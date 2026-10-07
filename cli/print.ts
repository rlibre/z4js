/**
 *     _____ __
 *    |__   /  / _
 *      /  /  /_| |_
 *     /  /\____   _|
 *    /_____|   |_|
 *
 * @file print.ts
 * @author Etienne Cochard
 *
 * @copyright (c) 2026 R-libre ingenierie
 *
 * Use of this source code is governed by an MIT-style license
 * that can be found in the LICENSE file or at https://opensource.org/licenses/MIT.
 **/

// Console output of the build and dev commands: a colored label, then a value.
// Colors on a terminal only, never with NO_COLOR, forced by FORCE_COLOR (except "0").

import { styleText } from "node:util";

type Style = Parameters<typeof styleText>[0];

export function useColor( stream: NodeJS.WriteStream = process.stdout ): boolean {
	if( process.env.NO_COLOR !== undefined ) {
		return false;
	}

	if( process.env.FORCE_COLOR !== undefined ) {
		return process.env.FORCE_COLOR !== "0";
	}

	return !!stream.isTTY;
}

function paint( style: Style, text: string, stream?: NodeJS.WriteStream ): string {
	return useColor( stream ) ? styleText( style, text ) : text;
}

function labeled( style: Style, label: string, value: string ) {
	const left = paint( style, label.padEnd( 11 ) );
	console.log( value === "" ? left.trimEnd( ) : left + value );
}

export function info( label: string, value = "" ) {
	labeled( "cyan", label, value );
}

export function success( label: string, value = "" ) {
	labeled( "green", label, value );
}

export function warning( message: string ) {
	console.warn( paint( "yellow", message ) );
}

export function failure( message: string ) {
	console.error( paint( "red", message, process.stderr ) );
}
