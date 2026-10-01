/**
 *     _____ __
 *    |__   /  / _
 *      /  /  /_| |_
 *     /  /\____   _|
 *    /_____|   |_|
 *
 * @file shape.ts
 * @author Etienne Cochard
 *
 * @copyright (c) 2026 R-libre ingenierie
 *
 * Use of this source code is governed by an MIT-style license
 * that can be found in the LICENSE file or at https://opensource.org/licenses/MIT.
 **/

// No Node or browser dependency in this file: usable on the server and on the client.

import { isPlainObject, parseSqlDate, UUID_RE } from "./tools";
import type { SqlDatePart } from "./tools";

// a value refused by a validator: the message names the field, never the value
export class ShapeError extends Error {}

// base class of the validators: optional and nullable, then the check of the value
abstract class BaseValidator {
	private _optional = false;
	private _nullable = false;

	optional( ): this { this._optional = true; return this; }
	nullable( ): this { this._nullable = true; return this; }

	isOptional( ) { return this._optional; }
	isNullable( ) { return this._nullable; }

	// throws ShapeError on failure, never includes the received value in the message
	abstract validate( name: string, value: unknown ): unknown;
}

// ---------------------------------------------------------------------------

// validates a string: length, trim, truncate, format
class StringValidator extends BaseValidator {
	private _minLen?: number;
	private _maxLen?: number;
	private _truncate = false;
	private _trim = false;
	private _regex?: RegExp;
	private _formatName = "format";

	trim( ): this {
		this._trim = true;
		return this;
	}

	minLen( min: number ): this {
		this._minLen = min;
		return this;
	}

	// reject anything longer than max (default behavior)
	maxLen( max: number ): this {
		this._maxLen = max;
		return this;
	}

	// only meaningful with maxLen: cut the value instead of rejecting it
	truncate( ): this {
		this._truncate = true;
		return this;
	}

	email( ): this {
		return this.format( /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "email" );
	}

	uuid( ): this {
		return this.format( UUID_RE, "uuid" );
	}

	// a second call replaces the first one: a string has a single format
	format( regex: RegExp, name = "format" ): this {
		this._regex = regex;
		this._formatName = name;
		return this;
	}

	validate( name: string, value: unknown ): string {
		if( typeof value !== "string" ) {
			throw new ShapeError( `"${name}": string expected` );
		}

		let str = this._trim ? value.trim( ) : value;

		// the format is tested on the original value, before any truncation
		if( this._regex && !this._regex.test( str ) ) {
			throw new ShapeError( `"${name}": bad ${this._formatName}` );
		}

		// count code points (like Postgres counts characters), not UTF-16 units
		const chars = [...str];

		if( this._minLen !== undefined && chars.length < this._minLen ) {
			throw new ShapeError( `"${name}": too short (min ${this._minLen})` );
		}

		if( this._maxLen !== undefined && chars.length > this._maxLen ) {
			if( !this._truncate ) {
				throw new ShapeError( `"${name}": too long (max ${this._maxLen})` );
			}

			str = chars.slice( 0, this._maxLen ).join( "" );
		}

		return str;
	}
}

// ---------------------------------------------------------------------------

// validates a number: finite, integer, bounds, not zero
class NumberValidator extends BaseValidator {
	private _min?: number;
	private _max?: number;
	private _integer = false;
	private _notZero = false;

	minMax( min: number, max: number ): this {
		this._min = min;
		this._max = max;
		return this;
	}

	integer( ): this {
		this._integer = true;
		return this;
	}

	notZero( ): this {
		this._notZero = true;
		return this;
	}

	validate( name: string, value: unknown ): number {
		// Number.isFinite rejects NaN and +/-Infinity
		if( typeof value !== "number" || !Number.isFinite( value ) ) {
			throw new ShapeError( `"${name}": number expected` );
		}

		if( this._integer && !Number.isInteger( value ) ) {
			throw new ShapeError( `"${name}": integer expected` );
		}

		if( this._min !== undefined && value < this._min ) {
			throw new ShapeError( `"${name}": too low (min ${this._min})` );
		}

		if( this._max !== undefined && value > this._max ) {
			throw new ShapeError( `"${name}": too high (max ${this._max})` );
		}

		if( this._notZero && value === 0 ) {
			throw new ShapeError( `"${name}": cannot be zero` );
		}

		return value;
	}
}

// ---------------------------------------------------------------------------

// strict: only real booleans are accepted
class BoolValidator extends BaseValidator {
	validate( name: string, value: unknown ): boolean {
		if( typeof value !== "boolean" ) {
			throw new ShapeError( `"${name}": boolean expected` );
		}

		return value;
	}
}

// ---------------------------------------------------------------------------

// validates a value from a fixed list
class EnumValidator extends BaseValidator {
	private _values: readonly string[];

	constructor( values: readonly string[] ) {
		super( );
		this._values = [...values];
	}

	validate( name: string, value: unknown ): string {
		// the received value is never echoed back
		if( typeof value !== "string" || !this._values.includes( value ) ) {
			throw new ShapeError( `"${name}": unknown value` );
		}

		return value;
	}
}

// ---------------------------------------------------------------------------

export type DateFormat = "sql-date" | "sql-datetime" | "iso";

const DATE_PARTS: Record<DateFormat, SqlDatePart> = { "sql-date": "date", "sql-datetime": "datetime", "iso": "any" };

// always UTC, so the result is the same in a browser and on the server
class DateValidator extends BaseValidator {
	constructor( private _format: DateFormat ) {
		super( );
	}

	validate( name: string, value: unknown ): Date {
		if( typeof value !== "string" ) {
			throw new ShapeError( `"${name}": date expected` );
		}

		const date = parseSqlDate( value, DATE_PARTS[this._format], true );
		if( !date ) {
			throw new ShapeError( `"${name}": bad date format` );
		}

		return date;
	}
}

// ---------------------------------------------------------------------------

// the table must describe every key of T, so a forgotten or misspelled field fails to compile
type Fields<T> = { [K in keyof T]-?: BaseValidator };

// validates an object field by field: only the declared fields are kept
export class ObjectValidator<T = any> extends BaseValidator {

	constructor( private fields: Fields<T> ) {
		super( );
	}

	parse( data: unknown ): T;
	parse( data: unknown, partial: true ): Partial<T>;
	parse( data: unknown, partial = false ): any {
		if( !isPlainObject( data ) ) {
			throw new ShapeError( "object expected" );
		}

		const result: Record<string, unknown> = {};

		for( const key of Object.keys( this.fields ) ) {
			const validator = ( this.fields as Record<string, BaseValidator> )[key];

			// own properties only, so "constructor" or "toString" never count as present
			const present = Object.hasOwn( data, key );
			const value = present ? data[key] : undefined;

			if( value === undefined ) {
				if( !partial && !validator.isOptional( ) ) {
					throw new ShapeError( `"${key}": required` );
				}
				continue;
			}

			// null is kept as null (PATCH: "absent" means untouched, "null" means clear)
			if( value === null ) {
				if( !validator.isNullable( ) ) {
					throw new ShapeError( `"${key}": cannot be null` );
				}
				result[key] = null;
				continue;
			}

			result[key] = validator.validate( key, value );
		}

		return result;
	}

	parseArray( data: unknown ): T[] {
		if( !Array.isArray( data ) ) {
			throw new ShapeError( "array expected" );
		}

		return data.map( line => this.parse( line ) );
	}

	validate( _name: string, value: unknown ) {
		return this.parse( value );
	}
}

// ---------------------------------------------------------------------------

// the entry point of the validators: Shape.string( ), Shape.object( { ... } )...
export class Shape {
	static string( ) { return new StringValidator( ); }
	static email( ) { return new StringValidator( ).email( ); }
	static uuid( ) { return new StringValidator( ).uuid( ); }
	static number( ) { return new NumberValidator( ); }
	static boolean( ) { return new BoolValidator( ); }
	static enum( ...values: string[] ) { return new EnumValidator( values ); }
	static date( format: DateFormat ) { return new DateValidator( format ); }

	static object<T = any>( fields: Fields<T> ) {
		return new ObjectValidator<T>( fields );
	}
}
