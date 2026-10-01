// Password hashing: PBKDF2-SHA256, built in node:crypto (no dependency), slow on
// purpose (about 100 ms) and without memory cost.
//
// Stored form: "pbkdf2-sha256$<iterations>$<salt>$<hash>" (base64url). The algorithm
// and its cost are stored with each password: when ITERATIONS is raised, the old
// passwords still verify, and needsRehash tells to store them again at the next login.
//
// The work runs in the thread pool of libuv: it does not block the event loop.

import { pbkdf2, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { isString } from "./tools";

const pbkdf2Async = promisify( pbkdf2 );

const ALGORITHM = "pbkdf2-sha256";
const ITERATIONS = 600_000;
const SALT_BYTES = 16;
const HASH_BYTES = 32;

// a longer password is refused before any work (bounds the cost of one attempt)
const MAX_LENGTH = 64;

const STORED_RE = /^pbkdf2-sha256\$(\d+)\$([A-Za-z0-9_-]+)\$([A-Za-z0-9_-]+)$/;

// the same characters typed on two systems may be encoded differently (é as one code
// point or as e + accent): normalized, they give the same hash
function prepare( password: string ): string {
	return password.normalize( "NFC" );
}

function derive( password: string, salt: Buffer, iterations: number ): Promise<Buffer> {
	return pbkdf2Async( prepare( password ), salt, iterations, HASH_BYTES, "sha256" );
}

export async function hashPassword( password: string ): Promise<string> {
	if( !isString( password ) || !password || password.length > MAX_LENGTH ) {
		throw new TypeError( "password: invalid value" );
	}

	const salt = randomBytes( SALT_BYTES );
	const hash = await derive( password, salt, ITERATIONS );
	return `${ALGORITHM}$${ITERATIONS}$${salt.toString( "base64url" )}$${hash.toString( "base64url" )}`;
}

// false for a wrong password, a malformed stored value or an invalid password.
// the comparison takes the same time whatever the number of matching bytes
export async function verifyPassword( password: string, stored: string ): Promise<boolean> {
	const m = isString( stored ) ? STORED_RE.exec( stored ) : null;
	if( !m || !isString( password ) || !password || password.length > MAX_LENGTH ) {
		return false;
	}

	const expected = Buffer.from( m[3], "base64url" );
	const hash = await derive( password, Buffer.from( m[2], "base64url" ), Number( m[1] ) );
	return hash.length === expected.length && timingSafeEqual( hash, expected );
}

// true when the stored hash is weaker than the current settings: store it again
// (hashPassword) once the password is verified
export function needsRehash( stored: string ): boolean {
	const m = isString( stored ) ? STORED_RE.exec( stored ) : null;
	return !m || Number( m[1] ) < ITERATIONS;
}
