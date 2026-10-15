// The backup of the database, every config.backupMinutes (data/backup/demo.db).
// On the connection of the main thread: in production the database is exclusive (one
// instance), no other connection, a worker's for instance, could open it.

import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { Logger } from "@r-libre/z4js";
import type { DemoConfig } from "./config";
import { backupModel } from "./models";

// starts the periodic backup, returns the function that stops it
export function startBackups( config: DemoConfig ): ( ) => void {
	const folder = join( config.data, "backup" );
	mkdirSync( folder, { recursive: true } );
	const target = join( folder, "demo.db" );

	const timer = setInterval( async ( ) => {
		const start = Date.now( );
		try {
			await backupModel.copyTo( target );
			Logger.app.info( "backup.done", { file: target, ms: Date.now( ) - start } );
		}
		catch( e ) {
			Logger.app.error( "backup.failed", { error: e } );
		}
	}, config.backupMinutes * 60_000 );

	return ( ) => clearInterval( timer );
}
