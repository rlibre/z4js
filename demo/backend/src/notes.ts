// The notes API, behind the session guard of the /api group.
//
//   GET    /api/notes/all          notes/read
//   GET    /api/notes/item/:id     notes/read
//   POST   /api/notes/create       notes/create   { title, text }
//   POST   /api/notes/import       notes/create   a text file (multipart, field "file"): one note,
//                                                 titled by the name of the file
//   DELETE /api/notes/item/:id     notes/delete   + step-up (identity confirmed recently)
//   GET    /api/notes/stats        notes/read     words counted by the "stats" worker
//   POST   /api/notes/recount      notes/read     the same, slowly, as a task: 202 { task },
//                                                 its progress comes on /api/tasks
//   GET    /api/me                 any user

import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { EndPoints, HttpError, noAccessCheck } from "@r-libre/z4js";
import type { Access, Request, Response, Sessions, SqliteSql, Tasks, WorkerHandle } from "@r-libre/z4js";
import type { LiveChannel } from "./live";

// limits of a note, as the client is told (characters)
const TITLE_MAX = 100;
const TEXT_MAX = 10_000;

// a text file: at most 4 bytes per character in UTF-8
const IMPORT_MAX_BYTES = TEXT_MAX * 4;

interface Deps {
	sql: SqliteSql;
	access: Access;
	sessions: Sessions;
	live: LiveChannel;
	// the worker that counts the words
	stats: WorkerHandle;
	tasks: Tasks;
}

// the routes of the notes (see the header)
export class NotesEP extends EndPoints {
	constructor( private readonly deps: Deps ) {
		super( );

		this.get( "/all", this.on_all );
		this.get( "/item/:id", this.on_item );
		this.post( "/create", this.on_create );
		this.post( "/import", this.on_import );
		this.del( "/item/:id", this.on_delete, { filter: deps.sessions.stepUp } );
		this.get( "/stats", this.on_stats );
		this.post( "/recount", this.on_recount );
	}

	async on_all( req: Request, res: Response ) {
		await this.need( req, "notes/read" );
		res.json( await this.deps.sql`select id, title, author, created from notes order by created desc` );
	}

	async on_item( req: Request, res: Response ) {
		await this.need( req, "notes/read" );

		const id = this.paramValue( req, "id", "uuid" );
		const [note] = await this.deps.sql`select * from notes where id = ${id}`;
		if( !note ) {
			throw new HttpError( 404, "unknown note" );
		}

		res.json( note );
	}

	async on_create( req: Request, res: Response ) {
		await this.need( req, "notes/create" );

		const title = this.bodyValue( req, "title", "string", { maxlength: TITLE_MAX, trim: true } );
		const text = this.bodyValue( req, "text", "string", { maxlength: TEXT_MAX } );

		res.status( 201 ).json( { id: await this.addNote( req, title, text ) } );
	}

	// a text file becomes a note: the file is deleted at the end of the request (not kept)
	async on_import( req: Request, res: Response ) {
		await this.need( req, "notes/create" );

		const { file } = await this.filesOf( req, { file: { maxBytes: IMPORT_MAX_BYTES, types: ["text/plain"] } } );
		const text = await readFile( file.path, "utf-8" );
		if( [...text].length > TEXT_MAX ) {
			throw new HttpError( 400, "text too long" );
		}

		const title = file.name.replace( /\.txt$/i, "" ).trim( ).slice( 0, TITLE_MAX ) || "import";
		res.status( 201 ).json( { id: await this.addNote( req, title, text ) } );
	}

	async on_delete( req: Request, res: Response ) {
		await this.need( req, "notes/delete" );

		const id = this.paramValue( req, "id", "uuid" );
		const { count } = await this.deps.sql`delete from notes where id = ${id}`;
		if( !count ) {
			throw new HttpError( 404, "unknown note" );
		}

		this.deps.live.notify( { event: "deleted", id } );
		res.json( {} );
	}

	async on_stats( req: Request, res: Response ) {
		await this.need( req, "notes/read" );

		const rows = await this.deps.sql`select text from notes`;
		res.json( await this.deps.stats.call( "count", { texts: rows.map( r => r.text ) } ) );
	}

	// the worker reports the progress of the task: the answer gives its id at once
	async on_recount( req: Request, res: Response ) {
		await this.need( req, "notes/read" );

		const rows = await this.deps.sql`select text from notes`;
		const task = this.deps.tasks.create( req.user );
		this.deps.stats.post( "recount", { task, texts: rows.map( r => r.text ) } );

		res.status( 202 ).json( { task } );
	}

	// stores the note and tells the live channel, returns its id
	private async addNote( req: Request, title: string, text: string ): Promise<string> {
		const note = { id: randomUUID( ), title, text, author: req.user.login, created: new Date( ) };

		await this.deps.sql`insert into notes ${this.deps.sql( note )}`;
		this.deps.live.notify( { event: "created", id: note.id, title, author: note.author } );

		return note.id;
	}

	private async need( req: Request, right: string ) {
		if( !await this.deps.access.userHasAccess( req.user, right ) ) {
			throw new HttpError( 403 );
		}
	}
}

// the logged user
export class MeEP extends EndPoints {
	constructor( ) {
		super( );
		this.get( "/", this.on_me );
	}

	// any logged user may see himself: no right to check
	on_me( req: Request, res: Response ) {
		noAccessCheck( req.user );
		res.json( req.user );
	}
}
