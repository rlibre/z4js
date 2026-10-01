/**
 *     _____ __
 *    |__   /  / _
 *      /  /  /_| |_
 *     /  /\____   _|
 *    /_____|   |_|
 *
 * @file log.ts
 * @author Etienne Cochard
 *
 * @copyright (c) 2026 R-libre ingenierie
 *
 * Use of this source code is governed by an MIT-style license
 * that can be found in the LICENSE file or at https://opensource.org/licenses/MIT.
 **/

// The log command: colors the log lines read on the standard input, for reading only.
// The logger itself never writes a color: a log file stays plain text.
//
//   npm start | z4js log
//   tail -f logs/app.log | z4js log --level=warn
//
// A line that is not a z4js log line (a Node trace, a console.log...) is written as is.
// Colors only when the output is a terminal and NO_COLOR is not set (https://no-color.org).

import { createInterface } from "node:readline";
import { LOG_LEVELS, SECURITY_LEVEL } from "../src/logger";
import type { LogLevel } from "../src/logger";

const ESC = "\x1b[";
const RESET = ESC + "0m";
const DIM = ESC + "2m";

// color of each level of the lines
const COLORS: Record<string, string> = {
	DEBUG: ESC + "90m",
	INFO: ESC + "36m",
	WARN: ESC + "33m",
	ERROR: ESC + "31m",
	FATAL: ESC + "1;31m",
	[SECURITY_LEVEL]: ESC + "35m",
};

// <date> <LEVEL> <request id> <event> [<json>]
const LEVELS = [...LOG_LEVELS.map( l => l.toUpperCase( ) ), SECURITY_LEVEL];
const LINE_RE = new RegExp( `^(\\S+) (${LEVELS.join( "|" )}) (\\S+ \\S+)( .*)?$` );

// level: lines below it are skipped (the security lines are always shown)
export async function log( level: string ) {
	if( level !== null && !( LOG_LEVELS as readonly string[] ).includes( level ) ) {
		throw new Error( `--level: one of ${LOG_LEVELS.join( ", " )}` );
	}

	const min = level === null ? 0 : LOG_LEVELS.indexOf( level as LogLevel );
	const colored = !!process.stdout.isTTY && !process.env.NO_COLOR;

	for await ( const line of createInterface( { input: process.stdin, crlfDelay: Infinity } ) ) {
		const m = LINE_RE.exec( line );

		if( m && m[2] !== SECURITY_LEVEL && LOG_LEVELS.indexOf( m[2].toLowerCase( ) as LogLevel ) < min ) {
			continue;
		}

		process.stdout.write( ( m && colored ? colorize( m ) : line ) + "\n" );
	}
}

// date and json dimmed, level in its color, request id and event as they are
function colorize( m: RegExpExecArray ): string {
	const [, date, level, head, json] = m;
	return `${DIM}${date}${RESET} ${COLORS[level]}${level}${RESET} ${head}${json ? DIM + json + RESET : ""}`;
}
