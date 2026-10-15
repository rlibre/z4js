// Shared by the tests: a temporary folder, the real server on a free port, and requests.

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after } from "node:test";
import { Config, Logger, SecurityLog, serve } from "../src/index";
import type { RouteGroup } from "../src/index";

// a new empty folder, deleted when the test process exits: after( ) hooks run in their
// order of registration, a folder removed there may still hold an open database (Windows)
export function tempDir( ): string {
	const dir = mkdtempSync( join( tmpdir( ), "z4js-test-" ) );
	process.once( "exit", ( ) => rmSync( dir, { recursive: true, force: true } ) );
	return dir;
}

function freePort( ): Promise<number> {
	return new Promise( ( resolve, reject ) => {
		const probe = createServer( );
		probe.once( "error", reject );
		probe.listen( 0, "127.0.0.1", ( ) => {
			const { port } = probe.address( ) as { port: number };
			probe.close( ( ) => resolve( port ) );
		} );
	} );
}

// the logs of the process, created by the first configuration of the test file:
// quiet logger, security log in a temporary file
function ensureLogs( ) {
	try {
		Logger.app;
	}
	catch {
		Logger.create( { level: "fatal" } );
		SecurityLog.create( { file: join( tempDir( ), "security.log" ) } );
	}
}

export interface TestServer {
	call( method: string, path: string, options?: CallOptions ): Promise<Answer>;
}

export interface CallOptions {
	body?: unknown;
	token?: string;
	headers?: Record<string, string>;
}

export interface Answer {
	status: number;
	body: any;
	text: string;
	headers: Headers;
}

// the configuration of a test server: debug, a free port of the loopback, plus the
// given keys of the configuration file. creates the logger of the process (quiet)
export async function testConfig( settings: Record<string, unknown> = {} ): Promise<Config> {
	const file = join( tempDir( ), "config.json" );
	writeFileSync( file, JSON.stringify( { mode: "debug", server: { port: await freePort( ) }, ...settings } ) );

	ensureLogs( );
	return Config.load( Config, file );
}

// serve( ) with these groups (testConfig( ) by default). closed at the end of the test
// file: to call at the top level of the file (await), not in a hook (an after( )
// registered in a hook runs at the end of that hook)
export async function startServer( groups: RouteGroup[], config?: Config ): Promise<TestServer> {
	config ??= await testConfig( );
	const running = await serve( { config, groups, handleSignals: false } );
	after( ( ) => running.close( ) );

	const base = `http://127.0.0.1:${config.server.port}`;

	return {
		async call( method, path, options = {} ) {
			const headers: Record<string, string> = { ...options.headers };
			if( options.body !== undefined ) {
				headers["content-type"] = "application/json";
			}

			if( options.token ) {
				headers.authorization = `Bearer ${options.token}`;
			}

			const r = await fetch( base + path, { method, headers, body: options.body === undefined ? undefined : JSON.stringify( options.body ) } );
			const text = await r.text( );
			let body: unknown = null;
			try {
				body = JSON.parse( text );
			}
			catch {
				// not JSON: text only
			}

			return { status: r.status, body, text, headers: r.headers };
		},
	};
}
