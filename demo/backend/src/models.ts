// The notes table and its queries, and the demo accounts created on the first start.
// Nobody else touches these data: the end points import notesModel.

import { randomUUID } from "node:crypto";
import { rmSync } from "node:fs";
import { Model, hashPassword } from "@r-libre/z4js";
import type { Db, SqliteDb } from "@r-libre/z4js";

// a note in the list
export interface NoteHead {
	id: string;
	title: string;
	author: string;
	created: Date;
}

// a whole note
export interface Note extends NoteHead {
	text: string;
}

// the notes table and its queries
export class NotesModel extends Model<SqliteDb> {
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

	// every note, the newest first, without its text
	async list( ): Promise<NoteHead[]> {
		return await this.db`select id, title, author, created from notes order by created desc` as NoteHead[];
	}

	// null if unknown
	async get( id: string ): Promise<Note> {
		const [note] = await this.db`select * from notes where id = ${id}` as Note[];
		return note ?? null;
	}

	async add( title: string, text: string, author: string ): Promise<Note> {
		const note: Note = { id: randomUUID( ), title, text, author, created: new Date( ) };
		await this.db`insert into notes ${this.db( note )}`;
		return note;
	}

	// false if unknown
	async remove( id: string ): Promise<boolean> {
		const { count } = await this.db`delete from notes where id = ${id}`;
		return count > 0;
	}

	// the texts of every note, for the word count
	async texts( ): Promise<string[]> {
		const rows = await this.db`select text from notes`;
		return rows.map( r => r.text as string );
	}
}

// registered at import, like every model of the application
export const notesModel = new NotesModel( );

// two groups and two accounts, only when there is no account yet: a migration, so
// they are created in the same transaction as the tables
class DemoAccountsModel extends Model {
	constructor( ) {
		// after groups (10) and users (20)
		super( "demo-accounts", 50 );
	}

	override async onMigrate( db: Db, version: number ): Promise<number> {
		const [{ n }] = await db<{ n: number }[]>`select count(*) as n from users`;
		if( n > 0 ) {
			return Math.max( version, 1 );
		}

		const accounts = [
			{ group: randomUUID( ), name: "admin", rights: ["*"], password: "admin-demo" },
			{ group: randomUUID( ), name: "reader", rights: ["notes/read"], password: "reader-demo" },
		];

		for( const a of accounts ) {
			await db`insert into groups ( id, name, rights ) values ( ${a.group}, ${a.name}, ${a.rights} )`;
			await db`insert into users ( id, login, grps, password ) values ( ${randomUUID( )}, ${a.name}, ${[a.group]}, ${await hashPassword( a.password )} )`;
		}

		return Math.max( version, 1 );
	}
}

export const demoAccountsModel = new DemoAccountsModel( );

// the copy of the whole database: no table of its own, nothing to migrate
class BackupModel extends Model {
	constructor( ) {
		super( "backup" );
	}

	// vacuum into refuses an existing file
	async copyTo( file: string ): Promise<void> {
		rmSync( file, { force: true } );
		await this.db`vacuum into ${file}`;
	}
}

export const backupModel = new BackupModel( );
