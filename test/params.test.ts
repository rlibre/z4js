// Reading of one named value: conversions, arrays, enum, Shape, refusals.

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { HttpError, Shape } from "../src/index";
import { getParam } from "../src/params";

// the HttpError thrown, with its status and message
function refused( fn: ( ) => unknown ): HttpError {
	try {
		fn( );
	}
	catch( e ) {
		assert.ok( e instanceof HttpError, `HttpError expected, got ${e}` );
		return e;
	}

	assert.fail( "refusal expected" );
}

describe( "scalars", ( ) => {
	it( "converts the strings of an URL", ( ) => {
		assert.equal( getParam( { a: "12" }, "a", "integer" ), 12 );
		assert.equal( getParam( { a: "1.5" }, "a", "number" ), 1.5 );
		assert.equal( getParam( { a: "yes" }, "a", "boolean" ), true );
		assert.equal( getParam( { a: 12 }, "a", "string" ), "12" );
	} );

	it( "returns a lowercase uuid", ( ) => {
		assert.equal( getParam( { a: "0D3F1E2A-1B2C-4D5E-8F90-A1B2C3D4E5F6" }, "a", "uuid" ), "0d3f1e2a-1b2c-4d5e-8f90-a1b2c3d4e5f6" );
	} );

	it( "refuses a missing value, names it, never echoes a value", ( ) => {
		const e = refused( ( ) => getParam( {}, "a", "string" ) );
		assert.equal( e.code, 400 );
		assert.match( e.message, /"a"/ );

		const bad = refused( ( ) => getParam( { a: "secret-value" }, "a", "integer" ) );
		assert.doesNotMatch( bad.message, /secret-value/ );
	} );

	it( "returns the default of an absent value that is not required", ( ) => {
		assert.equal( getParam( {}, "a", "integer", { required: false, default: 3 } ), 3 );
	} );

	it( "checks the limits", ( ) => {
		assert.equal( refused( ( ) => getParam( { a: "abcdef" }, "a", "string", { maxlength: 3 } ) ).code, 400 );
		assert.equal( getParam( { a: "abcdef" }, "a", "string", { maxlength: 3, truncate: true } ), "abc" );
		assert.equal( refused( ( ) => getParam( { a: "0" }, "a", "integer", { minval: 1 } ) ).code, 400 );
	} );

	it( "ignores inherited properties", ( ) => {
		assert.equal( refused( ( ) => getParam( {}, "constructor", "any" ) ).code, 400 );
	} );

	it( "refuses an unknown type (server error, not a raw value)", ( ) => {
		assert.throws( ( ) => getParam( { a: "x" }, "a", "nope" as any ), /unknown parameter type/ );
		assert.throws( ( ) => getParam( { a: ["x"] }, "a", "nope[]" as any ), /unknown parameter type/ );
	} );
} );

describe( "enum", ( ) => {
	it( "accepts one of its values only", ( ) => {
		assert.equal( getParam( { s: "open" }, "s", "enum", { values: ["open", "closed"] } ), "open" );
		assert.equal( refused( ( ) => getParam( { s: "other" }, "s", "enum", { values: ["open", "closed"] } ) ).code, 400 );
	} );

	it( "without values is a server error", ( ) => {
		assert.throws( ( ) => getParam( { s: "open" }, "s", "enum" ), /without values/ );
	} );
} );

describe( "arrays", ( ) => {
	it( "converts each item, a single value is an array of one", ( ) => {
		assert.deepEqual( getParam( { ids: ["1", "2"] }, "ids", "integer[]" ), [1, 2] );
		assert.deepEqual( getParam( { ids: "7" }, "ids", "integer[]" ), [7] );
	} );

	it( "refuses a bad item", ( ) => {
		assert.equal( refused( ( ) => getParam( { ids: ["1", "x"] }, "ids", "integer[]" ) ).code, 400 );
	} );

	it( "holds 100 items unless maxitems says otherwise", ( ) => {
		const many = Array.from( { length: 101 }, ( ) => "1" );
		assert.match( refused( ( ) => getParam( { ids: many }, "ids", "integer[]" ) ).message, /Too many values/ );
		assert.equal( refused( ( ) => getParam( { ids: ["1", "2", "3"] }, "ids", "integer[]", { maxitems: 2 } ) ).code, 400 );
	} );
} );

describe( "shape", ( ) => {
	interface Order { item: string; qty: number }
	const shape = Shape.object<Order>( { item: Shape.string( ).maxLen( 20 ), qty: Shape.number( ).minMax( 1, 100 ) } );

	it( "keeps the declared fields only", ( ) => {
		assert.deepEqual( getParam( { order: { item: "pen", qty: 2, extra: 1 } }, "order", "object", { shape } ), { item: "pen", qty: 2 } );
	} );

	it( "names the member and the field of a refusal, never the value", ( ) => {
		const e = refused( ( ) => getParam( { order: { item: "pen", qty: 4242 } }, "order", "object", { shape } ) );
		assert.equal( e.code, 400 );
		assert.match( e.message, /"order".*"qty"/ );
		assert.doesNotMatch( e.message, /4242/ );
	} );

	it( "checks each item of an object[]", ( ) => {
		assert.deepEqual( getParam( { lines: [{ item: "a", qty: 1 }] }, "lines", "object[]", { shape } ), [{ item: "a", qty: 1 }] );
		assert.equal( refused( ( ) => getParam( { lines: [{ item: "a", qty: 1 }, { item: "b", qty: 0 }] }, "lines", "object[]", { shape } ) ).code, 400 );
	} );
} );
