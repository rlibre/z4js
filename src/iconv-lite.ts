/**
 *     _____ __
 *    |__   /  / _
 *      /  /  /_| |_
 *     /  /\____   _|
 *    /_____|   |_|
 *
 * @file iconv-lite.ts
 * @author Etienne Cochard
 *
 * @copyright (c) 2026 R-libre ingenierie
 *
 * Use of this source code is governed by an MIT-style license
 * that can be found in the LICENSE file or at https://opensource.org/licenses/MIT.
 **/

// Replacement of the npm package iconv-lite, in the bundle of an application only.
//
// WHY
// Express loads body-parser at its own import (express/lib/express.js), and
// body-parser and raw-body load iconv-lite, whose tables of every encoding weigh more
// than 500 KB: about 40 % of the bundle of an application (1280 KB -> 944 KB for the
// demo, debug build). Node already has these encodings: TextDecoder, on the ICU that
// the official builds include whole (full ICU).
//
// HOW
// esbuild replaces the package by this file when it bundles the application. In the
// z4.config.json of the application:
//
//   "esbuild": { "alias": { "iconv-lite": "@r-libre/z4js/iconv-lite" } }
//
// Nothing else changes: the real iconv-lite stays installed (dependency of
// body-parser), it is only left out of the bundle. Without the alias, the bundle
// contains the real one, as before.
//
// WHAT IS USED (checked with express 5.2.1, body-parser 2.3.0, raw-body 3.0.2,
// iconv-lite 0.7.3)
//   body-parser/lib/read.js   iconv.encodingExists( charset )   false: 415 unsupported charset
//                             iconv.decode( buffer, charset )
//   raw-body/index.js         iconv.getDecoder( charset )       throws: 415
//                             decoder.write( chunk ), decoder.end( )
// Nothing encodes. Any other function is missing here: an update of these packages
// that calls one would fail at run time, so check again after each update:
//
//   grep -n "iconv\." node_modules/body-parser/lib/*.js node_modules/raw-body/index.js
//
// DIFFERENCES WITH THE REAL ICONV-LITE
// - the charsets are the WHATWG ones of TextDecoder (utf-8, utf-16le/be, latin1,
//   windows-125x, iso-8859-x, shift_jis, euc-jp, gbk, big5, euc-kr, koi8-r...).
//   utf-32, utf-7, cesu8 are unknown: with express.json (charsets "utf-..." only), a
//   body in utf-32 or utf-7 is now refused with 415 instead of being decoded. No
//   browser nor usual HTTP client sends JSON in these encodings.
// - a Node built without ICU (or with small-icu) only knows utf-8, utf-16le and
//   latin1: the other charsets are refused (415), never decoded wrong.
// - the BOM is removed, as iconv-lite does by default.
//
// TO REMOVE IT
// 1. in the z4.config.json of each application, delete the "alias" entry above
//    (the bundle takes the real iconv-lite again, about 340 KB more)
// 2. in the package.json of z4js, delete the export "./iconv-lite"
// 3. delete this file, and its mentions in aicontext.md, README.md and CLAUDE.md

// true if the charset is known (body-parser answers 415 otherwise)
export function encodingExists( encoding: string ): boolean {
	try {
		new TextDecoder( encoding );
		return true;
	}
	catch {
		return false;
	}
}

// the whole body at once
export function decode( buffer: Uint8Array, encoding: string ): string {
	return new TextDecoder( encoding ).decode( buffer );
}

// a decoder for a body read in chunks (raw-body): throws if the charset is unknown.
// stream: true keeps a character cut between two chunks for the next one
export function getDecoder( encoding: string ) {
	const decoder = new TextDecoder( encoding );

	return {
		write: ( chunk: Uint8Array ): string => decoder.decode( chunk, { stream: true } ),
		end: ( ): string => decoder.decode( ),
	};
}
