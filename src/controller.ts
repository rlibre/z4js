// Base class of all controllers, and groups of routes.
//
// A controller only NOTES its routes (method, path, handler, options): it touches
// neither Express nor the configuration, so it can safely be created at import time.
// Routes reach Express only through a RouteGroup, mounted by y4js in the main.

import { Router } from "express";
import type { Request, Response, RequestHandler } from "express";
import { getParam } from "./params";
import type { ArgType, ArgTypes, ValueType } from "./params";
import { noAccessCheck } from "./access";
import { checkFixedPath, checkPath, joinPath, routeKey } from "./paths";
import { TicketStore, WSController } from "./ws";
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

// base class of the HTTP controllers: notes the routes of a resource and reads the
// values of a request (paramValue, bodyValue, queryValue). mounted by a RouteGroup
export class Controller {
	private readonly _routes: RouteDef[] = [];
	private readonly _keys = new Set<string>( );

	get routes(): readonly RouteDef[] {
		return this._routes;
	}

	get( url: string, handler: Handler, options?: RouteOptions ) { this.route( "get", url, handler, options ); }
	post( url: string, handler: Handler, options?: RouteOptions ) { this.route( "post", url, handler, options ); }
	put( url: string, handler: Handler, options?: RouteOptions ) { this.route( "put", url, handler, options ); }
	patch( url: string, handler: Handler, options?: RouteOptions ) { this.route( "patch", url, handler, options ); }
	del( url: string, handler: Handler, options?: RouteOptions ) { this.route( "delete", url, handler, options ); }

	protected route( method: Method, url: string, handler: Handler, options: RouteOptions = {} ) {
		checkPath( url );

		const key = routeKey( method, url );
		if( this._keys.has( key ) ) {
			throw new Error( `duplicate route ${key}` );
		}

		this._keys.add( key );

		const filter = options.filter;
		const filters = filter === undefined ? [] : Array.isArray( filter ) ? filter : [filter];

		// handlers are written as methods and given unbound: they run with the controller as "this"
		this._routes.push( Object.freeze( { method, path: url, handler: handler.bind( this ) as Handler, filters } ) );
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

// a prefix, the controllers mounted under it (each one on its own sub-path), and
// whether a guard runs first. The two constructors make the choice explicit: an
// unprotected group stands out in the main.
//
//   RouteGroup.guarded( "/api/v1", sessionGuard )
//       .add( "/bed", bedController )        // -> /api/v1/bed/all, /api/v1/bed/item/:id...
//       .add( "/live", liveController );     // WSController: see ws.ts
//
// In a guarded group, each WebSocket endpoint also gets a POST route on the same path
// that issues its one-time tickets (behind the guard, like every route of the group)
export class RouteGroup {
	private readonly entries: { path: string, controller: Controller | WSController }[] = [];
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

	// mounts the controller on path, inside the group ("/" for the group prefix itself).
	// a controller may be added to several groups (api/v1 and api/v2)
	add( path: string, controller: Controller | WSController ): this {
		checkFixedPath( path );

		const added = new Set<string>( );
		const reserve = ( method: string, routePath: string ) => {
			const key = routeKey( method, joinPath( path, routePath ) );
			if( this.keys.has( key ) || added.has( key ) ) {
				throw new Error( `duplicate route ${key} in group ${this.prefix}` );
			}

			added.add( key );
		};

		if( controller instanceof WSController ) {
			for( const route of controller.routes ) {
				reserve( "ws", route.path );
				if( this.tickets ) {
					reserve( "post", route.path );
				}
			}
		}
		else {
			for( const route of controller.routes ) {
				reserve( route.method, route.path );
			}
		}

		added.forEach( k => this.keys.add( k ) );
		this.entries.push( { path, controller } );
		return this;
	}

	// for the startup log: the whole exposed surface, in one place
	list(): RouteInfo[] {
		const guarded = !!this.guard;
		const full = ( path: string ) => joinPath( this.prefix, path );

		return [
			...this.mounted( Controller ).map( ( { path, route } ) => ( { method: route.method, path: full( path ), guarded } ) ),
			...this.mounted( WSController ).flatMap( ( { path } ) => {
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

		for( const { path, route } of this.mounted( Controller ) ) {
			router.route( path )[route.method]( ...route.filters, route.handler as RequestHandler );
		}

		// the guard has set req.user: the ticket carries it to the socket
		if( this.tickets ) {
			for( const { path } of this.mounted( WSController ) ) {
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
		return this.mounted( WSController ).map( ( { path, route } ) => ( { path: joinPath( this.prefix, path ), route, tickets: this.tickets } ) );
	}

	// every route of the given kind of controller, with its path inside the group
	// (controller path + route path)
	private mounted<R extends { path: string }>( kind: new ( ) => { routes: readonly R[] } ): { path: string, route: R }[] {
		return this.entries.flatMap( e => e.controller instanceof kind
			? e.controller.routes.map( route => ( { path: joinPath( e.path, route.path ), route } ) )
			: [] );
	}
}
