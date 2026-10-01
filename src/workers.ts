// Background workers (worker_threads).
//
// Every worker class lives in one entry file of the application, built as workers.js
// next to the main script. It registers the classes by name and calls runWorker:
//
//   class Mailer extends Worker {
//       async onMessage( type: string, data: any ) { ... }      // its result answers a call
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

import { dirname, join } from "node:path";
import { Worker as NodeWorker, isMainThread, parentPort, workerData } from "node:worker_threads";
import type { Config } from "./config";
import { LOG_LEVELS } from "./logger";
import type { Logger, LogLevel } from "./logger";
import { closeMutexes, mutexBuffers, releaseThread } from "./mutex";
import type { MutexBuffers } from "./mutex";
import { deepFreeze, isString } from "./tools";

const DEFAULT_CALL_MS = 30_000;

// messages between the threads
type ToWorker =
	| { k: "post", type: string, data: unknown }
	| { k: "call", id: number, type: string, data: unknown }
	| { k: "stop" };

type ToMain =
	| { k: "ready" }
	| { k: "post", type: string, data: unknown }
	| { k: "reply", id: number, ok: boolean, value?: unknown, error?: string }
	| { k: "log", level: LogLevel, event: string, data?: Record<string, unknown> }
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

	// called once, before any message
	onStart( ): unknown {
		return undefined;
	}

	// a post or a call from the main thread. for a call, the result is the answer
	abstract onMessage( type: string, data: unknown ): unknown;

	// called at the stop, before the thread ends
	onStop( ): unknown {
		return undefined;
	}
}

function send( message: ToMain ) {
	parentPort.postMessage( message );
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

	parentPort.on( "message", ( message: ToWorker ) => {
		chain = chain.then( ( ) => handle( worker, message ) );
	} );

	await worker.onStart( );
	send( { k: "ready" } );
}

async function handle( worker: Worker, message: ToWorker ) {
	switch( message.k ) {
		case "post":
			try {
				await worker.onMessage( message.type, message.data );
			}
			catch( e ) {
				worker.log.error( "worker.message.failed", { worker: worker.name, type: message.type, error: e } );
			}
			break;

		case "call":
			try {
				send( { k: "reply", id: message.id, ok: true, value: await worker.onMessage( message.type, message.data ) } );
			}
			catch( e ) {
				send( { k: "reply", id: message.id, ok: false, error: e instanceof Error ? e.message : String( e ) } );
			}
			break;

		case "stop":
			try {
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

export interface WorkersOptions {
	config: Config;
	logger: Logger;
	// the entry file of the workers, default: workers.js next to the main script
	file?: string;
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
		const thread = new NodeWorker( this.file, { workerData: start, name: `${name}#${instance}` } );

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

			case "stopped":
				break;
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
