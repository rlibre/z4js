// Access to the z4js backend: the session tokens (memory only, a reload
// logs out), a refresh on 401, the password asked again when a route needs a step-up,
// the live events and the progress of the tasks, fired as global messages
// ("note.created", "note.deleted", "task.start", "task.step", "task.end"): the views
// do not know they come through a WebSocket.

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

// a message of /api/tasks: the progress of a task of a worker
export interface TaskEvent {
	task: string;
	phase: "start" | "step" | "end";
	text?: string;
	percent?: number;
	ok?: boolean;
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

	// a call to the API: refresh on 401, step-up on 403 "step-up required", then once again.
	// a FormData body is sent as multipart (files), anything else as JSON
	async call<T = any>( method: string, path: string, body?: object | FormData ): Promise<T> {
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

	// the live events of the notes and the progress of the tasks
	async openSockets( ) {
		await this.openSocket<LiveEvent>( "/api/live/notes", e => `note.${e.event}` );
		await this.openSocket<TaskEvent>( "/api/tasks", e => `task.${e.phase}` );
	}

	// a one-time ticket (POST on the endpoint path), then the socket within 1 s. each
	// message is fired as a global message, named by nameOf
	private async openSocket<E>( path: string, nameOf: ( event: E ) => string ) {
		const { ticket } = await this.call<{ ticket: string }>( "POST", path );
		const ws = new WebSocket( `${API_URL.replace( /^http/, "ws" )}${path}?ticket=${encodeURIComponent( ticket )}` );

		ws.onmessage = e => {
			const event: E = JSON.parse( e.data );
			Application.fireGlobal( nameOf( event ), event );
		};
	}

	private async send<T>( method: string, path: string, body?: object | FormData ): Promise<T> {
		// multipart: the browser writes the content type, with its boundary
		const form = body instanceof FormData;
		const headers: Record<string, string> = form ? {} : { "content-type": "application/json" };
		if( this.tokens ) {
			headers.authorization = "Bearer " + this.tokens.access;
		}

		const res = await fetch( API_URL + path, { method, headers, body: form ? body : body ? JSON.stringify( body ) : undefined } );
		// a body that is not JSON: no message
		const json = await res.json( ).catch( ( ): any => null );

		if( !res.ok ) {
			// z4js answers { error: "short message" }, never more
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
