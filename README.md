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
		await this.need( req, "notes/create" );

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

## Files, refused unless declared

```ts
async on_import( req: Request, res: Response ) {
	await this.need( req, "notes/create" );          // before reading a single byte

	const { data } = await this.filesOf( req, { data: { maxBytes: 1_000_000, types: ["text/csv"] } } );
	const comment = this.bodyValue( req, "comment", "string", { required: false } );

	await data.keep( join( config.data, "imports", data.id ) );   // otherwise deleted at the end of the request
	res.status( 201 ).json( { id: data.id } );
}
```

The file arrives with the request of the action, so the access check is the usual one, done before anything is read. Each file field is declared with its size limit and, if you want, its accepted types: an undeclared field, a second file, a missing one is a `400`, a file too large a `413`, a wrong type a `415`. Files are streamed to disk, never held whole in memory, under a random name: the name given by the client is only an information, never a path. Whatever is not kept is deleted when the answer is sent, even when the request fails or is aborted. The text fields of the form are read with `bodyValue`, as for JSON.

---

## Secure by default, not by checklist

Security is not a chapter at the end of the documentation. It is what happens when you write nothing special.

- **Configuration**: an unknown key in the file is an error, never silently ignored. Secrets live in separate files. TLS is mandatory outside the loopback address. `trust proxy` is off until you say otherwise.
- **Sessions**: opaque tokens, no cookies, only their SHA-256 hash stored. 15 minute access tokens, refresh tokens rotated on every use, and a reused refresh token ends the session (theft detected).
- **Passwords**: PBKDF2-SHA256, 600,000 iterations, constant time comparison. An unknown login takes as long as a wrong password. Hashes are upgraded at the next login when the settings change.
- **Step-up**: a sensitive route adds `sessions.stepUp` as a filter. Without a recent confirmation of identity, the answer is `403 step-up required`.
- **Access rights**: four actions per resource, nothing else: `notes/create`, `notes/read`, `notes/update`, `notes/delete` (plus `notes/*` and `*`). An import creates, so it needs `notes/create`: no right is ever invented for a feature. Rights are cached 5 seconds. In debug mode, a handler that forgets to check access is reported.
- **Rate limits**: login attempts per IP and per account, token refreshes, and every API route.
- **Errors**: one central handler. The client receives a status and a short message; the cause goes to the log, never to the response.
- **Security log**: a closed list of events (`auth.login.failed`, `auth.unauthorized`, `auth.stepup.failed`...), never filtered, in its own file.
- **WebSockets**: in a guarded group, a socket opens only with a one-time ticket, bound to the endpoint and the user, valid one second.
- **Uploads**: only the declared file fields, each with its size limit, streamed to disk under a random name, deleted at the end of the request unless kept.

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
const stats = await workers.start( "stats" );
const result = await stats.call( "count", { texts } );
```

Workers are classes registered by name in a single entry file. Starting one gives the object you talk to. Messages go both ways (`post`, `broadcast`, `call`), a worker processes them one at a time, and its log lines are written by the main thread. Named mutexes are shared by every thread and released when a worker dies. In debug mode, each thread carries its name in the debugger, and calls never time out while you sit on a breakpoint.

A worker that runs until the server stops, a periodic backup for instance, puts its loop in `onRun`:

```ts
// copies the database every hour, until the stop
class Backup extends Worker {
	async onRun( ) {
		while( await this.wait( 3_600_000 ) ) {      // false at once when the server stops
			await this.sql`vacuum into ${target}`;
		}
	}
}
```

The stop interrupts the wait, lets the current round end, then calls `onStop`. A loop that dies is logged and ends the worker: it never fails in silence.

A class can be started several times, each worker with its name and its own data. One automaton, one worker:

```ts
const press = await workers.start( "autom", { name: "press", data: { ip: "10.0.0.5" } } );
const oven = await workers.start( "autom", { name: "oven", data: { ip: "10.0.0.6" } } );

press.post( "write", { address: 12, value: 1 } );
workers.get( "autom", "oven" ).post( "write", { address: 3, value: 0 } );
```

An order never reaches the wrong one: `post` and `call` belong to the object of a worker, and only interchangeable instances (`{ instances: 4 }`) are served in turn. Logs and the debugger name each thread `press@autom`, `render@render#2`.

A worker with heavy work to do stays reachable by reading its messages itself, between two pieces of work, instead of receiving them in `onMessage`:

```ts
async onRun( ) {
	let msg: WorkerMessage;

	while( !this.signal.aborted ) {
		if( msg = this.peekMessage( ) ) {
			this.dispatch( msg );                   // msg.reply( value ) answers a call
		}
		else if( this.files.length ) {
			indexFile( this.files.shift( ) );       // heavy, synchronous
		}
		else {
			await this.waitMessage( );              // nothing to do: sleeps until a message or the stop
		}
	}
}
```

`peekMessage` never waits and works in a loop that never awaits; `getMessage` waits for the next message and returns `null` when the worker stops. A call left without answer is rejected at once, not after its timeout.

A worker bundles only what it uses: the package declares no side effect at import, so the bundler leaves Express and WebSockets out of `workers.js` (29 KB in the demo, instead of 684 KB).

---

## Progress you can follow

```ts
// the handler: the task id comes back at once
const task = tasks.create( req.user );
importer.post( "run", { task, file: data.id } );
res.status( 202 ).json( { task } );

// the worker
const progress = this.progress( data.task );
progress.step( "line 300 / 1200", 25 );
progress.done( "1200 lines imported" );
```

The client follows its task on a WebSocket (`{ task, phase: "start" | "step" | "end", text, percent }`), and a page reloaded in the middle catches up with the current state. The messages of a task go to the user who started it only, or to everybody for a broadcast task (a scheduled backup nobody asked for). A worker can only report on a task the main thread created, a progress left open is closed when the handler ends, and a worker that dies fails its tasks: a progress bar never spins forever.

---

## Logs you can read, and grep

```
2026-10-01T14:08:26.392Z INFO Xk2pQ9vLm3aB http.request {"method":"GET","path":"/api/notes/all","status":200,"ms":3}
```

One line per event: date, level, request id, event name, then the data in JSON. The logger never writes colors: `npm start | npx z4js log` colors the lines for reading (`--level=warn` hides the rest), the same way on a log file (`tail -f app.log | npx z4js log`). Everything before the JSON is written by z4js; anything that came from a client goes into the JSON, escaped and truncated. Requests are logged once their answer is sent, and slow ones are flagged.

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
| `esbuild` | build (`z4js build`, `z4js dev`) |
| `@fastify/busboy` | files sent with a request (multipart), streamed to disk |

That is all. No ORM, no validation library, no logger, no session store, no JWT library, no upload middleware. And what Express brings along is kept in check: two aliases in the build replace the 500 KB of encoding tables of `iconv-lite` by the `TextDecoder` Node already has, and the 157 KB of `mime-db` by the 54 KB that are actually read. The demo bundle goes from 1280 KB to 776 KB, and its workers from 684 KB to 29 KB. Sources are published as TypeScript, as is: what you debug is what was written.

---

## Getting started

```
npm install @r-libre/z4js
```

Look at `demo/`: a notes application, backend and frontend. It shows accounts and rights, the step-up before a deletion, live notifications through WebSocket, the import of a text file, a word count done by a worker with its progress shown live, and a periodic backup broadcast to every connected user.

```
cd demo/frontend && npm install && npm run build
cd ../backend && npm install && npm run build && npm start
```

`npm run start:log` starts it with colored logs (`z4js log`).

A project is built by the command line of z4js, from its `z4.config.json` (entry points, output folder, esbuild options):

```
npx z4js build          # production bundle (--debug: readable, with source maps)
npx z4js dev            # rebuilds and restarts the server at each change
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
