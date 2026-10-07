/**
 *     _____ __
 *    |__   /  / _
 *      /  /  /_| |_
 *     /  /\____   _|
 *    /_____|   |_|
 *
 * @file dev.ts
 * @author Etienne Cochard
 *
 * @copyright (c) 2026 R-libre ingenierie
 *
 * Use of this source code is governed by an MIT-style license
 * that can be found in the LICENSE file or at https://opensource.org/licenses/MIT.
 **/

// The dev command: watches the sources, rebuilds, and runs Node after each successful
// build.
//
//   z4js dev [--config <file>] [--no-restart|--no-run]
//
// --no-restart launches Node once and keeps building without restarting it. --no-run
// only builds. The configuration file is watched too: a change reloads it.

import { watch } from "node:fs";
import type { FSWatcher } from "node:fs";
import { basename, dirname } from "node:path";
import { parseArgs } from "node:util";
import type { BuildContext } from "esbuild";
import { DEFAULT_CONFIG_FILE, expandEnv, loadConfig, resolveConfigFile } from "./build-config";
import type { BuildConfig } from "./build-config";
import { createBuildOptions } from "./build-options";
import { devPlugin } from "./dev-plugin";
import { loadEsbuild } from "./esbuild";
import { failure, info, success } from "./print";
import { NodeRunner } from "./runner";

export async function dev( argv: string[] = [], root = process.cwd( ) ) {
	const { values, positionals } = parseArgs( {
		args: argv,
		options: {
			config: { type: "string" },
			"no-run": { type: "boolean", default: false },
			"no-restart": { type: "boolean", default: false },
		},
		allowPositionals: true,
		strict: true,
	} );

	if( positionals.length ) {
		throw new Error( `Unexpected argument: ${positionals[0]}` );
	}

	if( values["no-run"] && values["no-restart"] ) {
		throw new Error( "--no-restart has no effect with --no-run" );
	}

	const configArg = values.config ? expandEnv( values.config ) : DEFAULT_CONFIG_FILE;
	const explicit = values.config !== undefined;
	const watchedConfigFile = resolveConfigFile( root, configArg );

	const esbuild = await loadEsbuild( );
	const runner = new NodeRunner( );

	let context: BuildContext;
	let configWatcher: FSWatcher;
	let stopping = false;
	let reloadTimer: NodeJS.Timeout;
	let reloadChain: Promise<void> = Promise.resolve( );

	async function createContext( config: BuildConfig ): Promise<BuildContext> {
		const plugin = devPlugin( config, runner, { run: !values["no-run"], restart: !values["no-restart"] } );
		const next = await esbuild.context( createBuildOptions( config, "dev", [plugin] ) );

		try {
			await next.watch( { delay: config.dev.watchDelay } );
			return next;
		}
		catch( error ) {
			await next.dispose( );
			throw error;
		}
	}

	async function start( config: BuildConfig ) {
		context = await createContext( config );
		info( "mode", "dev" );
		info( "config", config.configFile );
		info( "outdir", config.outdir );

		if( values["no-run"] ) {
			info( "run", "disabled" );
		}
		else if( values["no-restart"] ) {
			info( "restart", "disabled" );
		}

		success( "watching", `${config.entryPoints.length} entr${config.entryPoints.length === 1 ? "y" : "ies"}` );
	}

	// the configuration changed: a new context replaces the running one, which is kept
	// if the new configuration is wrong
	async function reload( ) {
		let next: BuildContext;

		try {
			next = await createContext( loadConfig( root, configArg, process.env, { explicit } ) );
		}
		catch( error ) {
			failure( `config: ${error instanceof Error ? error.message : error}` );
			return;
		}

		const previous = context;
		context = next;
		await previous?.dispose( );

		success( "config", "reloaded" );
	}

	function scheduleReload( ) {
		clearTimeout( reloadTimer );
		reloadTimer = setTimeout( ( ) => {
			reloadChain = reloadChain.then( reload, reload );
		}, 150 );
	}

	await start( loadConfig( root, configArg, process.env, { explicit } ) );

	const watchName = basename( watchedConfigFile );
	configWatcher = watch( dirname( watchedConfigFile ), { persistent: true }, ( _event, filename ) => {
		if( filename === null || filename.toString( ) === watchName ) {
			scheduleReload( );
		}
	} );

	async function stop( ) {
		if( stopping ) {
			return;
		}

		stopping = true;
		clearTimeout( reloadTimer );
		configWatcher?.close( );
		await reloadChain.catch( ( ) => { } );
		await context?.dispose( );
		await runner.stop( );
	}

	for( const signal of ["SIGINT", "SIGTERM"] as const ) {
		process.once( signal, async ( ) => {
			await stop( );
			process.exit( 0 );
		} );
	}

	return { stop };
}
