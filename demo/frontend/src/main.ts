// The demo frontend: a login dialog, then the notes (list, add, delete, word count
// done by a worker of the backend), refreshed live when a note changes. The recount is
// a task of the worker: its progress is shown as it comes.

import { Application, Button, Dialog, FileDialog, Flex, Form, HBox, Label, MessageBox, Notification, ProgressionBox, TextArea, TextEdit, VBox, asap } from "x4js";
import type { ComponentEvents, ComponentProps, CoreEvent, EventCallback } from "x4js";
import { server } from "./server";
import type { Note, TaskEvent } from "./server";

import "./main.scss";

function showError( e: unknown ) {
	MessageBox.show( e instanceof Error ? e.message : String( e ) );
}

// :: NOTES ::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

interface NotesViewEvents extends ComponentEvents {
	logout: CoreEvent;
}

interface NotesViewProps extends ComponentProps {
	login: string;
	logout?: EventCallback<CoreEvent>;
}

// the notes of the logged user: list, add, delete, word count (direct, or as a task
// whose progress is shown); reports the logout
class NotesView extends VBox<NotesViewProps, NotesViewEvents> {
	declare refs: {
		stats: Label,
		form: Form,
		title: TextEdit,
		text: TextArea,
		list: VBox,
		files: FileDialog,
	};

	// the recount task in progress and its box, null when none
	private task: string = null;
	private progress: ProgressionBox = null;

	// task messages received while the recount request runs: the worker may report
	// before the answer gives the id. null when no request runs
	private early: TaskEvent[] = null;

	constructor( props: NotesViewProps ) {
		super( props );
		this.mapPropEvents( props, "logout" );

		this.setContent( [
			new HBox( { cls: "toolbar", content: [
				new Label( { text: `Connecté en tant que ${props.login}` } ),
				new Flex( ),
				this.refs.stats = new Label( { cls: "stats" } ),
				new Button( { label: "Compter les mots", click: ( ) => this.count( ) } ),
				new Button( { label: "Recompter (tâche)", click: ( ) => this.recount( ) } ),
				new Button( { label: "Déconnexion", click: ( ) => this.logout( ) } ),
			] } ),

			this.refs.form = new Form( { cls: "create", content: [
				this.refs.title = new TextEdit( { label: "Titre", name: "title", type: "text", value: "" } ),
				this.refs.text = new TextArea( { label: "Texte" } ),
				new HBox( { content: [
					new Button( { label: "Ajouter la note", click: ( ) => this.add( ) } ),
					new Button( { label: "Importer un fichier texte", click: ( ) => this.refs.files.showDialog( ) } ),
				] } ),
				// the file picker of the browser, hidden: the button above opens it
				this.refs.files = new FileDialog( { accept: ".txt,text/plain", callback: files => this.importFile( files[0] ) } ),
			] } ),

			this.refs.list = new VBox( { cls: "list" } ),
		] );

		// a note was created or deleted, here or by another user; a task progressed
		this.onGlobalEvent( ev => {
			if( ev.msg.startsWith( "note." ) ) {
				this.refresh( ).catch( showError );
			}
			else if( ev.msg.startsWith( "task." ) ) {
				this.onTask( ev.params as TaskEvent );
			}
		} );

		this.refresh( ).catch( showError );
	}

	private async refresh( ) {
		const notes = await server.call<Note[]>( "GET", "/api/notes/all" );

		this.refs.list.setContent( notes.map( note => new HBox( { cls: "note", content: [
			new Label( { cls: "title", text: note.title } ),
			new Label( { cls: "author", text: `par ${note.author}` } ),
			new Flex( ),
			new Button( { label: "Supprimer", click: ( ) => this.remove( note ) } ),
		] } ) ) );
	}

	// the text is read from the TextArea itself: in x4js 2.3.8, TextArea does not pass
	// its name to its textarea, so Form.getValues( ) does not see it
	private async add( ) {
		const { title } = this.refs.form.getValues( );
		const text = this.refs.text.getText( );

		try {
			await server.call( "POST", "/api/notes/create", { title, text } );
			this.refs.title.setValue( "" );
			this.refs.text.setText( "" );
		}
		catch( e ) {
			showError( e );
		}
	}

	// a text file becomes a note, titled by its name: sent as multipart (field "file")
	private async importFile( file: File ) {
		if( !file ) {
			return;
		}

		const form = new FormData( );
		form.append( "file", file );

		try {
			await server.call( "POST", "/api/notes/import", form );
		}
		catch( e ) {
			showError( e );
		}
	}

	// the backend asks for a step-up: server.call asks the password again
	private async remove( note: Note ) {
		try {
			await server.call( "DELETE", `/api/notes/item/${note.id}` );
		}
		catch( e ) {
			showError( e );
		}
	}

	private async count( ) {
		try {
			const r = await server.call<{ notes: number, words: number, by: string }>( "GET", "/api/notes/stats" );
			this.refs.stats.setText( `${r.notes} notes, ${r.words} mots (worker ${r.by})` );
		}
		catch( e ) {
			showError( e );
		}
	}

	// the same count as a task of the worker: the answer gives its id, the progress
	// comes as global messages (onTask)
	private async recount( ) {
		this.early = [];

		try {
			const { task } = await server.call<{ task: string }>( "POST", "/api/notes/recount" );
			this.task = task;
			this.progress = new ProgressionBox( "Comptage des mots" );
			this.progress.show( );
		}
		catch( e ) {
			showError( e );
		}

		const early = this.early;
		this.early = null;
		early.forEach( e => this.onTask( e ) );
	}

	// our recount moves its box; the end of another task (the backup of the server,
	// a recount started elsewhere) is a notification
	private onTask( e: TaskEvent ) {
		if( this.early ) {
			this.early.push( e );
			return;
		}

		if( e.task !== this.task ) {
			if( e.phase === "end" ) {
				new Notification( { title: "Tâche terminée", text: e.text ?? "", mode: e.ok ? "success" : "danger" } ).display( 4 );
			}
			return;
		}

		if( e.phase === "step" ) {
			this.progress.setText( e.text ?? "", e.percent ?? 0 );
		}
		else if( e.phase === "end" ) {
			if( e.ok ) {
				this.progress.setText( e.text ?? "", 100 );
			}
			else {
				this.progress.addError( e.text ?? "échec", 100 );
			}

			this.progress.done( );
			this.task = null;
			this.progress = null;
		}
	}

	private async logout( ) {
		await server.logout( );
		this.fire( "logout", {} );
	}
}

// :: APPLICATION ::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::

// owns the views and decides what their events mean. setMainView is called once:
// the main view takes the whole page and the screens change its content
class App extends Application {
	private readonly main = new VBox( { cls: "mainview" } );

	constructor( ) {
		super( {} );
		this.setMainView( this.main );
		this.showLogin( );
	}

	// the login dialog, over an empty page. Escape closes any dialog: it opens again
	private showLogin( ) {
		this.main.clearContent( );

		let logged = false;

		const form = new Form( { content: [
			new Label( { cls: "hint", text: "admin / admin-demo (tous les droits), reader / reader-demo (lecture seule)" } ),
			new TextEdit( { label: "Identifiant", name: "login", type: "text", value: "admin" } ),
			new TextEdit( { label: "Mot de passe", name: "password", type: "password", value: "admin-demo" } ),
		] } );

		const dialog = new Dialog( {
			title: "Connexion",
			form,
			buttons: ["ok.default"],
			btnclick: async ( ) => {
				const { login, password } = form.getValues( );

				try {
					await server.login( login, password );
					logged = true;
					dialog.close( );
					this.showNotes( login );
				}
				catch( e ) {
					showError( e );
				}
			},
		} );

		dialog.on( "close", ( ) => {
			if( !logged ) {
				asap( ( ) => this.showLogin( ) );
			}
		} );

		dialog.show( );
	}

	private showNotes( login: string ) {
		this.main.setContent( new NotesView( {
			flex: true,
			login,
			logout: ( ) => this.showLogin( ),
		} ) );

		server.openSockets( ).catch( showError );
	}
}

new App( );
