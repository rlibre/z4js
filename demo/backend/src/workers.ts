// Entry file of the workers (dist/workers.js): every worker class is registered here.

import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { Mutex, Worker, runWorker, sqlite } from "@r-libre/z4js";
import type { SqliteSql } from "@r-libre/z4js";
import type { DemoConfig } from "./config";

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

// a scheduled task: copies the database every config.backupMinutes, until the stop.
// its own connection: the one of the main thread cannot cross the thread boundary
class Backup extends Worker {
	private sql: SqliteSql;

	onStart( ) {
		const { data } = this.config as DemoConfig;
		mkdirSync( join( data, "backup" ), { recursive: true } );
		// the main thread may be writing: wait for it rather than fail
		this.sql = sqlite( join( data, "demo.db" ), { busyTimeout: 5000 } );
	}

	async onRun( ) {
		const { data, backupMinutes } = this.config as DemoConfig;
		const target = join( data, "backup", "demo.db" );

		while( await this.wait( backupMinutes * 60_000 ) ) {
			// nobody asked for it: a broadcast task, every connected user sees it
			const progress = this.progress( { broadcast: true } );
			const start = Date.now( );

			// vacuum into refuses an existing file
			progress.step( "copie de la base" );
			rmSync( target, { force: true } );
			await this.sql`vacuum into ${target}`;

			this.log.info( "backup.done", { file: target, ms: Date.now( ) - start } );
			progress.done( "sauvegarde de la base faite" );
		}
	}

	// nothing is asked to it
	onMessage( type: string ) {
		throw new Error( `backup: unknown message "${type}"` );
	}

	async onStop( ) {
		await this.sql.end( );
	}
}

Worker.register( "stats", Stats );
Worker.register( "backup", Backup );
runWorker( );
