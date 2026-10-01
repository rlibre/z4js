// The live notifications: the page opens /api/live/notes (with a ticket, the group is
// guarded) and receives an event each time a note is created or deleted.

import { Channel } from "z4js";
import type { WSocket } from "z4js";

// the live endpoint: keeps the open sockets and sends them the note events
export class LiveChannel extends Channel {
	private readonly sockets = new Set<WSocket>( );

	constructor( ) {
		super( );

		this.route( "/notes", {
			onOpen: socket => {
				this.sockets.add( socket );
			},
			// the clients only listen: what they send is ignored
			onMessage: ( ) => { },
			onClose: socket => {
				this.sockets.delete( socket );
			},
		} );
	}

	notify( event: object ) {
		for( const socket of this.sockets ) {
			socket.send( event );
		}
	}
}
