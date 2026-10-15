// Models: the connection after updateAll, Model.transaction (commit, rollback,
// savepoint, parallel queries, a work that outlives its transaction), on SQLite.

import assert from "node:assert/strict";
import { join } from "node:path";
import { after, describe, it } from "node:test";
import { Model, sqlite } from "../src/index";
import type { Db, SqliteDb } from "../src/index";
import { tempDir } from "./helpers";

// one table of strings, filled by its migration too
class ValuesModel extends Model<SqliteDb> {
	constructor( ) {
		super( "values", 50 );
	}

	override async onMigrate( db: Db, version: number ): Promise<number> {
		await db`create table if not exists vals ( v text not null )`;
		// this.db is the migration transaction here
		await this.add( "migration" );
		return Math.max( version, 1 );
	}

	async add( v: string ) {
		await this.db`insert into vals ( v ) values ( ${v} )`;
	}

	async all( ): Promise<string[]> {
		return ( await this.db`select v from vals order by rowid` ).map( r => r.v as string );
	}
}

const values = new ValuesModel( );

// the steps depend on each other: one suite, run in order
describe( "transaction", ( ) => {
	const sql = sqlite( join( tempDir( ), "test.db" ) );
	after( ( ) => sql.end( ) );

	it( "this.db before Model.updateAll is a programming error", async ( ) => {
		await assert.rejects( values.all( ), /before Model.updateAll/ );
		await assert.rejects( Model.transaction( async ( ) => { } ), /before Model.updateAll/ );
	} );

	it( "the migration runs in its transaction, through this.db", async ( ) => {
		await Model.updateAll( sql );
		assert.deepEqual( await values.all( ), ["migration"] );
	} );

	it( "commits when the function resolves", async ( ) => {
		await Model.transaction( async ( ) => {
			await values.add( "a" );
			await values.add( "b" );
		} );
		assert.deepEqual( ( await values.all( ) ).slice( -2 ), ["a", "b"] );
	} );

	it( "rolls back everything when it throws", async ( ) => {
		const before = await values.all( );
		await assert.rejects( Model.transaction( async ( ) => {
			await values.add( "lost" );
			throw new Error( "boom" );
		} ), /boom/ );
		assert.deepEqual( await values.all( ), before );
	} );

	it( "inside another one: a savepoint, its failure can be caught", async ( ) => {
		const before = await values.all( );
		await Model.transaction( async ( ) => {
			await values.add( "outer" );
			await Model.transaction( async ( ) => {
				await values.add( "inner" );
				throw new Error( "inner" );
			} ).catch( ( ) => { } );
			await Promise.all( [values.add( "p1" ), values.add( "p2" )] );
		} );
		assert.deepEqual( await values.all( ), [...before, "outer", "p1", "p2"] );
	} );

	it( "the failure of the outer one drops the inner one too", async ( ) => {
		const before = await values.all( );
		await assert.rejects( Model.transaction( async ( ) => {
			await Model.transaction( async ( ) => values.add( "inner" ) );
			throw new Error( "outer" );
		} ) );
		assert.deepEqual( await values.all( ), before );
	} );

	it( "a work that outlives its transaction is refused clearly", async ( ) => {
		let late: Promise<void>;
		await Model.transaction( async ( ) => {
			late = new Promise( r => setTimeout( r, 10 ) ).then( ( ) => values.add( "late" ) );
		} );
		await assert.rejects( late, /transaction already ended/ );
	} );
} );

describe( "registry", ( ) => {
	it( "refuses a model created after updateAll", ( ) => {
		assert.throws( ( ) => new ( class extends Model {
			constructor( ) { super( "late" ); }
		} )( ), /after Model.updateAll/ );
	} );

	it( "ensure refuses a registered model of another class", ( ) => {
		class Other extends Model {
			constructor( ) { super( "values" ); }
		}
		assert.throws( ( ) => Model.ensure( "values", Other ), /must be a Other/ );
		assert.equal( Model.ensure( "values", ValuesModel ), values );
	} );
} );
