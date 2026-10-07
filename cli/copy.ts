/**
 *     _____ __
 *    |__   /  / _
 *      /  /  /_| |_
 *     /  /\____   _|
 *    /_____|   |_|
 *
 * @file copy.ts
 * @author Etienne Cochard
 *
 * @copyright (c) 2026 R-libre ingenierie
 *
 * Use of this source code is governed by an MIT-style license
 * that can be found in the LICENSE file or at https://opensource.org/licenses/MIT.
 **/

// The "copy" entries of the build configuration: files and folders copied into the
// output folder after each successful build. A missing source is skipped.

import { cp, mkdir, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { Plugin } from "esbuild";
import { errorCode } from "../src/tools";
import type { BuildConfig } from "./build-config";

async function statOrNull( filename: string ) {
	try {
		return await stat( filename );
	}
	catch( error ) {
		if( errorCode( error ) === "ENOENT" ) {
			return null;
		}

		throw error;
	}
}

export async function copyConfiguredFiles( config: BuildConfig ) {
	for( const entry of config.copy ) {
		const source = await statOrNull( entry.from );
		if( !source ) {
			continue;
		}

		const destination = resolve( config.outdir, entry.to );
		await mkdir( dirname( destination ), { recursive: true } );
		await cp( entry.from, destination, { recursive: source.isDirectory( ), force: true } );
	}
}

export function copyPlugin( config: BuildConfig ): Plugin {
	return {
		name: "z4js-copy",
		setup( build ) {
			build.onEnd( async result => {
				if( result.errors.length === 0 ) {
					await copyConfiguredFiles( config );
				}
			} );
		},
	};
}
