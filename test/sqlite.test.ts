// The SQLite wrapper: the exclusive connection (single instance).

import assert from "node:assert/strict";
import { join } from "node:path";
import { describe, it } from "node:test";
import { sqlite } from "../src/index";
import { tempDir } from "./helpers";

describe( "exclusive", ( ) => {
	it( "a second connection to the file is refused, the first one works", async ( ) => {
		const file = join( tempDir( ), "excl.db" );
		const first = sqlite( file, { exclusive: true } );
		await first`create table t ( v text )`;
		await first`insert into t ( v ) values ( ${"a"} )`;

		// a second instance fails to open; any other connection fails at its first query
		assert.throws( ( ) => sqlite( file, { exclusive: true } ), /used by another instance/ );
		const other = sqlite( file );
		await assert.rejects( Promise.resolve( other`select v from t` ), /locked/ );
		await other.end( );

		assert.deepEqual( ( await first`select v from t` ).map( r => r.v ), ["a"] );
		await first.end( );

		// released at the end: open again
		const again = sqlite( file, { exclusive: true } );
		await again.end( );
	} );

	it( "without exclusive, two connections share the file", async ( ) => {
		const file = join( tempDir( ), "shared.db" );
		const a = sqlite( file );
		const b = sqlite( file );
		await a`create table t ( v text )`;
		await a`insert into t ( v ) values ( ${"x"} )`;
		assert.equal( ( await b`select count(*) as n from t` )[0].n, 1 );
		await a.end( );
		await b.end( );
	} );

	it( "refuses exclusive with readOnly", ( ) => {
		assert.throws( ( ) => sqlite( join( tempDir( ), "ro.db" ), { exclusive: true, readOnly: true } ), /exclude each other/ );
	} );
} );
