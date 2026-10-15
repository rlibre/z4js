// Entry point of the demo: configuration, database, sessions, routes, workers, server.

import { join } from "node:path";
import { Access, Config, ConfigError, Logger, Model, RouteGroup, SecurityLog, Sessions, Workers, serve, sqlite } from "@r-libre/z4js";
import { startBackups } from "./backup";
import { DemoConfig } from "./config";
import { live } from "./live";
import { MeEP, NotesEP } from "./notes";
import { tasks } from "./tasks";

let config: DemoConfig;
try {
	config = Config.load( DemoConfig );
}
catch( e ) {
	// every problem of the file at once
	console.error( e instanceof ConfigError ? e.message : e );
	process.exit( 1 );
}

const logger = Logger.create( config.log );
SecurityLog.create( { file: config.securityLog.file } );

// exclusive in production: one instance only (z4js keeps state in memory). not in
// debug, so that the database can be opened in an SQL editor meanwhile
const sql = sqlite( join( config.data, "demo.db" ), { exclusive: !config.debug } );

// they register the models they read (users, groups, sessions): created before the migration
const access = new Access( );
const sessions = new Sessions( config.session, { rateLimit: config.rateLimit } );

// every table created or migrated in one transaction, the demo accounts with them
// (models registered at the import of models.ts)
await Model.updateAll( sql );
await Model.validateAll( sql );

// the worker entry file is dist/workers.js, next to this one
const workers = new Workers( { config, tasks } );
// found again by the end points (Workers.get)
await workers.start( "stats" );

const stopBackups = startBackups( config );

// every route of /api needs a session; /auth is open (login, refresh, logout, stepup)
const api = RouteGroup.guarded( "/api", sessions.guard, access )
	.add( "/notes", new NotesEP( ) )
	.add( "/me", new MeEP( ) )
	.add( "/live", live )
	.add( "/tasks", tasks );

const auth = RouteGroup.unprotected( "/auth" )
	.add( "/", sessions.endPoints );

await serve( {
	config,
	groups: [api, auth],
	statics: [{ path: "/", folder: config.www }],
	onStop: async ( ) => {
		stopBackups( );
		await workers.stop( );
		await sql.end( );
		logger.close( );
	},
} );
