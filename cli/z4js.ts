#!/usr/bin/env node
/**
 *     _____ __
 *    |__   /  / _
 *      /  /  /_| |_
 *     /  /\____   _|
 *    /_____|   |_|
 *
 * @file z4js.ts
 * @author Etienne Cochard
 *
 * @copyright (c) 2026 R-libre ingenierie
 *
 * Use of this source code is governed by an MIT-style license
 * that can be found in the LICENSE file or at https://opensource.org/licenses/MIT.
 **/

// The z4js command line: development tools, run from the folder of a project.
//
//   z4js apidoc [--project=tsconfig.json] [--out=api.json]
//   npm start | z4js log [--level=warn]

import { writeFileSync } from "node:fs";
import { argValue } from "../src/tools";
import { apidoc } from "./apidoc";
import { log } from "./log";

const USAGE = `usage: z4js <command> [options]

commands:
  apidoc   OpenAPI 3 description of the routes, read from the sources
           --project=<tsconfig.json>   project to read (default: tsconfig.json)
           --out=<file>                output file (default: standard output)
  log      colors the log lines read on the standard input (npm start | z4js log)
           --level=<level>             hides the lines below it (debug, info, warn, error, fatal)`;

const command = process.argv[2];

try {
	switch( command ) {
		case "apidoc": {
			const { doc, warnings } = await apidoc( argValue( "project" ) ?? "tsconfig.json" );
			warnings.forEach( w => console.error( "warning: " + w ) );

			const json = JSON.stringify( doc, null, "\t" ) + "\n";
			const out = argValue( "out" );
			if( out ) {
				writeFileSync( out, json );
			}
			else {
				process.stdout.write( json );
			}
			break;
		}

		case "log":
			await log( argValue( "level" ) );
			break;

		default:
			console.error( USAGE );
			process.exitCode = 1;
	}
}
catch( e ) {
	console.error( "z4js: " + ( e instanceof Error ? e.message : e ) );
	process.exitCode = 1;
}
