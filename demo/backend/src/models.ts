// The notes table, and the demo accounts created on the first start.

import { randomUUID } from "node:crypto";
import { Model, hashPassword } from "@rlibre/z4js";
import type { Db, SqliteSql } from "@rlibre/z4js";

// the notes table
export class NotesModel extends Model {
	constructor( ) {
		// after users (priority 20): a note has an author
		super( "notes", 40 );
	}

	override async onMigrate( db: Db, version: number ): Promise<number> {
		if( !await this.hasTable( db, "notes" ) ) {
			await db`create table notes ( id text primary key, title text not null, text text not null, author text not null, created datetime not null )`;
		}

		return Math.max( version, 1 );
	}
}

// registered at import, like every model of the application
export const notesModel = new NotesModel( );

// two groups and two accounts, only when there is no account yet
export async function seed( sql: SqliteSql ): Promise<void> {
	const [{ n }] = await sql<{ n: number }[]>`select count(*) as n from users`;
	if( n > 0 ) {
		return;
	}

	const admin = randomUUID( );
	const reader = randomUUID( );

	await sql`insert into groups ${sql( [
		{ id: admin, name: "admin", rights: ["*"] },
		{ id: reader, name: "reader", rights: ["notes/read"] },
	] )}`;

	await sql`insert into users ${sql( [
		{ id: randomUUID( ), login: "admin", grps: [admin], password: await hashPassword( "admin-demo" ) },
		{ id: randomUUID( ), login: "reader", grps: [reader], password: await hashPassword( "reader-demo" ) },
	] )}`;
}
