// Entry file of the workers (dist/workers.js): every worker class is registered here.

import { Mutex, Worker, runWorker } from "@r-libre/z4js";

// counts the words of the notes. the mutex shows a lock shared by every thread,
// "recount" a long task whose progress the client follows
class Stats extends Worker {
	private readonly mutex = new Mutex( "stats" );

	async onMessage( type: string, data: { texts: string[], task?: string } ) {
		switch( type ) {
			case "count":
				return this.mutex.withLock( 1000, ( ) => {
					const words = countWords( data.texts );
					this.log.info( "stats.counted", { notes: data.texts.length, words } );
					return { notes: data.texts.length, words, by: this.id };
				} );

			case "recount":
				return this.recount( data.texts, data.task );

			default:
				throw new Error( `stats: unknown message "${type}"` );
		}
	}

	// one note at a time, slowed down on purpose so that the progress can be seen
	private async recount( texts: string[], task: string ) {
		const progress = this.progress( task );
		let words = 0;

		for( let i = 0; i < texts.length; i++ ) {
			if( !await this.wait( 400 ) ) {
				return progress.fail( "arrêt du serveur" );
			}

			words += countWords( [texts[i]] );
			progress.step( `note ${i + 1} / ${texts.length} : ${words} mots`, Math.round( ( i + 1 ) * 100 / texts.length ) );
		}

		progress.done( `${texts.length} notes, ${words} mots` );
	}
}

function countWords( texts: string[] ): number {
	return texts.reduce( ( n, text ) => n + ( text.match( /\S+/g )?.length ?? 0 ), 0 );
}

Worker.register( "stats", Stats );
runWorker( );
