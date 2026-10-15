// Sessions on the real server: login, guard, refresh, reuse of a refresh token,
// step-up, lockout after failures, logout. SQLite.

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { after, describe, it } from "node:test";
import { Access, EndPoints, Model, RouteGroup, Sessions, hashPassword, sqlite } from "../src/index";
import type { Ctx, SessionUser } from "../src/index";
import { startServer, tempDir, testConfig } from "./helpers";

// the routes behind the guard
class ApiEP extends EndPoints {
	constructor( ) {
		super( );
		this.get( "/me", ( ctx: Ctx<SessionUser> ) => ctx.json( ctx.session.user ), { need: null } );
		this.del( "/item", ( ctx: Ctx ) => ctx.ok( ), { need: "notes/delete", filter: Sessions.stepUp } );
	}
}

const config = await testConfig( { rateLimit: { loginPerMinute: 100, loginFailures: 3 } } );

const sql = sqlite( join( tempDir( ), "test.db" ) );
after( ( ) => sql.end( ) );

const access = new Access( );
const sessions = new Sessions( config.session, { rateLimit: config.rateLimit } );
await Model.updateAll( sql );

// two accounts with the right notes/delete (test data: written here directly)
const group = randomUUID( );
await sql`insert into groups ( id, name, rights ) values ( ${group}, ${"editors"}, ${["notes/delete"]} )`;
for( const login of ["alice", "bob"] ) {
	await sql`insert into users ( id, login, grps, password ) values ( ${randomUUID( )}, ${login}, ${[group]}, ${await hashPassword( "pass-" + login )} )`;
}

const server = await startServer( [
	RouteGroup.unprotected( "/auth" ).add( "/", sessions.endPoints ),
	RouteGroup.guarded( "/api", sessions.guard, access ).add( "/", new ApiEP( ) ),
], config );

const login = async ( name: string, password = "pass-" + name ) => server.call( "POST", "/auth/login", { body: { login: name, password } } );

describe( "login and guard", ( ) => {
	it( "refuses a wrong password and an unknown login alike", async ( ) => {
		assert.equal( ( await login( "alice", "wrong" ) ).status, 401 );
		assert.equal( ( await login( "nobody" ) ).status, 401 );
	} );

	it( "opens a session: the access token passes the guard", async ( ) => {
		const tokens = ( await login( "alice" ) ).body;
		const me = await server.call( "GET", "/api/me", { token: tokens.access } );
		assert.equal( me.status, 200 );
		assert.equal( me.body.login, "alice" );
	} );

	it( "the guard refuses a missing or malformed token", async ( ) => {
		assert.equal( ( await server.call( "GET", "/api/me" ) ).status, 401 );
		assert.equal( ( await server.call( "GET", "/api/me", { token: "nope" } ) ).status, 401 );
	} );
} );

describe( "refresh", ( ) => {
	it( "replaces both tokens: the old access token ends at once", async ( ) => {
		const first = ( await login( "alice" ) ).body;
		const second = await server.call( "POST", "/auth/refresh", { body: { refresh: first.refresh } } );
		assert.equal( second.status, 200 );
		assert.equal( ( await server.call( "GET", "/api/me", { token: first.access } ) ).status, 401 );
		assert.equal( ( await server.call( "GET", "/api/me", { token: second.body.access } ) ).status, 200 );
	} );

	it( "a reused refresh token ends the whole session", async ( ) => {
		const first = ( await login( "alice" ) ).body;
		const second = ( await server.call( "POST", "/auth/refresh", { body: { refresh: first.refresh } } ) ).body;
		assert.equal( ( await server.call( "POST", "/auth/refresh", { body: { refresh: first.refresh } } ) ).status, 401 );
		assert.equal( ( await server.call( "POST", "/auth/refresh", { body: { refresh: second.refresh } } ) ).status, 401 );
		assert.equal( ( await server.call( "GET", "/api/me", { token: second.access } ) ).status, 401 );
	} );

	it( "logout ends the session", async ( ) => {
		const tokens = ( await login( "alice" ) ).body;
		assert.equal( ( await server.call( "POST", "/auth/logout", { body: { refresh: tokens.refresh } } ) ).status, 200 );
		assert.equal( ( await server.call( "POST", "/auth/refresh", { body: { refresh: tokens.refresh } } ) ).status, 401 );
	} );
} );

describe( "step-up", ( ) => {
	it( "a sensitive route asks for it, a wrong proof is refused, the right one raises the session", async ( ) => {
		const { access: token } = ( await login( "alice" ) ).body;

		const before = await server.call( "DELETE", "/api/item", { token } );
		assert.equal( before.status, 403 );
		assert.equal( before.body.error, "step-up required" );

		assert.equal( ( await server.call( "POST", "/auth/stepup", { token, body: { password: "wrong" } } ) ).status, 403 );
		assert.equal( ( await server.call( "POST", "/auth/stepup", { token, body: { password: "pass-alice" } } ) ).status, 200 );
		assert.equal( ( await server.call( "DELETE", "/api/item", { token } ) ).status, 200 );
	} );

	it( "needs a session", async ( ) => {
		assert.equal( ( await server.call( "POST", "/auth/stepup", { body: { password: "x" } } ) ).status, 401 );
	} );
} );

describe( "lockout", ( ) => {
	it( "after loginFailures failures, the login is refused (429), even with the right password", async ( ) => {
		for( let i = 0; i < 3; i++ ) {
			assert.equal( ( await login( "bob", "wrong" ) ).status, 401 );
		}

		const blocked = await login( "bob" );
		assert.equal( blocked.status, 429 );
		assert.ok( Number( blocked.headers.get( "retry-after" ) ) > 0 );
	} );
} );
