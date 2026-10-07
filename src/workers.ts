/**
 *     _____ __
 *    |__   /  / _
 *      /  /  /_| |_
 *     /  /\____   _|
 *    /_____|   |_|
 *
 * @file workers.ts
 * @author Etienne Cochard
 *
 * @copyright (c) 2026 R-libre ingenierie
 *
 * Use of this source code is governed by an MIT-style license
 * that can be found in the LICENSE file or at https://opensource.org/licenses/MIT.
 **/

// Background workers (worker_threads).
//
// Every worker class lives in one entry file of the application, built as workers.js
// next to the main script. It registers the classes by name and calls runWorker:
//
//   class Mailer extends Worker {
//       async onMessage( type: string, data: any ) { ... }      // its result answers a call
//   }
//   class Backup extends Worker {                              // runs until its stop
//       async onRun( ) {
//           while( await this.wait( 3_600_000 ) ) { ... }      // false as soon as the worker stops
//       }
//   }
//   class Indexer extends Worker {                             // no onMessage: reads its messages itself
//       async onRun( ) {
//           let msg: WorkerMessage;
//           while( !this.signal.aborted ) {
//               if( msg = this.peekMessage( ) ) { ... }        // never waits. msg.reply( value ) answers a call
//               else if( this.files.length ) { ... }           // a piece of work
//               else { await this.waitMessage( ); }            // nothing to do: until a message or the stop
//           }
//       }
//   }
//   Worker.register( "mailer", Mailer );
//   Worker.register( "render", Render, { multiple: true } );   // several instances allowed
//   runWorker( );
//
// The main thread starts them by name and talks to them:
//
//   const workers = new Workers( { config, logger } );
//   await workers.start( "mailer" );
//   await workers.start( "render", 4 );
//   workers.post( "mailer", "send", { to } );                  // one instance, in turn
//   workers.broadcast( "render", "clear-cache" );              // every instance
//   const pdf = await workers.call( "render", "pdf", { id } );
//   workers.on( "mailer", "sent", ( data, info ) => ... );     // posted by a worker
//   workers.list( );
//   await workers.stop( );
//
// Lifecycle of a worker: onStart, then the messages (one at a time, in order) and
// onRun beside them. The stop fires this.signal at once (a wait in progress returns
// false), waits for the end of onRun, then runs onStop. An error that ends onRun stops
// the worker: like a crash, it is logged and not restarted.
//
// A worker without onMessage reads its messages in onRun, when it chooses to: peekMessage
// (at once, null if there is none), waitMessage (until one is there), getMessage (the
// next one, waited for, null at the stop). peekMessage reads the port itself, so a loop
// that never awaits still receives its messages, and its stop. The messages not read yet
// wait in a queue of MAX_INBOX: above, a call is rejected and a post is logged and lost.
//
// A worker receives the loaded configuration (frozen again on its side) and the
// shared mutexes (mutex.ts). Its log lines go to the main thread, which writes them:
// two threads writing the same file could mix their lines. A crashed worker is not
// restarted: it is logged, removed from the list, its pending calls fail and the
// mutexes it held are released.
//
// Debugging: each thread is named "<name>#<instance>", the name the debugger shows.
// VS Code attaches by itself to the workers of the process it debugs (breakpoints in
// the workers need the source maps of workers.js). In debug mode (config.mode), a
// worker stopped on a breakpoint must not be taken for a dead one: the calls have no
// timeout, and the stop waits for the workers instead of terminating them.

import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { dirname, join } from "node:path";
import { Worker as NodeWorker, isMainThread, parentPort, receiveMessageOnPort, workerData } from "node:worker_threads";
import type { Config } from "./config";
import { LOG_LEVELS } from "./logger";
import type { Logger, LogLevel } from "./logger";
import { closeMutexes, mutexBuffers, releaseThread } from "./mutex";
import type { MutexBuffers } from "./mutex";
import type { TaskReport, Tasks } from "./tasks";
import { deepFreeze, isString } from "./tools";

const DEFAULT_CALL_MS = 30_000;
const MAX_INBOX = 100;

// fired when the worker stops. one per thread, and a thread runs one worker only: the
// module is loaded again by each thread, so this is the state of the worker of the thread
const stopper = isMainThread ? null : new AbortController( );

// the messages of the worker of the thread, when it reads them itself. set by runWorker,
// null for a worker that has an onMessage
let inbox: Inbox = null;

// the tasks opened by the onMessage or onRun in progress (see tracked)
const scope = isMainThread ? null : new AsyncLocalStorage<Set<Progress>>( );

// messages between the threads
type ToWorker =
	| { k: "post", type: string, data: unknown }
	| { k: "call", id: number, type: string, data: unknown }
	| { k: "stop" };

type Incoming = Exclude<ToWorker, { k: "stop" }>;

type ToMain =
	| { k: "ready" }
	| { k: "post", type: string, data: unknown }
	| { k: "reply", id: number, ok: boolean, value?: unknown, error?: string }
	| { k: "log", level: LogLevel, event: string, data?: Record<string, unknown> }
	| { k: "task", report: TaskReport }
	| { k: "stopped" };

interface StartData {
	name: string;
	instance: number;
	instances: number;
	config: unknown;
	mutexes: MutexBuffers;
}

// -- worker side ----------------------------------------------------------------------

export interface WorkerOptions {
	// several instances of this worker may run (start( name, n ))
	multiple?: boolean;
}

// the log of a worker: same methods as Logger, lines written by the main thread
export type WorkerLog = Pick<Logger, LogLevel>;

// a post or a call from the main thread, read by peekMessage or getMessage
export interface WorkerMessage {
	type: string;
	data: unknown;
	// answers a call, nothing for a post. to do before the next message is read: a call
	// left without answer is rejected then
	reply( value?: unknown ): void;
}

// base class of the workers: the code that runs in a thread of its own, receives
// messages from the main thread and answers or posts back
export abstract class Worker {
	// the classes of the entry file, by name. a static registry, because the classes
	// register themselves when the file is loaded, before runWorker picks one
	private static readonly registry = new Map<string, { cls: new ( ) => Worker, options: WorkerOptions }>( );

	readonly name: string;
	readonly instance: number;
	readonly config: Config;
	readonly log: WorkerLog;

	constructor( ) {
		const start = workerData as StartData;
		this.name = start.name;
		this.instance = start.instance;
		this.config = start.config as Config;

		const log = {} as WorkerLog;
		for( const level of LOG_LEVELS ) {
			log[level] = ( event, data ) => send( { k: "log", level, event, data } );
		}

		this.log = log;
	}

	static register( name: string, cls: new ( ) => Worker, options: WorkerOptions = {} ) {
		if( Worker.registry.has( name ) ) {
			throw new Error( `worker "${name}" is already registered` );
		}

		Worker.registry.set( name, { cls, options } );
	}

	static find( name: string ) {
		return Worker.registry.get( name ) ?? null;
	}

	// a message posted to the main thread (workers.on)
	post( type: string, data?: unknown ) {
		send( { k: "post", type, data } );
	}

	// the progress of a task created by the main thread (tasks.create, its id comes with
	// the message), or of a new broadcast task created here ({ broadcast: true }: a
	// scheduled job nobody asked for). sends "start" at once
	progress( task: string | { broadcast: true } ): Progress {
		return isString( task ) ? new Progress( task, false ) : new Progress( randomUUID( ), true );
	}

	// called once, before any message
	onStart( ): unknown {
		return undefined;
	}

	// the work of a worker that runs until its stop (scheduled tasks, polling...).
	// started after onStart, beside the messages: workers.start does not wait for it
	onRun( ): unknown {
		return undefined;
	}

	// a post or a call from the main thread. for a call, the result is the answer.
	// a worker without onMessage reads its messages itself, in onRun (peekMessage...)
	onMessage?( type: string, data: unknown ): unknown;

	// called at the stop, after the end of onRun, before the thread ends
	onStop( ): unknown {
		return undefined;
	}

	// fired as soon as the stop is asked: to abort a fetch, a timer of node:timers/promises...
	get signal( ): AbortSignal {
		return stopper.signal;
	}

	// true after ms, false at once when the worker stops (or is stopping)
	wait( ms: number ): Promise<boolean> {
		const signal = stopper.signal;
		if( signal.aborted ) {
			return Promise.resolve( false );
		}

		return new Promise( resolve => {
			const stop = ( ) => {
				clearTimeout( timer );
				resolve( false );
			};

			const timer = setTimeout( ( ) => {
				signal.removeEventListener( "abort", stop );
				resolve( true );
			}, ms );

			signal.addEventListener( "abort", stop, { once: true } );
		} );
	}

	// the next message, null if there is none: never waits, for a loop that has work to
	// do. it sees the stop too (this.signal), that a loop without await would never see
	peekMessage( ): WorkerMessage {
		return reader( ).peek( );
	}

	// resolves when a message is there (it is not read) or when the worker stops
	waitMessage( ): Promise<void> {
		return reader( ).wait( );
	}

	// the next message, waited for. null: the worker stops
	async getMessage( ): Promise<WorkerMessage> {
		const box = reader( );

		for( ;; ) {
			const message = box.peek( );
			if( message || stopper.signal.aborted ) {
				return message;
			}

			await box.wait( );
		}
	}
}

function send( message: ToMain ) {
	parentPort.postMessage( message );
}

function reader( ): Inbox {
	if( !inbox ) {
		throw new Error( "peekMessage, waitMessage and getMessage are for a worker without onMessage" );
	}

	return inbox;
}

// the messages of a worker that reads them itself (peekMessage, waitMessage, getMessage)
// instead of receiving them in onMessage: they wait here, MAX_INBOX at most
class Inbox {
	private readonly queue: Incoming[] = [];
	private readonly waiters: ( ( ) => void )[] = [];
	// the call read by the worker and not answered yet
	private owed = 0;

	// accept: what runWorker does with a message of the port
	constructor( private readonly accept: ( message: ToWorker ) => void ) {
		stopper.signal.addEventListener( "abort", ( ) => this.wake( ) );
	}

	add( message: Incoming ) {
		if( this.queue.length < MAX_INBOX ) {
			this.queue.push( message );
			this.wake( );
		}
		else if( message.k === "call" ) {
			send( { k: "reply", id: message.id, ok: false, error: "worker busy" } );
		}
		else {
			send( { k: "log", level: "warn", event: "worker.message.dropped", data: { type: message.type } } );
		}
	}

	peek( ): WorkerMessage {
		this.settle( );

		// read from the port itself: a loop that never awaits would receive nothing, not even its stop
		let next: { message: ToWorker };
		while( next = receiveMessageOnPort( parentPort ) ) {
			this.accept( next.message );
		}

		const message = stopper.signal.aborted ? null : this.queue.shift( );
		if( !message ) {
			return null;
		}

		const call = message.k === "call" ? message.id : 0;
		this.owed = call;

		return {
			type: message.type,
			data: message.data,
			reply: value => {
				if( call && this.owed === call ) {
					this.owed = 0;
					send( { k: "reply", id: call, ok: true, value } );
				}
			},
		};
	}

	wait( ): Promise<void> {
		if( this.queue.length || stopper.signal.aborted ) {
			return Promise.resolve( );
		}

		return new Promise( resolve => this.waiters.push( resolve ) );
	}

	// a call read and left without answer must not wait for its timeout
	settle( ) {
		if( this.owed ) {
			send( { k: "reply", id: this.owed, ok: false, error: "no answer" } );
			this.owed = 0;
		}
	}

	private wake( ) {
		this.waiters.splice( 0 ).forEach( resolve => resolve( ) );
	}
}

// the progress of one task, seen from the worker (see tasks.ts): "start" at its
// creation, then the steps, then done or fail. nothing is sent once it ended
export class Progress {
	private ended = false;
	private readonly owner: Set<Progress>;

	// made by worker.progress( )
	constructor( readonly id: string, broadcast: boolean ) {
		this.owner = scope.getStore( ) ?? null;
		this.owner?.add( this );
		send( { k: "task", report: { id, phase: "start", ...( broadcast ? { broadcast } : {} ) } } );
	}

	get isEnded( ): boolean {
		return this.ended;
	}

	// text shown by the client (plain text), percent from 0 to 100, absent if unknown
	step( text: string, percent?: number ) {
		if( !this.ended ) {
			send( { k: "task", report: { id: this.id, phase: "step", text, percent } } );
		}
	}

	done( text?: string ) {
		this.end( true, text );
	}

	fail( text: string ) {
		this.end( false, text );
	}

	private end( ok: boolean, text: string ) {
		if( this.ended ) {
			return;
		}

		this.ended = true;
		this.owner?.delete( this );
		send( { k: "task", report: { id: this.id, phase: "end", ok, text } } );
	}
}

// runs onMessage or onRun, then ends the tasks it left open: done if it succeeded, fail
// if it threw. a forgotten done must not leave a progress bar running forever
async function tracked( fn: ( ) => unknown ): Promise<unknown> {
	const open = new Set<Progress>( );

	try {
		const result = await scope.run( open, fn );
		[...open].forEach( p => p.done( ) );
		return result;
	}
	catch( e ) {
		[...open].forEach( p => p.fail( "failed" ) );
		throw e;
	}
}

// to call at the end of the entry file: instantiates the worker named in workerData
export async function runWorker( ): Promise<void> {
	if( isMainThread ) {
		throw new Error( "runWorker: to be called in the workers entry file only" );
	}

	const start = workerData as StartData;
	const entry = Worker.find( start.name );
	if( !entry ) {
		throw new Error( `worker "${start.name}" is not registered in the workers entry file` );
	}

	if( start.instances > 1 && !entry.options.multiple ) {
		throw new Error( `worker "${start.name}" does not allow several instances` );
	}

	deepFreeze( start.config );
	const worker = new entry.cls( );

	// one message at a time, in order (like the WebSocket messages)
	let chain = Promise.resolve( );
	let run = Promise.resolve( );

	const accept = ( message: ToWorker ) => {
		// the stop is signaled at once, not after the messages in the queue
		if( message.k === "stop" ) {
			stopper.abort( );
		}
		else if( inbox ) {
			inbox.add( message );
			return;
		}

		chain = chain.then( ( ) => handle( worker, message, ( ) => run ) );
	};

	// no onMessage: the worker reads its messages itself
	if( !worker.onMessage ) {
		inbox = new Inbox( accept );
	}

	parentPort.on( "message", accept );

	await worker.onStart( );
	send( { k: "ready" } );

	// stopped during onStart: onStop may already have run
	if( !stopper.signal.aborted ) {
		run = runLoop( worker );
	}
}

async function runLoop( worker: Worker ): Promise<void> {
	try {
		await tracked( ( ) => worker.onRun( ) );
	}
	catch( e ) {
		worker.log.error( "worker.run.failed", { worker: worker.name, error: e } );
		if( stopper.signal.aborted ) {
			return;
		}

		// a loop that died must be seen: the worker ends, like after a crash
		stopper.abort( );
		try {
			await worker.onStop( );
		}
		finally {
			process.exit( 1 );
		}
	}
	finally {
		inbox?.settle( );
	}
}

// run: the onRun in progress, waited for by the stop
async function handle( worker: Worker, message: ToWorker, run: ( ) => Promise<void> ) {
	switch( message.k ) {
		case "post":
			try {
				await tracked( ( ) => worker.onMessage( message.type, message.data ) );
			}
			catch( e ) {
				worker.log.error( "worker.message.failed", { worker: worker.name, type: message.type, error: e } );
			}
			break;

		case "call":
			try {
				const value = await tracked( ( ) => worker.onMessage( message.type, message.data ) );
				send( { k: "reply", id: message.id, ok: true, value } );
			}
			catch( e ) {
				send( { k: "reply", id: message.id, ok: false, error: e instanceof Error ? e.message : String( e ) } );
			}
			break;

		case "stop":
			try {
				await run( );
				await worker.onStop( );
			}
			finally {
				send( { k: "stopped" } );
				parentPort.close( );
			}
			break;
	}
}

// -- main side ------------------------------------------------------------------------

// "name#instance": the name of the thread in the debugger, and the owner of its tasks
function threadName( w: { name: string, instance: number } ): string {
	return `${w.name}#${w.instance}`;
}

export interface WorkersOptions {
	config: Config;
	logger: Logger;
	// the entry file of the workers, default: workers.js next to the main script
	file?: string;
	// receives the progress of the tasks reported by the workers (tasks.ts)
	tasks?: Tasks;
}

export interface WorkerInfo {
	name: string;
	instance: number;
	threadId: number;
	started: Date;
	state: "starting" | "running" | "stopping";
}

type PostHandler = ( data: unknown, from: WorkerInfo ) => unknown;

interface Running {
	info: WorkerInfo;
	thread: NodeWorker;
	// timer null: no timeout (debug)
	calls: Map<number, { resolve: ( v: unknown ) => void, reject: ( e: Error ) => void, timer: NodeJS.Timeout }>;
}

// the workers seen from the main thread: starts them by name, talks to them,
// lists and stops them
export class Workers {
	private readonly running = new Map<string, Running[]>( );
	private readonly handlers = new Map<string, PostHandler>( );
	private readonly turns = new Map<string, number>( );
	private readonly file: string;
	private nextCall = 1;

	constructor( private readonly options: WorkersOptions ) {
		this.file = options.file ?? join( dirname( process.argv[1] ), "workers.js" );
	}

	// starts the worker (n instances), resolves once each one ran its onStart
	async start( name: string, instances = 1 ): Promise<void> {
		if( this.running.has( name ) ) {
			throw new Error( `worker "${name}" is already started` );
		}

		const list: Running[] = [];
		this.running.set( name, list );

		await Promise.all( Array.from( { length: instances }, ( _, i ) => this.spawn( name, i, instances, list ) ) );
	}

	// one instance, in turn
	post( name: string, type: string, data?: unknown ) {
		this.pick( name ).thread.postMessage( { k: "post", type, data } satisfies ToWorker );
	}

	// every instance
	broadcast( name: string, type: string, data?: unknown ) {
		for( const w of this.instances( name ) ) {
			w.thread.postMessage( { k: "post", type, data } satisfies ToWorker );
		}
	}

	// one instance, in turn: the result of its onMessage. rejects on error, timeout or crash
	call<T = unknown>( name: string, type: string, data?: unknown, timeoutMs = DEFAULT_CALL_MS ): Promise<T> {
		const w = this.pick( name );
		const id = this.nextCall++;

		return new Promise<T>( ( resolve, reject ) => {
			// debug: the worker may be stopped on a breakpoint
			const timer = this.options.config.debug ? null : setTimeout( ( ) => {
				w.calls.delete( id );
				reject( new Error( `worker "${name}": call "${type}" timeout` ) );
			}, timeoutMs );

			w.calls.set( id, { resolve: resolve as ( v: unknown ) => void, reject, timer } );
			w.thread.postMessage( { k: "call", id, type, data } satisfies ToWorker );
		} );
	}

	// the messages of this type posted by the workers of this name (one handler)
	on( name: string, type: string, handler: PostHandler ) {
		this.handlers.set( `${name}\n${type}`, handler );
	}

	list( ): WorkerInfo[] {
		return [...this.running.values( )].flat( ).map( w => ( { ...w.info } ) );
	}

	// no new mutex, the held ones are released, then each worker runs its onStop.
	// a worker still there after timeoutMs (config.server.shutdownMs) is terminated
	async stop( timeoutMs = this.options.config.server.shutdownMs ): Promise<void> {
		const { logger } = this.options;

		const held = await closeMutexes( timeoutMs );
		if( held.length ) {
			logger.warn( "worker.mutex.held", { mutexes: held } );
		}

		const all = [...this.running.values( )].flat( );
		await Promise.all( all.map( w => new Promise<void>( resolve => {
			w.info.state = "stopping";

			// debug: a worker stopped on a breakpoint is waited for, not terminated
			const timer = this.options.config.debug ? null : setTimeout( ( ) => {
				logger.warn( "worker.stop.timeout", { worker: w.info.name, instance: w.info.instance } );
				void w.thread.terminate( );
			}, timeoutMs );

			w.thread.once( "exit", ( ) => {
				clearTimeout( timer );
				resolve( );
			} );

			w.thread.postMessage( { k: "stop" } satisfies ToWorker );
		} ) ) );
	}

	private spawn( name: string, instance: number, instances: number, list: Running[] ): Promise<void> {
		const { config, logger } = this.options;
		const start: StartData = { name, instance, instances, config, mutexes: mutexBuffers( ) };
		// the name shown by the debugger, and in worker_threads.threadName
		const thread = new NodeWorker( this.file, { workerData: start, name: threadName( { name, instance } ) } );

		const w: Running = {
			info: { name, instance, threadId: thread.threadId, started: new Date( ), state: "starting" },
			thread,
			calls: new Map( ),
		};

		list.push( w );

		return new Promise<void>( ( resolve, reject ) => {
			thread.on( "message", ( message: ToMain ) => this.receive( w, message, resolve ) );

			thread.on( "error", e => {
				logger.error( "worker.crashed", { worker: name, instance, error: e } );
				if( w.info.state === "starting" ) {
					reject( e );
				}
			} );

			thread.on( "exit", code => {
				this.remove( w );

				for( const call of w.calls.values( ) ) {
					clearTimeout( call.timer );
					call.reject( new Error( `worker "${name}" ended` ) );
				}

				// its running tasks fail
				this.options.tasks?.workerEnded( threadName( w.info ) );

				const released = releaseThread( w.info.threadId );
				if( released.length ) {
					logger.warn( "worker.mutex.released", { worker: name, instance, mutexes: released } );
				}

				if( w.info.state !== "stopping" ) {
					logger.error( "worker.exited", { worker: name, instance, code } );
					reject( new Error( `worker "${name}" exited (${code})` ) );
				}
			} );
		} );
	}

	private receive( w: Running, message: ToMain, ready: ( ) => void ) {
		const { logger } = this.options;

		switch( message.k ) {
			case "ready":
				w.info.state = "running";
				ready( );
				break;

			case "post": {
				const handler = this.handlers.get( `${w.info.name}\n${message.type}` );
				if( handler ) {
					void Promise.resolve( ).then( ( ) => handler( message.data, { ...w.info } ) ).catch( e => {
						logger.error( "worker.handler.failed", { worker: w.info.name, type: message.type, error: e } );
					} );
				}
				else {
					logger.warn( "worker.post.unhandled", { worker: w.info.name, type: message.type } );
				}
				break;
			}

			case "reply": {
				const call = w.calls.get( message.id );
				if( call ) {
					w.calls.delete( message.id );
					clearTimeout( call.timer );
					message.ok ? call.resolve( message.value ) : call.reject( new Error( message.error ) );
				}
				break;
			}

			case "log":
				// the level comes from the worker: checked against the list, as the event name is by the logger
				if( ( LOG_LEVELS as readonly string[] ).includes( message.level ) && isString( message.event ) ) {
					logger[message.level]( message.event, { ...message.data, worker: w.info.name, instance: w.info.instance } );
				}
				break;

			case "task":
				this.task( w, message.report );
				break;

			case "stopped":
				break;
		}
	}

	// a progress report: passed to the Tasks, refused if it is not theirs
	private task( w: Running, report: TaskReport ) {
		const { logger, tasks } = this.options;
		let refused = "no Tasks given to Workers";

		try {
			refused = tasks ? tasks.report( report, threadName( w.info ) ) : refused;
		}
		catch {
			refused = "too many tasks";
		}

		if( refused ) {
			logger.warn( "worker.task.refused", { worker: w.info.name, instance: w.info.instance, reason: refused } );
		}
	}

	private instances( name: string ): Running[] {
		const list = this.running.get( name );
		if( !list?.length ) {
			throw new Error( `worker "${name}" is not running` );
		}

		return list;
	}

	// in turn among the instances
	private pick( name: string ): Running {
		const list = this.instances( name );
		const turn = ( this.turns.get( name ) ?? 0 ) % list.length;
		this.turns.set( name, turn + 1 );
		return list[turn];
	}

	private remove( w: Running ) {
		const list = this.running.get( w.info.name );
		const at = list?.indexOf( w ) ?? -1;
		if( at >= 0 ) {
			list.splice( at, 1 );
		}

		if( list && !list.length ) {
			this.running.delete( w.info.name );
		}
	}
}
