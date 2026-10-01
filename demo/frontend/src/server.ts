// Access to the y4js backend: the session tokens (memory only, a reload
// logs out), a refresh on 401, the password asked again when a route needs a step-up,
// and the live events, fired as global messages ("note.created", "note.deleted"):
// the views do not know they come through a WebSocket.

import { Application, InputBox } from "x4js";

// the backend, set at build time (x4.config.json "define"): the page may come from the
// dev server of x4js (another port), the backend then allows its origin (server.cors)
declare const API_URL: string;

export interface Note {
	id: string;
	title: string;
	author: string;
	created: string;
}

export interface LiveEvent {
	event: "created" | "deleted";
	id: string;
	title?: string;
	author?: string;
}

// an error answer: the HTTP status and the short message of the backend
type ServerError = Error & { status: number };

interface Tokens {
	access: string;
	refresh: string;
}

// the calls to the backend, with the tokens of the session (see the header)
class Server {
	private tokens: Tokens = null;

	async login( login: string, password: string ) {
		this.tokens = await this.send<Tokens>( "POST", "/auth/login", { login, password } );
	}

	async logout( ) {
		if( this.tokens ) {
			await this.send( "POST", "/auth/logout", { refresh: this.tokens.refresh } ).catch( ( ): void => { } );
			this.tokens = null;
		}
	}

	// a call to the API: refresh on 401, step-up on 403 "step-up required", then once again
	async call<T = any>( method: string, path: string, body?: object ): Promise<T> {
		try {
			return await this.send<T>( method, path, body );
		}
		catch( e ) {
			const { status, message } = e as ServerError;
			const again = ( status === 401 && await this.refresh( ) ) ||
				( message === "step-up required" && await this.stepUp( ) );

			if( !again ) {
				throw e;
			}

			return this.send<T>( method, path, body );
		}
	}

	// live events: a one-time ticket (POST on the endpoint path), then the socket within 1 s
	async openLive( ) {
		const { ticket } = await this.call<{ ticket: string }>( "POST", "/api/live/notes" );
		const ws = new WebSocket( `${API_URL.replace( /^http/, "ws" )}/api/live/notes?ticket=${encodeURIComponent( ticket )}` );

		ws.onmessage = e => {
			const event: LiveEvent = JSON.parse( e.data );
			Application.fireGlobal( `note.${event.event}`, event );
		};
	}

	private async send<T>( method: string, path: string, body?: object ): Promise<T> {
		const headers: Record<string, string> = { "content-type": "application/json" };
		if( this.tokens ) {
			headers.authorization = "Bearer " + this.tokens.access;
		}

		const res = await fetch( API_URL + path, { method, headers, body: body ? JSON.stringify( body ) : undefined } );
		// a body that is not JSON: no message
		const json = await res.json( ).catch( ( ): any => null );

		if( !res.ok ) {
			// y4js answers { error: "short message" }, never more
			const error: ServerError = Object.assign( new Error( json?.error ?? res.statusText ), { status: res.status } );
			throw error;
		}

		return json;
	}

	private async refresh( ): Promise<boolean> {
		if( !this.tokens ) {
			return false;
		}

		try {
			this.tokens = await this.send<Tokens>( "POST", "/auth/refresh", { refresh: this.tokens.refresh } );
			return true;
		}
		catch {
			this.tokens = null;
			return false;
		}
	}

	private async stepUp( ): Promise<boolean> {
		const password = await InputBox.showAsync( "Cette action demande de confirmer votre mot de passe", "", "Confirmation", { password: true } );
		if( !password ) {
			return false;
		}

		await this.send( "POST", "/auth/stepup", { password } );
		return true;
	}
}

export const server = new Server( );
