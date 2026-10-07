/**
 *     _____ __
 *    |__   /  / _
 *      /  /  /_| |_
 *     /  /\____   _|
 *    /_____|   |_|
 *
 * @file tasks.ts
 * @author Etienne Cochard
 *
 * @copyright (c) 2026 R-libre ingenierie
 *
 * Use of this source code is governed by an MIT-style license
 * that can be found in the LICENSE file or at https://opensource.org/licenses/MIT.
 **/

// Progress of long tasks run by the workers, sent to the clients through a WebSocket.
//
// The main thread creates the task: the handler gets its id at once and answers with
// it, so the client can match the messages it receives. The worker reports on it:
//
//   handler   const task = tasks.create( req.user );                // or { broadcast: true }
//             importer.post( "run", { task, file } );              // the object of the worker (workers.start)
//             res.status( 202 ).json( { task } );
//
//   worker    const progress = this.progress( data.task );          // "start"
//             progress.step( "line 300 / 1200", 25 );               // text, optional percent
//             progress.done( );                                     // or progress.fail( "..." )
//
//   main      api.add( "/tasks", tasks );     // a Channel: ticket, then the socket
//
// Messages received by the client: { task, phase: "start" | "step" | "end", text?,
// percent?, ok? }. The text is plain text, never HTML.
//
// Refused by default:
// - the messages of a task go to the sockets of the user who created it only, unless
//   the task is created with broadcast (then every connected user of the group)
// - a worker reports only on a task created by the main thread. The one exception is a
//   broadcast task (a scheduled backup: nobody asked for it): the worker creates it
// - a socket without user (unprotected group) is closed: tasks need a session
//
// A client that connects while a task runs receives its current state (start, then
// the last step). A task ends when its worker says so, or when the worker dies (fail).

import { randomUUID } from "node:crypto";
import { HttpError } from "./http-error";
import { isNumber, isString, isUUID } from "./tools";
import { Channel } from "./ws";
import type { WSocket } from "./ws";

// tasks running at the same time: above, create( ) answers 503
const MAX_TASKS = 1000;

// longest text of a step, in characters (anything longer is cut)
export const MAX_TASK_TEXT = 256;

export type TaskPhase = "start" | "step" | "end";

// what a worker sends to the main thread about a task (workers.ts)
export interface TaskReport {
	id: string;
	phase: TaskPhase;
	text?: string;
	percent?: number;
	ok?: boolean;
	// a task created by the worker itself: always broadcast
	broadcast?: boolean;
}

// what a client receives
export interface TaskMessage {
	task: string;
	phase: TaskPhase;
	text?: string;
	percent?: number;
	ok?: boolean;
}

export interface TaskOptions {
	// sent to every connected user, not only to the one who created the task
	broadcast?: boolean;
}

interface Task {
	id: string;
	user: string;			// null: broadcast only
	broadcast: boolean;
	worker: string;			// id of the worker that started it ("name@class#instance"), null before
	text: string;
	percent: number;
}

// the running tasks and the sockets that follow them (see the header)
export class Tasks extends Channel {
	private readonly tasks = new Map<string, Task>( );
	private readonly sockets = new Set<WSocket>( );

	constructor( ) {
		super( );

		this.route( "/", {
			onOpen: socket => this.open( socket ),
			// the clients only listen
			onMessage: ( ) => { },
			onClose: socket => {
				this.sockets.delete( socket );
			},
		} );
	}

	// a new task for the user (the one of the request), or for everybody with broadcast.
	// returns its id, to give to the worker and to the client
	create( user: string | { id: string }, options: TaskOptions = {} ): string {
		const owner = isString( user ) ? user : user?.id;
		if( !owner && !options.broadcast ) {
			throw new Error( "tasks: a task needs a user, or broadcast" );
		}

		return this.add( owner ?? null, !!options.broadcast ).id;
	}

	// a report of a worker. returns why it was refused, null if accepted (workers.ts logs it)
	report( r: TaskReport, worker: string ): string {
		let task = this.tasks.get( r.id );

		// a broadcast task created by the worker itself, at its start
		if( !task && r.phase === "start" && r.broadcast && isUUID( r.id ) ) {
			task = this.add( null, true, r.id );
		}

		if( !task ) {
			return "unknown task";
		}

		if( task.worker && task.worker !== worker ) {
			return "task of another worker";
		}

		task.worker = worker;

		switch( r.phase ) {
			case "start":
				this.send( task, { task: task.id, phase: "start" } );
				break;

			case "step":
				task.text = isString( r.text ) ? r.text.slice( 0, MAX_TASK_TEXT ) : "";
				task.percent = isNumber( r.percent ) ? Math.min( 100, Math.max( 0, r.percent ) ) : null;
				this.send( task, this.stepOf( task ) );
				break;

			case "end":
				this.end( task, r.ok === true, isString( r.text ) ? r.text.slice( 0, MAX_TASK_TEXT ) : "" );
				break;

			default:
				return "unknown phase";
		}

		return null;
	}

	// the worker died: its running tasks fail
	workerEnded( worker: string ) {
		for( const task of [...this.tasks.values( )] ) {
			if( task.worker === worker ) {
				this.end( task, false, "worker ended" );
			}
		}
	}

	private add( user: string, broadcast: boolean, id: string = randomUUID( ) ): Task {
		if( this.tasks.size >= MAX_TASKS ) {
			throw new HttpError( 503 );
		}

		const task: Task = { id, user, broadcast, worker: null, text: "", percent: null };
		this.tasks.set( id, task );
		return task;
	}

	private end( task: Task, ok: boolean, text: string ) {
		this.tasks.delete( task.id );
		this.send( task, { task: task.id, phase: "end", ok, ...( text ? { text } : {} ) } );
	}

	private stepOf( task: Task ): TaskMessage {
		return {
			task: task.id,
			phase: "step",
			text: task.text,
			...( task.percent === null ? {} : { percent: task.percent } ),
		};
	}

	// a socket that opens catches up with the running tasks it may see
	private open( socket: WSocket ) {
		if( !socket.user ) {
			socket.close( 1008, "tasks need a session" );
			return;
		}

		this.sockets.add( socket );

		for( const task of this.tasks.values( ) ) {
			if( task.worker && this.mayFollow( socket, task ) ) {
				socket.send( { task: task.id, phase: "start" } satisfies TaskMessage );
				if( task.text || task.percent !== null ) {
					socket.send( this.stepOf( task ) );
				}
			}
		}
	}

	private send( task: Task, message: TaskMessage ) {
		for( const socket of this.sockets ) {
			if( this.mayFollow( socket, task ) ) {
				socket.send( message );
			}
		}
	}

	private mayFollow( socket: WSocket, task: Task ): boolean {
		return task.broadcast || String( socket.user?.id ) === task.user;
	}
}
