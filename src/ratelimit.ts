/**
 *     _____ __
 *    |__   /  / _
 *      /  /  /_| |_
 *     /  /\____   _|
 *    /_____|   |_|
 *
 * @file ratelimit.ts
 * @author Etienne Cochard
 *
 * @copyright (c) 2026 R-libre ingenierie
 *
 * Use of this source code is governed by an MIT-style license
 * that can be found in the LICENSE file or at https://opensource.org/licenses/MIT.
 **/

// Rate limiting, in memory: a counter per key (an IP, a login...) over a fixed window.
//
// Used as a route filter, keyed on the IP:
//
//   const limiter = new RateLimiter( "login", 10, 60_000 );
//   this.post( "/login", this.on_login, { filter: limiter.filter } );
//
// The IP is req.ip: it follows X-Forwarded-For only when trustProxy is set in the
// configuration, otherwise a client could make up its address to escape the limit.
// Above the limit: 429 with a Retry-After header (seconds).

import type { Request, RequestHandler, Response } from "express";
import { HttpError } from "./http-error";
import { dropOldest } from "./tools";

// keys followed by one limiter: above, the oldest are forgotten (bounds the memory)
const MAX_KEYS = 10_000;

// counts the hits of each key (an IP, a login...) over a fixed window, and refuses
// them above the limit
export class RateLimiter {
	private readonly hits = new Map<string, { count: number, reset: number }>( );

	constructor( readonly name: string, readonly max: number, readonly windowMs: number ) {
	}

	// counts one hit for the key: 0 if allowed, else the ms to wait
	hit( key: string ): number {
		const now = Date.now( );
		const entry = this.current( key, now );

		if( entry ) {
			entry.count++;
			return entry.count > this.max ? entry.reset - now : 0;
		}

		this.makeRoom( now );
		this.hits.set( key, { count: 1, reset: now + this.windowMs } );
		return this.max < 1 ? this.windowMs : 0;
	}

	// without counting: 0 if allowed, else the ms to wait
	waitFor( key: string ): number {
		const now = Date.now( );
		const entry = this.current( key, now );
		return entry && entry.count >= this.max ? entry.reset - now : 0;
	}

	// forgets the key (a successful login clears its failures)
	reset( key: string ) {
		this.hits.delete( key );
	}

	// route filter keyed on the IP
	readonly filter: RequestHandler = ( req, res, next ) => {
		const wait = this.hit( req.ip ?? "?" );
		if( wait ) {
			return refuse( req, res, this.name, wait );
		}

		next( );
	};

	private current( key: string, now: number ) {
		const entry = this.hits.get( key );
		if( entry && entry.reset <= now ) {
			this.hits.delete( key );
			return null;
		}

		return entry;
	}

	// drops the expired keys, then the oldest ones (Map keeps the insertion order)
	private makeRoom( now: number ) {
		if( this.hits.size < MAX_KEYS ) {
			return;
		}

		for( const [key, entry] of this.hits ) {
			if( entry.reset <= now ) {
				this.hits.delete( key );
			}
		}

		dropOldest( this.hits, MAX_KEYS );
	}
}

// 429 with Retry-After: thrown, so the central error handler answers
export function refuse( req: Request, res: Response, name: string, waitMs: number ): never {
	res.setHeader( "Retry-After", String( Math.ceil( waitMs / 1000 ) ) );
	req.log?.warn( "http.ratelimited", { limiter: name, ip: req.ip } );
	throw new HttpError( 429 );
}
