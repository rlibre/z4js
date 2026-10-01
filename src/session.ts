// Sessions: opaque tokens, no cookie.
//
// At login, the application (once the password is checked) opens a session and gives
// the client two random tokens:
//
// - the access token, sent with every request: "Authorization: Bearer <token>".
//   It lives config.session.accessMinutes: a leaked one (proxy log...) is soon useless.
// - the refresh token, sent to the refresh route only, to get a new pair before the
//   access token expires. Without a refresh within config.session.refreshMinutes, the
//   session ends.
//
// Each refresh replaces both tokens. An old refresh token used again means it was
// copied (by a thief, or the thief came first): the whole session ends at once, and
// both parties have to log in again.
//
// Step-up: a sensitive route (change a password, give rights...) asks for an identity
// confirmed a few minutes ago, even with a valid session. The client confirms it with
// POST /stepup { method, ...proof } (default method "password": { password }), then
// the session is raised for config.session.stepUpMinutes (stored in the session: it
// survives the refreshes). The route declares it with a filter:
//
//   this.post( "/user/delete/:id", this.on_delete, { filter: sessions.stepUp } );
//
// Without a raised session: 403 "step-up required" (not 401: the session is valid).
// Other proofs (TOTP...) are added with options.stepUpVerifiers. An application that
// checks the identity itself (LDAP...) calls sessions.grantStepUp( req ).
//
// Only the SHA-256 of the tokens is stored: a leak of the table opens no session.
// The guard of a guarded group checks the access token, loads the user and sets
// req.user, or answers 401. Sessions and their user are cached 5 s: a revoked session
// may still pass during those seconds.
//
//   export const sessions = new Sessions( sql, config.session, { rateLimit: config.rateLimit, securityLog } );
//   RouteGroup.guarded( "/api/v1", sessions.guard );
//   RouteGroup.unprotected( "/auth" ).add( "/", sessions.controller );   // POST /auth/login, /refresh, /logout, /stepup
//
// login: local password (password.ts). An application with another way to log in
// (LDAP...) writes its own route and calls sessions.create once the user is checked.

import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { RequestHandler } from "express";
import { UsersModel, noAccessCheck, requestUser } from "./access";
import { Controller } from "./controller";
import type { Request, Response } from "./controller";
import { HttpError } from "./http-error";
import { getParam } from "./params";
import type { SecurityLog } from "./logger";
import type { Db } from "./model";
import { Model } from "./model";
import { hashPassword, needsRehash, verifyPassword } from "./password";
import { RateLimiter, refuse } from "./ratelimit";
import { isSqlite } from "./sqlite";
import { isArray, isString } from "./tools";

const CACHE_MS = 5000;
const MAX_CACHED = 1000;
const TOKEN_BYTES = 32;

// base64url of TOKEN_BYTES: 43 characters
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

// the sessions table: hashes of the tokens, their expiry, the step-up. registered
// by Sessions
export class SessionsModel extends Model {
	constructor( priority = 30 ) {
		super( "sessions", priority );
	}

	// previous_refresh: the refresh token replaced by the last refresh, to detect its reuse
	override async onMigrate( db: Db, version: number ): Promise<number> {
		if( !await this.hasTable( db, "sessions" ) ) {
			await ( isSqlite( db )
				? db`create table sessions ( id text primary key, user_id text not null, created datetime not null,
					access text not null unique, access_expires datetime not null,
					refresh text not null unique, refresh_expires datetime not null, previous_refresh text )`
				: db`create table sessions ( id uuid primary key, user_id uuid not null, created timestamptz not null,
					access text not null unique, access_expires timestamptz not null,
					refresh text not null unique, refresh_expires timestamptz not null, previous_refresh text )` );
		}

		if( !await this.hasIndex( db, "sessions", "sessions_user_id" ) ) {
			await db`create index sessions_user_id on sessions ( user_id )`;
		}

		if( !await this.hasIndex( db, "sessions", "sessions_previous_refresh" ) ) {
			await db`create index sessions_previous_refresh on sessions ( previous_refresh )`;
		}

		// end of the step-up, null if never raised
		if( !await this.hasField( db, "sessions", "stepup_until" ) ) {
			await ( isSqlite( db )
				? db`alter table sessions add column stepup_until datetime`
				: db`alter table sessions add column stepup_until timestamptz` );
		}

		return Math.max( version, 2 );
	}
}

export interface SessionSettings {
	accessMinutes: number;
	refreshMinutes: number;
	maxPerUser: number;
	stepUpMinutes: number;
}

export interface SessionRateLimits {
	loginPerMinute: number;
	loginFailures: number;
	loginFailureMinutes: number;
	refreshPerMinute: number;
}

// checks a proof of identity for the step-up (the body of POST /stepup is in req.body)
export type StepUpVerifier = ( user: SessionUser, req: Request ) => Promise<boolean>;

export interface SessionOptions {
	// config.rateLimit: protects /login, /refresh and /stepup
	rateLimit: SessionRateLimits;
	securityLog?: SecurityLog;
	// step-up proofs added to "password", by name ("totp"...)
	stepUpVerifiers?: Record<string, StepUpVerifier>;
}

// the user of a session, as loaded from the users table
export interface SessionUser {
	id: string;
	login: string;
	grps: string[];
}

// what the client receives at login and at each refresh. durations in seconds
export interface SessionTokens {
	access: string;
	refresh: string;
	accessExpiresIn: number;
	refreshExpiresIn: number;
}

interface Entry {
	sessionId: string;
	user: SessionUser;
	accessExpires: number;
	stepUpUntil: number;
	expires: number;		// of the cache entry
}

function hashToken( token: string ): string {
	return createHash( "sha256" ).update( token ).digest( "hex" );
}

function newToken( ): string {
	return randomBytes( TOKEN_BYTES ).toString( "base64url" );
}

function time( v: unknown ): number {
	return v instanceof Date ? v.getTime( ) : new Date( v as string ).getTime( );
}

// the sessions of the users: login, tokens, refresh, logout, step-up, and the guard
// of the guarded groups. one instance per application
export class Sessions {
	private readonly cache = new Map<string, Entry>( );

	// a real hash of a random password, verified when the login is unknown. made at
	// construction: made at the first unknown login, it would double that answer time
	private readonly dummy = hashPassword( randomBytes( 16 ).toString( "base64url" ) );
	private readonly accessMs: number;
	private readonly refreshMs: number;

	// per IP on the routes, and failed logins per login name (attack spread over many IPs)
	readonly loginLimiter: RateLimiter;
	readonly refreshLimiter: RateLimiter;
	private readonly failures: RateLimiter;
	private readonly stepUpMs: number;
	private readonly verifiers: Record<string, StepUpVerifier>;

	// POST /login { login, password } and /refresh { refresh } -> tokens, POST /logout { refresh }.
	// to mount in an unprotected group: the access token is expired when refreshing
	readonly controller: Controller;

	// registers the models it reads (users, sessions) if the application did not
	constructor( private readonly db: Db, private readonly settings: SessionSettings, private readonly options: SessionOptions ) {
		Model.ensure( "users", ( ) => new UsersModel( ) );
		Model.ensure( "sessions", ( ) => new SessionsModel( ) );

		this.accessMs = settings.accessMinutes * 60_000;
		this.refreshMs = settings.refreshMinutes * 60_000;

		const limits = options.rateLimit;
		this.loginLimiter = new RateLimiter( "login", limits.loginPerMinute, 60_000 );
		this.refreshLimiter = new RateLimiter( "refresh", limits.refreshPerMinute, 60_000 );
		this.failures = new RateLimiter( "login-failures", limits.loginFailures, limits.loginFailureMinutes * 60_000 );

		this.stepUpMs = settings.stepUpMinutes * 60_000;
		this.verifiers = { password: this.verifyPassword, ...options.stepUpVerifiers };

		// last: its routes use the limiters
		this.controller = new SessionController( this );
	}

	// ms before this login may be tried again after too many failures, 0 if it may
	readonly loginBlockedFor = ( login: string ): number => {
		return isString( login ) ? this.failures.waitFor( login ) : 0;
	};

	// arrow functions and properties: they can be taken out of the object

	// login with a local password: the tokens, or null (unknown login, wrong password,
	// account without password). an unknown login takes the same time as a wrong
	// password: the answer time does not tell which accounts exist
	readonly login = async ( login: string, password: string, requestId?: string ): Promise<SessionTokens> => {
		if( this.loginBlockedFor( login ) ) {
			return null;
		}

		const [user] = isString( login ) && login ? await this.db`select id, password from users where login = ${login}` : [];
		const stored = isString( user?.password ) ? user.password : await this.dummy;
		const valid = await verifyPassword( password, stored ) && !!user?.password;

		if( !valid ) {
			if( isString( login ) ) {
				this.failures.hit( login );
			}

			this.options.securityLog?.log( "auth.login.failed", { login: isString( login ) ? login : null }, requestId );
			return null;
		}

		this.failures.reset( login );

		const id = String( user.id );
		if( needsRehash( stored ) ) {
			await this.db`update users set password = ${await hashPassword( password )} where id = ${id}`;
		}

		this.options.securityLog?.log( "auth.login.ok", { user: id }, requestId );
		return this.create( id );
	};

	// opens a session for an authenticated user. above maxPerUser, the oldest sessions end
	readonly create = async ( userId: string ): Promise<SessionTokens> => {
		const now = Date.now( );
		const { tokens, access, refresh } = this.pair( now );

		await this.db`delete from sessions where refresh_expires < ${new Date( now )}`;
		await this.db`insert into sessions ( id, user_id, created, access, access_expires, refresh, refresh_expires )
			values ( ${randomUUID( )}, ${userId}, ${new Date( now )}, ${access.hash}, ${new Date( access.expires )},
				${refresh.hash}, ${new Date( refresh.expires )} )`;

		const rows = await this.db`select id, created from sessions where user_id = ${userId}`;
		const extra = rows.length - this.settings.maxPerUser;
		if( extra > 0 ) {
			const oldest = [...rows].sort( ( a, b ) => time( a.created ) - time( b.created ) ).slice( 0, extra );
			for( const row of oldest ) {
				await this.db`delete from sessions where id = ${row.id}`;
			}
		}

		return tokens;
	};

	// a new pair for a valid refresh token. null: unknown or expired (answer 401).
	// a replaced refresh token used again ends the whole session
	readonly refresh = async ( refreshToken: string ): Promise<SessionTokens> => {
		if( !isString( refreshToken ) || !TOKEN_RE.test( refreshToken ) ) {
			return null;
		}

		const hash = hashToken( refreshToken );
		const now = Date.now( );

		const [stolen] = await this.db`select id, user_id from sessions where previous_refresh = ${hash}`;
		if( stolen ) {
			await this.endSession( String( stolen.id ) );
			this.options.securityLog?.log( "auth.session.revoked", { user: String( stolen.user_id ), reason: "refresh token reused" } );
			return null;
		}

		const [row] = await this.db`select id, access, refresh_expires from sessions where refresh = ${hash}`;
		if( !row || time( row.refresh_expires ) < now ) {
			return null;
		}

		const { tokens, access, refresh } = this.pair( now );
		await this.db`update sessions set access = ${access.hash}, access_expires = ${new Date( access.expires )},
			refresh = ${refresh.hash}, refresh_expires = ${new Date( refresh.expires )}, previous_refresh = ${hash}
			where id = ${row.id}`;

		// the replaced access token ends now, not at its own expiry
		this.cache.delete( String( row.access ) );
		return tokens;
	};

	// logout, with the refresh token: ends the session
	readonly logout = async ( refreshToken: string ): Promise<void> => {
		if( isString( refreshToken ) && TOKEN_RE.test( refreshToken ) ) {
			const [row] = await this.db`select id from sessions where refresh = ${hashToken( refreshToken )}`;
			if( row ) {
				await this.endSession( String( row.id ) );
			}
		}
	};

	// ends every session of the user (password changed, account disabled...)
	readonly revokeUser = async ( userId: string ): Promise<void> => {
		const rows = await this.db`select id from sessions where user_id = ${userId}`;
		for( const row of rows ) {
			await this.endSession( String( row.id ) );
		}

		this.options.securityLog?.log( "auth.session.revoked", { user: userId, reason: "all sessions" } );
	};

	// the guard of a guarded group: sets req.user, or answers 401
	readonly guard: RequestHandler = async ( req, _res, next ) => {
		const header = req.headers.authorization ?? "";
		const token = header.startsWith( "Bearer " ) ? header.slice( 7 ) : "";

		if( !TOKEN_RE.test( token ) ) {
			return this.refuse( req.id, header ? "malformed" : "missing" );
		}

		const entry = await this.find( hashToken( token ) );
		if( !entry ) {
			return this.refuse( req.id, "unknown" );
		}

		if( Date.now( ) > entry.accessExpires ) {
			return this.refuse( req.id, "expired" );
		}

		req.user = requestUser( entry.user );
		req.session = { id: entry.sessionId, stepUpUntil: entry.stepUpUntil };
		next( );
	};

	// route filter (after the guard): a raised session, or 403 "step-up required"
	readonly stepUp: RequestHandler = ( req, _res, next ) => {
		if( !req.session || req.session.stepUpUntil < Date.now( ) ) {
			this.options.securityLog?.log( "auth.stepup.required", { user: req.user?.id ?? null }, req.id );
			throw new HttpError( 403, "step-up required" );
		}

		next( );
	};

	// raises the session of the request for stepUpMinutes, once the identity is
	// confirmed (by stepUpWith, or by the application itself: LDAP...)
	readonly grantStepUp = async ( req: Request ): Promise<void> => {
		if( !req.session ) {
			throw new Error( "grantStepUp: no session (route without the guard)" );
		}

		const until = Date.now( ) + this.stepUpMs;
		await this.db`update sessions set stepup_until = ${new Date( until )} where id = ${req.session.id}`;
		req.session.stepUpUntil = until;
		this.forgetSession( req.session.id );

		this.options.securityLog?.log( "auth.stepup.ok", { user: req.user?.id ?? null }, req.id );
	};

	// checks the proof with the verifier of the method and raises the session. false if
	// refused. failures count with the failed logins of the same login
	readonly stepUpWith = async ( req: Request, method: string ): Promise<boolean> => {
		const verifier = Object.hasOwn( this.verifiers, method ) ? this.verifiers[method] : null;
		if( !verifier ) {
			throw new HttpError( 400, "unknown step-up method" );
		}

		const user = req.user as SessionUser;
		if( !this.loginBlockedFor( user.login ) && await verifier( user, req ) ) {
			this.failures.reset( user.login );
			await this.grantStepUp( req );
			return true;
		}

		this.failures.hit( user.login );
		this.options.securityLog?.log( "auth.stepup.failed", { user: user.id, method }, req.id );
		return false;
	};


	// the built-in step-up proof: the password of the user, { password } in the body
	private readonly verifyPassword: StepUpVerifier = async ( user, req ) => {
		const password = getParam( req.body, "password", "string" );
		const [row] = await this.db`select password from users where id = ${user.id}`;
		return isString( row?.password ) && verifyPassword( password, row.password );
	};

	// cache entries of the session (the step-up changed)
	private forgetSession( sessionId: string ) {
		for( const [hash, entry] of this.cache ) {
			if( entry.sessionId === sessionId ) {
				this.cache.delete( hash );
			}
		}
	}

	private pair( now: number ) {
		const access = newToken( );
		const refresh = newToken( );

		return {
			tokens: { access, refresh, accessExpiresIn: this.accessMs / 1000, refreshExpiresIn: this.refreshMs / 1000 },
			access: { hash: hashToken( access ), expires: now + this.accessMs },
			refresh: { hash: hashToken( refresh ), expires: now + this.refreshMs },
		};
	}

	private async endSession( id: string ) {
		const [row] = await this.db`select access from sessions where id = ${id}`;
		if( row ) {
			this.cache.delete( String( row.access ) );
		}

		await this.db`delete from sessions where id = ${id}`;
	}

	private refuse( requestId: string, reason: string ): never {
		this.options.securityLog?.log( "auth.unauthorized", { reason }, requestId );
		throw new HttpError( 401 );
	}

	// the session of an access token and its user, cached CACHE_MS. null if unknown
	private async find( accessHash: string ): Promise<Entry> {
		const now = Date.now( );
		const cached = this.cache.get( accessHash );
		if( cached && cached.expires > now ) {
			return cached;
		}

		const [row] = await this.db`select s.id, s.user_id, s.access_expires, s.stepup_until, u.login, u.grps
			from sessions s join users u on u.id = s.user_id where s.access = ${accessHash}`;

		this.cache.delete( accessHash );
		if( !row ) {
			return null;
		}

		const id = String( row.user_id );
		const grps = isArray( row.grps ) ? row.grps.filter( isString ) : [];
		const entry: Entry = {
			sessionId: String( row.id ),
			user: Object.freeze( { id, login: String( row.login ), grps } ),
			accessExpires: time( row.access_expires ),
			stepUpUntil: row.stepup_until ? time( row.stepup_until ) : 0,
			expires: now + CACHE_MS,
		};

		// Map keeps the insertion order: the first key is the oldest
		if( this.cache.size >= MAX_CACHED ) {
			this.cache.delete( this.cache.keys( ).next( ).value );
		}

		this.cache.set( accessHash, entry );
		return entry;
	}
}

// the routes of the sessions: /login, /refresh, /logout and /stepup
class SessionController extends Controller {
	constructor( private readonly sessions: Sessions ) {
		super( );
		this.post( "/login", this.on_login, { filter: sessions.loginLimiter.filter } );
		this.post( "/refresh", this.on_refresh, { filter: sessions.refreshLimiter.filter } );
		// behind the guard: a valid session is needed to raise it
		this.post( "/stepup", this.on_stepup, { filter: [sessions.loginLimiter.filter, sessions.guard] } );
		this.post( "/logout", this.on_logout );
	}

	async on_login( req: Request, res: Response ) {
		// password hashing takes about 100 ms on purpose: not a slow request (server.ts)
		res.locals.expectedSlow = true;

		const login = this.bodyValue( req, "login" );
		const wait = this.sessions.loginBlockedFor( login );
		if( wait ) {
			return refuse( req, res, "login-failures", wait );
		}

		const tokens = await this.sessions.login( login, this.bodyValue( req, "password" ), req.id );
		if( !tokens ) {
			throw new HttpError( 401 );
		}

		res.json( tokens );
	}

	async on_stepup( req: Request, res: Response ) {
		// no right needed: the user confirms his own identity
		noAccessCheck( req.user );
		res.locals.expectedSlow = true;

		const login = ( req.user as SessionUser ).login;
		const wait = this.sessions.loginBlockedFor( login );
		if( wait ) {
			return refuse( req, res, "login-failures", wait );
		}

		const method = this.bodyValue( req, "method", "string", { required: false, default: "password" } );
		if( !await this.sessions.stepUpWith( req, method ) ) {
			throw new HttpError( 403, "step-up failed" );
		}

		res.json( {} );
	}

	async on_refresh( req: Request, res: Response ) {
		const tokens = await this.sessions.refresh( this.bodyValue( req, "refresh" ) );
		if( !tokens ) {
			throw new HttpError( 401 );
		}

		res.json( tokens );
	}

	async on_logout( req: Request, res: Response ) {
		await this.sessions.logout( this.bodyValue( req, "refresh" ) );
		res.json( {} );
	}
}
