/**
 *     _____ __
 *    |__   /  / _
 *      /  /  /_| |_
 *     /  /\____   _|
 *    /_____|   |_|
 *
 * @file ws.ts
 * @author Etienne Cochard
 *
 * @copyright (c) 2026 R-libre ingenierie
 *
 * Use of this source code is governed by an MIT-style license
 * that can be found in the LICENSE file or at https://opensource.org/licenses/MIT.
 **/

// WebSocket endpoints.
//
// A Channel notes its endpoints (path + handler), like an EndPoints object: it touches
// neither the HTTP server nor the configuration. It is added to a RouteGroup, and the
// group decides the protection:
//
// - guarded group: the socket opens only with a one-time ticket. A browser cannot send
//   an Authorization header when it opens a WebSocket, so the client first asks for a
//   ticket with a POST on the same path (behind the guard of the group, so with a valid
//   session), then opens the socket with ?ticket=... within 1 second. The ticket is bound
//   to the endpoint and to the user, and destroyed at its first use.
// - unprotected group: no ticket.
//
// The ticket only needs a session: an endpoint that needs a right checks it in its
// onOpen, with userHasAccess( socket.user, "..." ), and closes the socket otherwise.
//
// There is no Origin check: z4js has no cookie, and a ticket can only be obtained with
// the Authorization header, which a page of another site cannot send for the user.
//
// Every upgrade goes through one listener (ws in noServer mode), see createUpgradeHandler.
// The messages of one socket are handled one after the other, in order.

import { randomBytes } from "node:crypto";
import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocketServer } from "ws";
import type { RawData, WebSocket } from "ws";
import type { RouteGroup } from "./endpoints";
import { HttpError, statusText } from "./http-error";
import type { Logger } from "./logger";
import { checkFixedPath, routeKey, RouteList } from "./paths";
import { isFunction, isString, isUIntNumber } from "./tools";

const DEFAULT_MAX_PAYLOAD = 64 * 1024;
const DEFAULT_PING_MS = 30_000;
const TICKET_TTL_MS = 1000;

// above that, ticket requests are refused (503): bounds the memory under a flood
const MAX_TICKETS = 10_000;

// messages waiting for their turn on one socket: above that, the socket is closed
const MAX_PENDING = 100;

export type WSMessageHandler = ( socket: WSocket, data: WSData ) => unknown;

export interface WSHandler {
	onOpen?( socket: WSocket ): unknown;
	onMessage: WSMessageHandler;
	onClose?( socket: WSocket, code: number ): unknown;
}

export interface WSOptions {
	// bytes: a larger message closes the socket (1009)
	maxPayload?: number;
}

export interface WSRouteDef {
	readonly path: string;
	readonly handler: WSHandler;
	readonly maxPayload: number;
}

// base class of the WebSocket channels: notes the endpoints and their handlers.
// mounted by a RouteGroup, like an EndPoints object
export class Channel {
	private readonly list = new RouteList<WSRouteDef>( );

	get routes(): readonly WSRouteDef[] {
		return this.list.all;
	}

	// handler: { onOpen?, onMessage, onClose? }, its methods are called on that object
	// (an object literal, or the channel itself: this.route( "/notif", this )).
	// or only the message handler, which then runs with the channel as "this"
	route( path: string, handler: WSHandler | WSMessageHandler, options: WSOptions = {} ) {
		checkFixedPath( path );

		const maxPayload = options.maxPayload ?? DEFAULT_MAX_PAYLOAD;
		if( !isUIntNumber( maxPayload ) || maxPayload === 0 ) {
			throw new Error( "ws: maxPayload must be an integer > 0" );
		}

		const full: WSHandler = typeof handler === "function" ? { onMessage: handler.bind( this ) } : handler;
		if( !isFunction( full?.onMessage ) ) {
			throw new Error( `ws: ${path}: onMessage is required` );
		}

		this.list.add( routeKey( "ws", path ), { path, handler: full, maxPayload } );
	}
}

// -- socket and message ---------------------------------------------------------

// one open WebSocket, as seen by the handlers: its path, its user, send and close
export class WSocket {
	constructor( private readonly ws: WebSocket, readonly path: string, readonly user: any ) {
	}

	get isOpen( ): boolean {
		return this.ws.readyState === this.ws.OPEN;
	}

	// strings and buffers are sent as they are, anything else as JSON
	send( data: unknown ) {
		if( this.isOpen ) {
			this.ws.send( isString( data ) || Buffer.isBuffer( data ) ? data : JSON.stringify( data ) );
		}
	}

	close( code = 1000, reason = "" ) {
		this.ws.close( code, reason );
	}
}

// thrown when a message cannot be read as asked: the socket is closed with 1007
export class WSDataError extends Error {
	constructor( message: string ) {
		super( message );
		this.name = "WSDataError";
	}
}

// a received message: the raw bytes, read as needed
export class WSData {
	constructor( readonly buffer: Buffer, readonly isBinary: boolean ) {
	}

	get text( ): string {
		return this.buffer.toString( "utf-8" );
	}

	get json( ): any {
		try {
			return JSON.parse( this.text );
		}
		catch {
			throw new WSDataError( "invalid JSON message" );
		}
	}
}

function toBuffer( raw: RawData ): Buffer {
	if( Buffer.isBuffer( raw ) ) {
		return raw;
	}

	return Array.isArray( raw ) ? Buffer.concat( raw ) : Buffer.from( raw );
}

// -- tickets --------------------------------------------------------------------

// one-time tickets, in memory: valid TICKET_TTL_MS, bound to an endpoint and a user
export class TicketStore {
	private readonly tickets = new Map<string, { path: string, user: unknown, expires: number }>( );

	issue( path: string, user: unknown ): string {
		this.sweep( );

		if( this.tickets.size >= MAX_TICKETS ) {
			throw new HttpError( 503 );
		}

		const ticket = randomBytes( 32 ).toString( "base64url" );
		this.tickets.set( ticket, { path, user, expires: Date.now( ) + TICKET_TTL_MS } );
		return ticket;
	}

	// the ticket is destroyed whatever the result: one try only. null if refused
	consume( ticket: string, path: string ): { user: unknown } {
		const entry = this.tickets.get( ticket );
		this.tickets.delete( ticket );

		if( !entry || entry.expires < Date.now( ) || entry.path !== path ) {
			return null;
		}

		return { user: entry.user };
	}

	private sweep( ) {
		const now = Date.now( );
		for( const [ticket, entry] of this.tickets ) {
			if( entry.expires < now ) {
				this.tickets.delete( ticket );
			}
		}
	}
}

// -- upgrade --------------------------------------------------------------------

export interface UpgradeOptions {
	logger: Logger;
	// ms between two pings: a socket that did not answer the previous one is closed
	pingMs?: number;
}

interface Endpoint {
	path: string;
	route: WSRouteDef;
	tickets: TicketStore;		// null: unprotected group
	server: WebSocketServer;
}

export interface UpgradeHandler {
	// the listener of the "upgrade" event of the HTTP server
	upgrade( req: IncomingMessage, socket: Duplex, head: Buffer ): void;
	// closes every open socket (1001, going away) and stops the pings
	close( ): void;
}

// handles the WebSocket endpoints of the given groups:
// server.on( "upgrade", handler.upgrade )
export function createUpgradeHandler( groups: readonly RouteGroup[], options: UpgradeOptions ): UpgradeHandler {
	const endpoints = new Map<string, Endpoint>( );

	for( const group of groups ) {
		for( const { path, route, tickets } of group.sockets( ) ) {
			const key = path.toLowerCase( );
			if( endpoints.has( key ) ) {
				throw new Error( `duplicate websocket endpoint ${path}` );
			}

			endpoints.set( key, { path, route, tickets, server: new WebSocketServer( { noServer: true, maxPayload: route.maxPayload } ) } );
		}
	}

	// sockets that answered the last ping
	const alive = new WeakSet<WebSocket>( );
	const timer = startPing( endpoints, alive, options.pingMs ?? DEFAULT_PING_MS );

	const close = ( ) => {
		clearInterval( timer );
		for( const { server } of endpoints.values( ) ) {
			for( const ws of server.clients ) {
				ws.close( 1001, "server shutdown" );
			}
		}
	};

	const upgrade = ( req: IncomingMessage, socket: Duplex, head: Buffer ) => {
		const refuse = ( status: number ) => {
			socket.end( `HTTP/1.1 ${status} ${statusText( status )}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n` );
		};

		let url: URL;
		try {
			url = new URL( req.url ?? "", "http://localhost" );
		}
		catch {
			return refuse( 400 );
		}

		const endpoint = endpoints.get( url.pathname.toLowerCase( ) );
		if( !endpoint ) {
			return refuse( 404 );
		}

		let user: unknown = null;

		if( endpoint.tickets ) {
			const granted = endpoint.tickets.consume( url.searchParams.get( "ticket" ) ?? "", endpoint.path );
			if( !granted ) {
				return refuse( 401 );
			}

			user = granted.user;
		}

		endpoint.server.handleUpgrade( req, socket, head, ws => open( endpoint, ws, user, alive, options.logger ) );
	};

	return { upgrade, close };
}

function startPing( endpoints: Map<string, Endpoint>, alive: WeakSet<WebSocket>, ms: number ): NodeJS.Timeout {
	const timer = setInterval( ( ) => {
		for( const { server } of endpoints.values( ) ) {
			for( const ws of server.clients ) {
				if( !alive.has( ws ) ) {
					ws.terminate( );
					continue;
				}

				alive.delete( ws );
				ws.ping( );
			}
		}
	}, ms );

	timer.unref( );
	return timer;
}

function open( endpoint: Endpoint, ws: WebSocket, user: unknown, alive: WeakSet<WebSocket>, logger: Logger ) {
	const socket = new WSocket( ws, endpoint.path, user );
	const { handler } = endpoint.route;

	alive.add( ws );
	ws.on( "pong", ( ) => alive.add( ws ) );

	// the calls of one socket are chained: in order, never two at the same time
	let chain = Promise.resolve( );
	let pending = 0;

	// always: onClose runs even when too many messages are waiting
	const run = ( call: ( ) => unknown, always = false ) => {
		if( ++pending > MAX_PENDING && !always ) {
			pending--;
			socket.close( 1008, "too many messages" );
			return;
		}

		chain = chain.then( async ( ) => {
			try {
				await call( );
			}
			catch( e ) {
				// an unreadable message is the client's fault: 1007. anything else is ours: 1011
				if( e instanceof WSDataError ) {
					socket.close( 1007, e.message );
				}
				else {
					logger.error( "ws.handler.failed", { path: endpoint.path, error: e } );
					socket.close( 1011 );
				}
			}
			finally {
				pending--;
			}
		} );
	};

	ws.on( "message", ( raw, isBinary ) => run( ( ) => handler.onMessage( socket, new WSData( toBuffer( raw ), isBinary ) ) ) );
	ws.on( "close", code => run( ( ) => handler.onClose?.( socket, code ), true ) );
	ws.on( "error", e => logger.warn( "ws.error", { path: endpoint.path, error: e } ) );

	run( ( ) => handler.onOpen?.( socket ) );
}
