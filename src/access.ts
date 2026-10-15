/**
 *     _____ __
 *    |__   /  / _
 *      /  /  /_| |_
 *     /  /\____   _|
 *    /_____|   |_|
 *
 * @file access.ts
 * @author Etienne Cochard
 *
 * @copyright (c) 2026 R-libre ingenierie
 *
 * Use of this source code is governed by an MIT-style license
 * that can be found in the LICENSE file or at https://opensource.org/licenses/MIT.
 **/

// Users, groups and access rights.
//
// A user belongs to groups (users.grps: list of group ids), a group carries rights
// (groups.rights: list of "resource/action"). A right is granted by the same right,
// by "*" (everything) or by "resource/*" (any action on the resource). The joker is
// accepted at the end only, behind a "/": a "*/read" would otherwise grant everything.
//
// The application creates one Access and gives it to its guarded groups, which check
// the need of each route ( { need: "bed/read" } ). A handler may still check by itself:
//
//   export const access = new Access( );
//   RouteGroup.guarded( "/api", sessions.guard, access );
//   ...
//   if( !await access.userHasAccess( ctx.session.user, "bed/read" ) ) {
//       throw new HttpError( 403 );
//   }
//
// The guard gives each request its own user object (requestUser), which carries the
// request id for the security log.

import type { Db } from "./model";
import { Model } from "./model";
import type { Ctx, Handler } from "./context";
import { HttpError } from "./http-error";
import { SecurityLog } from "./logger";
import { isSqlite } from "./sqlite";
import type { SessionUser } from "./session";
import { dropOldest, isArray, isString, isUUID } from "./tools";

const CACHE_MS = 5000;

// users whose rights are kept: above that, the oldest entry is dropped
const MAX_CACHED_USERS = 1000;

// -- models ---------------------------------------------------------------------
// the strict minimum used by z4js. they are registered by Access and Sessions when
// they are created, before Model.updateAll. an application that needs more columns
// adds them with a model of its own, migrated after these ones

// the groups table: name and rights (a list of "resource/action")
export class GroupsModel extends Model {
	constructor( priority = 10 ) {
		super( "groups", priority );
	}

	override async onMigrate( db: Db, version: number ): Promise<number> {
		if( !await this.hasTable( db, "groups" ) ) {
			await ( isSqlite( db )
				? db`create table groups ( id text primary key, name text not null unique, rights json not null default '[]' )`
				: db`create table groups ( id uuid primary key default gen_random_uuid( ), name text not null unique, rights jsonb not null default '[]' )` );
		}

		return Math.max( version, 1 );
	}

	// every group with its rights (a few rows: read whole)
	async rightsByGroup( ): Promise<Map<string, string[]>> {
		const rows = await this.db`select id, rights from groups`;
		return new Map( rows.map( r => [String( r.id ), stringList( r.rights )] ) );
	}
}

// the users table: login, groups and password hash (null for an account without
// local password). registered by Access or Sessions, migrated before the sessions
export class UsersModel extends Model {
	constructor( priority = 20 ) {
		super( "users", priority );
	}

	override async onMigrate( db: Db, version: number ): Promise<number> {
		if( !await this.hasTable( db, "users" ) ) {
			await ( isSqlite( db )
				? db`create table users ( id text primary key, login text not null unique, grps json not null default '[]' )`
				: db`create table users ( id uuid primary key default gen_random_uuid( ), login text not null unique, grps jsonb not null default '[]' )` );
		}

		// hash of the password (password.ts), null for an account without local password (LDAP...)
		if( !await this.hasField( db, "users", "password" ) ) {
			await db`alter table users add column password text`;
		}

		return Math.max( version, 2 );
	}

	// the user as a session sees it, null if unknown
	async get( id: string ): Promise<SessionUser> {
		const [row] = await this.db`select id, login, grps from users where id = ${id}`;
		return row ? { id: String( row.id ), login: String( row.login ), grps: stringList( row.grps ) } : null;
	}

	// the ids of the groups of the user, empty if unknown
	async groupsOf( id: string ): Promise<string[]> {
		const [row] = await this.db`select grps from users where id = ${id}`;
		return stringList( row?.grps );
	}

	// for a local login: id and password hash (null without local password), null if unknown
	async byLogin( login: string ): Promise<{ id: string, password: string }> {
		const [row] = await this.db`select id, password from users where login = ${login}`;
		return row ? { id: String( row.id ), password: isString( row.password ) ? row.password : null } : null;
	}

	// the password hash, null without local password or unknown user
	async passwordOf( id: string ): Promise<string> {
		const [row] = await this.db`select password from users where id = ${id}`;
		return isString( row?.password ) ? row.password : null;
	}

	async setPassword( id: string, hash: string ): Promise<void> {
		await this.db`update users set password = ${hash} where id = ${id}`;
	}
}

// -- rights ---------------------------------------------------------------------

// the right is granted by the set: same right, "*", or "resource/*"
export function rightMatches( rights: ReadonlySet<string>, right: string ): boolean {
	if( rights.has( right ) || rights.has( "*" ) ) {
		return true;
	}

	for( const r of rights ) {
		if( r.endsWith( "/*" ) && right.startsWith( r.slice( 0, -1 ) ) ) {
			return true;
		}
	}

	return false;
}

// strings of a json list, trimmed, anything else ignored
function stringList( v: unknown ): string[] {
	return isArray( v ) ? v.filter( isString ).map( s => s.trim( ) ).filter( s => s ) : [];
}

// the request id, hidden on the user object of a request
const REQUEST_ID = Symbol( "z4js.access.request" );

// the user object of one request: a copy of the user (own properties, so that
// ctx.json( ctx.session.user ) shows them), carrying the id of this request only
// (hidden, for the security log). called by the guard
export function requestUser<U extends object>( user: U, requestId?: string ): U {
	const copy = { ...user };
	Object.defineProperty( copy, REQUEST_ID, { value: requestId } );
	return copy;
}

// the request id carried by the user object of a request, undefined otherwise
function requestIdOf( user: unknown ): string {
	return user && typeof user === "object" ? ( user as Record<symbol, string> )[REQUEST_ID] : undefined;
}

// -- need -----------------------------------------------------------------------

// the right(s) a route (HTTP or WebSocket) needs, checked before anything else of the
// route (403 otherwise): one right, several (all of them), or a function for what rights
// cannot say (the owner of a record...). checked with the Access of the group: guarded
// groups only (a check without a session is a filter).
// null: no right needed, said explicitly (required in every route)
export type Need = string | readonly string[] | ( ( ctx: Ctx<any> ) => boolean | Promise<boolean> );

// checked when a route is declared: need present (TypeScript lets null pass anywhere,
// without strictNullChecks: the key itself is checked), a right, a non empty list of
// rights, a function, or null
export function checkNeed( key: string, options: { need?: Need } ) {
	if( !options || !Object.hasOwn( options, "need" ) ) {
		throw new Error( `route ${key}: need expected (null for no right)` );
	}

	const { need } = options;
	const isRight = ( r: unknown ) => isString( r ) && r !== "";
	if( need !== null && typeof need !== "function" && !isRight( need ) && !( isArray( need ) && need.length > 0 && need.every( isRight ) ) ) {
		throw new Error( `invalid need for route ${key}` );
	}
}

// the need of a route as its first step: 403 unless granted
export function needStep( need: Need, access: Access ): Handler {
	if( typeof need === "function" ) {
		return async ( ctx: Ctx ) => {
			if( !await need( ctx ) ) {
				throw new HttpError( 403 );
			}
		};
	}

	const rights = isString( need ) ? [need] : need;
	return async ( ctx: Ctx ) => {
		// in order, the first refusal ends (logged once by userHasAccess)
		for( const right of rights ) {
			if( !await access.userHasAccess( ctx.session.user, right ) ) {
				throw new HttpError( 403 );
			}
		}
	};
}

// -- access ---------------------------------------------------------------------


type UserRef = string | { id: string };

function idOf( user: UserRef ): string {
	return isString( user ) ? user : user?.id;
}

// access control: tells whether a user has a right, from the rights of his groups.
// one instance per application, given to the guarded groups (see the header)
export class Access {
	private readonly users = new Map<string, { rights: Set<string>, expires: number }>( );
	private groups: { rights: Map<string, string[]>, expires: number } = null;
	private readonly groupsModel: GroupsModel;
	private readonly usersModel: UsersModel;

	// registers the models it reads (groups, users) if the application did not
	constructor( ) {
		this.groupsModel = Model.ensure( "groups", GroupsModel );
		this.usersModel = Model.ensure( "users", UsersModel );
	}

	// arrow functions: they can be taken out of the object (see the header)

	// true if the user has the right. the rights of a user are cached CACHE_MS
	readonly userHasAccess = async ( user: UserRef, right: string ): Promise<boolean> => {
		const id = idOf( user );
		const granted = isUUID( id ) && rightMatches( await this.rightsOf( id ), right );

		if( !granted ) {
			SecurityLog.app.log( "auth.forbidden", { user: isString( id ) ? id : null, right }, requestIdOf( user ) );
		}

		return granted;
	};

	// the groups that the actor may not give: a group is given only if each of its
	// rights is granted to the actor himself (nobody gives what he does not have).
	// an unknown group is refused. returns the refused ids, to be logged by the caller
	readonly ungrantableGroups = async ( actor: UserRef, groupIds: readonly string[] ): Promise<string[]> => {
		const id = idOf( actor );
		const mine = isUUID( id ) ? await this.rightsOf( id ) : new Set<string>( );
		const groups = await this.groupRights( );

		return groupIds.filter( gid => {
			const rights = groups.get( gid );
			return !rights || !rights.every( r => rightMatches( mine, r ) );
		} );
	};

	private async rightsOf( id: string ): Promise<Set<string>> {
		const now = Date.now( );
		const cached = this.users.get( id );
		if( cached && cached.expires > now ) {
			return cached.rights;
		}

		const grps = await this.usersModel.groupsOf( id );
		const groups = await this.groupRights( );

		const rights = new Set<string>( );
		for( const gid of grps ) {
			groups.get( gid )?.forEach( r => rights.add( r ) );
		}

		// set again at the end: the newest entry
		this.users.delete( id );
		dropOldest( this.users, MAX_CACHED_USERS );
		this.users.set( id, { rights, expires: now + CACHE_MS } );
		return rights;
	}

	// every group with its rights, cached CACHE_MS (a few rows: read whole)
	private async groupRights( ): Promise<Map<string, string[]>> {
		const now = Date.now( );
		if( this.groups && this.groups.expires > now ) {
			return this.groups.rights;
		}

		const rights = await this.groupsModel.rightsByGroup( );
		this.groups = { rights, expires: now + CACHE_MS };
		return rights;
	}
}
