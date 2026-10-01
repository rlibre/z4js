/**
 *     _____ __
 *    |__   /  / _
 *      /  /  /_| |_
 *     /  /\____   _|
 *    /_____|   |_|
 *
 * @file mutex.ts
 * @author Etienne Cochard
 *
 * @copyright (c) 2026 R-libre ingenierie
 *
 * Use of this source code is governed by an MIT-style license
 * that can be found in the LICENSE file or at https://opensource.org/licenses/MIT.
 **/

// Named mutexes shared by all the threads of the process (main thread and workers).
//
//   const stock = new Mutex( "stock" );
//   await stock.withLock( 5000, async ( ) => { ... } );     // LockError if not taken within 5 s
//   const r = await stock.tryLock( 100, ( ) => ... );       // null if held elsewhere
//
// The state lives in a SharedArrayBuffer made by the main thread and given to the
// workers in workerData (workers.ts). A slot holds 0 when free, otherwise the thread
// id of its holder + 1 (the main thread is 0): when a worker dies holding a mutex, the
// main thread releases it (releaseThread), otherwise it would stay locked forever.
//
// Limits: names are ASCII, NAME_LENGTH characters at most, and MAX_MUTEXES names in all
// over the life of the process, because a name is never freed. Names must therefore be
// fixed ("stock", "backup"...), never made per resource (an uuid per item would fill
// the table).
//
// Slot 0 locks the name table, slot 1 is the shutdown flag: once closed (shutdown),
// no mutex can be taken any more (LockError "shutdown").

import { isMainThread, threadId, workerData } from "node:worker_threads";

const MAX_MUTEXES = 128;
const NAME_LENGTH = 64;
const NAME_RE = /^[\x20-\x7e]{1,64}$/;

const NAMES_SLOT = 0;
const SHUTDOWN_SLOT = 1;
const FIRST_SLOT = 2;

// longest wait between two checks of a slot (a missed notify costs that much at most)
const POLL_MS = 50;

export interface MutexBuffers {
	state: SharedArrayBuffer;
	names: SharedArrayBuffer;
}

// a mutex could not be taken: timeout, or shutdown in progress
export class LockError extends Error {
	constructor( message: string, readonly reason: "timeout" | "shutdown" ) {
		super( message );
		this.name = "LockError";
	}
}

// value of a slot held by this thread
const ME = threadId + 1;

// one set of buffers per process: made by the main thread at the first use, received
// by the workers in workerData.mutexes
let shared: { buffers: MutexBuffers, state: Int32Array, names: Uint8Array } = null;

// the buffers, to give to a worker (workers.ts)
export function mutexBuffers( ): MutexBuffers {
	return views( ).buffers;
}

function views( ) {
	if( !shared ) {
		const buffers: MutexBuffers = isMainThread
			? { state: new SharedArrayBuffer( 4 * ( FIRST_SLOT + MAX_MUTEXES ) ), names: new SharedArrayBuffer( NAME_LENGTH * MAX_MUTEXES ) }
			: workerData?.mutexes;

		if( !buffers ) {
			throw new Error( "mutex: no shared buffers (worker not started by Workers)" );
		}

		shared = { buffers, state: new Int32Array( buffers.state ), names: new Uint8Array( buffers.names ) };
	}

	return shared;
}

// -- slots ------------------------------------------------------------------------

function tryTake( state: Int32Array, slot: number ): boolean {
	return Atomics.compareExchange( state, slot, 0, ME ) === 0;
}

function release( state: Int32Array, slot: number, holder = ME ): boolean {
	if( Atomics.compareExchange( state, slot, holder, 0 ) !== holder ) {
		return false;
	}

	Atomics.notify( state, slot );
	return true;
}

// blocking: only for the name table, held a few microseconds
function takeSync( state: Int32Array, slot: number, timeoutMs: number ): boolean {
	const end = Date.now( ) + timeoutMs;
	while( !tryTake( state, slot ) ) {
		const left = end - Date.now( );
		if( left <= 0 ) {
			return false;
		}

		const holder = Atomics.load( state, slot );
		if( holder ) {
			Atomics.wait( state, slot, holder, Math.min( POLL_MS, left ) );
		}
	}

	return true;
}

// does not block the event loop
async function take( state: Int32Array, slot: number, timeoutMs: number ): Promise<boolean> {
	const end = Date.now( ) + timeoutMs;
	while( !tryTake( state, slot ) ) {
		const left = end - Date.now( );
		if( left <= 0 ) {
			return false;
		}

		const holder = Atomics.load( state, slot );
		if( holder ) {
			const r = Atomics.waitAsync( state, slot, holder, Math.min( POLL_MS, left ) );
			if( r.async ) {
				await r.value;
			}
		}
	}

	return true;
}

// slot of the name, registered at the first use
function slotOf( name: string ): number {
	const { state, names } = views( );

	if( !takeSync( state, NAMES_SLOT, 1000 ) ) {
		throw new Error( "mutex: cannot lock the name table" );
	}

	try {
		for( let i = 0; i < MAX_MUTEXES; i++ ) {
			const at = i * NAME_LENGTH;
			if( !names[at] ) {
				for( let j = 0; j < name.length; j++ ) {
					names[at + j] = name.charCodeAt( j );
				}

				return FIRST_SLOT + i;
			}

			if( nameAt( names, at ) === name ) {
				return FIRST_SLOT + i;
			}
		}
	}
	finally {
		release( state, NAMES_SLOT );
	}

	throw new Error( `mutex: more than ${MAX_MUTEXES} names` );
}

function nameAt( names: Uint8Array, at: number ): string {
	let end = at;
	while( end < at + NAME_LENGTH && names[end] ) {
		end++;
	}

	return String.fromCharCode( ...names.subarray( at, end ) );
}

// -- mutex ------------------------------------------------------------------------

// a named lock shared by every thread of the process: one holder at a time
export class Mutex {
	private readonly slot: number;

	constructor( readonly name: string ) {
		if( !NAME_RE.test( name ) ) {
			throw new Error( `mutex: name must be ASCII, ${NAME_LENGTH} characters at most` );
		}

		this.slot = slotOf( name );
	}

	// runs fn holding the mutex. LockError if not taken within timeoutMs, or after shutdown
	async withLock<T>( timeoutMs: number, fn: ( ) => T ): Promise<Awaited<T>> {
		if( !await this.lock( timeoutMs ) ) {
			throw new LockError( `mutex "${this.name}": lock timeout`, "timeout" );
		}

		return this.run( fn );
	}

	// runs fn holding the mutex, null if held elsewhere for timeoutMs (a task already
	// running, for a cron). the result of fn is returned: it tells "done" from "busy"
	async tryLock<T>( timeoutMs: number, fn: ( ) => T ): Promise<Awaited<T>> {
		return await this.lock( timeoutMs ) ? this.run( fn ) : null;
	}

	private async lock( timeoutMs: number ): Promise<boolean> {
		const { state } = views( );
		checkOpen( state );

		const taken = await take( state, this.slot, timeoutMs );

		// shutdown started while waiting
		if( taken && Atomics.load( state, SHUTDOWN_SLOT ) ) {
			release( state, this.slot );
			checkOpen( state );
		}

		return taken;
	}

	private async run<T>( fn: ( ) => T ): Promise<Awaited<T>> {
		try {
			return await fn( );
		}
		finally {
			release( views( ).state, this.slot );
		}
	}
}

function checkOpen( state: Int32Array ) {
	if( Atomics.load( state, SHUTDOWN_SLOT ) ) {
		throw new LockError( "mutex: shutdown in progress", "shutdown" );
	}
}

// -- main thread ------------------------------------------------------------------

// releases the mutexes held by a dead thread, returns their names (to log)
export function releaseThread( deadThreadId: number ): string[] {
	const { state, names } = views( );
	const released: string[] = [];

	for( let i = 0; i < MAX_MUTEXES; i++ ) {
		if( release( state, FIRST_SLOT + i, deadThreadId + 1 ) ) {
			released.push( nameAt( names, i * NAME_LENGTH ) );
		}
	}

	return released;
}

// no new mutex can be taken any more, then waits until the held ones are released.
// returns the names still held after timeoutMs (to log)
export async function closeMutexes( timeoutMs: number ): Promise<string[]> {
	const { state, names } = views( );
	Atomics.store( state, SHUTDOWN_SLOT, 1 );

	const held = ( ) => {
		const list: string[] = [];
		for( let i = 0; i < MAX_MUTEXES; i++ ) {
			if( Atomics.load( state, FIRST_SLOT + i ) ) {
				list.push( nameAt( names, i * NAME_LENGTH ) );
			}
		}
		return list;
	};

	const end = Date.now( ) + timeoutMs;
	while( held( ).length && Date.now( ) < end ) {
		await new Promise( resolve => setTimeout( resolve, 20 ) );
	}

	return held( );
}
