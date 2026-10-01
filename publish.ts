// Release of z4js: checks, version bump, commit, push and tag.
//
//   deno run -A publish.ts            1.0.3 -> 1.0.4
//   deno run -A publish.ts minor      1.0.3 -> 1.1.0
//   deno run -A publish.ts major      1.0.3 -> 2.0.0
//   deno run -A publish.ts current    keeps the version of package.json (first release)
//
// Refused when the working tree is not clean: "git commit -a" would release work in
// progress, and leave out the files not yet added.

import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const LEVELS = ["patch", "minor", "major", "current"];

const run = ( cmd: string ): void => {
	execSync( cmd, { stdio: "inherit" } );
};

const output = ( cmd: string ): string => {
	return execSync( cmd, { encoding: "utf-8" } ).trim( );
};

const level = Deno.args[0] ?? "patch";
if( !LEVELS.includes( level ) ) {
	console.error( `usage: deno run -A publish.ts [${LEVELS.join( "|" )}]` );
	Deno.exit( 1 );
}

try {
	if( output( "git status --porcelain" ) ) {
		throw new Error( "the working tree is not clean: commit or stash first" );
	}

	// the same checks as the development, and the command line that is published
	run( "npm run typecheck" );
	run( "npm run build" );

	// package.json and package-lock.json together, no git tag (done below)
	if( level !== "current" ) {
		run( `npm version ${level} --no-git-tag-version` );
	}

	const version = JSON.parse( readFileSync( "./package.json", "utf-8" ) ).version;

	run( `git commit --allow-empty -am "release: ${version}"` );
	run( "git push" );
	run( `git tag ${version}` );
	run( "git push --tags" );

	console.log( `z4js ${version} pushed and tagged` );
}
catch( e ) {
	console.error( "release failed:", e instanceof Error ? e.message : e );
	Deno.exit( 11 );
}
