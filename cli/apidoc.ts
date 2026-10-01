/**
 *     _____ __
 *    |__   /  / _
 *      /  /  /_| |_
 *     /  /\____   _|
 *    /_____|   |_|
 *
 * @file apidoc.ts
 * @author Etienne Cochard
 *
 * @copyright (c) 2026 R-libre ingenierie
 *
 * Use of this source code is governed by an MIT-style license
 * that can be found in the LICENSE file or at https://opensource.org/licenses/MIT.
 **/

// The apidoc command: writes the OpenAPI 3 description of the routes of a project.
//
// Nothing runs: the TypeScript compiler reads the sources and finds
//   - the groups and what they mount: RouteGroup.guarded/unprotected( ... ).add( ... )
//   - the routes of each EndPoints: this.get/post/put/patch/del( path, handler, options )
//     and this.route( path, ... ) for the endpoints of a Channel
//   - the values read by each handler: paramValue, bodyValue, queryValue, with their
//     type and options, and the statuses it answers (res.status( 201 ), new HttpError( 404 ))
//   - the comment above the handler, as the description of the route
//
// Names, types and options must be literals (or constants): anything else is reported
// as a warning, never guessed. Methods of the EndPoints called by a handler
// (this.need( ... )) are read too.

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type * as TS from "typescript";
import { statusText } from "../src/http-error";
import type { Method } from "../src/endpoints";
import type { ArgType, ValueType } from "../src/params";
import { joinPath, PARAM_RE } from "../src/paths";

type Json = Record<string, any>;

// OpenAPI schema of each kind of value read by paramValue, bodyValue and queryValue
const SCHEMAS: Record<ArgType, Json> = {
	"string": { type: "string" },
	"number": { type: "number" },
	"integer": { type: "integer" },
	"boolean": { type: "boolean" },
	"array": { type: "array", items: {} },
	"object": { type: "object" },
	"any": {},
	"uuid": { type: "string", format: "uuid" },
	"date": { type: "string", format: "date-time", description: "or a timestamp in milliseconds" },
	"sql-date": { type: "string", format: "date" },
	"sql-datetime": { type: "string", example: "2026-01-31 12:00:00" },
	"time": { type: "string", example: "12:00:00" },
};

const READERS: Record<string, "path" | "query" | "body"> = {
	paramValue: "path",
	queryValue: "query",
	bodyValue: "body",
};

// EndPoints method -> HTTP method
const HTTP_METHODS: Record<string, Method> = {
	get: "get",
	post: "post",
	put: "put",
	patch: "patch",
	del: "delete",
};

interface Value {
	where: "path" | "query" | "body";
	name: string;
	type: ArgType;
	options: Partial<Record<keyof ValueType, unknown>>;
}

// what a handler does: values read, statuses answered (code -> messages)
interface Usage {
	values: Value[];
	statuses: Map<number, Set<string>>;
}

interface Group {
	prefix: string;
	guarded: boolean;
}

export async function apidoc( project: string ): Promise<{ doc: Json, warnings: string[] }> {
	const tsconfig = resolve( project );
	const root = dirname( tsconfig );
	const ts = await loadTypescript( root );

	const read = ts.readConfigFile( tsconfig, ts.sys.readFile );
	if( read.error ) {
		throw new Error( ts.flattenDiagnosticMessageText( read.error.messageText, "\n" ) );
	}

	const parsed = ts.parseJsonConfigFileContent( read.config, ts.sys, root );
	const program = ts.createProgram( parsed.fileNames, parsed.options );
	const scanner = new ApiScanner( ts, program.getTypeChecker( ), root );

	// only the files of the project hold its groups (the framework has none)
	for( const file of parsed.fileNames ) {
		scanner.scanFile( program.getSourceFile( file ) );
	}

	return { doc: scanner.document( readPackage( root ) ), warnings: scanner.warnings };
}

// the compiler of the project first (its tsconfig is written for it), else ours
async function loadTypescript( root: string ): Promise<typeof TS> {
	for( const from of [join( root, "package.json" ), import.meta.url] ) {
		let path: string;
		try {
			path = createRequire( from ).resolve( "typescript" );
		}
		catch {
			continue;
		}

		return ( await import( pathToFileURL( path ).href ) ).default;
	}

	throw new Error( "typescript not found: npm install -D typescript" );
}

// name and version of the project, for the info of the document
function readPackage( root: string ): Json {
	try {
		return JSON.parse( readFileSync( join( root, "package.json" ), "utf-8" ) );
	}
	catch {
		return {};
	}
}

// ---------------------------------------------------------------------------

// walks the sources with the type checker and collects the operations of the document
class ApiScanner {
	readonly warnings: string[] = [];
	private readonly paths: Json = {};
	private secured = false;

	constructor( private readonly ts: typeof TS, private readonly checker: TS.TypeChecker, private readonly root: string ) {
	}

	scanFile( file: TS.SourceFile ) {
		this.forEachNode( file, node => {
			if( this.ts.isCallExpression( node ) && this.calledMember( node, "RouteGroup" ) === "add" ) {
				this.scanMount( node );
			}
		} );
	}

	document( pkg: Json ): Json {
		return {
			openapi: "3.0.3",
			info: { title: pkg.name ?? "api", version: pkg.version ?? "0.0.0" },
			...( this.secured ? { components: { securitySchemes: { bearer: { type: "http", scheme: "bearer" } } } } : {} ),
			paths: this.paths,
		};
	}

	// group.add( "/notes", notesEP )
	private scanMount( call: TS.CallExpression ) {
		const group = this.groupOf( ( call.expression as TS.PropertyAccessExpression ).expression );
		const mount = this.text( call.arguments[0] );
		const cls = this.classOf( call.arguments[1] );
		if( !group || mount === null || !cls ) {
			return this.warn( call, "mounted object not understood: ignored" );
		}

		const base = joinPath( group.prefix, mount );
		const kind = this.kindOf( cls );

		for( const c of this.lineage( cls ) ) {
			this.forEachCall( c, ( route, member, owner ) => {
				if( kind === "http" && owner === "EndPoints" && HTTP_METHODS[member] ) {
					this.addRoute( group, base, HTTP_METHODS[member], route );
				}
				else if( kind === "ws" && owner === "Channel" && member === "route" ) {
					this.addSocket( group, base, route );
				}
			} );
		}
	}

	private addRoute( group: Group, base: string, method: string, call: TS.CallExpression ) {
		const path = this.text( call.arguments[0] );
		if( path === null ) {
			return this.warn( call, "route path is not a literal: route ignored" );
		}

		const handler = this.functionOf( call.arguments[1] );
		if( !handler ) {
			this.warn( call, "handler not found: parameters unknown" );
		}

		const usage: Usage = { values: [], statuses: new Map( ) };
		if( handler ) {
			this.scanHandler( handler, usage, new Set( ) );
		}

		const filters = this.filtersOf( call.arguments[2] );
		const guarded = group.guarded || filters.has( "Sessions.guard" );
		const full = joinPath( base, path );

		const op: Json = { tags: [base] };

		const description = handler && this.commentOf( handler );
		if( description ) {
			op.description = description;
		}

		if( guarded ) {
			op.security = [{ bearer: [] }];
			this.secured = true;
		}

		// every :name of the path, typed by its paramValue when there is one
		const parameters: Json[] = [...full.matchAll( PARAM_RE )].map( m => {
			const name = m[0].slice( 1 );
			const value = usage.values.find( v => v.where === "path" && v.name === name );
			return { name, in: "path", required: true, schema: value ? this.schemaOf( value ) : SCHEMAS.string };
		} );

		for( const v of usage.values.filter( v => v.where === "query" ) ) {
			parameters.push( { name: v.name, in: "query", required: this.required( v ), schema: this.schemaOf( v ) } );
		}

		if( parameters.length ) {
			op.parameters = parameters;
		}

		const body = usage.values.filter( v => v.where === "body" );
		if( body.length ) {
			const required = body.filter( v => this.required( v ) ).map( v => v.name );
			op.requestBody = {
				required: required.length > 0,
				content: { "application/json": { schema: {
					type: "object",
					properties: Object.fromEntries( body.map( v => [v.name, this.schemaOf( v )] ) ),
					...( required.length ? { required } : {} ),
				} } },
			};
		}

		// statuses known by construction: values read, guard, step-up, rate limiter
		const statuses = usage.statuses;
		const success = [...statuses.keys( )].find( c => c >= 200 && c < 300 ) ?? 200;
		addStatus( statuses, success );
		if( usage.values.length ) {
			addStatus( statuses, 400 );
		}
		if( guarded ) {
			addStatus( statuses, 401 );
		}
		if( filters.has( "Sessions.stepUp" ) ) {
			addStatus( statuses, 403, "step-up required" );
		}
		if( filters.has( "RateLimiter.filter" ) ) {
			addStatus( statuses, 429 );
		}

		op.responses = Object.fromEntries( [...statuses.keys( )].sort( ).map( code => [code, {
			description: [...statuses.get( code )].join( " / " ) || statusText( code ),
		}] ) );

		this.addOperation( full, method, op, call );
	}

	// a WebSocket endpoint: in a guarded group, a POST on the same path gives a ticket first
	private addSocket( group: Group, base: string, call: TS.CallExpression ) {
		const path = this.text( call.arguments[0] );
		if( path === null ) {
			return this.warn( call, "endpoint path is not a literal: endpoint ignored" );
		}

		const full = joinPath( base, path );
		const upgrade: Json = {
			tags: [base],
			summary: "WebSocket endpoint (upgrade)",
			responses: { 101: { description: "Switching Protocols" } },
		};

		if( group.guarded ) {
			this.secured = true;
			upgrade.parameters = [{ name: "ticket", in: "query", required: true, schema: SCHEMAS.string }];

			this.addOperation( full, "post", {
				tags: [base],
				summary: "WebSocket ticket",
				description: "one-time ticket: open the socket on the same path with ?ticket= within a second",
				security: [{ bearer: [] }],
				responses: {
					200: { description: "OK", content: { "application/json": { schema: {
						type: "object", properties: { ticket: SCHEMAS.string }, required: ["ticket"],
					} } } },
					401: { description: statusText( 401 ) },
				},
			}, call );
		}

		this.addOperation( full, "get", upgrade, call );
	}

	private addOperation( path: string, method: string, op: Json, at: TS.Node ) {
		const key = path.replace( PARAM_RE, m => `{${m.slice( 1 )}}` );
		const item = this.paths[key] ??= {};
		if( item[method] ) {
			return this.warn( at, `${method.toUpperCase( )} ${path} already described: ignored` );
		}

		item[method] = op;
	}

	// values read and statuses answered by a handler, and by the methods of the
	// EndPoints it calls
	private scanHandler( fn: TS.Node, usage: Usage, seen: Set<TS.Node> ) {
		seen.add( fn );

		this.forEachNode( fn, node => {
			if( this.ts.isCallExpression( node ) ) {
				const member = this.calledMember( node, "EndPoints" );
				if( READERS[member] ) {
					this.readValue( node, READERS[member], usage );
				}
				// res.status( 201 )
				else if( this.ts.isPropertyAccessExpression( node.expression ) && node.expression.name.text === "status" ) {
					const code = this.literal( node.arguments[0] );
					if( typeof code === "number" ) {
						addStatus( usage.statuses, code );
					}
				}
				else if( this.isThisMember( node.expression ) ) {
					const callee = this.functionOf( node.expression );
					if( callee && !seen.has( callee ) && !this.isFramework( callee ) ) {
						this.scanHandler( callee, usage, seen );
					}
				}
			}
			else if( this.ts.isNewExpression( node ) && this.classOf( node )?.name?.text === "HttpError" ) {
				const code = this.literal( node.arguments?.[0] );
				const message = this.literal( node.arguments?.[1] );
				if( typeof code === "number" ) {
					addStatus( usage.statuses, code, typeof message === "string" ? message : "" );
				}
			}
		} );
	}

	// this.bodyValue( req, "title", "string", { maxlength: 100 } )
	private readValue( call: TS.CallExpression, where: Value["where"], usage: Usage ) {
		const [, nameArg, typeArg, optionsArg] = call.arguments;

		const name = this.text( nameArg );
		if( name === null ) {
			return this.warn( call, "value name is not a literal: value ignored" );
		}

		const type = ( typeArg ? this.text( typeArg ) : "string" ) as ArgType;
		if( !SCHEMAS[type] ) {
			return this.warn( call, `type of "${name}" is not a literal: value ignored` );
		}

		const options: Value["options"] = {};
		if( optionsArg ) {
			if( !this.ts.isObjectLiteralExpression( optionsArg ) ) {
				this.warn( call, `options of "${name}" are not an object literal: ignored` );
			}
			else {
				for( const prop of optionsArg.properties ) {
					const key = prop.name && this.ts.isIdentifier( prop.name ) ? prop.name.text as keyof ValueType : null;
					// the validator is code: nothing to describe
					if( key === "validator" ) {
						continue;
					}

					const value = this.ts.isPropertyAssignment( prop ) ? this.literal( prop.initializer ) : undefined;
					if( !key || value === undefined ) {
						this.warn( prop, `option of "${name}" is not a literal: ignored` );
						continue;
					}

					options[key] = value;
				}
			}
		}

		if( !usage.values.some( v => v.where === where && v.name === name ) ) {
			usage.values.push( { where, name, type, options } );
		}
	}

	private schemaOf( v: Value ): Json {
		const o = v.options;
		const schema: Json = { ...SCHEMAS[v.type] };

		if( o.maxlength !== undefined ) {
			schema.maxLength = o.maxlength;
		}
		if( o.minval !== undefined ) {
			schema.minimum = o.minval;
		}
		if( o.maxval !== undefined ) {
			schema.maximum = o.maxval;
		}
		if( o.nullable ) {
			schema.nullable = true;
		}
		if( o.default !== undefined ) {
			schema.default = o.default;
		}

		const notes = [o.trim && "trimmed", o.truncate && "truncated to its maximum length"].filter( Boolean );
		if( notes.length ) {
			schema.description = [schema.description, ...notes].filter( Boolean ).join( ", " );
		}

		return schema;
	}

	private required( v: Value ): boolean {
		return v.options.required !== false;
	}

	// -- groups, classes, functions --------------------------------------------

	// prefix and protection of the group an expression designates:
	// RouteGroup.guarded( "/api", guard ), a chain of add( ), or a variable holding one
	private groupOf( expr: TS.Expression ): Group {
		expr = this.skip( expr );

		if( this.ts.isCallExpression( expr ) ) {
			const member = this.calledMember( expr, "RouteGroup" );
			if( member === "add" ) {
				return this.groupOf( ( expr.expression as TS.PropertyAccessExpression ).expression );
			}

			if( member === "guarded" || member === "unprotected" ) {
				const prefix = this.text( expr.arguments[0] );
				return prefix === null ? null : { prefix, guarded: member === "guarded" };
			}

			return null;
		}

		const source = this.sourceOf( expr );
		return source ? this.groupOf( source ) : null;
	}

	// class of the EndPoints or Channel an expression gives: its type, or when the type
	// is only the base class (readonly endPoints: EndPoints), the value it was given
	private classOf( expr: TS.Expression ): TS.ClassDeclaration {
		if( !expr ) {
			return null;
		}

		const decl = this.checker.getTypeAtLocation( expr ).getSymbol( )?.declarations?.find( d => this.ts.isClassDeclaration( d ) ) as TS.ClassDeclaration;
		if( decl && !this.isFramework( decl ) ) {
			return decl;
		}

		const source = this.sourceOf( this.skip( expr ) );
		return source ? this.classOf( source ) : decl;
	}

	// the expression a variable or a property was given: its initializer, or the
	// this.name = ... of the constructor
	private sourceOf( expr: TS.Expression ): TS.Expression {
		const node = this.ts.isPropertyAccessExpression( expr ) ? expr.name : expr;
		const decl = this.symbolOf( node )?.valueDeclaration;
		if( !decl ) {
			return null;
		}

		if( ( this.ts.isVariableDeclaration( decl ) || this.ts.isPropertyDeclaration( decl ) ) && decl.initializer ) {
			return decl.initializer;
		}

		if( this.ts.isPropertyDeclaration( decl ) && this.ts.isClassDeclaration( decl.parent ) ) {
			const name = decl.name.getText( );
			let found: TS.Expression = null;
			this.forEachNode( decl.parent, n => {
				if( this.ts.isBinaryExpression( n ) && n.operatorToken.kind === this.ts.SyntaxKind.EqualsToken &&
					this.isThisMember( n.left ) && n.left.name.text === name ) {
					found = n.right;
				}
			} );
			return found;
		}

		return null;
	}

	// "http" for an EndPoints, "ws" for a Channel
	private kindOf( cls: TS.ClassDeclaration ): "http" | "ws" {
		const top = this.lineage( cls ).at( -1 );
		const base = this.baseOf( top );
		return base?.name?.text === "Channel" ? "ws" : "http";
	}

	// the class and its ancestors, up to the framework base (excluded)
	private lineage( cls: TS.ClassDeclaration ): TS.ClassDeclaration[] {
		const list: TS.ClassDeclaration[] = [];
		for( let c = cls; c && !this.isFramework( c ); c = this.baseOf( c ) ) {
			list.push( c );
		}
		return list;
	}

	private baseOf( cls: TS.ClassDeclaration ): TS.ClassDeclaration {
		const ext = cls.heritageClauses?.find( h => h.token === this.ts.SyntaxKind.ExtendsKeyword )?.types[0];
		return ext ? this.classOf( ext.expression ) : null;
	}

	// the framework classes are the ones declared in its endpoints.ts and ws.ts
	private isFramework( node: TS.Node ): boolean {
		const cls = this.ts.isClassDeclaration( node ) ? node : this.ts.findAncestor( node, this.ts.isClassDeclaration );
		const name = cls?.name?.text;
		return ( name === "EndPoints" || name === "Channel" ) && /[\\/](endpoints|ws)\.ts$/.test( cls.getSourceFile( ).fileName );
	}

	// body of the function an expression designates: this.on_item, an arrow function...
	private functionOf( expr: TS.Expression ): TS.Node {
		expr = this.skip( expr );
		if( this.ts.isFunctionLike( expr ) ) {
			return expr;
		}

		const decl = this.symbolOf( this.ts.isPropertyAccessExpression( expr ) ? expr.name : expr )?.valueDeclaration;
		if( decl && this.ts.isMethodDeclaration( decl ) ) {
			return decl;
		}

		if( decl && this.ts.isPropertyDeclaration( decl ) && decl.initializer && this.ts.isFunctionLike( decl.initializer ) ) {
			return decl.initializer;
		}

		return null;
	}

	// the recognized filters of a route: "Sessions.guard", "Sessions.stepUp", "RateLimiter.filter"
	private filtersOf( options: TS.Expression ): Set<string> {
		const found = new Set<string>( );
		if( !options || !this.ts.isObjectLiteralExpression( options ) ) {
			return found;
		}

		const prop = options.properties.find( p => p.name?.getText( ) === "filter" );
		if( !prop || !this.ts.isPropertyAssignment( prop ) ) {
			return found;
		}

		const init = prop.initializer;
		for( const f of this.ts.isArrayLiteralExpression( init ) ? init.elements : [init] ) {
			if( this.ts.isPropertyAccessExpression( f ) ) {
				const owner = this.ownerOf( f.name );
				if( owner ) {
					found.add( `${owner}.${f.name.text}` );
				}
			}
		}

		return found;
	}

	// -- small helpers -----------------------------------------------------------

	// name of the member called when it belongs to the given class (this.get -> "get"
	// for "EndPoints"), null otherwise
	private calledMember( call: TS.CallExpression, cls: string ): string {
		const callee = call.expression;
		if( !this.ts.isPropertyAccessExpression( callee ) ) {
			return null;
		}

		return this.ownerOf( callee.name ) === cls ? callee.name.text : null;
	}

	// name of the class that declares a member
	private ownerOf( name: TS.Node ): string {
		const decl = this.symbolOf( name )?.declarations?.[0];
		const cls = decl && this.ts.findAncestor( decl, this.ts.isClassDeclaration );
		return cls?.name?.text ?? null;
	}

	// symbol of a node, through the import aliases
	private symbolOf( node: TS.Node ): TS.Symbol {
		const sym = this.checker.getSymbolAtLocation( node );
		return sym && sym.flags & this.ts.SymbolFlags.Alias ? this.checker.getAliasedSymbol( sym ) : sym;
	}

	// calls of the methods of the class in its own code: this.get( ... ), this.route( ... )
	private forEachCall( cls: TS.ClassDeclaration, fn: ( call: TS.CallExpression, member: string, owner: string ) => void ) {
		this.forEachNode( cls, n => {
			if( this.ts.isCallExpression( n ) && this.isThisMember( n.expression ) ) {
				fn( n, n.expression.name.text, this.ownerOf( n.expression.name ) );
			}
		} );
	}

	// this.name
	private isThisMember( expr: TS.Expression ): expr is TS.PropertyAccessExpression {
		return this.ts.isPropertyAccessExpression( expr ) && expr.expression.kind === this.ts.SyntaxKind.ThisKeyword;
	}

	// every node under root (root excluded), depth first
	private forEachNode( root: TS.Node, fn: ( node: TS.Node ) => void ) {
		const visit = ( node: TS.Node ) => {
			fn( node );
			this.ts.forEachChild( node, visit );
		};
		this.ts.forEachChild( root, visit );
	}

	// value of a literal or of a constant (its literal type): string, number, boolean, null
	private literal( expr: TS.Expression ): unknown {
		if( !expr ) {
			return undefined;
		}

		if( expr.kind === this.ts.SyntaxKind.NullKeyword ) {
			return null;
		}

		const type = this.checker.getTypeAtLocation( expr );
		if( type.isStringLiteral( ) || type.isNumberLiteral( ) ) {
			return type.value;
		}

		if( type.flags & this.ts.TypeFlags.BooleanLiteral ) {
			return this.checker.typeToString( type ) === "true";
		}

		return undefined;
	}

	private text( expr: TS.Expression ): string {
		const value = this.literal( expr );
		return typeof value === "string" ? value : null;
	}

	// ( x ), x as T, x!
	private skip( expr: TS.Expression ): TS.Expression {
		while( this.ts.isParenthesizedExpression( expr ) || this.ts.isAsExpression( expr ) || this.ts.isNonNullExpression( expr ) ) {
			expr = expr.expression;
		}
		return expr;
	}

	// the // or /* */ comment just above a method
	private commentOf( fn: TS.Node ): string {
		const node = this.ts.isMethodDeclaration( fn ) ? fn : null;
		if( !node ) {
			return null;
		}

		const text = node.getSourceFile( ).text;
		const ranges = this.ts.getLeadingCommentRanges( text, node.getFullStart( ) ) ?? [];
		const lines = ranges.map( r => text.slice( r.pos, r.end )
			.replace( /^\/\*+|\*+\/$/g, "" )
			.split( /\r?\n/ )
			.map( l => l.replace( /^\s*(\/\/|\*)?\s?/, "" ).trimEnd( ) )
			.join( "\n" ) );

		return lines.join( "\n" ).trim( ) || null;
	}

	private warn( node: TS.Node, message: string ) {
		const file = node.getSourceFile( );
		const { line } = file.getLineAndCharacterOfPosition( node.getStart( ) );
		this.warnings.push( `${relative( this.root, file.fileName )}:${line + 1}: ${message}` );
	}
}

function addStatus( statuses: Map<number, Set<string>>, code: number, message = "" ) {
	const set = statuses.get( code ) ?? new Set( );
	if( message ) {
		set.add( message );
	}
	statuses.set( code, set );
}
