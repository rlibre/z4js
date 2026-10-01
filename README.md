# z4js

**A TypeScript backend for people who build applications, not plumbing.**

Secure by default. Small by design. Objects that stay objects.

Its UI counterpart is [x4js](https://x4js.org): the same philosophy on both sides. Plain TypeScript classes, very few dependencies, and code that runs when you call it.

Writing z4js with an AI assistant: give it [aiguide.md](./aiguide.md) (the rules) and [aicontext.md](./aicontext.md) (the API).

---

## The assembly you never signed up for

A typical Node backend starts as a blank Express app and grows by accretion: a body parser here, a CORS package there, a session store, a rate limiter, a validation library, a logger, a migration tool, a JWT library, and a dozen middlewares whose order matters and whose defaults nobody reads.

Each piece is reasonable. Together they become a supply chain you have to audit, a configuration you have to keep consistent, and a security posture that depends on everyone remembering every rule.

z4js takes the other road. One package provides the pieces a business backend actually needs, written together, with the same rules everywhere:

- **anything not explicitly allowed is refused**
- **the client gets a status and a short message, never an internal detail**
- **every value from a client is checked before you use it**

---

## Three lines tell the whole story

```ts
const api = RouteGroup.guarded( "/api", sessions.guard )
	.add( "/notes", new NotesEP( deps ) )
	.add( "/live", live );

const auth = RouteGroup.unprotected( "/auth" )
	.add( "/", sessions.endPoints );

await serve( { config, logger, groups: [api, auth], statics: [{ path: "/", folder: config.www }] } );
```

The whole exposed surface is visible in the main. A group is either guarded or unprotected, and you have to say which one: an open route stands out in review instead of hiding behind a forgotten middleware.

---

## End points that stay objects

```ts
// the routes of the notes
export class NotesEP extends EndPoints {
	constructor( private readonly deps: Deps ) {
		super( );

		this.get( "/item/:id", this.on_item );
		this.post( "/create", this.on_create );
		this.del( "/item/:id", this.on_delete, { filter: deps.sessions.stepUp } );
	}

	async on_create( req: Request, res: Response ) {
		await this.need( req, "notes/write" );

		const title = this.bodyValue( req, "title", "string", { maxlength: 100, trim: true } );
		const text = this.bodyValue( req, "text", "string", { maxlength: 10_000 } );
		...
		res.status( 201 ).json( { id } );
	}
}
```

An `EndPoints` object only **notes** its routes: it touches neither Express nor the configuration, so it can be created anywhere, tested alone, and mounted in several groups (`/api/v1`, `/api/v2`).

`paramValue`, `bodyValue` and `queryValue` read one named value, convert it, check it, and return the right TypeScript type: `"uuid"` gives a `UUID`, `"integer"` a `number`, `"sql-date"` a `Date`. A missing, malformed, too long or out of range value is a `400` that names the parameter and never echoes its value.

---

## Secure by default, not by checklist

Security is not a chapter at the end of the documentation. It is what happens when you write nothing special.

- **Configuration**: an unknown key in the file is an error, never silently ignored. Secrets live in separate files. TLS is mandatory outside the loopback address. `trust proxy` is off until you say otherwise.
- **Sessions**: opaque tokens, no cookies, only their SHA-256 hash stored. 15 minute access tokens, refresh tokens rotated on every use, and a reused refresh token ends the session (theft detected).
- **Passwords**: PBKDF2-SHA256, 600,000 iterations, constant time comparison. An unknown login takes as long as a wrong password. Hashes are upgraded at the next login when the settings change.
- **Step-up**: a sensitive route adds `sessions.stepUp` as a filter. Without a recent confirmation of identity, the answer is `403 step-up required`.
- **Access rights**: `resource/action`, `resource/*` or `*`, cached 5 seconds. In debug mode, a handler that forgets to check access is reported.
- **Rate limits**: login attempts per IP and per account, token refreshes, and every API route.
- **Errors**: one central handler. The client receives a status and a short message; the cause goes to the log, never to the response.
- **Security log**: a closed list of events (`auth.login.failed`, `auth.unauthorized`, `auth.stepup.failed`...), never filtered, in its own file.
- **WebSockets**: in a guarded group, a socket opens only with a one-time ticket, bound to the endpoint and the user, valid one second.

---

## Migrations that look at the database

```ts
// the notes table
export class NotesModel extends Model {
	constructor( ) {
		super( "notes", 40 );
	}

	override async onMigrate( db: Db, version: number ): Promise<number> {
		if( !await this.hasTable( db, "notes" ) ) {
			await db`create table notes ( id text primary key, title text not null, ... )`;
		}

		return Math.max( version, 1 );
	}
}
```

No numbered migration files. A model inspects the real state of the database (`hasTable`, `hasField`...) and brings it where it must be, because in development the database is often edited by hand and a version number does not follow. Every model migrates in **one transaction**: it all succeeds, or nothing changed. `Model.checkAll` replays everything then rolls back, `Model.validateAll` refuses to start on a mismatch.

---

## Postgres or SQLite, one style

Postgres through [postgres.js](https://github.com/porsager/postgres) for sites, SQLite through `node:sqlite` for small projects and desktop apps. Both are written the same way, with tagged templates:

```ts
const [note] = await sql`select * from notes where id = ${id}`;
await sql`insert into notes ${sql( note )}`;
```

The SQLite wrapper adds no dependency. It queues requests during a transaction, limits its duration, caches prepared statements, and converts booleans, dates and JSON both ways.

---

## Threads without ceremony

```ts
await workers.start( "stats" );
const result = await workers.call( "stats", "count", { texts } );
```

Workers are classes registered by name in a single entry file. Messages go both ways (`post`, `broadcast`, `call`), a worker processes them one at a time, and its log lines are written by the main thread. Named mutexes are shared by every thread and released when a worker dies. A long task reports its progress (`progress.step( "line 300 / 1200", 25 )`), which the user who started it follows live through a WebSocket, or everybody for a broadcast task. In debug mode, each thread carries its name in the debugger, and calls never time out while you sit on a breakpoint.

---

## Logs you can read, and grep

```
2026-10-01T14:08:26.392Z INFO Xk2pQ9vLm3aB http.request {"method":"GET","path":"/api/notes/all","status":200,"ms":3}
```

One line per event: date, level, request id, event name, then the data in JSON. Everything before the JSON is written by z4js; anything that came from a client goes into the JSON, escaped and truncated. Requests are logged once their answer is sent, and slow ones are flagged.

---

## API documentation, read from your code

```
npx z4js apidoc --out=api.json
```

No annotations, no decorators, no YAML in comments. The TypeScript compiler reads your sources and writes an OpenAPI 3 description: full paths, protection, path parameters, body and query fields with their types and limits, the statuses you answer (`res.status( 201 )`, `new HttpError( 404, "unknown note" )`), and the comment above each handler. Nothing runs. Anything that is not a literal is reported, never guessed. Open the result in Bruno, Postman or Scalar.

---

## Very few dependencies

| Package | Why |
|---|---|
| `express` 5 | HTTP routing |
| `postgres` | Postgres access |
| `ws` | WebSockets (`noServer` mode, one `upgrade` listener) |
| `x4build` | build (esbuild) |

That is all. No ORM, no validation library, no logger, no session store, no JWT library. Sources are published as TypeScript, as is: what you debug is what was written.

---

## Getting started

```
npm install @r-libre/z4js
```

Look at `demo/`: a backend (notes, accounts, step-up, live notifications through WebSocket, a worker) and its frontend.

```
cd demo/frontend && npm install && npm run build
cd ../backend && npm install && npm run build && npm start
```

Checks for the framework itself:

```
npm install
npm run typecheck
```

The second type check compiles `src/shared` without the types of Node nor the DOM, so that `@r-libre/z4js/shape` stays usable on the server and on the client.

---

## Principles

1. The best ratio of simplicity to maintainability.
2. Secure by design: refuse by default, nothing dangerous by accident.
3. Memory is expensive: nothing duplicated without need.
4. Optimize, without brute force nor speculation.
5. No global state without thought.
6. Every dependency is a real discussion.

These are defaults, not taboos. When the code departs from one, a comment says why, right there.

---

**Write the application. Not the plumbing.**

MIT License, © 2026 R-LIBRE INGENIERIE
