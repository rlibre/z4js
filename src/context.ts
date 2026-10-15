/**
 *     _____ __
 *    |__   /  / _
 *      /  /  /_| |_
 *     /  /\____   _|
 *    /_____|   |_|
 *
 * @file context.ts
 * @author Etienne Cochard
 *
 * @copyright (c) 2026 R-libre ingenierie
 *
 * Use of this source code is governed by an MIT-style license
 * that can be found in the LICENSE file or at https://opensource.org/licenses/MIT.
 **/

// The context of one HTTP request, the only thing a handler receives: it reads the
// values of the request and sends the answer. Express (req, res) stays hidden.
//
//   on_item( ctx: Ctx<Note> ) {                  // T: type of the JSON answer
//       const id = ctx.paramValue( "id", "uuid" );
//       ctx.json( note );
//   }
//
// A handler that ends without answering: z4js sends the status set by ctx.status
// with an empty body (200 without status, a warning in debug).

import type { Request, Response } from "express";
import { HttpError } from "./http-error";
import { getParam } from "./params";
import type { ArgType, ArgTypes, EnumMode, ParamMode, ShapeMode, ValueType } from "./params";
import { receiveFiles } from "./uploads";
import type { FileSpec, FilesOptions, UploadedFile } from "./uploads";
import { isIntNumber } from "./tools";

// app setting: true in debug (set by serve)
export const DEBUG_SETTING = "z4js.debug";

declare const BINARY: unique symbol;

// marker type of a binary answer: only a Ctx<Binary> may send( ) or download( ),
// and it cannot json( )
export interface Binary { readonly [BINARY]: true }

// the session of a guarded request, as the application sees it (read only)
export type RequestSession = Readonly<Express.Request["session"]>;

// may be async: one step of a route (need, filter or handler)
export type Handler = ( ctx: Ctx<any> ) => unknown;

// internal to z4js (not exported by index.ts): the Express request behind a
// context, and the run of a route.
// req and res are true private fields (#), out of reach of the application, even with
// a cast. only the code of the class body can read them: these two functions are
// written there, in the static block, and stored here. a public static or a TS
// "private" member would have been reachable by the application. the static block
// only assigns them: nothing runs at import beyond the declaration of the class
export let requestOf: ( ctx: Ctx<any> ) => Request;
export let runRoute: ( req: Request, res: Response, steps: readonly Handler[] ) => Promise<void>;

// the context of one request (see the header)
export class Ctx<T = unknown> {
	// makes Ctx invariant in T: a Ctx<Note> is neither a Ctx<Binary> nor a Ctx
	private declare readonly answerType: ( value: T ) => T;

	readonly #req: Request;
	readonly #res: Response;
	#status = 0;
	// not res.headersSent: a download sends its headers later
	#sent = false;
	// the need and the filters run before the handler: they cannot answer
	#answering = false;

	static {
		requestOf = ctx => ctx.#req;
		runRoute = ( req, res, steps ) => new Ctx( req, res ).#run( steps );
	}

	private constructor( req: Request, res: Response ) {
		this.#req = req;
		this.#res = res;
	}

	// -- request --------------------------------------------------------------

	// set by the guard of a guarded group, null otherwise
	get session( ): RequestSession {
		return this.#req.session;
	}

	// follows X-Forwarded-For only when trustProxy is set (see server.ts)
	get ip( ): string {
		return this.#req.ip;
	}

	// the JSON body, as decoded (the text fields after filesOf)
	get rawBody( ): unknown {
		return this.#req.body;
	}

	header( name: string ): string {
		return this.#req.get( name );
	}

	// one named value, converted and validated according to its type: a bad or
	// missing value throws a 400 that names the parameter (never its value)

	// "enum" has its own signature: its values are required (EnumMode). so has an
	// "object" or "object[]" checked by a Shape (bodyValue only): typed by the shape (ShapeMode)

	// route parameter (/item/:id)
	paramValue<const V extends readonly string[]>( name: string, type: "enum", mode: EnumMode<V> ): V[number];
	paramValue<K extends Exclude<ArgType, "enum"> = "string">( name: string, type?: K, mode?: ValueType ): ArgTypes[K];
	paramValue( name: string, type?: ArgType, mode?: ValueType ): unknown {
		return getParam( this.#req.params, name, type ?? "string", mode );
	}

	// member of the body
	bodyValue<T>( name: string, type: "object", mode: ShapeMode<T> ): T;
	bodyValue<T>( name: string, type: "object[]", mode: ShapeMode<T> ): T[];
	bodyValue<const V extends readonly string[]>( name: string, type: "enum", mode: EnumMode<V> ): V[number];
	bodyValue<K extends Exclude<ArgType, "enum"> = "string">( name: string, type?: K, mode?: ValueType ): ArgTypes[K];
	bodyValue( name: string, type?: ArgType, mode?: ParamMode ): unknown {
		return getParam( this.#req.body, name, type ?? "string", mode );
	}

	// query string (?a=1&b=2)
	queryValue<const V extends readonly string[]>( name: string, type: "enum", mode: EnumMode<V> ): V[number];
	queryValue<K extends Exclude<ArgType, "enum"> = "string">( name: string, type?: K, mode?: ValueType ): ArgTypes[K];
	queryValue( name: string, type?: ArgType, mode?: ValueType ): unknown {
		return getParam( this.#req.query, name, type ?? "string", mode );
	}

	// the files of a multipart body, by field, as declared in spec: anything else is
	// refused. the text fields become the body (bodyValue). see uploads.ts
	filesOf<F extends string>( spec: Record<F, FileSpec>, options?: FilesOptions ): Promise<Record<F, UploadedFile>> {
		return receiveFiles( this.#req, this.#res, spec, options );
	}

	// -- answer ---------------------------------------------------------------

	status( code: number ): this {
		this.#status = code;
		return this;
	}

	addHeader( name: string, value: string ): this {
		this.#res.append( name, value );
		return this;
	}

	json( value: T ): void {
		this.#begin( ).json( value );
	}

	// 200 {}
	ok( ): void {
		this.#begin( ).json( {} );
	}

	send( this: Ctx<Binary>, data: Buffer | Uint8Array | string, contentType: string ): void {
		this.#begin( ).setHeader( "Content-Type", contentType ).send( data );
	}

	// the file (absolute path) as an attachment named name. a missing file is a 404
	download( this: Ctx<Binary>, path: string, name: string ): Promise<void> {
		const res = this.#begin( );

		return new Promise( ( resolve, reject ) => {
			res.download( path, name, err => {
				// once started, an error is the client leaving: logged as http.aborted (server.ts)
				if( err && !res.headersSent ) {
					// a missing file: 404. Express marks it not to be shown (expose false): the status alone is
					const status = ( err as { status?: unknown } ).status;
					reject( isIntNumber( status ) && status >= 400 && status < 500 ? new HttpError( status ) : err );
				}
				else {
					resolve( );
				}
			} );
		} );
	}

	// -------------------------------------------------------------------------

	#begin( ): Response {
		if( !this.#answering ) {
			throw new Error( "a filter cannot answer: it refuses by throwing an HttpError, the handler answers" );
		}

		if( this.#sent ) {
			throw new Error( "answer already sent" );
		}

		this.#sent = true;
		return this.#res.status( this.#status || 200 );
	}

	// the steps in order, the handler last: a refusal throws. answers if the handler did not
	async #run( steps: readonly Handler[] ) {
		const handler = steps.length - 1;
		for( let i = 0; i < handler; i++ ) {
			await steps[i]( this );
		}

		this.#answering = true;
		await steps[handler]( this );

		if( !this.#sent ) {
			const req = this.#req;
			if( !this.#status && req.app.get( DEBUG_SETTING ) ) {
				req.log.warn( "http.empty", { method: req.method, path: req.originalUrl.split( "?" )[0] } );
			}

			this.#begin( ).end( );
		}
	}
}
