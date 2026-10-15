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
//
//   this.del( "/item/:id", this.on_delete, { need: "notes/delete", filter: Sessions.stepUp } );
//
// The way of a request through a route of a group:
//
// 1. the rate limit of all the groups (server.ts), then the guard of a guarded group:
//    401 without a valid session, which it sets (ctx.session) otherwise.
// 2. need, with the Access of the group: 403 at the first right refused. Before the
//    filters, so that no step-up is asked from who has no right. Every route declares
//    it, null for no right: a forgotten check is refused at the declaration. In an
//    unprotected group, need is null, even as a function (which needs no Access): need
//    is about the rights of a user, and there is no user there. A check made without
//    a session (signature of a webhook...) is a filter. Refused at startup (add).
// 3. the filters, in order: a refusal throws.
// 4. the handler, with a context of its own (context.ts). a step that throws ends the
//    route: the central error handler answers (http-handlers.ts).
// 5. nothing sent by the handler: the status set by ctx.status, empty body.

import { Router } from "express";
import type { RequestHandler } from "express";
import { checkNeed, needStep } from "./access";
import type { Access, Need } from "./access";
import { runRoute } from "./context";
import type { Ctx, Handler } from "./context";
import { HttpError } from "./http-error";
import { checkFixedPath, checkPath, joinPath, routeKey, RouteList } from "./paths";
import { isArray, isString } from "./tools";
import { Channel, TicketStore } from "./ws";
import type { WSRouteDef } from "./ws";

export type Method = "get" | "post" | "put" | "patch" | "delete";

// may be async: refuses by throwing an HttpError (Sessions.stepUp, RateLimiter.filter...)
export type Filter = ( ctx: Ctx<any> ) => unknown;

export interface RouteOptions {
	need: Need;
	filter?: Filter | readonly Filter[];
}

export interface RouteDef {
	readonly method: Method;
	readonly path: string;
	readonly handler: Handler;
	readonly need: Need;
	readonly filters: readonly Filter[];
}

// base class of the HTTP end points of a domain: notes its routes, one method per
// route, which receives the context of the request (see context.ts). mounted by a RouteGroup
export class EndPoints {
	private readonly list = new RouteList<RouteDef>( );

	get routes(): readonly RouteDef[] {
		return this.list.all;
	}

	get( url: string, handler: Handler, options: RouteOptions ) { this.route( "get", url, handler, options ); }
	post( url: string, handler: Handler, options: RouteOptions ) { this.route( "post", url, handler, options ); }
	put( url: string, handler: Handler, options: RouteOptions ) { this.route( "put", url, handler, options ); }
	patch( url: string, handler: Handler, options: RouteOptions ) { this.route( "patch", url, handler, options ); }
	del( url: string, handler: Handler, options: RouteOptions ) { this.route( "delete", url, handler, options ); }

	protected route( method: Method, url: string, handler: Handler, options: RouteOptions ) {
		checkPath( url );

		const key = routeKey( method, url );
		checkNeed( key, options );

		const { need, filter } = options;

		const filters = filter === undefined ? [] : isArray( filter ) ? filter : [filter as Filter];

		// handlers are written as methods and given unbound: they run with the end points object as "this"
		this.list.add( key, { method, path: url, handler: handler.bind( this ) as Handler, need, filters } );
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
//   RouteGroup.guarded( "/api/v1", sessions.guard, access )
//       .add( "/bed", bedEP )                // -> /api/v1/bed/all, /api/v1/bed/item/:id...
//       .add( "/live", liveChannel );        // Channel: see ws.ts
//
// In a guarded group, each WebSocket endpoint also gets a POST route on the same path
// that issues its one-time tickets (behind the guard, like every route of the group)
export class RouteGroup {
	private readonly entries: { path: string, target: EndPoints | Channel }[] = [];
	private readonly keys = new Set<string>( );
	private readonly tickets: TicketStore;

	private constructor( readonly prefix: string, private readonly guard: RequestHandler, private readonly access: Access ) {
		checkFixedPath( prefix );
		this.tickets = guard ? new TicketStore( ) : null;
	}

	// every route of the group runs behind the guard (session check...). access checks
	// the needs of its routes
	static guarded( prefix: string, guard: RequestHandler, access: Access ): RouteGroup {
		if( !guard || !access ) {
			throw new Error( `guarded group ${prefix}: guard and access expected` );
		}

		return new RouteGroup( prefix, guard, access );
	}

	// no control at all: for login, health, signed webhooks... no route may need a right
	static unprotected( prefix: string ): RouteGroup {
		return new RouteGroup( prefix, null, null );
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
				this.checkRight( "ws", joinPath( path, route.path ), route.need );
				if( this.tickets ) {
					reserve( "post", route.path );
				}
			}
		}
		else {
			for( const route of target.routes ) {
				reserve( route.method, route.path );
				this.checkRight( route.method, joinPath( path, route.path ), route.need );
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
			const steps = this.steps( route.need, route.filters, route.handler );
			router.route( path )[route.method]( ( req, res ) => runRoute( req, res, steps ) );
		}

		// the guard has set the session: the ticket carries its user to the socket. the
		// need of the endpoint is checked here: no right, no ticket, no socket
		if( this.tickets ) {
			for( const { path, route } of this.mounted( Channel ) ) {
				const endpoint = joinPath( this.prefix, path );
				const issue = ( ctx: Ctx<{ ticket: string }> ) => ctx.json( { ticket: this.tickets.issue( endpoint, ctx.session.user ) } );
				const steps = this.steps( route.need, [], issue );
				router.post( path, ( req, res ) => runRoute( req, res, steps ) );
			}
		}

		return router;
	}

	// guard (run by the router), need, filters, handler: no step-up asked from who has no right
	private steps( need: Need, filters: readonly Filter[], handler: Handler ): Handler[] {
		return [...( need ? [needStep( need, this.access )] : [] ), ...filters, handler];
	}

	// a right in an unprotected group: refused at startup (there is no user there)
	private checkRight( method: string, path: string, need: Need ) {
		if( need && !this.access ) {
			throw new Error( `route ${routeKey( method, path )} needs a right: group ${this.prefix} is unprotected (need: null; a check without session is a filter)` );
		}
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
