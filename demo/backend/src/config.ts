// The configuration of the demo: the one of y4js (server, tls, log, session...)
// plus the folders of the demo.

import { Config } from "y4js";

// the configuration of the demo backend
export class DemoConfig extends Config {
	// the SQLite file lives there (created if missing)
	readonly data = this.folder( "data", { create: true } );

	// the web page
	readonly www = this.folder( "www" );
}
