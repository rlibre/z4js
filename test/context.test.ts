// The way of a request through a route (guard, need, filters, handler) and the
// answers of the context, on the real server. Plus the types of Ctx.

import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { Channel, EndPoints, HttpError, RouteGroup } from "../src/index";
import type { Access, Binary, Ctx } from "../src/index";
import { startServer, tempDir } from "./helpers";

// what happened, in order, for the request being tested
const steps: string[] = [];

// an Access that grants every right but "x/denied", and notes what it was asked
const access = {
	userHasAccess: async ( _user: unknown, right: string ) => {
		steps.push( `need ${right}` );
		return right !== "x/denied";
	},
} as unknown as Access;

// a guard that opens a session for any request
const guard = ( req: any, _res: unknown, next: ( ) => void ) => {
	req.session = { id: "s1", user: { id: "u1", login: "bob", grps: [] }, stepUpUntil: 0 };
	next( );
};

const file = join( tempDir( ), "file.txt" );
writeFileSync( file, "content of the file" );

const filter = ( name: string ) => ( ) => { steps.push( `filter ${name}` ); };

// routes of the tests
class TestEP extends EndPoints {
	constructor( ) {
		super( );
		this.get( "/json", this.on_json, { need: null } );
		this.get( "/empty", ( ) => { }, { need: null } );
		this.get( "/nocontent", ( ctx: Ctx ) => { ctx.status( 204 ); }, { need: null } );
		this.get( "/twice", ( ctx: Ctx ) => { ctx.ok( ); ctx.ok( ); }, { need: null } );
		this.get( "/bin", ( ctx: Ctx<Binary> ) => ctx.addHeader( "X-Test", "1" ).send( Buffer.from( [1, 2, 3] ), "application/octet-stream" ), { need: null } );
		this.get( "/download", ( ctx: Ctx<Binary> ) => ctx.download( file, "été.txt" ), { need: null } );
		this.get( "/missing", ( ctx: Ctx<Binary> ) => ctx.download( file + ".none", "x.txt" ), { need: null } );
		this.post( "/body", ( ctx: Ctx ) => ctx.json( { raw: ctx.rawBody, header: ctx.header( "x-test" ), session: ctx.session ?? null } ), { need: null } );
	}

	on_json( ctx: Ctx<{ a: number }> ) {
		ctx.status( 201 ).json( { a: 1 } );
	}
}

// routes behind the guard
class GuardedEP extends EndPoints {
	constructor( ) {
		super( );
		const handler = ( ctx: Ctx ) => { steps.push( "handler" ); ctx.json( { user: ctx.session.user.login } ); };
		this.get( "/granted", handler, { need: ["a/read", "b/read"], filter: [filter( "1" ), filter( "2" )] } );
		this.get( "/denied", handler, { need: "x/denied", filter: filter( "1" ) } );
		this.get( "/refused-by-filter", handler, { need: null, filter: ( ) => { throw new HttpError( 418 ); } } );
		this.get( "/filter-answers", handler, { need: null, filter: ( ctx: Ctx ) => ctx.ok( ) } );
		this.get( "/fn", handler, { need: ctx => ctx.queryValue( "ok", "boolean" ) } );
	}
}

// WebSocket endpoints: their need is checked when the ticket is asked
class TestChannel extends Channel {
	constructor( ) {
		super( );
		this.route( "/granted", ( ) => { }, { need: "a/read" } );
		this.route( "/denied", ( ) => { }, { need: "x/denied" } );
	}
}

const server = await startServer( [
	RouteGroup.unprotected( "/open" ).add( "/", new TestEP( ) ),
	RouteGroup.guarded( "/api", guard, access ).add( "/", new GuardedEP( ) ).add( "/ws", new TestChannel( ) ),
] );

describe( "declaration", ( ) => {
	it( "refuses a route without need", ( ) => {
		class NoNeed extends EndPoints {
			constructor( ) {
				super( );
				this.get( "/x", ( ) => { }, {} as any );
			}
		}
		assert.throws( ( ) => new NoNeed( ), /need expected/ );
	} );

	it( "refuses an empty list of rights", ( ) => {
		class Empty extends EndPoints {
			constructor( ) {
				super( );
				this.get( "/x", ( ) => { }, { need: [] } );
			}
		}
		assert.throws( ( ) => new Empty( ), /invalid need/ );
	} );

	it( "refuses a right in an unprotected group, even as a function", ( ) => {
		assert.throws( ( ) => RouteGroup.unprotected( "/bad" ).add( "/", new GuardedEP( ) ), /is unprotected/ );
	} );

	it( "refuses a WebSocket endpoint without need, or with a right in an unprotected group", ( ) => {
		class NoNeed extends Channel {
			constructor( ) {
				super( );
				this.route( "/x", ( ) => { }, {} as any );
			}
		}
		assert.throws( ( ) => new NoNeed( ), /need expected/ );
		assert.throws( ( ) => RouteGroup.unprotected( "/bad" ).add( "/", new TestChannel( ) ), /is unprotected/ );
	} );

	it( "refuses a guarded group without access", ( ) => {
		assert.throws( ( ) => RouteGroup.guarded( "/bad", guard, null ), /guard and access expected/ );
	} );
} );

describe( "way of a request", ( ) => {
	it( "need, then the filters in order, then the handler", async ( ) => {
		steps.length = 0;
		const r = await server.call( "GET", "/api/granted" );
		assert.equal( r.status, 200 );
		assert.deepEqual( r.body, { user: "bob" } );
		assert.deepEqual( steps, ["need a/read", "need b/read", "filter 1", "filter 2", "handler"] );
	} );

	it( "a refused need stops before the filters (403)", async ( ) => {
		steps.length = 0;
		const r = await server.call( "GET", "/api/denied" );
		assert.equal( r.status, 403 );
		assert.deepEqual( steps, ["need x/denied"] );
	} );

	it( "a filter refuses by throwing", async ( ) => {
		steps.length = 0;
		assert.equal( ( await server.call( "GET", "/api/refused-by-filter" ) ).status, 418 );
		assert.deepEqual( steps, [] );
	} );

	it( "a filter cannot answer: server error, the handler does not run", async ( ) => {
		steps.length = 0;
		assert.equal( ( await server.call( "GET", "/api/filter-answers" ) ).status, 500 );
		assert.deepEqual( steps, [] );
	} );

	it( "a WebSocket ticket is given only with the need of its endpoint", async ( ) => {
		const granted = await server.call( "POST", "/api/ws/granted" );
		assert.equal( granted.status, 200 );
		assert.ok( granted.body.ticket );
		assert.equal( ( await server.call( "POST", "/api/ws/denied" ) ).status, 403 );
	} );

	it( "a need function decides alone", async ( ) => {
		assert.equal( ( await server.call( "GET", "/api/fn?ok=1" ) ).status, 200 );
		assert.equal( ( await server.call( "GET", "/api/fn?ok=0" ) ).status, 403 );
	} );
} );

describe( "answers", ( ) => {
	it( "json with its status", async ( ) => {
		const r = await server.call( "GET", "/open/json" );
		assert.equal( r.status, 201 );
		assert.deepEqual( r.body, { a: 1 } );
	} );

	it( "nothing sent: 200 or the status set, empty body", async ( ) => {
		const empty = await server.call( "GET", "/open/empty" );
		assert.equal( empty.status, 200 );
		assert.equal( empty.text, "" );
		assert.equal( ( await server.call( "GET", "/open/nocontent" ) ).status, 204 );
	} );

	it( "the second answer throws, the first one is kept", async ( ) => {
		const r = await server.call( "GET", "/open/twice" );
		assert.equal( r.status, 200 );
		assert.deepEqual( r.body, {} );
	} );

	it( "send: data, type and headers", async ( ) => {
		const r = await server.call( "GET", "/open/bin" );
		assert.equal( r.status, 200 );
		assert.equal( r.headers.get( "content-type" ), "application/octet-stream" );
		assert.equal( r.headers.get( "x-test" ), "1" );
		assert.equal( r.text, "\x01\x02\x03" );
	} );

	it( "download: the file as an attachment, 404 when missing", async ( ) => {
		const r = await server.call( "GET", "/open/download" );
		assert.equal( r.status, 200 );
		assert.equal( r.text, "content of the file" );
		assert.match( r.headers.get( "content-disposition" ), /attachment/ );
		assert.equal( ( await server.call( "GET", "/open/missing" ) ).status, 404 );
	} );

	it( "reads the request: body, header, no session without guard", async ( ) => {
		const r = await server.call( "POST", "/open/body", { body: { z: 1 }, headers: { "x-test": "yo" } } );
		assert.deepEqual( r.body, { raw: { z: 1 }, header: "yo", session: null } );
	} );
} );

// never called: checked by the compiler (npm run typecheck)
export function types( ctx: Ctx<{ a: number }>, bin: Ctx<Binary>, any: Ctx ) {
	const state: "open" | "closed" = ctx.queryValue( "state", "enum", { values: ["open", "closed"] } );
	const ids: number[] = ctx.queryValue( "ids", "integer[]" );
	ctx.json( { a: 1 } );
	bin.send( "x", "text/plain" );
	void state; void ids;

	// @ts-expect-error enum without values
	ctx.queryValue( "state", "enum" );
	// @ts-expect-error not the type of the answer
	ctx.json( { b: 1 } );
	// @ts-expect-error only a Ctx<Binary> sends
	ctx.send( "x", "text/plain" );
	// @ts-expect-error nor an untyped Ctx
	any.send( "x", "text/plain" );
	// @ts-expect-error a Ctx<Binary> cannot json
	bin.json( {} );
}
