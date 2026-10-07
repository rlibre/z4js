/**
 *     _____ __
 *    |__   /  / _
 *      /  /  /_| |_
 *     /  /\____   _|
 *    /_____|   |_|
 *
 * @file build-options.ts
 * @author Etienne Cochard
 *
 * @copyright (c) 2026 R-libre ingenierie
 *
 * Use of this source code is governed by an MIT-style license
 * that can be found in the LICENSE file or at https://opensource.org/licenses/MIT.
 **/

// The esbuild options of a build: the defaults of z4js (a Node bundle, ESM or CommonJS
// like the package), then the "esbuild" object of the configuration, applied last.
//
// Two constants are defined in the sources: DEBUG_MODE (false in a production build)
// and VERSION_ID (the date of the build, yymmdd).

import type { BuildOptions, Plugin } from "esbuild";
import type { BuildConfig } from "./build-config";
import { copyPlugin } from "./copy";
import { diagnosticsPlugin } from "./diagnostics";

export type BuildMode = "production" | "debug" | "dev";

function versionId( ): string {
	const now = new Date( );
	const pad = ( value: number ) => String( value ).padStart( 2, "0" );
	return `${pad( now.getFullYear( ) - 2000 )}${pad( now.getMonth( ) + 1 )}${pad( now.getDate( ) )}`;
}

export function createBuildOptions( config: BuildConfig, mode: BuildMode, extraPlugins: Plugin[] = [] ): BuildOptions {
	const production = mode === "production";

	const defaults: BuildOptions = {
		absWorkingDir: config.root,
		entryPoints: config.entryPoints,
		outdir: config.outdir,
		bundle: true,
		charset: "utf8",
		keepNames: true,
		platform: "node",
		format: config.package.type === "module" ? "esm" : "cjs",
		target: "node20",
		minify: production,
		sourcemap: production ? false : "linked",
		logLevel: "silent",
		external: config.external,
		define: {
			...config.define,
			DEBUG_MODE: production ? "false" : "true",
			VERSION_ID: versionId( ),
		},
		plugins: [
			copyPlugin( config ),
			diagnosticsPlugin( ),
			...extraPlugins,
		],
	};

	const merged: BuildOptions = { ...defaults, ...config.esbuild };

	// the dev command finds the output to run in the metafile
	if( mode === "dev" ) {
		merged.metafile = true;
	}

	// the diagnostics are written by diagnosticsPlugin, never twice
	merged.logLevel = "silent";
	return merged;
}
