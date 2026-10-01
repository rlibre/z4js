// Entry point of the demo: configuration, database, sessions, routes, workers, server.

import { join } from "node:path";
import { Access, Config, ConfigError, Logger, Model, RouteGroup, SecurityLog, Sessions, Workers, serve, sqlite } from "z4js";
import { DemoConfig } from "./config";
import { LiveChannel } from "./live";
import { seed } from "./models";
import { MeEP, NotesEP } from "./notes";

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
const securityLog = new SecurityLog( { file: config.securityLog.file } );

const sql = sqlite( join( config.data, "demo.db" ) );

// they register the models they read (users, groups, sessions): created before the migration
const access = new Access( sql, { securityLog } );
const sessions = new Sessions( sql, config.session, { rateLimit: config.rateLimit, securityLog } );

// every table created or migrated in one transaction (notesModel registered at the
// import of models.ts), then the demo accounts
await Model.updateAll( sql );
await Model.validateAll( sql );
await seed( sql );

// the worker entry file is dist/workers.js, next to this one
const workers = new Workers( { config, logger } );
await workers.start( "stats" );
await workers.start( "backup" );

const live = new LiveChannel( );

// every route of /api needs a session; /auth is open (login, refresh, logout, stepup)
const api = RouteGroup.guarded( "/api", sessions.guard )
	.add( "/notes", new NotesEP( { sql, access, sessions, live, workers } ) )
	.add( "/me", new MeEP( ) )
	.add( "/live", live );

const auth = RouteGroup.unprotected( "/auth" )
	.add( "/", sessions.endPoints );

await serve( {
	config,
	logger,
	groups: [api, auth],
	statics: [{ path: "/", folder: config.www }],
	onStop: async ( ) => {
		await workers.stop( );
		await sql.end( );
		logger.close( );
	},
} );
