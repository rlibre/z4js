/**
 *     _____ __
 *    |__   /  / _
 *      /  /  /_| |_
 *     /  /\____   _|
 *    /_____|   |_|
 *
 * @file endpoints.ts
 * @author Etienne Cochard
 *
 * @copyright (c) 2026 R-libre ingenierie
 *
 * Use of this source code is governed by an MIT-style license
 * that can be found in the LICENSE file or at https://opensource.org/licenses/MIT.
 **/

// End points (the HTTP routes of a domain), and groups of routes.
//
// An EndPoints object only NOTES its routes (method, path, handler, options): it touches
// neither Express nor the configuration, so it can safely be created at import time.
// Routes reach Express only through a RouteGroup, mounted by z4js in the main.

import { Router } from "express";
import type { Request, Response, RequestHandler } from "express";
import { getParam } from "./params";
import type { ArgType, ArgTypes, ValueType } from "./params";
import { noAccessCheck } from "./access";
import { checkFixedPath, checkPath, joinPath, routeKey, RouteList } from "./paths";
import { Channel, TicketStore } from "./ws";
import type { WSRouteDef } from "./ws";

export type { Request, Response };

export type Method = "get" | "post" | "put" | "patch" | "delete";

// may be async: Express 5 forwards a rejected promise to the error handler
export type Handler = ( req: Request, res: Response ) => unknown;

export interface RouteOptions {
	// Express middleware(s) run before the handler
	filter?: RequestHandler | RequestHandler[];
}

export interface RouteDef {
	readonly method: Method;
	readonly path: string;
	readonly handler: Handler;
	readonly filters: readonly RequestHandler[];
}

// base class of the HTTP end points of a domain: notes its routes and reads the
// values of a request (paramValue, bodyValue, queryValue). mounted by a RouteGroup
export class EndPoints {
	private readonly list = new RouteList<RouteDef>( );

	get routes(): readonly RouteDef[] {
		return this.list.all;
	}

	get( url: string, handler: Handler, options?: RouteOptions ) { this.route( "get", url, handler, options ); }
	post( url: string, handler: Handler, options?: RouteOptions ) { this.route( "post", url, handler, options ); }
	put( url: string, handler: Handler, options?: RouteOptions ) { this.route( "put", url, handler, options ); }
	patch( url: string, handler: Handler, options?: RouteOptions ) { this.route( "patch", url, handler, options ); }
	del( url: string, handler: Handler, options?: RouteOptions ) { this.route( "delete", url, handler, options ); }

	protected route( method: Method, url: string, handler: Handler, options: RouteOptions = {} ) {
		checkPath( url );

		const filter = options.filter;
		const filters = filter === undefined ? [] : Array.isArray( filter ) ? filter : [filter];

		// handlers are written as methods and given unbound: they run with the end points object as "this"
		this.list.add( routeKey( method, url ), { method, path: url, handler: handler.bind( this ) as Handler, filters } );
	}

	// -- reading values of a request ------------------------------------------
	// one named value, converted and validated according to its type: a bad or
	// missing value throws a 400 that names the parameter (never its value)

	// route parameter (/item/:id)
	paramValue<K extends ArgType = "string">( req: Request, name: string, type?: K, mode?: ValueType ): ArgTypes[K] {
		return getParam( req.params, name, type ?? "string", mode );
	}

	// member of the body
	bodyValue<K extends ArgType = "string">( req: Request, name: string, type?: K, mode?: ValueType ): ArgTypes[K] {
		return getParam( req.body, name, type ?? "string", mode );
	}

	// query string (?a=1&b=2)
	queryValue<K extends ArgType = "string">( req: Request, name: string, type?: K, mode?: ValueType ): ArgTypes[K] {
		return getParam( req.query, name, type ?? "string", mode );
	}
}

// ---------------------------------------------------------------------------

export interface RouteInfo {
	method: Method | "ws";
	path: string;		// full path, prefix included
	guarded: boolean;
}

// a prefix, the end points and channels mounted under it (each one on its own sub-path), and
// whether a guard runs first. The two constructors make the choice explicit: an
// unprotected group stands out in the main.
//
//   RouteGroup.guarded( "/api/v1", sessionGuard )
//       .add( "/bed", bedEP )                // -> /api/v1/bed/all, /api/v1/bed/item/:id...
//       .add( "/live", liveChannel );        // Channel: see ws.ts
//
// In a guarded group, each WebSocket endpoint also gets a POST route on the same path
// that issues its one-time tickets (behind the guard, like every route of the group)
export class RouteGroup {
	private readonly entries: { path: string, target: EndPoints | Channel }[] = [];
	private readonly keys = new Set<string>( );
	private readonly tickets: TicketStore;

	private constructor( readonly prefix: string, private readonly guard: RequestHandler ) {
		checkFixedPath( prefix );
		this.tickets = guard ? new TicketStore( ) : null;
	}

	// every route of the group runs behind the guard (session check...)
	static guarded( prefix: string, guard: RequestHandler ): RouteGroup {
		return new RouteGroup( prefix, guard );
	}

	// no control at all: for login, health, signed webhooks...
	static unprotected( prefix: string ): RouteGroup {
		return new RouteGroup( prefix, null );
	}

	// mounts the end points or the channel on path, inside the group ("/" for the group
	// prefix itself). the same object may be added to several groups (api/v1 and api/v2)
	add( path: string, target: EndPoints | Channel ): this {
		checkFixedPath( path );

		const added = new Set<string>( );
		const reserve = ( method: string, routePath: string ) => {
			const key = routeKey( method, joinPath( path, routePath ) );
			if( this.keys.has( key ) || added.has( key ) ) {
				throw new Error( `duplicate route ${key} in group ${this.prefix}` );
			}

			added.add( key );
		};

		if( target instanceof Channel ) {
			for( const route of target.routes ) {
				reserve( "ws", route.path );
				if( this.tickets ) {
					reserve( "post", route.path );
				}
			}
		}
		else {
			for( const route of target.routes ) {
				reserve( route.method, route.path );
			}
		}

		added.forEach( k => this.keys.add( k ) );
		this.entries.push( { path, target } );
		return this;
	}

	// for the startup log: the whole exposed surface, in one place
	list(): RouteInfo[] {
		const guarded = !!this.guard;
		const full = ( path: string ) => joinPath( this.prefix, path );

		return [
			...this.mounted( EndPoints ).map( ( { path, route } ) => ( { method: route.method, path: full( path ), guarded } ) ),
			...this.mounted( Channel ).flatMap( ( { path } ) => {
				const ws: RouteInfo = { method: "ws", path: full( path ), guarded };
				return this.tickets ? [ws, { method: "post" as const, path: full( path ), guarded }] : [ws];
			} )
		];
	}

	// to be mounted on the prefix: app.use( group.prefix, group.toRouter() )
	toRouter(): Router {
		const router = Router( );

		if( this.guard ) {
			router.use( this.guard );
		}

		for( const { path, route } of this.mounted( EndPoints ) ) {
			router.route( path )[route.method]( ...route.filters, route.handler as RequestHandler );
		}

		// the guard has set req.user: the ticket carries it to the socket
		if( this.tickets ) {
			for( const { path } of this.mounted( Channel ) ) {
				const endpoint = joinPath( this.prefix, path );
				router.post( path, ( req, res ) => {
					// a session is enough for a ticket: an endpoint that needs a right checks
					// it in its onOpen ( userHasAccess( socket.user, ... ) )
					noAccessCheck( req.user );
					res.json( { ticket: this.tickets.issue( endpoint, req.user ) } );
				} );
			}
		}

		return router;
	}

	// the WebSocket endpoints, full paths, for createUpgradeHandler (ws.ts)
	sockets( ): { path: string, route: WSRouteDef, tickets: TicketStore }[] {
		return this.mounted( Channel ).map( ( { path, route } ) => ( { path: joinPath( this.prefix, path ), route, tickets: this.tickets } ) );
	}

	// every route of the given kind of target, with its path inside the group
	// (target path + route path)
	private mounted<R extends { path: string }>( kind: new ( ) => { routes: readonly R[] } ): { path: string, route: R }[] {
		return this.entries.flatMap( e => e.target instanceof kind
			? e.target.routes.map( route => ( { path: joinPath( e.path, route.path ), route } ) )
			: [] );
	}
}
