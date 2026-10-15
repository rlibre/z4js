// Runs the tests of z4js (test/*.test.ts), with node:test: no test dependency.
//
//   npm test                    every test file
//   npm test -- params model    the files whose name contains one of the words
//
// WHY A BUNDLE
// node runs a .ts file by stripping its types, but the sources of z4js use TypeScript
// features that cannot be stripped (constructor parameter properties). So each test
// file is bundled by esbuild (already a dependency), then node --test runs the bundles,
// one process per file: what exists once per process (Logger.create, Workers) is
// created once per file.
//
// The bundles go to node_modules/.cache/z4js-test: the packages stay external and are
// found in node_modules, as by the sources.

import { spawnSync } from "node:child_process";
import { readdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const ROOT = fileURLToPath( new URL( "..", import.meta.url ) );
const TESTS = ROOT + "test/";
const OUT = ROOT + "node_modules/.cache/z4js-test/";

const words = process.argv.slice( 2 );
const files = readdirSync( TESTS )
	.filter( f => f.endsWith( ".test.ts" ) )
	.filter( f => !words.length || words.some( w => f.includes( w ) ) );

if( !files.length ) {
	console.error( "no test file" );
	process.exit( 1 );
}

rmSync( OUT, { recursive: true, force: true } );

await build( {
	entryPoints: files.map( f => TESTS + f ),
	outdir: OUT,
	outExtension: { ".js": ".mjs" },
	bundle: true,
	packages: "external",
	platform: "node",
	format: "esm",
	target: "node22",
	sourcemap: true,
	logLevel: "warning",
} );

const run = spawnSync( process.execPath, ["--enable-source-maps", "--test", ...files.map( f => OUT + f.replace( /\.ts$/, ".mjs" ) )], { stdio: "inherit" } );
process.exit( run.status ?? 1 );
