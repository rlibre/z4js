/**
 *     _____ __
 *    |__   /  / _
 *      /  /  /_| |_
 *     /  /\____   _|
 *    /_____|   |_|
 *
 * @file params.ts
 * @author Etienne Cochard
 *
 * @copyright (c) 2026 R-libre ingenierie
 *
 * Use of this source code is governed by an MIT-style license
 * that can be found in the LICENSE file or at https://opensource.org/licenses/MIT.
 **/

// Extraction and validation of one named value from route params, query string or
// body. This is what paramValue / bodyValue / queryValue of EndPoints use.
//
// Conversions are intentionally tolerant (a number becomes a string, "yes"/"1" is
// true...), because URL parameters always arrive as strings. Everything else is
// strict: a bad value is a 400 that names the parameter and never echoes the value.

import { HttpError } from "./http-error";
import { groupInt, isPlainObject, isString, isUUID, parseSqlDate, toUUID } from "./tools";
import type { UUID } from "./tools";

// TypeScript type of the value returned for each kind of parameter
export interface ArgTypes {
	"string": string;
	"number": number;
	"integer": number;
	"boolean": boolean;
	"array": any[];
	"object": Record<string, any>;
	"any": any;
	"uuid": UUID;
	"date": Date;
	"sql-date": Date;
	"sql-datetime": Date;
	"time": string;
}

export type ArgType = keyof ArgTypes;

export interface ValueType {
	required?: boolean;		// default true
	nullable?: boolean;
	default?: unknown;		// returned when the value is absent and not required
	maxlength?: number;		// strings: length in characters (like the database counts them)
	truncate?: boolean;		// strings: cut to maxlength instead of rejecting
	trim?: boolean;			// strings
	minval?: number;		// numbers
	maxval?: number;		// numbers
	utc?: boolean;			// sql-date, sql-datetime: build the Date in UTC (local time otherwise)
	validator?: ( data: unknown ) => boolean;	// last word: checked on the converted value (each item for arrays)
}

const TIME_RE = /^(\d{2}):(\d{2})(?::(\d{2}))?$/;
const FLOAT_RE = /^-?\d+(?:\.\d+)?$/;
const INT_RE = /^-?\d+$/;

const TRUE_VALUES = new Set<unknown>( [true, "true", "yes", "1", 1] );
const FALSE_VALUES = new Set<unknown>( [false, "false", "no", "0", 0] );

function badType( name: string, detail = "" ): HttpError {
	return new HttpError( 400, `Bad parameter type for "${name}"${detail}` );
}

export function getParam( from: unknown, name: string, type: ArgType, mode?: ValueType ): any {
	const opts: ValueType = { required: true, nullable: false, ...mode };

	// an absent source (body not parsed, for instance) is an empty one, not a server error.
	// so is anything but a plain object: a JSON body sent as an array would otherwise
	// expose its "length" as a parameter (req.query has a null prototype: accepted)
	const source = isPlainObject( from ) ? from : {};

	// own properties only: "constructor" or "toString" are never present
	if( opts.required && !Object.hasOwn( source, name ) ) {
		throw new HttpError( 400, `Expected "${name}" parameter` );
	}

	let val: unknown = Object.hasOwn( source, name ) ? source[name] : undefined;
	if( val === undefined ) {
		return opts.default;
	}

	if( opts.nullable && val === null ) {
		return null;
	}

	switch( type ) {
		case "any":
			break;

		case "object":
			if( !isPlainObject( val ) ) {
				throw badType( name, " (object expected)" );
			}
			break;

		case "array": {
			// a single value (?a=1) is an array of one
			const items = typeof val === "string" || typeof val === "number" ? [val] : val;
			if( !Array.isArray( items ) ) {
				throw badType( name );
			}

			return items.map( ( x: unknown ) => {
				const item = typeof x === "number" ? x + "" : x;
				if( opts.validator && !opts.validator( item ) ) {
					throw badType( name );
				}
				return item;
			} );
		}

		// lowercase, like Postgres outputs it: the same UUID always compares equal
		case "uuid":
			if( !isUUID( val ) ) {
				throw badType( name );
			}

			val = toUUID( val );
			break;

		case "string": {
			if( typeof val === "number" ) {
				val = val + "";
			}
			else if( typeof val !== "string" ) {
				throw badType( name );
			}

			let str = val as string;
			if( opts.trim ) {
				str = str.trim( );
			}

			if( opts.maxlength !== undefined ) {
				// code points, like the database counts characters
				const chars = [...str];
				if( chars.length > opts.maxlength ) {
					if( !opts.truncate ) {
						throw new HttpError( 400, `Value too long for "${name}"` );
					}
					str = chars.slice( 0, opts.maxlength ).join( "" );
				}
			}

			val = str;
			break;
		}

		case "number":
		case "integer": {
			// only strings and numbers: an array like [1] would otherwise pass as "1"
			if( typeof val !== "string" && typeof val !== "number" ) {
				throw badType( name );
			}

			const text = String( val );
			if( !( type === "integer" ? INT_RE : FLOAT_RE ).test( text ) ) {
				throw badType( name );
			}

			const num = type === "integer" ? parseInt( text, 10 ) : parseFloat( text );
			if( type === "integer" ? !Number.isSafeInteger( num ) : !Number.isFinite( num ) ) {
				throw badType( name );
			}

			if( opts.minval !== undefined && num < opts.minval ) {
				throw new HttpError( 400, `Value too low for "${name}"` );
			}

			if( opts.maxval !== undefined && num > opts.maxval ) {
				throw new HttpError( 400, `Value too high for "${name}"` );
			}

			val = num;
			break;
		}

		case "boolean":
			if( TRUE_VALUES.has( val ) ) {
				val = true;
			}
			else if( FALSE_VALUES.has( val ) ) {
				val = false;
			}
			else {
				throw badType( name, " invalid boolean value" );
			}
			break;

		case "date": {
			// a timestamp in milliseconds, or anything Date can read
			if( typeof val !== "string" && typeof val !== "number" ) {
				throw badType( name, " invalid date value" );
			}

			const text = String( val );
			const date = /^\d+$/.test( text ) ? new Date( Number( text ) ) : new Date( text );
			if( isNaN( date.getTime( ) ) ) {
				throw badType( name, " invalid date value" );
			}

			val = date;
			break;
		}

		case "sql-date":
		case "sql-datetime": {
			const date = isString( val ) ? parseSqlDate( val, type === "sql-date" ? "date" : "datetime", !!opts.utc ) : null;
			if( !date ) {
				throw badType( name, " invalid date value" );
			}

			val = date;
			break;
		}

		case "time": {
			const m = typeof val === "string" ? TIME_RE.exec( val ) : null;
			if( !m || groupInt( m, 1 ) > 23 || groupInt( m, 2 ) > 59 || groupInt( m, 3 ) > 59 ) {
				throw badType( name, " invalid time format" );
			}
			break;
		}
	}

	if( opts.validator && !opts.validator( val ) ) {
		throw badType( name );
	}

	return val;
}
