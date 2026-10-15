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

import { readFile } from "node:fs/promises";
import { EndPoints, HttpError, Sessions, Workers } from "@r-libre/z4js";
import type { Ctx, SessionUser, WorkerHandle } from "@r-libre/z4js";
import { live } from "./live";
import { notesModel } from "./models";
import type { Note, NoteHead } from "./models";
import { tasks } from "./tasks";

// limits of a note, as the client is told (characters)
const TITLE_MAX = 100;
const TEXT_MAX = 10_000;

// a text file: at most 4 bytes per character in UTF-8
const IMPORT_MAX_BYTES = TEXT_MAX * 4;

// the words counted by the "stats" worker
interface Stats {
	notes: number;
	words: number;
	by: string;
}

// the routes of the notes (see the header)
export class NotesEP extends EndPoints {
	constructor( ) {
		super( );

		this.get( "/all", this.on_all, { need: "notes/read" } );
		this.get( "/item/:id", this.on_item, { need: "notes/read" } );
		this.post( "/create", this.on_create, { need: "notes/create" } );
		this.post( "/import", this.on_import, { need: "notes/create" } );
		this.del( "/item/:id", this.on_delete, { need: "notes/delete", filter: Sessions.stepUp } );
		this.get( "/stats", this.on_stats, { need: "notes/read" } );
		this.post( "/recount", this.on_recount, { need: "notes/read" } );
	}

	async on_all( ctx: Ctx<NoteHead[]> ) {
		ctx.json( await notesModel.list( ) );
	}

	async on_item( ctx: Ctx<Note> ) {
		const note = await notesModel.get( ctx.paramValue( "id", "uuid" ) );
		if( !note ) {
			throw new HttpError( 404, "unknown note" );
		}

		ctx.json( note );
	}

	async on_create( ctx: Ctx<{ id: string }> ) {
		const title = ctx.bodyValue( "title", "string", { maxlength: TITLE_MAX, trim: true } );
		const text = ctx.bodyValue( "text", "string", { maxlength: TEXT_MAX } );

		ctx.status( 201 ).json( { id: await this.addNote( ctx, title, text ) } );
	}

	// a text file becomes a note: the file is deleted at the end of the request (not kept)
	async on_import( ctx: Ctx<{ id: string }> ) {
		const { file } = await ctx.filesOf( { file: { maxBytes: IMPORT_MAX_BYTES, types: ["text/plain"] } } );
		const text = await readFile( file.path, "utf-8" );
		if( [...text].length > TEXT_MAX ) {
			throw new HttpError( 400, "text too long" );
		}

		const title = file.name.replace( /\.txt$/i, "" ).trim( ).slice( 0, TITLE_MAX ) || "import";
		ctx.status( 201 ).json( { id: await this.addNote( ctx, title, text ) } );
	}

	async on_delete( ctx: Ctx ) {
		const id = ctx.paramValue( "id", "uuid" );
		if( !await notesModel.remove( id ) ) {
			throw new HttpError( 404, "unknown note" );
		}

		live.notify( { event: "deleted", id } );
		ctx.ok( );
	}

	async on_stats( ctx: Ctx<Stats> ) {
		const texts = await notesModel.texts( );
		ctx.json( await this.stats( ).call( "count", { texts } ) as Stats );
	}

	// the worker reports the progress of the task: the answer gives its id at once
	async on_recount( ctx: Ctx<{ task: string }> ) {
		const stats = this.stats( );
		const texts = await notesModel.texts( );
		const task = tasks.create( ctx.session.user );
		stats.post( "recount", { task, texts } );

		ctx.status( 202 ).json( { task } );
	}

	// stores the note and tells the live channel, returns its id
	private async addNote( ctx: Ctx<any>, title: string, text: string ): Promise<string> {
		const note = await notesModel.add( title, text, ctx.session.user.login );
		live.notify( { event: "created", id: note.id, title, author: note.author } );
		return note.id;
	}

	// the worker that counts the words (started by the main)
	private stats( ): WorkerHandle {
		const stats = Workers.get( "stats" );
		if( !stats ) {
			throw new HttpError( 503 );
		}

		return stats;
	}
}

// the logged user
export class MeEP extends EndPoints {
	constructor( ) {
		super( );
		// any logged user may see himself
		this.get( "/", this.on_me, { need: null } );
	}

	on_me( ctx: Ctx<SessionUser> ) {
		ctx.json( ctx.session.user );
	}
}
