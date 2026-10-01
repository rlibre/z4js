// The configuration of the demo: the one of z4js (server, tls, log, session...)
// plus the folders of the demo and the period of its backup.

import { Config } from "@rlibre/z4js";

// the configuration of the demo backend
export class DemoConfig extends Config {
	// the SQLite file lives there (created if missing)
	readonly data = this.folder( "data", { create: true } );

	// the web page
	readonly www = this.folder( "www" );

	// the backup worker copies the database that often (data/backup/demo.db)
	readonly backupMinutes = this.int( "backupMinutes", { def: 1, min: 1 } );
}
