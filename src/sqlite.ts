/**
 *     _____ __
 *    |__   /  / _
 *      /  /  /_| |_
 *     /  /\____   _|
 *    /_____|   |_|
 *
 * @file sqlite.ts
 * @author Etienne Cochard
 *
 * @copyright (c) 2026 R-libre ingenierie
 *
 * Use of this source code is governed by an MIT-style license
 * that can be found in the LICENSE file or at https://opensource.org/licenses/MIT.
 **/

// SQLite access in the tagged template style of postgres.js, built on
// node:sqlite (no dependency). Meant for small projects and desktop mode,
// Postgres stays the choice for sites.
//
// Values are always bound as parameters, never written into the SQL text.
// node:sqlite is synchronous: a query runs as soon as it is awaited and returns
// an already settled promise, so the calling code is the same as with postgres.js.
//
// One connection only: while a transaction is open, the queries made outside of
// it wait in a FIFO queue and run once it ends, so they never land inside it.
//
// Conversions:
// - written: boolean -> 0/1, Date -> ISO text, plain object or array -> JSON text,
//   integers beyond Number.MAX_SAFE_INTEGER are refused (as numbers or bigints)
// - read: columns declared boolean, date / datetime / timestamp* or json are
//   converted back; integers beyond Number.MAX_SAFE_INTEGER are refused by node:sqlite

// node:sqlite is loaded by the first sqlite( ) call only: a Postgres project never loads it
import type { DatabaseSync, SQLInputValue, SQLOutputValue, StatementSync } from "node:sqlite";
import { AsyncLocalStorage } from "node:async_hooks";
import { dropOldest, isDate, isIntNumber, isNumber, isPlainObject, isUIntNumber } from "./tools";

const DEFAULT_CACHE_SIZE = 100;
const FINISHED = "sqlite: the transaction is finished";
const DEFAULT_MAX_TRANSACTION_MS = 30_000;

// code of the error rejecting a transaction rolled back by maxTransactionMs
export const TX_TIMEOUT_CODE = "SQLITE_TX_TIMEOUT";

// marks the handles made here, so that shared code (models) can tell SQLite from Postgres
const SQLITE_HANDLE = Symbol( "z4js.sqlite" );

export function isSqlite( db: unknown ): db is SqliteSql | SqliteTx {
	return typeof db === "function" && SQLITE_HANDLE in db;
}

const MAX_SAFE_BIGINT = BigInt( Number.MAX_SAFE_INTEGER );
const MIN_SAFE_BIGINT = BigInt( Number.MIN_SAFE_INTEGER );

export type Row = Record<string, unknown>;

export interface ResultMeta {
	// rows returned, or rows changed for a statement that returns nothing
	count: number;
	// set by statements that return nothing (insert without returning...)
	lastInsertRowid: number | bigint;
}

export type Result<T extends readonly object[] = Row[]> = T & ResultMeta;

export interface SqliteOptions {
	readOnly?: boolean;
	// ms to wait when another process holds a lock on the file (node:sqlite default: 0)
	busyTimeout?: number;
	// prepared statements kept (least recently used are dropped), 0 disables the cache
	cacheSize?: number;
	// ms, a transaction still open after that is rolled back; 0 = no limit
	maxTransactionMs?: number;
}

export interface BeginOptions {
	maxTransactionMs?: number;
}

interface SqlFunction {
	<T extends readonly object[] = Row[]>( strings: TemplateStringsArray, ...values: unknown[] ): Query<T>;
	// identifier: sql( "name" ), or list / insert / update helper: sql( value, ...columns )
	( value: unknown, ...columns: string[] ): Helper;
}

export interface SqliteSql extends SqlFunction {
	// options.maxTransactionMs replaces the one of the connection for this transaction only
	begin<R>( fn: ( tx: SqliteTx ) => R | Promise<R>, options?: BeginOptions ): Promise<R>;
	// closes the database once the pending queries and transactions are done
	end( ): Promise<void>;
}

export interface SqliteTx extends SqlFunction {
	savepoint<R>( fn: ( tx: SqliteTx ) => R | Promise<R> ): Promise<R>;
}

export function sqlite( path: string, options: SqliteOptions = {} ): SqliteSql {
	return makeSql( new Engine( path, options ), null ) as SqliteSql;
}

// -- query building -----------------------------------------------------------

// lazy, like postgres.js: runs when awaited, or is inlined when used inside another query
export class Query<T extends readonly object[] = Row[]> implements PromiseLike<Result<T>> {
	private promise: Promise<Result<T>> = null;

	constructor( private readonly engine: Engine, private readonly txn: Txn,
		readonly strings: TemplateStringsArray, readonly values: readonly unknown[] ) {
	}

	then<A = Result<T>, B = never>( onfulfilled?: ( ( value: Result<T> ) => A | PromiseLike<A> ),
		onrejected?: ( ( reason: unknown ) => B | PromiseLike<B> ) ): Promise<A | B> {
		return this.execute( ).then( onfulfilled, onrejected );
	}

	catch<B = never>( onrejected?: ( ( reason: unknown ) => B | PromiseLike<B> ) ): Promise<Result<T> | B> {
		return this.execute( ).catch( onrejected );
	}

	finally( onfinally?: ( ( ) => void ) ): Promise<Result<T>> {
		return this.execute( ).finally( onfinally );
	}

	private execute( ): Promise<Result<T>> {
		return this.promise ??= this.engine.run( this.txn, this.strings, this.values ) as unknown as Promise<Result<T>>;
	}
}

// result of sql( value, ...columns ): rendered according to the keyword before it
export class Helper {
	constructor( readonly value: unknown, readonly columns: readonly unknown[] ) {
	}
}

interface Compiled {
	text: string;
	params: SQLInputValue[];
}

const HELPER_KEYWORDS = /\b(insert|update|set|values|in|select|returning)\b/gi;

function compile( strings: TemplateStringsArray, values: readonly unknown[] ): Compiled {
	const out: Compiled = { text: "", params: [] };
	append( out, strings, values );
	return out;
}

function append( out: Compiled, strings: TemplateStringsArray, values: readonly unknown[] ): void {
	out.text += strings[0];

	for( let i = 0; i < values.length; i++ ) {
		const v = values[i];

		if( v instanceof Query ) {
			append( out, v.strings, v.values );
		}
		else if( v instanceof Helper ) {
			renderHelper( out, v );
		}
		else {
			out.text += bind( out, v );
		}

		out.text += strings[i + 1];
	}
}

function bind( out: Compiled, v: unknown ): string {
	out.params.push( toSqlite( v, out.params.length + 1 ) );
	return "?";
}

// the error never contains the value, only its position and kind
function toSqlite( v: unknown, pos: number ): SQLInputValue {
	switch( typeof v ) {
		case "string":
			return v;

		case "number":
			if( isNumber( v ) && ( !Number.isInteger( v ) || isIntNumber( v ) ) ) {
				return v;
			}
			break;

		case "bigint":
			if( v >= MIN_SAFE_BIGINT && v <= MAX_SAFE_BIGINT ) {
				return v;
			}
			break;

		case "boolean":
			return v ? 1 : 0;

		case "object":
			if( !v ) {
				return null;
			}

			if( v instanceof Uint8Array ) {
				return v;
			}

			if( isDate( v ) ) {
				return v.toISOString( );
			}

			if( v instanceof Date ) {
				break;
			}

			if( Array.isArray( v ) || isPlainObject( v ) ) {
				return JSON.stringify( v );
			}
			break;
	}

	throw new TypeError( `sqlite: parameter ${pos}: unsupported value (${describe( v )})` );
}

function describe( v: unknown ): string {
	if( typeof v === "number" || typeof v === "bigint" ) {
		return `${typeof v} out of range`;
	}

	if( v instanceof Date ) {
		return "invalid date";
	}

	return typeof v === "object" ? ( v?.constructor?.name ?? "object" ) : typeof v;
}

function ident( name: unknown ): string {
	if( typeof name !== "string" ) {
		throw new TypeError( "sqlite: identifier must be a string" );
	}

	const parts = name.split( "." );
	if( parts.some( p => p.length === 0 || p.includes( "\0" ) ) ) {
		throw new Error( "sqlite: invalid identifier" );
	}

	return parts.map( p => `"${p.replace( /"/g, '""' )}"` ).join( "." );
}

function lastKeyword( text: string ): string {
	let kw: string = null;
	for( const m of text.matchAll( HELPER_KEYWORDS ) ) {
		kw = m[1].toLowerCase( );
	}

	return kw;
}

// explicit columns win (they act as a whitelist), otherwise the keys of the object
function columnsOf( row: Record<string, unknown>, columns: readonly unknown[] ): readonly unknown[] {
	return columns.length > 0 ? columns : Object.keys( row );
}

function renderHelper( out: Compiled, h: Helper ): void {
	const { value, columns } = h;

	if( typeof value === "string" ) {
		out.text += ident( value );
		return;
	}

	const kw = lastKeyword( out.text );

	switch( kw ) {
		// in ${sql( [1, 2] )} -> (?, ?)   values ${sql( [[1, 2], [3, 4]] )} -> (?, ?), (?, ?)
		case "in":
		case "values": {
			if( !Array.isArray( value ) || ( kw === "values" && value.length === 0 ) ) {
				break;
			}

			const nested = value.length > 0 && Array.isArray( value[0] );
			if( value.some( r => Array.isArray( r ) !== nested ) ) {
				break;
			}

			const rows: unknown[][] = nested ? value : [value];
			out.text += rows.map( r => `(${r.map( v => bind( out, v ) ).join( ", " )})` ).join( ", " );
			return;
		}

		// select ${sql( ["a", "b"] )} -> "a", "b"
		case "select":
		case "returning": {
			const cols = Array.isArray( value ) ? value : isPlainObject( value ) ? columnsOf( value, columns ) : [];
			if( cols.length === 0 ) {
				break;
			}

			out.text += cols.map( ident ).join( ", " );
			return;
		}

		// insert into t ${sql( obj or [obj, ...], ...columns )} -> ("a", "b") values (?, ?), ...
		case "insert": {
			const rows = Array.isArray( value ) ? value : [value];
			if( rows.length === 0 || !rows.every( isPlainObject ) ) {
				break;
			}

			const cols = columnsOf( rows[0], columns );
			if( cols.length === 0 ) {
				break;
			}

			// a missing column binds undefined, which is refused
			out.text += `(${cols.map( ident ).join( ", " )}) values `
				+ rows.map( r => `(${cols.map( c => bind( out, r[c as string] ) ).join( ", " )})` ).join( ", " );
			return;
		}

		// update t set ${sql( obj, ...columns )} -> "a" = ?, "b" = ?
		case "update":
		case "set": {
			if( !isPlainObject( value ) ) {
				break;
			}

			const cols = columnsOf( value, columns );
			if( cols.length === 0 ) {
				break;
			}

			out.text += cols.map( c => `${ident( c )} = ${bind( out, value[c as string] )}` ).join( ", " );
			return;
		}
	}

	throw new Error( `sqlite: sql() helper not supported here (${kw ?? "no keyword"})` );
}

// -- reading ------------------------------------------------------------------

type Converter = ( v: SQLOutputValue ) => unknown;

function converterFor( declared: string ): Converter {
	const t = declared?.toLowerCase( ) ?? "";

	if( t.startsWith( "bool" ) ) {
		return v => v === null ? null : v !== 0 && v !== 0n;
	}

	if( t === "date" || t === "datetime" || t.startsWith( "timestamp" ) ) {
		return v => typeof v === "string" || typeof v === "number" ? new Date( v ) : v;
	}

	if( t === "json" ) {
		return v => typeof v === "string" ? JSON.parse( v ) : v;
	}

	return null;
}

interface Prepared {
	stmt: StatementSync;
	// returns rows (select, returning...), otherwise run() gives the changes
	reader: boolean;
	converters: [string, Converter][];
}

// -- engine -------------------------------------------------------------------

// one per transaction or savepoint; done once it is committed, rolled back or timed out
interface Txn {
	done: boolean;
	parent: Txn;
}

function isActive( t: Txn ): boolean {
	for( let x: Txn = t; x; x = x.parent ) {
		if( x.done ) {
			return false;
		}
	}

	return true;
}

// the SQLite connection behind the sql functions: runs the queries, caches the
// prepared statements and queues the queries made during a transaction
class Engine {
	private readonly db: DatabaseSync;
	private readonly cache = new Map<string, Prepared>( );
	private readonly cacheSize: number;
	private readonly maxTransactionMs: number;

	// transaction running now, the queries made outside of it wait in the queue
	private current: Txn = null;
	private readonly queue: ( ( ) => void )[] = [];

	// the transaction whose callback is running: detects the use of the root
	// handle inside it, which would otherwise wait for itself forever
	private readonly context = new AsyncLocalStorage<Txn>( );

	private savepoints = 0;
	private ended: Promise<void> = null;

	constructor( path: string, options: SqliteOptions ) {
		this.cacheSize = options.cacheSize ?? DEFAULT_CACHE_SIZE;
		this.maxTransactionMs = options.maxTransactionMs ?? DEFAULT_MAX_TRANSACTION_MS;

		if( !isUIntNumber( this.cacheSize ) ) {
			throw new Error( "sqlite: cacheSize must be a positive integer or 0" );
		}

		checkMaxTransactionMs( this.maxTransactionMs );

		const { DatabaseSync } = process.getBuiltinModule( "node:sqlite" );
		this.db = new DatabaseSync( path, { readOnly: options.readOnly ?? false, timeout: options.busyTimeout ?? 0 } );
	}

	run( txn: Txn, strings: TemplateStringsArray, values: readonly unknown[] ): Promise<Result> {
		try {
			const { text, params } = compile( strings, values );

			if( txn ) {
				if( !isActive( txn ) ) {
					throw new Error( FINISHED );
				}

				return Promise.resolve( this.exec( text, params ) );
			}

			this.checkRoot( );

			if( this.current ) {
				return new Promise( ( resolve, reject ) => {
					this.queue.push( ( ) => {
						try {
							resolve( this.exec( text, params ) );
						}
						catch( e ) {
							reject( e );
						}
					} );
				} );
			}

			return Promise.resolve( this.exec( text, params ) );
		}
		catch( e ) {
			return Promise.reject( e );
		}
	}

	begin<R>( fn: ( tx: SqliteTx ) => R | Promise<R>, options: BeginOptions = {} ): Promise<R> {
		const maxMs = options.maxTransactionMs ?? this.maxTransactionMs;

		try {
			this.checkRoot( );
			checkMaxTransactionMs( maxMs );
		}
		catch( e ) {
			return Promise.reject( e );
		}

		return new Promise<R>( ( resolve, reject ) => {
			const start = ( ) => this.transaction( fn, maxMs ).then( resolve, reject );

			if( this.current ) {
				this.queue.push( start );
			}
			else {
				start( );
			}
		} );
	}

	savepoint<R>( parent: Txn, fn: ( tx: SqliteTx ) => R | Promise<R> ): Promise<R> {
		if( !isActive( parent ) ) {
			return Promise.reject( new Error( FINISHED ) );
		}

		const name = `__savepoint${++this.savepoints}`;
		const txn: Txn = { done: false, parent };

		try {
			this.db.exec( `savepoint ${name}` );
		}
		catch( e ) {
			return Promise.reject( e );
		}

		return this.context.run( txn, async ( ) => fn( makeSql( this, txn ) as SqliteTx ) ).then(
			v => {
				txn.done = true;
				if( !isActive( parent ) ) {
					throw new Error( FINISHED );
				}

				this.db.exec( `release ${name}` );
				return v;
			},
			e => {
				txn.done = true;
				if( isActive( parent ) ) {
					this.db.exec( `rollback to ${name}` );
					this.db.exec( `release ${name}` );
				}

				throw e;
			}
		);
	}

	end( ): Promise<void> {
		this.ended ??= new Promise<void>( resolve => {
			const close = ( ) => {
				this.db.close( );
				resolve( );
			};

			if( this.current ) {
				this.queue.push( close );
			}
			else {
				close( );
			}
		} );

		return this.ended;
	}

	// root handle: refused once ended, or from inside a running transaction
	private checkRoot( ): void {
		if( this.ended ) {
			throw new Error( "sqlite: the database is closed" );
		}

		const inside = this.context.getStore( );
		if( inside && isActive( inside ) ) {
			throw new Error( "sqlite: inside a transaction, use its handle (tx) instead of sql" );
		}
	}

	// must be called with no transaction running: it becomes the current one synchronously
	private transaction<R>( fn: ( tx: SqliteTx ) => R | Promise<R>, maxMs: number ): Promise<R> {
		try {
			this.db.exec( "begin immediate" );
		}
		catch( e ) {
			return Promise.reject( e );
		}

		const txn: Txn = { done: false, parent: null };
		this.current = txn;

		return new Promise<R>( ( resolve, reject ) => {
			// ends the transaction (once), returns the commit error if any
			const close = ( commit: boolean ): unknown => {
				txn.done = true;
				if( timer ) {
					clearTimeout( timer );
				}

				let error: unknown = null;
				if( commit ) {
					try {
						this.db.exec( "commit" );
					}
					catch( e ) {
						error = e;
					}
				}

				// rollback asked, or a failed commit that left the transaction open
				if( this.db.isTransaction ) {
					this.db.exec( "rollback" );
				}

				this.current = null;
				this.drain( );
				return error;
			};

			const fail = ( e: unknown ) => {
				if( !txn.done ) {
					close( false );
					reject( e );
				}
			};

			const succeed = ( value: R ) => {
				if( !txn.done ) {
					const error = close( true );
					if( !error ) {
						resolve( value );
					}
					else {
						reject( error );
					}
				}
			};

			const timer = maxMs > 0
				? setTimeout( ( ) => fail( Object.assign( new Error( "sqlite: transaction too long, rolled back" ), { code: TX_TIMEOUT_CODE } ) ), maxMs )
				: null;

			timer?.unref( );

			this.context.run( txn, async ( ) => fn( makeSql( this, txn ) as SqliteTx ) ).then( succeed, fail );
		} );
	}

	// runs the waiting work in order, until a queued transaction takes the connection
	private drain( ): void {
		while( !this.current && this.queue.length > 0 ) {
			this.queue.shift( )( );
		}
	}

	private exec( text: string, params: SQLInputValue[] ): Result {
		const p = this.prepare( text );

		if( p.reader ) {
			const rows = p.stmt.all( ...params ) as Row[];

			if( p.converters.length > 0 ) {
				for( const row of rows ) {
					for( const [name, convert] of p.converters ) {
						row[name] = convert( row[name] as SQLOutputValue );
					}
				}
			}

			return Object.assign( rows, { count: rows.length, lastInsertRowid: null } );
		}

		const r = p.stmt.run( ...params );
		return Object.assign( [] as Row[], { count: Number( r.changes ), lastInsertRowid: r.lastInsertRowid } );
	}

	private prepare( text: string ): Prepared {
		const cached = this.cache.get( text );
		if( cached ) {
			// most recently used goes to the end
			this.cache.delete( text );
			this.cache.set( text, cached );
			return cached;
		}

		const stmt = this.db.prepare( text );
		const columns = stmt.columns( );
		const converters: [string, Converter][] = [];

		for( const c of columns ) {
			const convert = converterFor( c.type );
			if( convert ) {
				converters.push( [c.name, convert] );
			}
		}

		const p: Prepared = { stmt, reader: columns.length > 0, converters };

		if( this.cacheSize > 0 ) {
			dropOldest( this.cache, this.cacheSize );
			this.cache.set( text, p );
		}

		return p;
	}
}

function checkMaxTransactionMs( ms: number ): void {
	if( !isUIntNumber( ms ) ) {
		throw new Error( "sqlite: maxTransactionMs must be an integer >= 0" );
	}
}

function isTemplate( v: unknown ): v is TemplateStringsArray {
	return Array.isArray( v ) && Object.hasOwn( v, "raw" );
}

function makeSql( engine: Engine, txn: Txn ): SqliteSql | SqliteTx {
	const sql = ( first: unknown, ...rest: unknown[] ) => isTemplate( first )
		? new Query( engine, txn, first, rest )
		: new Helper( first, rest );

	Object.defineProperty( sql, SQLITE_HANDLE, { value: true } );

	if( txn ) {
		return Object.assign( sql, {
			savepoint: <R>( fn: ( tx: SqliteTx ) => R | Promise<R> ) => engine.savepoint( txn, fn )
		} ) as unknown as SqliteTx;
	}

	return Object.assign( sql, {
		begin: <R>( fn: ( tx: SqliteTx ) => R | Promise<R>, options?: BeginOptions ) => engine.begin( fn, options ),
		end: ( ) => engine.end( )
	} ) as unknown as SqliteSql;
}
