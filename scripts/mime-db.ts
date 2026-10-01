// Regenerates src/mime-db.json: the npm package mime-db, reduced to what mime-types
// reads. Run it after each update of express (and so of mime-types / mime-db):
//
//   npm run mime-db
//
// WHY
// Express loads mime-types (express.static, res.type, req.is...), which loads the whole
// mime-db: 2522 types, 157 KB of JSON (228 KB in a debug bundle). mime-types only reads
//   - the types that have extensions or a charset (1042 of them)
//   - their fields extensions and charset, and source for the types that share an
//     extension with another one (mime-score uses it to choose between them)
// compressible, the other types and the other fields are never read. Reduced: 54 KB.
// Checked with mime-db 1.54.0 and mime-types 3.0.2.
//
// HOW
// The application bundler maps the package to the reduced file (x4.config.json):
//
//   "esbuild": { "alias": { "mime-db": "@r-libre/z4js/mime-db" } }
//
// LOSSLESS, CHECKED HERE
// mime-types is loaded once on each database, and lookup, contentType, extension and
// charset are compared over every extension and every type: the script fails (and
// writes nothing) at the first difference. If mime-types starts reading another field,
// this check fails: then keep that field below.
//
// RISK
// A file not regenerated after an update of mime-db misses the newest types: a static
// file of such a type is served as application/octet-stream, never with a wrong type.
//
// TO REMOVE IT
// 1. in the x4.config.json of each application, delete the "mime-db" alias
// 2. in the package.json of z4js, delete the export "./mime-db" and the script "mime-db"
// 3. delete src/mime-db.json and this file, and their mentions in aicontext.md,
//    README.md and CLAUDE.md

import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire( import.meta.url );
const OUT = new URL( "../src/mime-db.json", import.meta.url );

interface MimeEntry {
	source?: string;
	charset?: string;
	extensions?: string[];
	compressible?: boolean;
}

type MimeDb = Record<string, MimeEntry>;

const full: MimeDb = require( "mime-db" );

// the types that share an extension with another one: the only ones that need source
const owners = new Map<string, string[]>( );
for( const [type, entry] of Object.entries( full ) ) {
	for( const ext of entry.extensions ?? [] ) {
		owners.set( ext, [...( owners.get( ext ) ?? [] ), type] );
	}
}

const contested = new Set( [...owners.values( )].filter( list => list.length > 1 ).flat( ) );

const reduced: MimeDb = {};
for( const [type, entry] of Object.entries( full ) ) {
	if( !entry.extensions && !entry.charset ) {
		continue;
	}

	reduced[type] = {
		...( entry.source && contested.has( type ) ? { source: entry.source } : {} ),
		...( entry.charset ? { charset: entry.charset } : {} ),
		...( entry.extensions ? { extensions: entry.extensions } : {} ),
	};
}

// mime-types loaded on the given database (its module cache entry swapped for the time of the load)
function mimeTypesOn( db: MimeDb ) {
	const dbId = require.resolve( "mime-db" );
	const typesId = require.resolve( "mime-types" );
	const saved = require.cache[dbId];

	require.cache[dbId] = { id: dbId, filename: dbId, loaded: true, exports: db } as NodeJS.Module;
	delete require.cache[typesId];

	const types = require( "mime-types" );

	delete require.cache[typesId];
	require.cache[dbId] = saved;
	return types;
}

const a = mimeTypesOn( full );
const b = mimeTypesOn( reduced );
const differences: string[] = [];

for( const ext of owners.keys( ) ) {
	for( const fn of ["lookup", "contentType"] ) {
		if( a[fn]( ext ) !== b[fn]( ext ) ) {
			differences.push( `${fn}( "${ext}" )` );
		}
	}
}

for( const type of [...Object.keys( full ), "text/x-unknown", "application/x-unknown", "text/html; charset=latin1"] ) {
	for( const fn of ["extension", "charset", "contentType"] ) {
		if( a[fn]( type ) !== b[fn]( type ) ) {
			differences.push( `${fn}( "${type}" )` );
		}
	}
}

if( differences.length ) {
	console.error( `mime-db: the reduced database differs, nothing written:\n${differences.slice( 0, 20 ).join( "\n" )}` );
	process.exit( 1 );
}

// one type per line: readable diffs when mime-db changes
const lines = Object.entries( reduced ).map( ( [type, entry] ) => `${JSON.stringify( type )}:${JSON.stringify( entry )}` );
writeFileSync( OUT, `{\n${lines.join( ",\n" )}\n}\n` );

const version = require( "mime-db/package.json" ).version;
console.log( `src/mime-db.json: mime-db ${version}, ${Object.keys( full ).length} -> ${lines.length} types, ` +
	`${( JSON.stringify( full ).length / 1024 ).toFixed( 0 )} -> ${( JSON.stringify( reduced ).length / 1024 ).toFixed( 0 )} KB, lossless` );
