/**
 *     _____ __
 *    |__   /  / _
 *      /  /  /_| |_
 *     /  /\____   _|
 *    /_____|   |_|
 *
 * @file tools.ts
 * @author Etienne Cochard
 *
 * @copyright (c) 2026 R-libre ingenierie
 *
 * Use of this source code is governed by an MIT-style license
 * that can be found in the LICENSE file or at https://opensource.org/licenses/MIT.
 **/

// Tools with no Node or browser dependency: usable on the server and on the client.
// src/tools.ts re-exports them, so z4js code imports everything from one place.

// object literal or Object.create( null ): not an array, a Date, a Map, a class instance...
export function isPlainObject( v: unknown ): v is Record<string, any> {
	if( !v || typeof v !== "object" ) {
		return false;
	}

	const proto = Object.getPrototypeOf( v );
	return proto === Object.prototype || !proto;
}

// the integer captured by group i of a regex match, 0 if the group did not match
export function groupInt( m: RegExpExecArray, i: number ): number {
	return m[i] === undefined ? 0 : parseInt( m[i], 10 );
}

// the date built from its parts, null if it does not exist: Date silently moves
// out of range values (31/02 -> 03/03, 25:00 -> next day), so the date must read
// back unchanged. month: 1 to 12
export function checkedDate( utc: boolean, y: number, mo: number, d: number, h = 0, mi = 0, s = 0, ms = 0 ): Date {
	const date = utc ? new Date( Date.UTC( y, mo - 1, d, h, mi, s, ms ) ) : new Date( y, mo - 1, d, h, mi, s, ms );

	const same = utc
		? date.getUTCFullYear( ) === y && date.getUTCMonth( ) === mo - 1 && date.getUTCDate( ) === d &&
			date.getUTCHours( ) === h && date.getUTCMinutes( ) === mi && date.getUTCSeconds( ) === s
		: date.getFullYear( ) === y && date.getMonth( ) === mo - 1 && date.getDate( ) === d &&
			date.getHours( ) === h && date.getMinutes( ) === mi && date.getSeconds( ) === s;

	return same ? date : null;
}

// "YYYY-MM-DD" or "YYYY/MM/DD" (one separator, typed by hand or not), then for a
// date time: "T" or a space, "HH:MM:SS", 1 to 3 digits of milliseconds, a final "Z"
const SQL_DATE_RE = /^(\d{4})([-/])(\d{2})\2(\d{2})(?:[T ](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z)?)?$/;

// what the text must hold: a date, a date and a time, or either
export type SqlDatePart = "date" | "datetime" | "any";

// reads a sql / iso date, null if the format is wrong or the date does not exist.
// a final "Z" always means UTC; without it, utc chooses between UTC and local time.
// offsets ("+02:00") are not accepted
export function parseSqlDate( text: string, part: SqlDatePart, utc: boolean ): Date {
	const m = SQL_DATE_RE.exec( text );
	if( !m ) {
		return null;
	}

	const hasTime = m[5] !== undefined;
	if( ( part === "date" && hasTime ) || ( part === "datetime" && !hasTime ) ) {
		return null;
	}

	const ms = m[8] ? parseInt( m[8].padEnd( 3, "0" ), 10 ) : 0;

	return checkedDate( utc || m[9] === "Z", groupInt( m, 1 ), groupInt( m, 3 ), groupInt( m, 4 ),
		groupInt( m, 5 ), groupInt( m, 6 ), groupInt( m, 7 ), ms );
}

// -- uuid ---------------------------------------------------------------------

// a string checked as an UUID: a plain string is refused where an UUID is expected,
// it must go through toUUID (or paramValue "uuid"). no cost at run time
export type UUID = string & { readonly __brand: "uuid" };

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// format check only: an uppercase UUID passes, but is not normalized (see toUUID)
export function isUUID( v: unknown ): v is UUID {
	return typeof v === "string" && UUID_RE.test( v );
}

// the UUID in lowercase, as Postgres outputs it: two writings of the same UUID
// then compare equal (===, Map keys, SQLite text). throws if v is not an UUID
// (the message never contains the value)
export function toUUID( v: unknown ): UUID {
	if( !isUUID( v ) ) {
		throw new TypeError( "invalid UUID" );
	}

	return v.toLowerCase( ) as UUID;
}
