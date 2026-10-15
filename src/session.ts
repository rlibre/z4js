/**
 *     _____ __
 *    |__   /  / _
 *      /  /  /_| |_
 *     /  /\____   _|
 *    /_____|   |_|
 *
 * @file session.ts
 * @author Etienne Cochard
 *
 * @copyright (c) 2026 R-libre ingenierie
 *
 * Use of this source code is governed by an MIT-style license
 * that can be found in the LICENSE file or at https://opensource.org/licenses/MIT.
 **/

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
//   this.post( "/user/delete/:id", this.on_delete, { need: "users/delete", filter: Sessions.stepUp } );
//
// Without a raised session: 403 "step-up required" (not 401: the session is valid).
// Other proofs (TOTP...) are added with options.stepUpVerifiers. An application that
// checks the identity itself (LDAP...) calls sessions.grantStepUp( ctx ).
//
// Only the SHA-256 of the tokens is stored: a leak of the table opens no session.
// The guard of a guarded group checks the access token, loads the user and sets the
// session of the request (ctx.session, with its user), or answers 401. Sessions and their user are cached 5 s: a revoked session
// may still pass during those seconds.
//
//   export const sessions = new Sessions( config.session, { rateLimit: config.rateLimit } );
//   RouteGroup.guarded( "/api/v1", sessions.guard, access );
//   RouteGroup.unprotected( "/auth" ).add( "/", sessions.endPoints );   // POST /auth/login, /refresh, /logout, /stepup
//
// login: local password (password.ts). An application with another way to log in
// (LDAP...) writes its own route and calls sessions.create once the user is checked.

import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { Request, RequestHandler } from "express";
import { UsersModel, requestUser } from "./access";
import { requestOf } from "./context";
import type { Ctx } from "./context";
import { EndPoints } from "./endpoints";
import type { Filter } from "./endpoints";
import { HttpError } from "./http-error";
import { SecurityLog } from "./logger";
import type { Db } from "./model";
import { Model } from "./model";
import { hashPassword, needsRehash, verifyPassword } from "./password";
import { RateLimiter, refuse } from "./ratelimit";
import { isSqlite } from "./sqlite";
import { dropOldest, isString } from "./tools";

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

	// opens a session (the hashes of its tokens), after dropping the expired ones.
	// above maxPerUser sessions for the user, the oldest end
	async open( userId: string, access: TokenHash, refresh: TokenHash, maxPerUser: number, now: number ): Promise<void> {
		await this.db`delete from sessions where refresh_expires < ${new Date( now )}`;
		await this.db`insert into sessions ( id, user_id, created, access, access_expires, refresh, refresh_expires )
			values ( ${randomUUID( )}, ${userId}, ${new Date( now )}, ${access.hash}, ${new Date( access.expires )},
				${refresh.hash}, ${new Date( refresh.expires )} )`;

		const rows = await this.db`select id, created from sessions where user_id = ${userId}`;
		const extra = rows.length - maxPerUser;
		if( extra > 0 ) {
			const oldest = [...rows].sort( ( a, b ) => time( a.created ) - time( b.created ) ).slice( 0, extra );
			for( const row of oldest ) {
				await this.db`delete from sessions where id = ${row.id}`;
			}
		}
	}

	// the session of an access token, null if unknown
	async byAccess( hash: string ): Promise<{ id: string, userId: string, accessExpires: number, stepUpUntil: number }> {
		const [row] = await this.db`select id, user_id, access_expires, stepup_until from sessions where access = ${hash}`;
		return row ? {
			id: String( row.id ),
			userId: String( row.user_id ),
			accessExpires: time( row.access_expires ),
			stepUpUntil: row.stepup_until ? time( row.stepup_until ) : 0,
		} : null;
	}

	// the session of a refresh token, current or replaced by the last refresh (reused:
	// the token was copied). null if unknown
	async byRefresh( hash: string ): Promise<{ id: string, userId: string, access: string, refreshExpires: number, reused: boolean }> {
		const [row] = await this.db`select id, user_id, access, refresh_expires, refresh from sessions
			where refresh = ${hash} or previous_refresh = ${hash}`;
		return row ? {
			id: String( row.id ),
			userId: String( row.user_id ),
			access: String( row.access ),
			refreshExpires: time( row.refresh_expires ),
			reused: row.refresh !== hash,
		} : null;
	}

	// new tokens for the session, the replaced refresh token kept to detect its reuse
	async rotate( id: string, access: TokenHash, refresh: TokenHash, previousRefresh: string ): Promise<void> {
		await this.db`update sessions set access = ${access.hash}, access_expires = ${new Date( access.expires )},
			refresh = ${refresh.hash}, refresh_expires = ${new Date( refresh.expires )}, previous_refresh = ${previousRefresh}
			where id = ${id}`;
	}

	async setStepUp( id: string, until: number ): Promise<void> {
		await this.db`update sessions set stepup_until = ${new Date( until )} where id = ${id}`;
	}

	async idsOfUser( userId: string ): Promise<string[]> {
		const rows = await this.db`select id from sessions where user_id = ${userId}`;
		return rows.map( r => String( r.id ) );
	}

	// ends the session: the hash of its access token (to drop from a cache), null if unknown
	async remove( id: string ): Promise<string> {
		const [row] = await this.db`select access from sessions where id = ${id}`;
		await this.db`delete from sessions where id = ${id}`;
		return row ? String( row.access ) : null;
	}
}

// the hash of a token and its expiry (ms)
interface TokenHash {
	hash: string;
	expires: number;
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

// checks a proof of identity for the step-up (the body of POST /stepup: ctx.bodyValue)
export type StepUpVerifier = ( user: SessionUser, ctx: Ctx ) => Promise<boolean>;

export interface SessionOptions {
	// config.rateLimit: protects /login, /refresh and /stepup
	rateLimit: SessionRateLimits;
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

function isToken( v: unknown ): v is string {
	return isString( v ) && TOKEN_RE.test( v );
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
	private readonly usersModel: UsersModel;
	private readonly sessionsModel: SessionsModel;

	// POST /login { login, password } and /refresh { refresh } -> tokens, POST /logout { refresh }.
	// to mount in an unprotected group: the access token is expired when refreshing
	readonly endPoints: EndPoints;

	// registers the models it reads (users, sessions) if the application did not
	constructor( private readonly settings: SessionSettings, private readonly options: SessionOptions ) {
		this.usersModel = Model.ensure( "users", UsersModel );
		this.sessionsModel = Model.ensure( "sessions", SessionsModel );

		this.accessMs = settings.accessMinutes * 60_000;
		this.refreshMs = settings.refreshMinutes * 60_000;

		const limits = options.rateLimit;
		this.loginLimiter = new RateLimiter( "login", limits.loginPerMinute, 60_000 );
		this.refreshLimiter = new RateLimiter( "refresh", limits.refreshPerMinute, 60_000 );
		this.failures = new RateLimiter( "login-failures", limits.loginFailures, limits.loginFailureMinutes * 60_000 );

		this.stepUpMs = settings.stepUpMinutes * 60_000;
		this.verifiers = { password: this.verifyPassword, ...options.stepUpVerifiers };

		// last: its routes use the limiters
		this.endPoints = new SessionEP( this, this.guardFilter );
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

		const user = isString( login ) && login ? await this.usersModel.byLogin( login ) : null;
		const stored = user?.password ?? await this.dummy;
		const valid = await verifyPassword( password, stored ) && !!user?.password;

		if( !valid ) {
			if( isString( login ) ) {
				this.failures.hit( login );
			}

			SecurityLog.app.log( "auth.login.failed", { login: isString( login ) ? login : null }, requestId );
			return null;
		}

		this.failures.reset( login );

		const id = user.id;
		if( needsRehash( stored ) ) {
			await this.usersModel.setPassword( id, await hashPassword( password ) );
		}

		SecurityLog.app.log( "auth.login.ok", { user: id }, requestId );
		return this.create( id );
	};

	// opens a session for an authenticated user. above maxPerUser, the oldest sessions end
	readonly create = async ( userId: string ): Promise<SessionTokens> => {
		const now = Date.now( );
		const { tokens, access, refresh } = this.pair( now );

		await this.sessionsModel.open( userId, access, refresh, this.settings.maxPerUser, now );
		return tokens;
	};

	// a new pair for a valid refresh token. null: unknown or expired (answer 401).
	// a replaced refresh token used again ends the whole session
	readonly refresh = async ( refreshToken: string ): Promise<SessionTokens> => {
		if( !isToken( refreshToken ) ) {
			return null;
		}

		const hash = hashToken( refreshToken );
		const now = Date.now( );

		const row = await this.sessionsModel.byRefresh( hash );
		if( row?.reused ) {
			await this.endSession( row.id );
			SecurityLog.app.log( "auth.session.revoked", { user: row.userId, reason: "refresh token reused" } );
			return null;
		}

		if( !row || row.refreshExpires < now ) {
			return null;
		}

		const { tokens, access, refresh } = this.pair( now );
		await this.sessionsModel.rotate( row.id, access, refresh, hash );

		// the replaced access token ends now, not at its own expiry
		this.cache.delete( row.access );
		return tokens;
	};

	// logout, with the refresh token: ends the session
	readonly logout = async ( refreshToken: string ): Promise<void> => {
		if( isToken( refreshToken ) ) {
			const row = await this.sessionsModel.byRefresh( hashToken( refreshToken ) );
			if( row && !row.reused ) {
				await this.endSession( row.id );
			}
		}
	};

	// ends every session of the user (password changed, account disabled...)
	readonly revokeUser = async ( userId: string ): Promise<void> => {
		for( const id of await this.sessionsModel.idsOfUser( userId ) ) {
			await this.endSession( id );
		}

		SecurityLog.app.log( "auth.session.revoked", { user: userId, reason: "all sessions" } );
	};

	// the guard of a guarded group: sets the session of the request, or answers 401
	readonly guard: RequestHandler = async ( req, _res, next ) => {
		await this.authenticate( req );
		next( );
	};

	// route filter (after the guard): a raised session, or 403 "step-up required".
	// static: it only reads the session of the request, a route declares it without
	// the instance
	static readonly stepUp: Filter = ( ctx: Ctx ) => {
		const req = requestOf( ctx );
		if( !req.session || req.session.stepUpUntil < Date.now( ) ) {
			SecurityLog.app.log( "auth.stepup.required", { user: req.session?.user.id ?? null }, req.id );
			throw new HttpError( 403, "step-up required" );
		}
	};

	// raises the session of the request for stepUpMinutes, once the identity is
	// confirmed (by stepUpWith, or by the application itself: LDAP...)
	readonly grantStepUp = async ( ctx: Ctx ): Promise<void> => {
		const req = requestOf( ctx );
		if( !req.session ) {
			throw new Error( "grantStepUp: no session (route without the guard)" );
		}

		const until = Date.now( ) + this.stepUpMs;
		await this.sessionsModel.setStepUp( req.session.id, until );
		req.session.stepUpUntil = until;
		this.forgetSession( req.session.id );

		SecurityLog.app.log( "auth.stepup.ok", { user: req.session.user.id }, req.id );
	};

	// checks the proof with the verifier of the method and raises the session. false if
	// refused. failures count with the failed logins of the same login
	readonly stepUpWith = async ( ctx: Ctx, method: string ): Promise<boolean> => {
		const verifier = Object.hasOwn( this.verifiers, method ) ? this.verifiers[method] : null;
		if( !verifier ) {
			throw new HttpError( 400, "unknown step-up method" );
		}

		const user = ctx.session.user;
		if( !this.loginBlockedFor( user.login ) && await verifier( user, ctx ) ) {
			this.failures.reset( user.login );
			await this.grantStepUp( ctx );
			return true;
		}

		this.failures.hit( user.login );
		SecurityLog.app.log( "auth.stepup.failed", { user: user.id, method }, requestOf( ctx ).id );
		return false;
	};

	// the guard, as a route filter (POST /stepup, in the unprotected group)
	private readonly guardFilter: Filter = ( ctx: Ctx ) => this.authenticate( requestOf( ctx ) );

	// the built-in step-up proof: the password of the user, { password } in the body
	private readonly verifyPassword: StepUpVerifier = async ( user, ctx ) => {
		const password = ctx.bodyValue( "password" );
		const stored = await this.usersModel.passwordOf( user.id );
		return !!stored && verifyPassword( password, stored );
	};

	// checks the access token of the request and sets its session, or throws a 401
	private async authenticate( req: Request ) {
		const header = req.headers.authorization ?? "";
		const token = header.startsWith( "Bearer " ) ? header.slice( 7 ) : "";

		if( !isToken( token ) ) {
			return this.refuse( req.id, header ? "malformed" : "missing" );
		}

		const entry = await this.find( hashToken( token ) );
		if( !entry ) {
			return this.refuse( req.id, "unknown" );
		}

		if( Date.now( ) > entry.accessExpires ) {
			return this.refuse( req.id, "expired" );
		}

		req.session = { id: entry.sessionId, user: requestUser( entry.user, req.id ), stepUpUntil: entry.stepUpUntil };
	}

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
		this.cache.delete( await this.sessionsModel.remove( id ) );
	}

	private refuse( requestId: string, reason: string ): never {
		SecurityLog.app.log( "auth.unauthorized", { reason }, requestId );
		throw new HttpError( 401 );
	}

	// the session of an access token and its user, cached CACHE_MS. null if unknown
	private async find( accessHash: string ): Promise<Entry> {
		const now = Date.now( );
		const cached = this.cache.get( accessHash );
		if( cached && cached.expires > now ) {
			return cached;
		}

		// two queries, each table by its model: only when the cache has nothing
		const session = await this.sessionsModel.byAccess( accessHash );
		const user = session ? await this.usersModel.get( session.userId ) : null;

		this.cache.delete( accessHash );
		if( !user ) {
			return null;
		}

		const entry: Entry = {
			sessionId: session.id,
			user: Object.freeze( user ),
			accessExpires: session.accessExpires,
			stepUpUntil: session.stepUpUntil,
			expires: now + CACHE_MS,
		};

		dropOldest( this.cache, MAX_CACHED );
		this.cache.set( accessHash, entry );
		return entry;
	}
}

// password hashing takes about 100 ms on purpose: not a slow request (server.ts)
function expectSlow( ctx: Ctx<any> ) {
	requestOf( ctx ).res.locals.expectedSlow = true;
}

// the routes of the sessions: /login, /refresh, /logout and /stepup
class SessionEP extends EndPoints {
	constructor( private readonly sessions: Sessions, guard: Filter ) {
		super( );
		this.post( "/login", this.on_login, { need: null, filter: sessions.loginLimiter.filter } );
		this.post( "/refresh", this.on_refresh, { need: null, filter: sessions.refreshLimiter.filter } );
		// behind the guard: a valid session is needed to raise it. no right: the user
		// confirms his own identity
		this.post( "/stepup", this.on_stepup, { need: null, filter: [sessions.loginLimiter.filter, guard] } );
		this.post( "/logout", this.on_logout, { need: null } );
	}

	async on_login( ctx: Ctx<SessionTokens> ) {
		expectSlow( ctx );

		const login = ctx.bodyValue( "login" );
		this.checkBlocked( ctx, login );

		const tokens = await this.sessions.login( login, ctx.bodyValue( "password" ), requestOf( ctx ).id );
		if( !tokens ) {
			throw new HttpError( 401 );
		}

		ctx.json( tokens );
	}

	async on_stepup( ctx: Ctx ) {
		const user = ctx.session.user;
		expectSlow( ctx );

		this.checkBlocked( ctx, user.login );

		const method = ctx.bodyValue( "method", "string", { required: false, default: "password" } );
		if( !await this.sessions.stepUpWith( ctx, method ) ) {
			throw new HttpError( 403, "step-up failed" );
		}

		ctx.ok( );
	}

	async on_refresh( ctx: Ctx<SessionTokens> ) {
		const tokens = await this.sessions.refresh( ctx.bodyValue( "refresh" ) );
		if( !tokens ) {
			throw new HttpError( 401 );
		}

		ctx.json( tokens );
	}

	async on_logout( ctx: Ctx ) {
		await this.sessions.logout( ctx.bodyValue( "refresh" ) );
		ctx.ok( );
	}

	// too many failures for this login: 429 with Retry-After
	private checkBlocked( ctx: Ctx<any>, login: string ) {
		const wait = this.sessions.loginBlockedFor( login );
		if( wait ) {
			refuse( requestOf( ctx ), "login-failures", wait );
		}
	}
}
