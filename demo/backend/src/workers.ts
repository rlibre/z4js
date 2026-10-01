// Entry file of the workers (dist/workers.js): every worker class is registered here.

import { Mutex, Worker, runWorker } from "y4js";

// counts the words of the notes. the mutex shows a lock shared by every thread
class Stats extends Worker {
	private readonly mutex = new Mutex( "stats" );

	async onMessage( type: string, data: { texts: string[] } ) {
		if( type !== "count" ) {
			throw new Error( `stats: unknown message "${type}"` );
		}

		return this.mutex.withLock( 1000, ( ) => {
			const words = data.texts.reduce( ( n, text ) => n + ( text.match( /\S+/g )?.length ?? 0 ), 0 );
			this.log.info( "stats.counted", { notes: data.texts.length, words } );
			return { notes: data.texts.length, words, by: `${this.name}#${this.instance}` };
		} );
	}
}

Worker.register( "stats", Stats );
runWorker( );
