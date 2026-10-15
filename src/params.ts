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
// body. This is what paramValue / bodyValue / queryValue of Ctx use.
//
// Conversions are intentionally tolerant (a number becomes a string, "yes"/"1" is
// true...), because URL parameters always arrive as strings. Everything else is
// strict: a bad value is a 400 that names the parameter and never echoes the value.

import { HttpError } from "./http-error";
import { ShapeError } from "./shared/shape";
import type { ObjectValidator } from "./shared/shape";
import { groupInt, isPlainObject, isString, isUUID, parseSqlDate, toUUID } from "./tools";
import type { UUID } from "./tools";

// TypeScript type of the value returned for each kind of parameter ("enum": the union
// of its values, given by the signature of the readers, see EnumMode)
interface ScalarTypes {
	"string": string;
	"number": number;
	"integer": number;
	"boolean": boolean;
	"object": Record<string, any>;
	"any": any;
	"uuid": UUID;
	"enum": string;
	"date": Date;
	"sql-date": Date;
	"sql-datetime": Date;
	"time": string;
}

type ScalarType = keyof ScalarTypes;

// the kinds that also exist as arrays ("integer[]"...): each item is converted and
// validated with the options
const ARRAY_ITEMS = ["string", "number", "integer", "uuid", "boolean", "object"] as const satisfies readonly ScalarType[];

export type ArgTypes = ScalarTypes & { [K in typeof ARRAY_ITEMS[number] as `${K}[]`]: ScalarTypes[K][] };

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
	values?: readonly string[];	// enum: the accepted values (required, see EnumMode)
	maxitems?: number;		// arrays: default MAX_ITEMS
	validator?: ( data: unknown ) => boolean;	// last word: checked on the converted value (each item for arrays)
}

// the options of an "enum": values required, the result is their union ("open" | "closed"),
// without "as const". forgetting them is a compile error, not a 500 at run time
export type EnumMode<V extends readonly string[]> = ValueType & { values: V };

// the options of an "object" or "object[]" checked by a Shape (bodyValue only): the
// result is typed by the shape and holds its declared fields only (each item for an array)
export type ShapeMode<T> = ValueType & { shape: ObjectValidator<T> };

// what getParam reads: the options, and the shape of an "object" (ShapeMode)
export type ParamMode = ValueType & { shape?: ObjectValidator<any> };

// items of an array parameter, unless maxitems says otherwise
const MAX_ITEMS = 100;

const TIME_RE = /^(\d{2}):(\d{2})(?::(\d{2}))?$/;
const FLOAT_RE = /^-?\d+(?:\.\d+)?$/;
const INT_RE = /^-?\d+$/;

const TRUE_VALUES = new Set<unknown>( [true, "true", "yes", "1", 1] );
const FALSE_VALUES = new Set<unknown>( [false, "false", "no", "0", 0] );

function badType( name: string, detail = "" ): HttpError {
	return new HttpError( 400, `Bad parameter type for "${name}"${detail}` );
}

export function getParam( from: unknown, name: string, type: ArgType, mode?: ParamMode ): any {
	const opts: ParamMode = { required: true, nullable: false, ...mode };

	// an absent source (body not parsed, for instance) is an empty one, not a server error.
	// so is anything but a plain object: a JSON body sent as an array would otherwise
	// expose its "length" as a parameter (req.query has a null prototype: accepted)
	const source = isPlainObject( from ) ? from : {};

	// own properties only: "constructor" or "toString" are never present
	if( opts.required && !Object.hasOwn( source, name ) ) {
		throw new HttpError( 400, `Expected "${name}" parameter` );
	}

	const val: unknown = Object.hasOwn( source, name ) ? source[name] : undefined;
	if( val === undefined ) {
		return opts.default;
	}

	if( opts.nullable && val === null ) {
		return null;
	}

	if( type.endsWith( "[]" ) ) {
		const itemType = type.slice( 0, -2 ) as ScalarType;
		if( !( ARRAY_ITEMS as readonly string[] ).includes( itemType ) ) {
			throw new Error( `unknown parameter type ${type}` );
		}

		// a single value (?a=1) is an array of one
		const items = Array.isArray( val ) ? val : [val];
		if( items.length > ( opts.maxitems ?? MAX_ITEMS ) ) {
			throw new HttpError( 400, `Too many values for "${name}"` );
		}

		return items.map( item => convert( name, itemType, item, opts ) );
	}

	return convert( name, type as ScalarType, val, opts );
}

// one value of the given kind, converted and validated
function convert( name: string, type: ScalarType, val: unknown, opts: ParamMode ): unknown {
	switch( type ) {
		case "any":
			break;

		case "object":
			if( !isPlainObject( val ) ) {
				throw badType( name, " (object expected)" );
			}

			// the message of a Shape names the field, never the value
			if( opts.shape ) {
				try {
					val = opts.shape.parse( val );
				}
				catch( e ) {
					throw e instanceof ShapeError ? new HttpError( 400, `Bad parameter "${name}": ${e.message}` ) : e;
				}
			}
			break;

		case "enum":
			// a programming error, not the client's: the route cannot work
			if( !Array.isArray( opts.values ) ) {
				throw new Error( `enum parameter "${name}" without values` );
			}

			if( !isString( val ) || !opts.values.includes( val ) ) {
				throw badType( name );
			}
			break;

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

		// refused by default: an unknown kind would let the raw value through
		default:
			throw new Error( `unknown parameter type ${type}` );
	}

	if( opts.validator && !opts.validator( val ) ) {
		throw badType( name );
	}

	return val;
}
