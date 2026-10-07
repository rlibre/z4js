/**
 *     _____ __
 *    |__   /  / _
 *      /  /  /_| |_
 *     /  /\____   _|
 *    /_____|   |_|
 *
 * @file diagnostics.ts
 * @author Etienne Cochard
 *
 * @copyright (c) 2026 R-libre ingenierie
 *
 * Use of this source code is governed by an MIT-style license
 * that can be found in the LICENSE file or at https://opensource.org/licenses/MIT.
 **/

// Errors and warnings of a build, written once on the standard error, formatted by
// esbuild. esbuild itself is kept silent (logLevel), so nothing is printed twice.

import type { BuildFailure, Message, Plugin } from "esbuild";
import { loadEsbuild } from "./esbuild";
import { failure, useColor } from "./print";

async function format( messages: Message[], kind: "error" | "warning" ): Promise<string[]> {
	if( !messages?.length ) {
		return [];
	}

	const esbuild = await loadEsbuild( );
	return esbuild.formatMessages( messages, {
		kind,
		color: useColor( process.stderr ),
		terminalWidth: process.stderr.columns || 100,
	} );
}

export async function printWarnings( messages: Message[] ) {
	for( const line of await format( messages, "warning" ) ) {
		process.stderr.write( line );
	}
}

export async function printErrors( messages: Message[] ) {
	if( !messages?.length ) {
		return;
	}

	failure( "build failed" );
	for( const line of await format( messages, "error" ) ) {
		process.stderr.write( line );
	}
}

// true for an error thrown by esbuild about the sources: it carries its messages
export function isBuildFailure( error: unknown ): error is BuildFailure {
	return !!( error as BuildFailure )?.errors?.length;
}

export async function printBuildError( error: unknown ) {
	if( isBuildFailure( error ) ) {
		await printErrors( error.errors );
		if( error.warnings?.length ) {
			await printWarnings( error.warnings );
		}

		return;
	}

	failure( error instanceof Error ? error.message : String( error ) );
}

export function diagnosticsPlugin( ): Plugin {
	return {
		name: "z4js-diagnostics",
		setup( build ) {
			build.onEnd( async result => {
				if( result.errors.length ) {
					await printErrors( result.errors );
					return;
				}

				if( result.warnings.length ) {
					await printWarnings( result.warnings );
				}
			} );
		},
	};
}
