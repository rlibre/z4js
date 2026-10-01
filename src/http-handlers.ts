// Uniform "not found" and central error handler.
//
// The client receives only a status and a short message: the message of an
// HttpError or of a SchemaError (which names the field, never the value), a fixed
// text otherwise. Details and stack go to the log, never to the response.

import type { ErrorRequestHandler, RequestHandler } from "express";
import { HttpError } from "./http-error";
import type { Logger } from "./logger";
import { LockError } from "./mutex";
import { SchemaError } from "./shared/schema";
import { errorCode, isIntNumber } from "./tools";

export const notFoundHandler: RequestHandler = ( _req, res ) => {
	res.status( 404 ).json( { error: "Not Found" } );
};

// errors raised by Express itself (body too large, invalid JSON...) carry a 4xx status
// and expose = true: the status is safe to send. 0 for any other error
function clientStatus( err: unknown ): number {
	const e = err as { status?: unknown, expose?: unknown };
	return e?.expose === true && isIntNumber( e.status ) && e.status >= 400 && e.status < 500 ? e.status : 0;
}

export function createErrorHandler( logger: Logger ): ErrorRequestHandler {
	return ( err, req, res, next ) => {
		// the response has started: let Express close the connection
		if( res.headersSent ) {
			next( err );
			return;
		}

		let status = 500;
		let message = "Internal Server Error";

		if( err instanceof HttpError ) {
			status = err.code;
			message = err.message;
		}
		else if( err instanceof LockError ) {
			// a resource held too long, or the shutdown: try again later
			status = 503;
			message = new HttpError( 503 ).message;
		}
		else if( err instanceof SchemaError ) {
			status = 400;
			message = err.message;
		}
		else if( clientStatus( err ) ) {
			status = clientStatus( err );
			message = new HttpError( status ).message;
		}
		else if( errorCode( err ) === "22001" ) {
			// value too long for the column: the client's fault, not a server error
			status = 400;
			message = "value too long";
		}

		if( !Number.isInteger( status ) || status < 400 || status > 599 ) {
			status = 500;
			message = "Internal Server Error";
		}

		// req.path has no query string
		const data = { method: req.method, path: req.path, status };

		// the logger of the request carries its id (see server.ts)
		const log = req.log ?? logger;

		if( status >= 500 ) {
			log.error( "http.error", { ...data, err } );
		}
		else {
			log.info( "http.rejected", data );
		}

		res.status( status ).json( { error: message } );
	};
}
