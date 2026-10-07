/**
 *     _____ __
 *    |__   /  / _
 *      /  /  /_| |_
 *     /  /\____   _|
 *    /_____|   |_|
 *
 * @file build.ts
 * @author Etienne Cochard
 *
 * @copyright (c) 2026 R-libre ingenierie
 *
 * Use of this source code is governed by an MIT-style license
 * that can be found in the LICENSE file or at https://opensource.org/licenses/MIT.
 **/

// The build command: bundles the project described by z4.config.json.
//
//   z4js build [--config <file>] [--debug]
//
// A production build is minified, without source map. --debug keeps the output
// readable and writes linked source maps. The output folder is emptied first.

import { mkdir, rm } from "node:fs/promises";
import { parseArgs } from "node:util";
import { DEFAULT_CONFIG_FILE, expandEnv, loadConfig } from "./build-config";
import { createBuildOptions } from "./build-options";
import { isBuildFailure, printBuildError } from "./diagnostics";
import { loadEsbuild } from "./esbuild";
import { info, success } from "./print";

export async function build( argv: string[] = [], root = process.cwd( ) ) {
	const { values, positionals } = parseArgs( {
		args: argv,
		options: {
			config: { type: "string" },
			debug: { type: "boolean", default: false },
		},
		allowPositionals: true,
		strict: true,
	} );

	if( positionals.length ) {
		throw new Error( `Unexpected argument: ${positionals[0]}` );
	}

	const configArg = values.config ? expandEnv( values.config ) : DEFAULT_CONFIG_FILE;
	const config = loadConfig( root, configArg, process.env, { explicit: values.config !== undefined } );
	const mode = values.debug ? "debug" : "production";

	info( "mode", mode );
	info( "config", config.configFile );
	info( "outdir", config.outdir );

	await rm( config.outdir, { recursive: true, force: true } );
	await mkdir( config.outdir, { recursive: true } );

	const esbuild = await loadEsbuild( );
	const started = performance.now( );

	try {
		await esbuild.build( createBuildOptions( config, mode ) );
		success( "built", `${Math.round( performance.now( ) - started )}ms` );
	}
	catch( error ) {
		// the diagnostics of esbuild are already written by diagnosticsPlugin: only
		// the other failures are written here
		if( !isBuildFailure( error ) ) {
			await printBuildError( error );
		}

		process.exitCode = 1;
	}
}
