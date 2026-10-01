// Configuration: one JSON file given by --config=<file> (or --config <file>).
//
// The class is the schema: each readonly field is read by a helper (string, int,
// folder...), so the structure of the file is visible in the code. The application
// extends Config with its own sections. Loading is explicit (Config.load, called by
// the main): nothing happens at import time.
//
// - errors are accumulated: one ConfigError lists every problem at once
// - a key of the file that no field reads is an error: a typo never falls back
//   silently on a default value
// - relative paths are resolved from the folder of the config file (see below)
// - secrets are not written in the file: it gives the path of a file holding the secret
// - the loaded configuration is frozen, never reloaded
// - comments (// and /* */) and trailing commas are accepted in the JSON
//
// The folder of the config file is the base folder of the deployment
//
// Every relative path of the file (folders, files, secrets, certificates, logs) is
// resolved from the folder that contains the config file, never from the current
// directory of the process. Giving the file therefore also gives the working folder,
// without chdir: the current directory of the process (and of its workers) is left
// untouched, and the result does not depend on where the process is started from.
//
//   node main.js --config=/srv/shop/env/prod.json
//
//   /srv/shop/env/prod.json         { "tls": { "cert": "certs/site.pem", "key": "secrets/site.key" },
//                                     "log": { "file": "../logs/app-${date}.log" } }
//   -> tls.cert  = /srv/shop/env/certs/site.pem
//   -> tls.key   = content of /srv/shop/env/secrets/site.key
//   -> log.file  = /srv/shop/logs/app-${date}.log
//
// Several configurations can share one folder (dev.json, prod.json, test.json) and
// the files it holds (secrets, certificates): only the file given on the command
// line changes. An absolute path in the file is used as is.

import { mkdirSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { LOG_LEVELS } from "./logger";
import { deepFreeze, isIntNumber, isNumber, isPlainObject, isString } from "./tools";

// every problem found while loading the configuration, listed at once
export class ConfigError extends Error {
	constructor( readonly errors: readonly string[] ) {
		super( `invalid configuration:\n${errors.join( "\n" )}` );
		this.name = "ConfigError";
	}
}

// def: value used when the key is absent. def: null makes the key optional
export interface ConfigOptions<T> {
	def?: T;
}

export interface NumberOptions extends ConfigOptions<number> {
	min?: number;
	max?: number;
}

export interface FolderOptions extends ConfigOptions<string> {
	create?: boolean;		// create the folder if missing
}

export interface FileOptions extends ConfigOptions<string> {
	mustExist?: boolean;	// default true
}

interface Loading {
	raw: Record<string, unknown>;
	baseDir: string;
	errors: string[];
	used: Set<string>;
}

// field initializers run before any constructor body, so the helpers cannot receive
// the file through the constructor: Config.load sets this for the time of the
// (synchronous) construction only, and always clears it
let loading: Loading = null;

// the configuration of a y4js application: its readonly fields are the schema of
// the file. the application extends it with its own sections (see the header)
export class Config {
	readonly mode = this.oneOf( "mode", ["production", "debug"] as const, { def: "production" } );
	readonly debug = this.mode === "debug";

	readonly server = {
		host: this.string( "server.host", { def: "127.0.0.1" } ),
		port: this.int( "server.port", { def: 4400, min: 1, max: 65535 } ),
		// X-Forwarded-* headers are trusted only when the server is behind a known proxy
		trustProxy: this.bool( "server.trustProxy", { def: false } ),
		// largest JSON body accepted, in bytes (413 above)
		bodyLimit: this.int( "server.bodyLimit", { def: 100 * 1024, min: 1 } ),
		// time to receive the headers / the whole request, idle time of a kept alive connection
		headersTimeoutMs: this.int( "server.headersTimeoutMs", { def: 10_000, min: 1 } ),
		requestTimeoutMs: this.int( "server.requestTimeoutMs", { def: 30_000, min: 1 } ),
		keepAliveTimeoutMs: this.int( "server.keepAliveTimeoutMs", { def: 5_000, min: 1 } ),
		// a request that takes longer (until its answer is sent) is logged as a warning
		slowRequestMs: this.int( "server.slowRequestMs", { def: 75, min: 1 } ),
		// on SIGTERM / SIGINT, time left to the running requests before they are cut
		shutdownMs: this.int( "server.shutdownMs", { def: 10_000, min: 0 } ),
		// origins of the frontends allowed to call the API from a browser (CORS), none by default
		cors: this.strings( "server.cors", { def: [] } ),
	};

	readonly session = {
		// life of the access token, sent with every request
		accessMinutes: this.int( "session.accessMinutes", { def: 15, min: 1 } ),
		// life of the refresh token: without a refresh within that time, the session ends
		refreshMinutes: this.int( "session.refreshMinutes", { def: 60, min: 1 } ),
		// open sessions of one user: above that, the oldest one ends
		maxPerUser: this.int( "session.maxPerUser", { def: 10, min: 1 } ),
		// a confirmed identity (step-up) is valid that long for the sensitive routes
		stepUpMinutes: this.int( "session.stepUpMinutes", { def: 5, min: 1 } ),
	};

	// per IP unless said otherwise. above a limit: 429 with Retry-After
	readonly rateLimit = {
		loginPerMinute: this.int( "rateLimit.loginPerMinute", { def: 10, min: 1 } ),
		// failed logins of one login name (attack spread over many IPs): above, that
		// login is refused until the end of the window
		loginFailures: this.int( "rateLimit.loginFailures", { def: 10, min: 1 } ),
		loginFailureMinutes: this.int( "rateLimit.loginFailureMinutes", { def: 15, min: 1 } ),
		refreshPerMinute: this.int( "rateLimit.refreshPerMinute", { def: 30, min: 1 } ),
		// every route of the groups, 0 = no limit
		apiPerMinute: this.int( "rateLimit.apiPerMinute", { def: 300, min: 0 } ),
	};

	// required as soon as the server listens on something else than the loopback
	readonly tls = {
		cert: this.file( "tls.cert", { def: null } ),
		key: this.secret( "tls.key", { def: null } ),
	};

	readonly log = {
		level: this.oneOf( "log.level", LOG_LEVELS, { def: "info" } ),
		// null = standard output, ${date} accepted in the file name
		file: this.file( "log.file", { def: null, mustExist: false } ),
	};

	readonly securityLog = {
		file: this.file( "securityLog.file", { def: null, mustExist: false } ),
	};

	// reads, checks and freezes the configuration. throws a ConfigError listing every problem
	static load<T extends Config>( cls: new ( ) => T, file = Config.argvFile( ) ): T {
		if( loading ) {
			throw new Error( "config: a load is already in progress" );
		}

		if( !file ) {
			throw new ConfigError( ["missing --config=<file> argument"] );
		}

		const path = resolve( file );
		let raw: unknown;

		try {
			raw = JSON.parse( stripJson( readFileSync( path, "utf-8" ) ) );
		}
		catch( e ) {
			throw new ConfigError( [`${path}: ${e instanceof Error ? e.message : "cannot be read"}`] );
		}

		if( !isPlainObject( raw ) ) {
			throw new ConfigError( [`${path}: a JSON object is expected`] );
		}

		const errors: string[] = [];
		let config: T;

		loading = { raw, baseDir: dirname( path ), errors, used: new Set( ) };

		try {
			config = new cls( );
			errors.push( ...config.onCheck( ) );
			checkKeys( raw, "", loading.used, errors );
		}
		finally {
			loading = null;
		}

		if( errors.length > 0 ) {
			throw new ConfigError( errors );
		}

		return deepFreeze( config );
	}

	// rules between several keys, called once every field is read.
	// an override adds its own errors to the ones of super.onCheck( )
	protected onCheck( ): string[] {
		const errors: string[] = [];

		if( !isLoopback( this.server.host ) && ( !this.tls.cert || !this.tls.key ) ) {
			errors.push( "tls.cert and tls.key are required when server.host is not a loopback address" );
		}

		// Node refuses a headers timeout longer than the request timeout
		if( this.server.headersTimeoutMs > this.server.requestTimeoutMs ) {
			errors.push( "server.headersTimeoutMs must not exceed server.requestTimeoutMs" );
		}

		if( this.session.refreshMinutes <= this.session.accessMinutes ) {
			errors.push( "session.refreshMinutes must exceed session.accessMinutes" );
		}

		for( const origin of this.server.cors ) {
			if( !isOrigin( origin ) ) {
				errors.push( `server.cors: "${origin}" is not an origin (scheme://host[:port])` );
			}
		}

		return errors;
	}

	// -- helpers ----------------------------------------------------------------
	// each one returns the default (or null) on error: the load throws anyway

	protected string( key: string, opts?: ConfigOptions<string> ): string {
		const v = read( key );
		if( v === undefined ) {
			return missing( key, opts );
		}

		if( !isString( v ) ) {
			return invalid( key, "string expected", opts );
		}

		const text = v.trim( );
		return text ? text : missing( key, opts );
	}

	protected number( key: string, opts?: NumberOptions ): number {
		const v = read( key );
		if( v === undefined ) {
			return missing( key, opts );
		}

		if( !isNumber( v ) ) {
			return invalid( key, "number expected", opts );
		}

		return inRange( key, v, opts );
	}

	protected int( key: string, opts?: NumberOptions ): number {
		const v = read( key );
		if( v === undefined ) {
			return missing( key, opts );
		}

		if( !isIntNumber( v ) ) {
			return invalid( key, "integer expected", opts );
		}

		return inRange( key, v, opts );
	}

	// true or false only: a config file is written by hand, no guessing
	protected bool( key: string, opts?: ConfigOptions<boolean> ): boolean {
		const v = read( key );
		if( v === undefined ) {
			return missing( key, opts );
		}

		if( v !== true && v !== false ) {
			return invalid( key, "true or false expected", opts );
		}

		return v;
	}

	// a list of strings (each one trimmed, none empty)
	protected strings( key: string, opts?: ConfigOptions<string[]> ): string[] {
		const v = read( key );
		if( v === undefined ) {
			return missing( key, opts );
		}

		if( !Array.isArray( v ) || !v.every( x => isString( x ) && x.trim( ) ) ) {
			return invalid( key, "list of non empty strings expected", opts );
		}

		return v.map( x => ( x as string ).trim( ) );
	}

	protected oneOf<T extends string>( key: string, values: readonly T[], opts?: ConfigOptions<T> ): T {
		const v = this.string( key, opts );
		if( v === opts?.def ) {
			return v as T;
		}

		if( !values.includes( v as T ) ) {
			return invalid( key, `one of ${values.join( ", " )} expected`, opts );
		}

		return v as T;
	}

	// absolute path of a folder
	protected folder( key: string, opts?: FolderOptions ): string {
		const v = this.string( key, opts );
		if( !v ) {
			return v;
		}

		const path = resolve( loading.baseDir, v );

		if( !exists( path ) && opts?.create ) {
			try {
				mkdirSync( path, { recursive: true } );
			}
			catch {
				return invalid( key, `cannot create the folder ${path}`, opts );
			}
		}

		if( !exists( path )?.isDirectory( ) ) {
			return invalid( key, `folder not found: ${path}`, opts );
		}

		return path;
	}

	// absolute path of a file
	protected file( key: string, opts?: FileOptions ): string {
		const v = this.string( key, opts );
		if( !v ) {
			return v;
		}

		const path = resolve( loading.baseDir, v );

		if( ( opts?.mustExist ?? true ) && !exists( path )?.isFile( ) ) {
			return invalid( key, `file not found: ${path}`, opts );
		}

		return path;
	}

	// the key gives the path of a file holding the secret, the content is returned.
	// on Linux / macOS the file must not be readable by the group or the others
	protected secret( key: string, opts?: ConfigOptions<string> ): string {
		const path = this.file( key, opts );
		if( !path || path === opts?.def ) {
			return path;
		}

		if( process.platform !== "win32" && ( statSync( path ).mode & 0o077 ) !== 0 ) {
			return invalid( key, `${path} is readable by the group or the others (chmod 600)`, opts );
		}

		// the secret itself never appears in an error message
		const content = readFileSync( path, "utf-8" ).replace( /\r?\n$/, "" );
		return content ? content : invalid( key, `${path} is empty`, opts );
	}

	private static argvFile( ): string {
		const args = process.argv;

		for( let i = 0; i < args.length; i++ ) {
			if( args[i].startsWith( "--config=" ) ) {
				return args[i].slice( "--config=".length );
			}

			if( args[i] === "--config" ) {
				return args[i + 1] ?? null;
			}
		}

		return null;
	}
}

// -- internals ------------------------------------------------------------------

function current( ): Loading {
	if( !loading ) {
		throw new Error( "config: use Config.load( ), never new" );
	}

	return loading;
}

// value at "a.b.c", undefined if absent. the key is marked as read
function read( key: string ): unknown {
	const ctx = current( );
	ctx.used.add( key );

	let node: unknown = ctx.raw;
	for( const part of key.split( "." ) ) {
		if( !isPlainObject( node ) || !Object.hasOwn( node, part ) ) {
			return undefined;
		}

		node = node[part];
	}

	return node;
}

function missing<T>( key: string, opts: ConfigOptions<T> ): T {
	if( opts?.def !== undefined ) {
		return opts.def;
	}

	current( ).errors.push( `${key}: missing` );
	return null;
}

function invalid<T>( key: string, reason: string, opts: ConfigOptions<T> ): T {
	current( ).errors.push( `${key}: ${reason}` );
	return opts?.def ?? null;
}

function inRange( key: string, v: number, opts: NumberOptions ): number {
	if( ( opts?.min !== undefined && v < opts.min ) || ( opts?.max !== undefined && v > opts.max ) ) {
		return invalid( key, `out of range [${opts.min ?? ""}..${opts.max ?? ""}]`, opts );
	}

	return v;
}

function exists( path: string ) {
	try {
		return statSync( path );
	}
	catch {
		return null;
	}
}

// "https://app.example.com" or "http://127.0.0.1:4401": no path, no trailing slash
function isOrigin( text: string ): boolean {
	try {
		const url = new URL( text );
		return ( url.protocol === "https:" || url.protocol === "http:" ) && url.origin === text;
	}
	catch {
		return false;
	}
}

function isLoopback( host: string ): boolean {
	return host === "::1" || /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test( host );
}

// a key that no field read is unknown. a key read as a whole (an object read by
// one helper) covers its content; a parent of read keys must be an object
function checkKeys( node: Record<string, unknown>, prefix: string, used: Set<string>, errors: string[] ) {
	for( const name of Object.keys( node ) ) {
		const key = prefix + name;
		if( used.has( key ) ) {
			continue;
		}

		const isParent = [...used].some( u => u.startsWith( key + "." ) );
		if( !isParent ) {
			errors.push( `${key}: unknown key` );
			continue;
		}

		const child = node[name];
		if( !isPlainObject( child ) ) {
			errors.push( `${key}: object expected` );
			continue;
		}

		checkKeys( child, key + ".", used, errors );
	}
}

// removes the comments, then the trailing commas. strings are matched first,
// so that "//" or ",]" inside a string is kept
function stripJson( text: string ): string {
	const STRING = /"(?:[^"\\]|\\.)*"/.source;

	return text
		.replace( new RegExp( `(${STRING})|//[^\\n]*|/\\*[\\s\\S]*?\\*/`, "g" ), ( _m, str ) => str ?? "" )
		.replace( new RegExp( `(${STRING})|,(?=\\s*[}\\]])`, "g" ), ( _m, str ) => str ?? "" );
}
