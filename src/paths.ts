// Route paths: checks and helpers shared by the HTTP and WebSocket controllers.

// a path is made of segments separated by "/": a literal, or ":name" for a parameter.
// No wildcard, no optional part, no regular expression, no "." or ".." segment
// (a browser normalizes them away: such a route could never be reached)
const SEGMENT_RE = /^(?:[A-Za-z0-9_.~-]+|:[A-Za-z_][A-Za-z0-9_]*)$/;
const PARAM_RE = /:[A-Za-z_][A-Za-z0-9_]*/g;

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
// not pass the value to the controllers), WebSocket endpoints
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
