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

// General tools: type checks, strings, object paths, dates (uuid: see shared/tools.ts).

import { checkedDate } from "./shared/tools";

// -- type checks --------------------------------------------------------------

export function isString( v: unknown ): v is string {
	return typeof v === "string";
}

// NaN and +/-Infinity are not numbers here
export function isNumber( v: unknown ): v is number {
	return typeof v === "number" && Number.isFinite( v );
}

// integers beyond Number.MAX_SAFE_INTEGER are refused, as everywhere in z4js (precision is lost)
export function isIntNumber( v: unknown ): v is number {
	return Number.isSafeInteger( v );
}

// integer >= 0: a count, a size, a duration
export function isUIntNumber( v: unknown ): v is number {
	return isIntNumber( v ) && v >= 0;
}

export function isArray( v: unknown ): v is any[] {
	return Array.isArray( v );
}

export function isFunction( v: unknown ): v is Function {
	return typeof v === "function";
}

// a valid date only (an Invalid Date is refused)
export function isDate( v: unknown ): v is Date {
	return v instanceof Date && !isNaN( v.getTime( ) );
}

// no Node dependency: usable on the client too
export { isPlainObject, groupInt, checkedDate, parseSqlDate, isUUID, toUUID } from "./shared/tools";
export type { SqlDatePart, UUID } from "./shared/tools";

// generic constructor definition
export type Constructor<P> = {
	new( ...params: any[] ): P;
};

// -- misc ---------------------------------------------------------------------

// freezes the object and everything it holds
export function deepFreeze<T>( obj: T ): T {
	for( const v of Object.values( obj ) ) {
		if( v && typeof v === "object" && !Object.isFrozen( v ) ) {
			deepFreeze( v );
		}
	}

	return Object.freeze( obj );
}

// value of a command line option: --name=value or --name value, null if absent
export function argValue( name: string, args = process.argv ): string {
	const flag = "--" + name;

	for( let i = 0; i < args.length; i++ ) {
		if( args[i].startsWith( flag + "=" ) ) {
			return args[i].slice( flag.length + 1 );
		}

		if( args[i] === flag ) {
			return args[i + 1] ?? null;
		}
	}

	return null;
}

// string code of an error (Node, database drivers: "ENOENT", SQLSTATE...), "" if none
export function errorCode( e: unknown ): string {
	const code = ( e as { code?: unknown } )?.code;
	return isString( code ) ? code : "";
}

// a Map used as a bounded cache keeps the insertion order: its first keys are the
// oldest. drops them until there is room for one more entry
export function dropOldest( map: Map<unknown, unknown>, max: number ) {
	while( map.size > 0 && map.size >= max ) {
		map.delete( map.keys( ).next( ).value );
	}
}

export function clamp<T>( v: T, min: T, max: T ): T {
	if( v < min ) {
		return min;
	}

	if( v > max ) {
		return max;
	}

	return v;
}

// -- strings ------------------------------------------------------------------

// size > 0: pad at the end, size < 0: pad at the start
// pad( 5, -2 ) -> "05"
export function pad( what: any, size: number, ch = "0" ): string {
	const value = String( what );
	return size > 0 ? value.padEnd( size, ch ) : value.padStart( -size, ch );
}

// replaces {0..9999} by the given arguments, an unknown index is left as is
// sprintf( "arg 1 {1} and arg 0 {0}", "a0", "a1" ) -> "arg 1 a1 and arg 0 a0"
export function sprintf( format: string, ...args: any[] ): string {
	return format.replace( /{(\d+)}/g, ( match, index ) => {
		return args[index] !== undefined ? args[index] : match;
	} );
}

// theThingToCase -> the-thing-to-case
export function kebabCase( text: string ): string {
	let result = text.replace( /([a-z])([A-Z])/g, "$1 $2" );
	result = result.toLowerCase( );
	result = result.replace( /[^- a-z0-9]+/g, " " );

	if( result.indexOf( " " ) < 0 ) {
		return result;
	}

	return result.trim( ).replace( / /g, "-" );
}

// the-thing to case -> theThingToCase
export function camelCase( text: string ): string {
	return text.toLowerCase( ).replace( /[^a-zA-Z0-9]+(.)/g, ( _m, chr ) => chr.toUpperCase( ) );
}

const HTML_ESCAPES: Record<string, string> = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	"\"": "&quot;",
	"'": "&#39;",
};

const HTML_SPECIALS = /[&<>"']/g;

// escapes the HTML special characters: the string is then safe as text content
// or as a quoted attribute value (mails, generated pages...)
export function sanitizeHtml( input: string ): string {
	if( !input ) {
		return "";
	}

	return input.replace( HTML_SPECIALS, ch => HTML_ESCAPES[ch] );
}

// -- object paths -------------------------------------------------------------

// segments that would reach the prototype chain: refused, so that a path coming
// from a client cannot modify Object.prototype (prototype pollution)
const FORBIDDEN_SEGMENTS = new Set( ["__proto__", "prototype", "constructor"] );

// "user.name" -> ["user", "name"], "user.tags[2]" -> ["user", "tags", "2"], "items[0][1]" -> ["items", "0", "1"]
function parsePath( path: string ): string[] {
	const segments: string[] = [];

	for( const part of path.split( "." ) ) {
		const bracket = part.indexOf( "[" );
		if( bracket < 0 ) {
			segments.push( part );
			continue;
		}

		if( bracket > 0 ) {
			segments.push( part.substring( 0, bracket ) );
		}

		for( const m of part.matchAll( /\[(\d+)\]/g ) ) {
			segments.push( m[1] );
		}
	}

	if( segments.some( s => FORBIDDEN_SEGMENTS.has( s ) ) ) {
		throw new Error( "forbidden path segment" );
	}

	return segments;
}

// parent object of the last segment, or null if the path is broken somewhere
function walkToParent( obj: any, segments: string[] ): any {
	let current = obj;

	for( let i = 0; i < segments.length - 1; i++ ) {
		if( current === null || current === undefined ) {
			return null;
		}

		current = current[segments[i]];
	}

	return current ?? null;
}

// getMemberValue( state, "user.tags[2]" ), undefined if the path is broken
export function getMemberValue( obj: any, path: string ): any {
	const segments = parsePath( path );
	const parent = walkToParent( obj, segments );
	return parent === null ? undefined : parent[segments[segments.length - 1]];
}

// false (nothing written) if an intermediate segment is missing
export function setMemberValue( obj: any, path: string, value: any ): boolean {
	const segments = parsePath( path );
	const parent = walkToParent( obj, segments );

	if( parent === null ) {
		return false;
	}

	parent[segments[segments.length - 1]] = value;
	return true;
}

// -- dates --------------------------------------------------------------------
// to be refined: local time vs UTC, week number, localized names

export function date_clone( date: Date ): Date {
	return new Date( date.getTime( ) );
}

// a number representing the day (local time): two hashes can be compared
export function date_hash( date: Date ): number {
	return date.getFullYear( ) << 16 | date.getMonth( ) << 8 | date.getDate( );
}

// week number (not ISO 8601)
export function date_calc_weeknum( date: Date ): number {
	const firstDayOfYear = new Date( date.getFullYear( ), 0, 1 );
	const pastDaysOfYear = ( date.valueOf( ) - firstDayOfYear.valueOf( ) ) / 86400000;
	return Math.floor( ( pastDaysOfYear + firstDayOfYear.getDay( ) + 1 ) / 7 );
}

// age in years at the date ref (now by default)
export function calcAge( birth: Date, ref = new Date( ) ): number {
	if( !birth ) {
		return 0;
	}

	let age = ref.getFullYear( ) - birth.getFullYear( );
	if( ref.getMonth( ) < birth.getMonth( ) || ( ref.getMonth( ) === birth.getMonth( ) && ref.getDate( ) < birth.getDate( ) ) ) {
		age--;
	}

	return age;
}

// sql format Y-M-D or Y-M-D H:I:S (local time)
export function date_to_sql( date: Date, withHours: boolean ): string {
	return formatIntlDate( date, withHours ? "Y-M-D H:I:S" : "Y-M-D" );
}

// date from an UTC sql date time "YYYY-MM-DD HH:MM:SS" (or "YYYY-MM-DD"),
// parsed as ISO 8601, the only format JS engines are required to read
export function date_sql_utc( date: string ): Date {
	const iso = date.length === 10 ? date + "T00:00:00Z" : date.replace( " ", "T" ) + "Z";
	return new Date( iso );
}

/**
 * parses a date according to the given formats, null if none matches or if the date is invalid
 * @param fmts - formats separated by a pipe, the most specific first
 * specifiers:
 * d: date (1 or 2 digits), D: date (2 digits)
 * m: month (1 or 2 digits), M: month (2 digits)
 * y: year (1 to 4 digits), Y: year (2 digits), YY: year (4 digits)
 * h: hours (1 or 2 digits), H: hours (2 digits)
 * i: minutes (1 or 2 digits), I: minutes (2 digits)
 * s: seconds (1 or 2 digits), S: seconds (2 digits)
 * <space>: 1 or more spaces
 * any other char: <0 or more spaces><the char><0 or more spaces>
 * @example
 * parseIntlDate( "25/12/2026", "d/m/y|y-m-d h:i:s|y-m-d" )
 */
export function parseIntlDate( value: string, fmts: string ): Date {
	for( const fmt of fmts.split( "|" ) ) {
		let pattern = "";

		for( let i = 0; i < fmt.length; i++ ) {
			const c = fmt[i];

			switch( c ) {
				case "d": pattern += "(?<day>\\d{1,2})"; break;
				case "D": pattern += "(?<day>\\d{2})"; break;
				case "m": pattern += "(?<month>\\d{1,2})"; break;
				case "M": pattern += "(?<month>\\d{2})"; break;
				case "y": pattern += "(?<year>\\d{1,4})"; break;
				case "h": pattern += "(?<hour>\\d{1,2})"; break;
				case "H": pattern += "(?<hour>\\d{2})"; break;
				case "i": pattern += "(?<min>\\d{1,2})"; break;
				case "I": pattern += "(?<min>\\d{2})"; break;
				case "s": pattern += "(?<sec>\\d{1,2})"; break;
				case "S": pattern += "(?<sec>\\d{2})"; break;
				case " ": pattern += "\\s+"; break;

				case "Y":
					if( fmt[i + 1] === "Y" ) {
						pattern += "(?<year>\\d{4})";
						i++;
					}
					else {
						pattern += "(?<year>\\d{2})";
					}
					break;

				// escape only the regex specials: "\" + a letter would make a class ("W" -> "\W": any separator)
				default:
					pattern += "\\s*" + c.replace( /[.*+?^${}()|[\]\\\/-]/, "\\$&" ) + "\\s*";
					break;
			}
		}

		const match = new RegExp( "^" + pattern + "$" ).exec( value );
		if( !match ) {
			continue;
		}

		const g = match.groups;
		const d = parseInt( g.day ?? "1" );
		const m = parseInt( g.month ?? "1" );
		const h = parseInt( g.hour ?? "0" );
		const i = parseInt( g.min ?? "0" );
		const s = parseInt( g.sec ?? "0" );

		let y = parseInt( g.year ?? new Date( ).getFullYear( ) + "" );
		if( y > 0 && y < 100 ) {
			y += 2000;
		}

		return checkedDate( false, y, m, d, h, i, s );
	}

	return null;
}

/**
 * formats a date
 * specifiers:
 * d: date, D: 2 digits date
 * w: week number, W: 2 digits week number
 * m: month, M: 2 digits month
 * y or Y: year
 * h: hours (24h), H: 2 digits hours
 * i: minutes, I: 2 digits minutes
 * s: seconds, S: 2 digits seconds
 * l: milliseconds, L: 3 digits milliseconds
 * a or A: am or pm
 * anything else is copied, text between {} is copied as is
 * (no localized day and month names: no i18n here)
 * @example
 * formatIntlDate( date, "{the }D/M/Y{ at }H:I" ) -> "the 25/12/2026 at 09:05"
 */
export function formatIntlDate( date: Date, fmt: string, utc = false ): string {
	if( !date ) {
		return "";
	}

	const now = {
		year: utc ? date.getUTCFullYear( ) : date.getFullYear( ),
		month: utc ? date.getUTCMonth( ) + 1 : date.getMonth( ) + 1,
		day: utc ? date.getUTCDate( ) : date.getDate( ),
		hours: utc ? date.getUTCHours( ) : date.getHours( ),
		minutes: utc ? date.getUTCMinutes( ) : date.getMinutes( ),
		seconds: utc ? date.getUTCSeconds( ) : date.getSeconds( ),
		milli: utc ? date.getUTCMilliseconds( ) : date.getMilliseconds( ),
	};

	let result = "";
	let esc = 0;

	for( const c of fmt ) {
		if( c === "{" ) {
			if( ++esc === 1 ) {
				continue;
			}
		}
		else if( c === "}" ) {
			if( --esc === 0 ) {
				continue;
			}
		}

		if( esc ) {
			result += c;
			continue;
		}

		switch( c ) {
			case "d": result += now.day; break;
			case "D": result += pad( now.day, -2 ); break;
			case "w": result += date_calc_weeknum( date ); break;
			case "W": result += pad( date_calc_weeknum( date ), -2 ); break;
			case "m": result += now.month; break;
			case "M": result += pad( now.month, -2 ); break;
			case "y":
			case "Y": result += pad( now.year, -4 ); break;
			case "a":
			case "A": result += now.hours < 12 ? "am" : "pm"; break;
			case "h": result += now.hours; break;
			case "H": result += pad( now.hours, -2 ); break;
			case "i": result += now.minutes; break;
			case "I": result += pad( now.minutes, -2 ); break;
			case "s": result += now.seconds; break;
			case "S": result += pad( now.seconds, -2 ); break;
			case "l": result += now.milli; break;
			case "L": result += pad( now.milli, -3 ); break;
			default: result += c; break;
		}
	}

	return result;
}
