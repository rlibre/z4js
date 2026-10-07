/**
 *     _____ __
 *    |__   /  / _
 *      /  /  /_| |_
 *     /  /\____   _|
 *    /_____|   |_|
 *
 * @file build-config.ts
 * @author Etienne Cochard
 *
 * @copyright (c) 2026 R-libre ingenierie
 *
 * Use of this source code is governed by an MIT-style license
 * that can be found in the LICENSE file or at https://opensource.org/licenses/MIT.
 **/

// The build configuration of a project: z4.config.json, in its folder.
//
//   {
//       "entryPoints": ["src/main.ts"],       // default
//       "outdir": "dist",                     // default: ./bin
//       "external": [],
//       "define": {},
//       "copy": [{ "from": "assets", "to": "assets" }],       // to: relative to outdir
//       "dev": { "run": "src/main.ts", "nodeArgs": [], "args": [], "watchDelay": 100 },
//       "esbuild": { "target": "node22" }     // native esbuild options, applied last
//   }
//
// Relative paths are resolved from the folder of the project. $VAR and ${VAR} are
// replaced by the environment variable, which must exist. The package.json of the
// project is read for its "type" (module or not).

import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join, normalize, parse, resolve, sep } from "node:path";
import type { BuildOptions } from "esbuild";
import { isIntNumber, isPlainObject, isString } from "../src/tools";

export const DEFAULT_CONFIG_FILE = "z4.config.json";

const DEFAULTS = {
	entryPoints: ["src/main.ts"],
	outdir: "./bin",
	watchDelay: 100,
};

const ENV_RE = /\$(?:\{([A-Za-z_][A-Za-z0-9_]*)\}|([A-Za-z_][A-Za-z0-9_]*))/g;

export interface CopyEntry {
	from: string;
	to: string;
}

// the loaded configuration: defaults applied, paths resolved
export interface BuildConfig {
	root: string;
	configFile: string;
	packageFile: string;
	package: Record<string, any>;
	entryPoints: string[];
	outdir: string;
	copy: CopyEntry[];
	external: string[];
	define: Record<string, string>;
	dev: {
		// the entry point to run. false: none. absent: the only entry point
		run: string | false;
		args: string[];
		nodeArgs: string[];
		watchDelay: number;
	};
	esbuild: BuildOptions;
}

export function expandEnv( value: string, env = process.env ): string {
	return value.replace( ENV_RE, ( _, braced: string, plain: string ) => {
		const name = braced ?? plain;
		const result = env[name];
		if( result === undefined ) {
			throw new Error( `Environment variable '${name}' is not defined` );
		}

		return result;
	} );
}

export function resolvePath( root: string, value: string, env = process.env ): string {
	const expanded = expandEnv( value, env );
	return isAbsolute( expanded ) ? normalize( expanded ) : resolve( root, expanded );
}

export function resolveConfigFile( root: string, configFile = DEFAULT_CONFIG_FILE, env = process.env ): string {
	return resolvePath( root, configFile, env );
}

function readJson( filename: string, label: string ): any {
	try {
		return JSON.parse( readFileSync( filename, "utf8" ) );
	}
	catch( error ) {
		throw new Error( `Cannot read ${label} '${filename}': ${error instanceof Error ? error.message : error}` );
	}
}

function validateStringArray( value: unknown, field: string ) {
	if( !Array.isArray( value ) || !value.every( isString ) ) {
		throw new Error( `${field} must be an array of strings` );
	}
}

function validateCopy( copy: unknown ) {
	if( !Array.isArray( copy ) ) {
		throw new Error( "copy must be an array" );
	}

	for( const item of copy ) {
		if( !item || typeof item !== "object" || !isString( item.from ) || !isString( item.to ) ) {
			throw new Error( "Each copy entry must contain string 'from' and 'to' fields" );
		}

		if( isAbsolute( item.to ) ) {
			throw new Error( `copy destination must be relative to outdir: '${item.to}'` );
		}

		const normalized = normalize( item.to );
		if( normalized === ".." || normalized.startsWith( `..${sep}` ) ) {
			throw new Error( `copy destination escapes outdir: '${item.to}'` );
		}
	}
}

// explicit: the file was asked for on the command line, so it must exist. the default
// file may be absent: the defaults then apply
export function loadConfig( root = process.cwd( ), configFile = DEFAULT_CONFIG_FILE, env = process.env, { explicit = false } = {} ): BuildConfig {
	root = resolve( root );

	const packageFile = join( root, "package.json" );
	const pkg = existsSync( packageFile ) ? readJson( packageFile, "package.json" ) : {};

	const filename = resolveConfigFile( root, configFile, env );
	let cfg: any = {};
	if( existsSync( filename ) ) {
		cfg = readJson( filename, "config" );
	}
	else if( explicit ) {
		throw new Error( `Config file not found: ${filename}` );
	}

	if( !isPlainObject( cfg ) ) {
		throw new Error( "config must be an object" );
	}

	const entryPoints = cfg.entryPoints ?? DEFAULTS.entryPoints;
	if( !Array.isArray( entryPoints ) || !entryPoints.length || !entryPoints.every( isString ) ) {
		throw new Error( "entryPoints must be a non-empty array of strings" );
	}

	const copy: CopyEntry[] = cfg.copy ?? [];
	validateCopy( copy );

	if( cfg.external !== undefined && cfg.externals !== undefined ) {
		throw new Error( "Use either 'external' or legacy 'externals', not both" );
	}

	const external: string[] = cfg.external ?? cfg.externals ?? [];
	validateStringArray( external, "external" );

	const define = cfg.define ?? {};
	if( !isPlainObject( define ) ) {
		throw new Error( "define must be an object" );
	}

	if( !Object.values( define ).every( isString ) ) {
		throw new Error( "define values must be strings containing esbuild define expressions" );
	}

	const outdirRaw = cfg.outdir ?? DEFAULTS.outdir;
	if( !isString( outdirRaw ) ) {
		throw new Error( "outdir must be a string" );
	}

	const outdir = resolvePath( root, outdirRaw, env );
	if( outdir === root ) {
		throw new Error( "outdir cannot be the project root" );
	}

	if( outdir === parse( outdir ).root ) {
		throw new Error( "outdir cannot be a filesystem root" );
	}

	const devCfg = cfg.dev ?? {};
	if( !isPlainObject( devCfg ) ) {
		throw new Error( "dev must be an object" );
	}

	const run = devCfg.run;
	if( run !== undefined && run !== false && !isString( run ) ) {
		throw new Error( "dev.run must be a string or false" );
	}

	const args: string[] = devCfg.args ?? [];
	validateStringArray( args, "dev.args" );

	const nodeArgs: string[] = devCfg.nodeArgs ?? [];
	validateStringArray( nodeArgs, "dev.nodeArgs" );

	const watchDelay = devCfg.watchDelay ?? DEFAULTS.watchDelay;
	if( !isIntNumber( watchDelay ) || watchDelay < 0 || watchDelay > 5000 ) {
		throw new Error( "dev.watchDelay must be an integer between 0 and 5000" );
	}

	if( cfg.esbuild !== undefined && !isPlainObject( cfg.esbuild ) ) {
		throw new Error( "esbuild must be an object" );
	}

	return {
		root,
		configFile: filename,
		packageFile,
		package: pkg,
		entryPoints: entryPoints.map( entry => resolvePath( root, entry, env ) ),
		outdir,
		copy: copy.map( item => ( { from: resolvePath( root, item.from, env ), to: normalize( item.to ) } ) ),
		external: [...external],
		define: { ...define },
		dev: {
			run: isString( run ) ? resolvePath( root, run, env ) : run,
			args: [...args],
			nodeArgs: [...nodeArgs],
			watchDelay,
		},
		esbuild: { ...cfg.esbuild },
	};
}
