/**
 *     _____ __
 *    |__   /  / _
 *      /  /  /_| |_
 *     /  /\____   _|
 *    /_____|   |_|
 *
 * @file runner.ts
 * @author Etienne Cochard
 *
 * @copyright (c) 2026 R-libre ingenierie
 *
 * Use of this source code is governed by an MIT-style license
 * that can be found in the LICENSE file or at https://opensource.org/licenses/MIT.
 **/

// The Node process of the dev command: the built entry point, run again after each
// successful build.

import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { normalize, resolve } from "node:path";
import type { Metafile } from "esbuild";
import type { BuildConfig } from "./build-config";
import { info, success, warning } from "./print";

function samePath( a: string, b: string ): boolean {
	const left = normalize( resolve( a ) );
	const right = normalize( resolve( b ) );
	return process.platform === "win32" ? left.toLowerCase( ) === right.toLowerCase( ) : left === right;
}

// the output file of the entry point to run: dev.run (one of the entry points), or the
// only entry point. null when dev.run is false
export function findRunnableOutput( config: BuildConfig, metafile: Metafile ): string {
	if( config.dev.run === false ) {
		return null;
	}

	let entryPoint: string;

	if( config.dev.run ) {
		entryPoint = config.dev.run;

		if( !config.entryPoints.some( entry => samePath( entry, entryPoint ) ) ) {
			throw new Error( `dev.run must reference one of entryPoints: '${config.dev.run}'` );
		}
	}
	else {
		if( config.entryPoints.length !== 1 ) {
			throw new Error( "dev.run is required when multiple entryPoints are configured" );
		}

		entryPoint = config.entryPoints[0];
	}

	for( const [output, meta] of Object.entries( metafile?.outputs ?? {} ) ) {
		if( !meta.entryPoint ) {
			continue;
		}

		const source = resolve( config.root, meta.entryPoint );
		if( !samePath( source, entryPoint ) ) {
			continue;
		}

		const target = resolve( config.root, output );
		if( /\.(?:mjs|cjs|js)$/i.test( target ) ) {
			return target;
		}
	}

	throw new Error( `Cannot determine output file for '${entryPoint}'` );
}

function exited( child: ChildProcess ): boolean {
	return !child || child.exitCode !== null || child.signalCode !== null;
}

// true if the process ended within the timeout
function waitForExit( child: ChildProcess, timeout = 1500 ): Promise<boolean> {
	if( exited( child ) ) {
		return Promise.resolve( true );
	}

	return new Promise( resolve => {
		const timer = setTimeout( ( ) => resolve( false ), timeout );

		child.once( "exit", ( ) => {
			clearTimeout( timer );
			resolve( true );
		} );
	} );
}

// runs the built entry point with Node, one process at a time
export class NodeRunner {
	private child: ChildProcess = null;
	private running: string = null;

	// the file being run, null if none
	get target( ): string {
		return this.running;
	}

	async stop( ) {
		const child = this.child;
		this.forget( );

		if( exited( child ) ) {
			return;
		}

		try {
			child.kill( );
		}
		catch {
			return;
		}

		if( !await waitForExit( child ) ) {
			try {
				child.kill( "SIGKILL" );
			}
			catch {
				// already gone
			}

			await waitForExit( child, 500 );
		}
	}

	async restart( target: string, config: BuildConfig ) {
		if( !target ) {
			return;
		}

		if( !existsSync( target ) ) {
			throw new Error( `Cannot run missing output: ${target}` );
		}

		await this.stop( );

		const args = [...config.dev.nodeArgs, target, ...config.dev.args];
		info( "run", `${process.execPath} ${args.join( " " )}` );

		const child = spawn( process.execPath, args, { cwd: config.root, env: process.env, stdio: "inherit" } );
		this.child = child;
		this.running = target;

		child.once( "error", error => {
			if( this.child === child ) {
				this.forget( );
			}

			warning( `process: ${error.message}` );
		} );

		child.once( "exit", ( code, signal ) => {
			if( this.child !== child ) {
				return;
			}

			this.forget( );

			if( signal ) {
				success( "process", `stopped (${signal})` );
			}
			else if( code ) {
				warning( `process exited with code ${code}` );
			}
		} );
	}

	private forget( ) {
		this.child = null;
		this.running = null;
	}
}
