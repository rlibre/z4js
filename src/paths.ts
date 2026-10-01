/**
 *     _____ __
 *    |__   /  / _
 *      /  /  /_| |_
 *     /  /\____   _|
 *    /_____|   |_|
 *
 * @file paths.ts
 * @author Etienne Cochard
 *
 * @copyright (c) 2026 R-libre ingenierie
 *
 * Use of this source code is governed by an MIT-style license
 * that can be found in the LICENSE file or at https://opensource.org/licenses/MIT.
 **/

// Route paths: checks and helpers shared by the HTTP end points and the WebSocket channels.

// a path is made of segments separated by "/": a literal, or ":name" for a parameter.
// No wildcard, no optional part, no regular expression, no "." or ".." segment
// (a browser normalizes them away: such a route could never be reached)
const SEGMENT_RE = /^(?:[A-Za-z0-9_.~-]+|:[A-Za-z_][A-Za-z0-9_]*)$/;
export const PARAM_RE = /:[A-Za-z_][A-Za-z0-9_]*/g;

export function checkPath( path: string ): void {
	if( path === "/" ) {
		return;
	}

	const segments = path.slice( 1 ).split( "/" );
	if( !path.startsWith( "/" ) || path.endsWith( "/" ) ||
		!segments.every( s => SEGMENT_RE.test( s ) && s !== "." && s !== ".." ) ) {
		throw new Error( `invalid route path "${path}"` );
	}
}

// a path without parameter: group prefixes and sub-paths (the router of a group could
// not pass the value to the end points), WebSocket endpoints
export function checkFixedPath( path: string ): void {
	checkPath( path );

	if( path.includes( ":" ) ) {
		throw new Error( `no parameter accepted in "${path}"` );
	}
}

// identifies a route: two paths that differ only by the name of a parameter, or by
// the case (Express matches paths without case), are the same route
export function routeKey( method: string, path: string ): string {
	return `${method} ${path.replace( PARAM_RE, ":" ).toLowerCase( )}`;
}

export function joinPath( prefix: string, path: string ): string {
	if( path === "/" ) {
		return prefix;
	}

	return prefix === "/" ? path : prefix + path;
}

// the routes noted by an EndPoints or a Channel: frozen, two routes with the same
// key (routeKey) are refused
export class RouteList<R extends object> {
	private readonly list: R[] = [];
	private readonly keys = new Set<string>( );

	get all( ): readonly R[] {
		return this.list;
	}

	add( key: string, route: R ) {
		if( this.keys.has( key ) ) {
			throw new Error( `duplicate route ${key}` );
		}

		this.keys.add( key );
		this.list.push( Object.freeze( route ) );
	}
}
