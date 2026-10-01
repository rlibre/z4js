/**
 *     _____ __
 *    |__   /  / _
 *      /  /  /_| |_
 *     /  /\____   _|
 *    /_____|   |_|
 *
 * @file uploads.ts
 * @author Etienne Cochard
 *
 * @copyright (c) 2026 R-libre ingenierie
 *
 * Use of this source code is governed by an MIT-style license
 * that can be found in the LICENSE file or at https://opensource.org/licenses/MIT.
 **/

// Files sent with a request (multipart/form-data), read by EndPoints.filesOf:
//
//   await this.need( req, "notes/create" );                       // before reading a byte
//   const files = await this.filesOf( req, { data: { maxBytes: 1_000_000, types: ["text/csv"] } } );
//   const comment = this.bodyValue( req, "comment" );              // the text fields: req.body
//   await files.data.keep( join( config.data, "imports", files.data.id ) );
//
// Refused by default:
// - a file field that is not declared, a second file in a field: 400
// - a declared file missing (unless required: false): 400
// - a file larger than its maxBytes, too many text fields, a text field too long: 413
// - a type not in types (the type given by the client, a hint only): 415
//
// A file is streamed to the upload folder (config uploads.folder, a temporary folder
// by default) under a random name, mode 600: never kept whole in memory, never named
// by the client. The name given by the client is only an information (file.name).
// Every file not kept (keep) is deleted once the answer is sent or the request aborted.

import { randomUUID } from "node:crypto";
import { createWriteStream, existsSync } from "node:fs";
import { copyFile, mkdir, rename, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { pipeline } from "node:stream/promises";
import Busboy from "@fastify/busboy";
import type { Request, Response } from "express";
import { HttpError } from "./http-error";
import { errorCode } from "./tools";

// text fields of a multipart body, and the longest one in bytes
const DEFAULT_FIELDS = 20;
const DEFAULT_FIELD_BYTES = 64 * 1024;

// longest file name kept as an information
const MAX_NAME = 255;

// key of the upload folder in the Express application (set by serve)
export const UPLOAD_FOLDER = "z4js.uploads";

// the folder used when the configuration gives none
export function defaultUploadFolder( ): string {
	return join( tmpdir( ), "z4js-uploads" );
}

export interface FileSpec {
	maxBytes: number;
	// accepted types (the content type given by the client), any if absent
	types?: readonly string[];
	// default true
	required?: boolean;
}

export interface FilesOptions {
	// text fields accepted (default 20), and the longest one in bytes (default 64 KB)
	fields?: number;
	fieldBytes?: number;
}

// a file received with the request, deleted at the end of it unless kept
export class UploadedFile {
	private _path: string;
	private _kept = false;

	constructor( readonly id: string, readonly name: string, readonly type: string, readonly size: number, path: string ) {
		this._path = path;
	}

	get path( ): string {
		return this._path;
	}

	get kept( ): boolean {
		return this._kept;
	}

	// moves the file to dest (copied if dest is on another disk): it is not deleted
	// at the end of the request any more. an existing dest is refused
	async keep( dest: string ) {
		if( this._kept ) {
			throw new Error( "upload: the file is already kept" );
		}

		if( existsSync( dest ) ) {
			throw new Error( "upload: the destination already exists" );
		}

		await mkdir( dirname( dest ), { recursive: true } );

		try {
			await rename( this._path, dest );
		}
		catch( e ) {
			if( errorCode( e ) !== "EXDEV" ) {
				throw e;
			}

			await copyFile( this._path, dest );
			await unlink( this._path );
		}

		this._path = dest;
		this._kept = true;
	}
}

// "C:\fakepath\report.csv" -> "report.csv": no path, no control character, bounded
function cleanName( name: string ): string {
	return basename( ( name ?? "" ).replace( /\\/g, "/" ) ).replace( /[\x00-\x1f\x7f]/g, "" ).trim( ).slice( 0, MAX_NAME );
}

// reads the multipart body of the request: the files to the upload folder, the text
// fields to req.body. throws an HttpError at the first refusal (see the header)
export async function receiveFiles( req: Request, res: Response, spec: Record<string, FileSpec>,
	options: FilesOptions = {} ): Promise<Record<string, UploadedFile>> {

	if( !req.is( "multipart/form-data" ) ) {
		throw new HttpError( 400, "multipart/form-data expected" );
	}

	const folder: string = req.app.get( UPLOAD_FOLDER ) ?? defaultUploadFolder( );
	await mkdir( folder, { recursive: true, mode: 0o700 } );

	const fields = options.fields ?? DEFAULT_FIELDS;
	const files: Record<string, UploadedFile> = {};
	const written: string[] = [];
	const body: Record<string, string> = Object.create( null );

	// at the end of the request, every file written here goes away: a kept one was
	// moved already, its old path no longer exists
	res.once( "close", ( ) => {
		for( const path of written ) {
			unlink( path ).catch( ( ) => { } );
		}
	} );

	const maxBytes = Math.max( 0, ...Object.values( spec ).map( s => s.maxBytes ) );

	await new Promise<void>( ( resolve, reject ) => {
		const busboy = Busboy( {
			headers: req.headers as { "content-type": string },
			limits: {
				files: Object.keys( spec ).length,
				fields,
				parts: Object.keys( spec ).length + fields,
				fieldSize: options.fieldBytes ?? DEFAULT_FIELD_BYTES,
				// one more byte: a file exactly at its limit is not cut
				fileSize: maxBytes + 1,
			},
		} );

		const writes: Promise<void>[] = [];
		let failed = false;

		// stops reading: the connection is closed after the answer (the rest of the body is not read)
		const fail = ( e: HttpError ) => {
			if( !failed ) {
				failed = true;
				res.setHeader( "Connection", "close" );
				req.unpipe( busboy );
				reject( e );
			}
		};

		busboy.on( "file", ( field, stream, filename, _encoding, mimeType ) => {
			const fs = Object.hasOwn( spec, field ) ? spec[field] : null;
			if( failed || !fs || Object.hasOwn( files, field ) ) {
				stream.resume( );
				return fail( new HttpError( 400, `Unexpected file "${field}"` ) );
			}

			if( fs.types && !fs.types.includes( mimeType ) ) {
				stream.resume( );
				return fail( new HttpError( 415, `Unsupported type for "${field}"` ) );
			}

			const id = randomUUID( );
			const path = join( folder, id );
			written.push( path );

			let size = 0;
			stream.on( "data", ( chunk: Buffer ) => {
				size += chunk.length;
				// the pipeline fails, which closes the file being written
				if( size > fs.maxBytes ) {
					stream.destroy( new Error( "too large" ) );
				}
			} );

			writes.push( pipeline( stream, createWriteStream( path, { flags: "wx", mode: 0o600 } ) ).then(
				( ) => {
					if( !failed ) {
						files[field] = new UploadedFile( id, cleanName( filename ), mimeType, size, path );
					}
				},
				( ) => fail( new HttpError( 413, `File too large for "${field}"` ) )
			) );
		} );

		busboy.on( "field", ( name, value, _nameTruncated, valueTruncated ) => {
			if( valueTruncated ) {
				return fail( new HttpError( 413, `Value too long for "${name}"` ) );
			}

			body[name] = value;
		} );

		const tooMany = ( ) => fail( new HttpError( 413, "Too many parts" ) );
		busboy.on( "filesLimit", tooMany );
		busboy.on( "fieldsLimit", tooMany );
		busboy.on( "partsLimit", tooMany );

		busboy.on( "error", ( ) => fail( new HttpError( 400, "Invalid multipart body" ) ) );

		busboy.on( "finish", ( ) => {
			Promise.all( writes ).then( ( ) => {
				if( failed ) {
					return;
				}

				for( const [field, fs] of Object.entries( spec ) ) {
					if( fs.required !== false && !Object.hasOwn( files, field ) ) {
						return fail( new HttpError( 400, `Expected "${field}" file` ) );
					}
				}

				resolve( );
			} );
		} );

		req.pipe( busboy );
	} );

	req.body = body;
	return files;
}
