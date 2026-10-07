/**
 *     _____ __
 *    |__   /  / _
 *      /  /  /_| |_
 *     /  /\____   _|
 *    /_____|   |_|
 *
 * @file dev-plugin.ts
 * @author Etienne Cochard
 *
 * @copyright (c) 2026 R-libre ingenierie
 *
 * Use of this source code is governed by an MIT-style license
 * that can be found in the LICENSE file or at https://opensource.org/licenses/MIT.
 **/

// The esbuild plugin of the dev command: after each successful build, says how long it
// took and runs the output again.

import type { Plugin } from "esbuild";
import type { BuildConfig } from "./build-config";
import { failure, success } from "./print";
import { findRunnableOutput } from "./runner";
import type { NodeRunner } from "./runner";

export interface DevPluginOptions {
	// false: never run the output (--no-run)
	run?: boolean;
	// false: run it once, do not restart it after the next builds (--no-restart)
	restart?: boolean;
}

export function devPlugin( config: BuildConfig, runner: NodeRunner, { run = true, restart = true }: DevPluginOptions = {} ): Plugin {
	let started = 0;

	return {
		name: "z4js-dev",
		setup( build ) {
			build.onStart( ( ) => {
				started = performance.now( );
			} );

			build.onEnd( async result => {
				if( result.errors.length ) {
					return;
				}

				success( "built", `${Math.round( performance.now( ) - started )}ms` );

				if( !run || ( !restart && runner.target ) ) {
					return;
				}

				try {
					await runner.restart( findRunnableOutput( config, result.metafile ), config );
				}
				catch( error ) {
					failure( error instanceof Error ? error.message : String( error ) );
				}
			} );
		},
	};
}
