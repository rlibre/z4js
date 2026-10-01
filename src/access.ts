// Users, groups and access rights.
//
// A user belongs to groups (users.grps: list of group ids), a group carries rights
// (groups.rights: list of "resource/action"). A right is granted by the same right,
// by "*" (everything) or by "resource/*" (any action on the resource). The joker is
// accepted at the end only, behind a "/": a "*/read" would otherwise grant everything.
//
// The application creates one Access and takes its functions, so that the handlers
// keep their usual form:
//
//   export const { userHasAccess, noAccessCheck } = new Access( sql, { securityLog } );
//   ...
//   if( !await userHasAccess( req.user, "bed/read" ) ) {
//       throw new HttpError( 403 );
//   }
//
// In debug mode, a handler of a guarded group that answers without any access check
// is logged (see server.ts). The guard gives each request its own user object
// (requestUser), on which userHasAccess and noAccessCheck leave a mark.

import type { Db } from "./model";
import { Model } from "./model";
import type { SecurityLog } from "./logger";
import { isSqlite } from "./sqlite";
import { isArray, isString, isUUID } from "./tools";

const CACHE_MS = 5000;

// users whose rights are kept: above that, the oldest entry is dropped
const MAX_CACHED_USERS = 1000;

// -- models ---------------------------------------------------------------------
// the strict minimum used by y4js. they are registered by Access and Sessions when
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

// marks left on the user object of a request
const CHECKED = Symbol( "y4js.access.checked" );

// the user object of one request: a copy of the user (own properties, so that
// res.json( req.user ) shows them), carrying the access check mark of this request
// only. called by the guard
export function requestUser<U extends object>( user: U ): U {
	return { ...user };
}

export function isAccessChecked( user: object ): boolean {
	return Object.hasOwn( user, CHECKED );
}

// the handler needs no right (GET /me...): says so, for the debug check
export function noAccessCheck( user: unknown ): void {
	markChecked( user );
}

function markChecked( user: unknown ) {
	if( user && typeof user === "object" ) {
		Object.defineProperty( user, CHECKED, { value: true } );
	}
}

// -- access ---------------------------------------------------------------------

export interface AccessOptions {
	// refusals are logged there (auth.forbidden), never in the database
	securityLog?: SecurityLog;
}

type UserRef = string | { id: string };

// access control: tells whether a user has a right, from the rights of his groups.
// one instance per application, its functions are taken out (see the header)
export class Access {
	private readonly users = new Map<string, { rights: Set<string>, expires: number }>( );
	private groups: { rights: Map<string, string[]>, expires: number } = null;

	// registers the models it reads (groups, users) if the application did not
	constructor( private readonly db: Db, private readonly options: AccessOptions = {} ) {
		Model.ensure( "groups", ( ) => new GroupsModel( ) );
		Model.ensure( "users", ( ) => new UsersModel( ) );
	}

	// arrow functions: they can be taken out of the object (see the header)

	// true if the user has the right. the rights of a user are cached CACHE_MS
	readonly userHasAccess = async ( user: UserRef, right: string ): Promise<boolean> => {
		markChecked( user );

		const id = isString( user ) ? user : user?.id;
		const granted = isUUID( id ) && rightMatches( await this.rightsOf( id ), right );

		if( !granted ) {
			this.options.securityLog?.log( "auth.forbidden", { user: isString( id ) ? id : null, right } );
		}

		return granted;
	};

	// the handler needs no right (GET /me...): says so, for the debug check
	readonly noAccessCheck = noAccessCheck;

	// the groups that the actor may not give: a group is given only if each of its
	// rights is granted to the actor himself (nobody gives what he does not have).
	// an unknown group is refused. returns the refused ids, to be logged by the caller
	readonly ungrantableGroups = async ( actor: UserRef, groupIds: readonly string[] ): Promise<string[]> => {
		const id = isString( actor ) ? actor : actor?.id;
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

		const [user] = await this.db`select grps from users where id = ${id}`;
		const groups = await this.groupRights( );

		const rights = new Set<string>( );
		for( const gid of stringList( user?.grps ) ) {
			groups.get( gid )?.forEach( r => rights.add( r ) );
		}

		// Map keeps the insertion order: the first key is the oldest
		this.users.delete( id );
		if( this.users.size >= MAX_CACHED_USERS ) {
			this.users.delete( this.users.keys( ).next( ).value );
		}

		this.users.set( id, { rights, expires: now + CACHE_MS } );
		return rights;
	}

	// every group with its rights, cached CACHE_MS (a few rows: read whole)
	private async groupRights( ): Promise<Map<string, string[]>> {
		const now = Date.now( );
		if( this.groups && this.groups.expires > now ) {
			return this.groups.rights;
		}

		const rows = await this.db`select id, rights from groups`;
		const rights = new Map( rows.map( r => [String( r.id ), stringList( r.rights )] ) );

		this.groups = { rights, expires: now + CACHE_MS };
		return rights;
	}
}
