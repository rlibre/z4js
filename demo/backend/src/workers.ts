// Entry file of the workers (dist/workers.js): every worker class is registered here.

import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { Mutex, Worker, runWorker, sqlite } from "z4js";
import type { SqliteSql } from "z4js";
import type { DemoConfig } from "./config";

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
			const start = Date.now( );
			// vacuum into refuses an existing file
			rmSync( target, { force: true } );
			await this.sql`vacuum into ${target}`;
			this.log.info( "backup.done", { file: target, ms: Date.now( ) - start } );
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
