// Base class of all models: a model owns one table (or a few) and knows how to
// create it, migrate it and validate it.
//
// All migrations run in ONE transaction: either every model migrates and its new
// version is recorded, or nothing changes. The same code path serves the
// dry run (played on the real database, then rolled back), so the pre-flight
// verdict cannot diverge from the real boot.
//
// Works with postgres.js and with y4js/sqlite: the models only see the common
// surface (Db). The SQL written by the models is theirs; only the tools below
// depend on the database.
//
// Versions: y4js keeps the version of each model in the table y4_versions. onMigrate
// receives the stored one (0 the first time) and returns the new one. It is called
// at every start: the version says what was done by the code, but the base may have
// been changed by hand (dev): checking the real state (hasTable...) stays the rule.

import { isSqlite, TX_TIMEOUT_CODE } from "./sqlite";
import type { SqliteSql } from "./sqlite";
import { errorCode, isIntNumber, isUIntNumber } from "./tools";

// a table name without "schema." prefix is looked for where an unqualified "create
// table" puts it: the current schema of the connection in Postgres (first of the
// search_path, so null here), the main database file in SQLite (a prefix names an
// attached database)
const SQLITE_DEFAULT_SCHEMA = "main";

const DEFAULT_PRIORITY = 100;
const DRY_RUN_LOCK_TIMEOUT = "10s";


// SQLSTATE prefixes and postgres.js / Node codes that say something about the
// access to the database, not about the migration: a dry run gives "no verdict"
// for those, never "the migration fails"
// (25P04: transaction_timeout exceeded)
const INFRA_SQLSTATE_PREFIXES = ["08", "53", "57P", "55P03", "40P01", "25P04"];
const INFRA_CONNECTION_CODES = [
	"CONNECTION_CLOSED", "CONNECTION_ENDED", "CONNECTION_DESTROYED", "CONNECT_TIMEOUT",
	"ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "EPIPE", TX_TIMEOUT_CODE
];

// same idea for SQLite (primary result codes): busy, locked, nomem, readonly,
// ioerr, corrupt, full, cantopen, protocol
const INFRA_SQLITE_ERRCODES = [5, 6, 7, 8, 10, 11, 13, 14, 15];

export function isInfraError( e: unknown ): boolean {
	const code = errorCode( e );

	if( code === "ERR_SQLITE_ERROR" ) {
		return INFRA_SQLITE_ERRCODES.includes( Number( ( e as { errcode?: unknown } ).errcode ) & 0xff );
	}

	return INFRA_CONNECTION_CODES.includes( code ) || INFRA_SQLSTATE_PREFIXES.some( p => code.startsWith( p ) );
}

// what the models need from a connection: postgres.js (Sql, TransactionSql)
// and y4js/sqlite (SqliteSql, SqliteTx) both fit it
export interface Db {
	<T extends readonly object[] = Record<string, any>[]>( strings: TemplateStringsArray, ...values: any[] ): PromiseLike<T>;
}

// connection given to updateAll / checkAll: they open the migration transaction
export interface DbRoot extends Db {
	begin<R>( fn: ( db: Db ) => Promise<R> ): Promise<unknown>;
}

// a model failed to migrate: names it, the original error is the cause
export class MigrationError extends Error {
	constructor( readonly model: string, readonly priority: number, cause: unknown ) {
		super( `migration failed in model "${model}" (priority ${priority})`, { cause } );
		this.name = "MigrationError";
	}
}

export interface MigrateFailure {
	model: string;
	priority: number;
	error: unknown;
}

export interface MigrateOptions {
	// postgres interval ("10s"): bounds the wait for locks during the transaction.
	// ignored by SQLite, which waits according to the busyTimeout of the connection
	lockTimeout?: string;
	// maximum duration of the migration transaction, 0 = no limit, absent = no change:
	// - SQLite: replaces the maxTransactionMs of the connection (30s by default)
	// - Postgres: transaction_timeout (Postgres 17 or later, an older server refuses it)
	maxTransactionMs?: number;
}

// thrown to cancel the transaction of a dry run, never propagated
class Rollback extends Error {}

// -- database specific tools --------------------------------------------------

interface Dialect {
	defaultSchema: string;
	setLockTimeout( db: Db, timeout: string ): Promise<void>;
	setTransactionTimeout( db: Db, ms: number ): Promise<void>;
	tableExists( db: Db, schema: string, name: string ): Promise<boolean>;
	fieldExists( db: Db, schema: string, name: string, field: string ): Promise<boolean>;
	fieldType( db: Db, schema: string, name: string, field: string ): Promise<string>;
	indexExists( db: Db, schema: string, name: string, index: string ): Promise<boolean>;
}

const POSTGRES: Dialect = {
	defaultSchema: null,

	async setLockTimeout( db, timeout ) {
		await db`select set_config( 'lock_timeout', ${timeout}, true )`;
	},

	// exceeded: the server ends the session (SQLSTATE 25P04)
	async setTransactionTimeout( db, ms ) {
		await db`select set_config( 'transaction_timeout', ${String( ms )}, true )`;
	},

	async tableExists( db, schema, name ) {
		const [r] = await db`select exists (
			select 1 from information_schema.tables where table_name = ${name} and table_schema = coalesce( ${schema}::text, current_schema( ) )
		)`;

		return r.exists;
	},

	async fieldExists( db, schema, name, field ) {
		const [r] = await db`select exists (
			select 1 from information_schema.columns
			where table_name = ${name} and table_schema = coalesce( ${schema}::text, current_schema( ) ) and column_name = ${field}
		)`;

		return r.exists;
	},

	async fieldType( db, schema, name, field ) {
		const [r] = await db`select data_type from information_schema.columns
			where table_name = ${name} and table_schema = coalesce( ${schema}::text, current_schema( ) ) and column_name = ${field}`;

		return r ? r.data_type : null;
	},

	async indexExists( db, schema, name, index ) {
		const [r] = await db`select exists (
			select 1 from pg_indexes where schemaname = coalesce( ${schema}::text, current_schema( ) ) and tablename = ${name} and indexname = ${index}
		)`;

		return r.exists;
	}
};

// like information_schema.tables in Postgres, views count as tables;
// the field type is the declared one (as written in "create table")
const SQLITE: Dialect = {
	defaultSchema: SQLITE_DEFAULT_SCHEMA,

	async setLockTimeout( ) {
	},

	// applied when the transaction is opened (begin option)
	async setTransactionTimeout( ) {
	},

	async tableExists( db, schema, name ) {
		const [r] = await db`select count(*) as n from pragma_table_list where schema = ${schema} and name = ${name}`;
		return r.n > 0;
	},

	async fieldExists( db, schema, name, field ) {
		const [r] = await db`select count(*) as n from pragma_table_info( ${name}, ${schema} ) where name = ${field}`;
		return r.n > 0;
	},

	async fieldType( db, schema, name, field ) {
		const [r] = await db`select type from pragma_table_info( ${name}, ${schema} ) where name = ${field}`;
		return r ? r.type : null;
	},

	async indexExists( db, schema, name, index ) {
		const [r] = await db`select count(*) as n from pragma_index_list( ${name}, ${schema} ) where name = ${index}`;
		return r.n > 0;
	}
};

function dialectOf( db: Db ): Dialect {
	return isSqlite( db ) ? SQLITE : POSTGRES;
}

// version of each model. y4_versions is written in the SQL text (a table name cannot
// be a parameter). No schema prefix: it goes in the default one of the connection
// (search_path in Postgres, main in SQLite). Created if missing, inside the migration
// transaction (a dry run leaves nothing)
async function readVersions( db: Db ): Promise<Map<string, number>> {
	await db`create table if not exists y4_versions ( model text primary key, version integer not null )`;
	const rows = await db`select model, version from y4_versions`;
	return new Map( rows.map( r => [r.model as string, Number( r.version )] ) );
}

function splitName( name: string, defaultSchema: string ): [string, string] {
	const idx = name.indexOf( "." );
	return idx === -1 ? [defaultSchema, name] : [name.slice( 0, idx ), name.slice( idx + 1 )];
}

// -- model --------------------------------------------------------------------

// base class of the models: a model owns one table (or a few), migrates it at
// startup and validates it. every model is migrated in one transaction
export class Model {
	// unique name of the model (registry key, error messages): not necessarily a table name
	readonly modelName: string;

	// lower runs first (a table referenced by another must migrate before it);
	// equal priorities keep their registration order
	readonly priority: number;

	// models register themselves in a static registry when they are
	// created, because they are instantiated and exported at import time (same
	// style as the controllers). Model names are unique: a second one throws.
	private static readonly registry = new Map<string, Model>( );
	private static updated = false;

	constructor( modelName: string, priority = DEFAULT_PRIORITY ) {
		if( Model.registry.has( modelName ) ) {
			throw new Error( `model "${modelName}" is already registered` );
		}

		// its table would never be created or migrated
		if( Model.updated ) {
			throw new Error( `model "${modelName}" created after Model.updateAll: create it before` );
		}

		this.modelName = modelName;
		this.priority = priority;
		Model.registry.set( modelName, this );
	}

	// the registered model of that name, created by create( ) if there is none yet.
	// used by the y4js parts that need a model (Access, Sessions): the application may
	// still create it itself before, with its own priority
	static ensure( modelName: string, create: ( ) => Model ): Model {
		return Model.registry.get( modelName ) ?? create( );
	}

	// -- migration ------------------------------------------------------------

	// migrates every model, in one transaction (once per process)
	static async updateAll( sql: DbRoot, options: MigrateOptions = {} ): Promise<void> {
		if( Model.updated ) {
			throw new Error( "the database has already been updated by this process" );
		}

		Model.updated = true;
		await Model.run( sql, false, options );
	}

	// plays every migration on the real database, then cancels everything:
	// null if all pass, otherwise the failing model and its error.
	// infrastructure errors (connection, lock timeout...) are thrown, not reported as a failure
	static async checkAll( sql: DbRoot, options: MigrateOptions = {} ): Promise<MigrateFailure> {
		return Model.run( sql, true, { lockTimeout: DRY_RUN_LOCK_TIMEOUT, ...options } );
	}

	// validates every model, a failure makes the startup fail
	static async validateAll( sql: Db ): Promise<void> {
		const errors: string[] = [];

		for( const model of Model.ordered( ) ) {
			try {
				await model.onValidate( sql );
			}
			catch( e ) {
				errors.push( `${model.modelName}: ${e instanceof Error ? e.message : "error"}` );
			}
		}

		if( errors.length > 0 ) {
			throw new Error( `database validation failed:\n${errors.join( "\n" )}` );
		}
	}

	private static ordered( ): Model[] {
		// Array.prototype.sort is stable: equal priorities keep the insertion order of the Map
		return [...Model.registry.values( )].sort( ( a, b ) => a.priority - b.priority );
	}

	private static async run( sql: DbRoot, dryRun: boolean, options: MigrateOptions ): Promise<MigrateFailure> {
		const models = Model.ordered( );
		let failure: MigrateFailure = null;

		const maxMs = options.maxTransactionMs;
		if( maxMs !== undefined && !isUIntNumber( maxMs ) ) {
			throw new Error( "maxTransactionMs must be an integer >= 0" );
		}

		const migrate = async ( db: Db ) => {
			if( options.lockTimeout ) {
				await dialectOf( db ).setLockTimeout( db, options.lockTimeout );
			}

			if( maxMs ) {
				await dialectOf( db ).setTransactionTimeout( db, maxMs );
			}

			const versions = await readVersions( db );

			for( const model of models ) {
				try {
					const current = versions.get( model.modelName ) ?? 0;
					const next = await model.onMigrate( db, current );

					if( !isIntNumber( next ) || next < current ) {
						throw new Error( `onMigrate must return an integer >= the current version (${current})` );
					}

					if( next !== current ) {
						await db`insert into y4_versions ( model, version ) values ( ${model.modelName}, ${next} )
							on conflict ( model ) do update set version = excluded.version`;
					}
				}
				catch( e ) {
					if( isInfraError( e ) ) {
						throw e;
					}

					if( !dryRun ) {
						throw new MigrationError( model.modelName, model.priority, e );
					}

					failure = { model: model.modelName, priority: model.priority, error: e };
					break;
				}
			}

			if( dryRun ) {
				throw new Rollback( );
			}
		};

		try {
			// SQLite: the limit is given when the transaction is opened
			await ( isSqlite( sql )
				? ( sql as SqliteSql ).begin( migrate, { maxTransactionMs: maxMs } )
				: sql.begin( migrate ) );
		}
		catch( e ) {
			if( !( e instanceof Rollback ) ) {
				throw e;
			}
		}

		return failure;
	}

	// -- to override ----------------------------------------------------------

	// creates or migrates the table(s), receives the connection of the migration
	// transaction and the stored version (0 the first time), returns the new version
	async onMigrate( _db: Db, version: number ): Promise<number> {
		return version;
	}

	// called at startup to validate the database, throw to make the startup fail
	async onValidate( _db: Db ): Promise<void> {
	}

	// -- tools ----------------------------------------------------------------
	// they all take the connection to use: inside onMigrate it is the one of the
	// migration transaction, so they see what the previous models just created

	protected async hasTable( db: Db, table: string ): Promise<boolean> {
		const dialect = dialectOf( db );
		const [schema, name] = splitName( table, dialect.defaultSchema );
		return dialect.tableExists( db, schema, name );
	}

	protected async hasField( db: Db, table: string, field: string ): Promise<boolean> {
		const dialect = dialectOf( db );
		const [schema, name] = splitName( table, dialect.defaultSchema );
		return dialect.fieldExists( db, schema, name, field );
	}

	protected async fieldType( db: Db, table: string, field: string ): Promise<string> {
		const dialect = dialectOf( db );
		const [schema, name] = splitName( table, dialect.defaultSchema );
		return dialect.fieldType( db, schema, name, field );
	}

	protected async hasIndex( db: Db, table: string, index: string ): Promise<boolean> {
		const dialect = dialectOf( db );
		const [schema, name] = splitName( table, dialect.defaultSchema );
		return dialect.indexExists( db, schema, name, index );
	}
}
