// The demo frontend: a login dialog, then the notes (list, add, delete, word count
// done by a worker of the backend), refreshed live when a note changes.

import { Application, Button, Dialog, Flex, Form, HBox, Label, MessageBox, TextArea, TextEdit, VBox, asap } from "x4js";
import type { ComponentEvents, ComponentProps, CoreEvent, EventCallback } from "x4js";
import { server } from "./server";
import type { Note } from "./server";

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

// the notes of the logged user: list, add, delete, word count; reports the logout
class NotesView extends VBox<NotesViewProps, NotesViewEvents> {
	declare refs: {
		stats: Label,
		form: Form,
		title: TextEdit,
		text: TextArea,
		list: VBox,
	};

	constructor( props: NotesViewProps ) {
		super( props );
		this.mapPropEvents( props, "logout" );

		this.setContent( [
			new HBox( { cls: "toolbar", content: [
				new Label( { text: `Connecté en tant que ${props.login}` } ),
				new Flex( ),
				this.refs.stats = new Label( { cls: "stats" } ),
				new Button( { label: "Compter les mots", click: ( ) => this.count( ) } ),
				new Button( { label: "Déconnexion", click: ( ) => this.logout( ) } ),
			] } ),

			this.refs.form = new Form( { cls: "create", content: [
				this.refs.title = new TextEdit( { label: "Titre", name: "title", type: "text", value: "" } ),
				this.refs.text = new TextArea( { label: "Texte" } ),
				new Button( { label: "Ajouter la note", click: ( ) => this.add( ) } ),
			] } ),

			this.refs.list = new VBox( { cls: "list" } ),
		] );

		// a note was created or deleted, here or by another user
		this.onGlobalEvent( ev => {
			if( ev.msg.startsWith( "note." ) ) {
				this.refresh( ).catch( showError );
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

		server.openLive( ).catch( showError );
	}
}

new App( );
