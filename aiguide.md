# z4js — AI Guide

This document explains how to write idiomatic z4js code.
This is not a suggestion but an imperative rule.

For exact classes, properties and method signatures, always use `aicontext.md` or inspect the z4js TypeScript sources (`node_modules/@r-libre/z4js/src/`).

**Do not invent z4js APIs.**

## 1. General rule

Use the simplest tool that fits.

z4js deliberately has a small application model. Do not introduce abstractions simply because they are common in other Node frameworks.

Prefer:

- TypeScript modules and imports
- classes when identity and lifecycle are useful
- plain objects for data
- a `Config` subclass for every setting
- `EndPoints` classes for HTTP routes, `Channel` for WebSockets
- `RouteGroup.guarded` / `RouteGroup.unprotected` to expose them
- `paramValue`, `bodyValue`, `queryValue` to read a request
- `HttpError` to refuse
- tagged template SQL (`sql\`...\``) written in the handler or in a small module
- `Model` subclasses for the database structure
- `Workers` and `Mutex` for background work and shared locks
- `Logger` events with JSON data

Avoid introducing by default:

- dependency injection containers
- repositories, services and DAO layers around plain SQL
- ORMs and query builders
- decorators for routes or validation
- validation libraries (`Shape` exists, and is never mandatory)
- `dotenv` or `process.env` settings
- cookies, JWT, session stores
- Express middlewares that z4js already provides (body parser, CORS, helmet, rate limit, request id, logging)
- numbered migration files
- extra npm dependencies

Before creating an abstraction, check whether TypeScript, Node, or z4js already solves the problem directly.

---

## 2. Mental model

The main concepts are deliberately few.

```text
Config        what the deployment is (frozen, read once)
Model         what the database must look like
EndPoints     what a resource answers
RouteGroup    who may reach it
Access        what a user may do
Sessions      who the user is
Workers       what runs beside the requests
Logger        what happened
```

### EndPoints

An `EndPoints` object only **notes** its routes. It touches neither Express nor the configuration, so it can be created anywhere and mounted in several groups.

A handler is a method, given unbound:

```ts
this.get( "/item/:id", this.on_item );
```

It runs with the `EndPoints` object as `this`. Do not write `this.on_item.bind( this )` nor arrow wrappers.

### RouteGroup

A group is a prefix, its end points and channels, and a decision: guarded or unprotected. The whole exposed surface is written in the main, in one place.

Do not create Express routers by hand. Do not mount end points outside a group.

### Model

A `Model` brings one part of the database where it must be. It inspects the real state (`hasTable`, `hasField`, `fieldType`, `hasIndex`) at every start and returns its version.

Models are global instances created at the import of their file:

```ts
export const notesModel = new NotesModel( );
```

### Config

The configuration class is the schema of the file. Every setting of the application is a `readonly` field of a `Config` subclass, read by a helper (`string`, `int`, `bool`, `oneOf`, `folder`, `file`, `secret`...).

---

## 3. Secure by default

Refuse by default. Anything not explicitly allowed is refused.

- A new resource goes in a **guarded** group unless it is meant to be public (login, health, signed webhooks).
- Every handler of a guarded group calls `userHasAccess( req.user, "resource/action" )` and throws `HttpError( 403 )` when refused, or calls `noAccessCheck( req.user )` when no right is needed. In debug mode, forgetting both logs `access.unchecked`.
- A destructive or sensitive route adds the step-up filter:

```ts
this.del( "/item/:id", this.on_delete, { filter: sessions.stepUp } );
```

- A public route that can be abused gets a `RateLimiter` filter.
- Never weaken a default of the configuration (TLS, `trustProxy`, CORS) in code.

---

## 4. Reading a request

Never read `req.body`, `req.params` or `req.query` directly. Use the `EndPoints` methods:

```ts
const id = this.paramValue( req, "id", "uuid" );
const title = this.bodyValue( req, "title", "string", { maxlength: 100, trim: true } );
const page = this.queryValue( req, "page", "integer", { required: false, default: 1, minval: 1 } );
```

The return type follows the requested type. Give the limits the database has: a `text not null` column of 100 characters is `{ maxlength: 100 }`.

For a structured object, read it as `"object"` and validate it with a `Shape` when its shape matters:

```ts
const order = orderShape.parse( this.bodyValue( req, "order", "object" ) );
```

For an object of known shape without a `Shape`, write `as Order`.

Prefer literal names, types and options: `z4js apidoc` documents them, and anything computed is invisible to it.

---

## 5. Answering and refusing

Answer with `res.json( ... )`, `res.status( 201 ).json( ... )`.

Refuse with an `HttpError`:

```ts
throw new HttpError( 404, "unknown note" );
```

The message is short and fixed. Never put a value from the request, an id, a SQL error, a stack or any internal detail in it. The cause of a server error goes in `options.cause`: it is logged, never sent.

Do not catch errors only to answer 500: the central handler already does it, and logs them.

Do not write `try / catch` around a handler to translate errors into responses.

---

## 6. SQL

SQL is written with tagged templates. Values are always bound.

```ts
const [note] = await sql`select * from notes where id = ${id}`;
await sql`insert into notes ${sql( note )}`;
await sql`update notes set ${sql( changes, "title", "text" )} where id = ${id}`;
```

Never build SQL text by concatenation or template strings. A dynamic identifier goes through `sql( "name" )`, and only from a fixed list, never from the client.

When updating from an object that came from a client, name the columns (`sql( changes, "title", "text" )`): they act as a whitelist.

Use `sql.begin( async tx => { ... } )` when several statements must succeed together. Inside a transaction, use `tx`, never the root `sql`.

Write the SQL where it is used. A small module of functions is fine when several `EndPoints` share a query. Do not add a repository layer.

---

## 7. Migrations

Never write numbered migrations.

`onMigrate( db, version )` checks the real state and acts only on what is missing:

```ts
override async onMigrate( db: Db, version: number ): Promise<number> {
	if( !await this.hasTable( db, "notes" ) ) {
		await db`create table notes ( ... )`;
	}

	if( !await this.hasField( db, "notes", "author" ) ) {
		await db`alter table notes add column author text`;
	}

	return Math.max( version, 2 );
}
```

It runs at every start: it must be harmless when everything is already there. The returned version never decreases.

Give a priority that respects the foreign keys: groups 10, users 20, sessions 30, application models after.

To add columns to `users` or `groups`, write an application model migrated after them. Do not modify the built-in models.

---

## 8. Configuration

Every setting is a field of the application `Config` subclass:

```ts
// the configuration of the application
export class AppConfig extends Config {
	readonly data = this.folder( "data", { create: true } );
	readonly mail = {
		host: this.string( "mail.host" ),
		password: this.secret( "mail.passwordFile" ),
	};
}
```

- No `process.env`, no `dotenv`, no second configuration mechanism.
- A secret is never written in the file: `secret()` reads the file the key names.
- Relative paths are resolved from the folder of the config file. Do not `chdir`.
- Cross-field rules go in `onCheck()`, which returns the errors.
- The configuration is passed to whoever needs it. Do not store it in a global.

---

## 9. Logging

Log events, not sentences:

```ts
req.log.info( "note.created", { id } );
this.log.warn( "mail.retry", { attempt } );
```

- Event names are stable, dotted, lowercase: `resource.what`.
- Data goes in the object, never in the event name.
- Inside a request, use `req.log`: the line carries the request id.
- Never log a password, a token, a secret or a full request body.
- Security events go to the `SecurityLog`, from its closed list. Add an event with `extraEvents` rather than logging security facts in the normal log.
- Do not log in the database.

---

## 10. WebSockets

A `Channel` notes its endpoints, and is mounted in a group like an `EndPoints` object.

- In a guarded group, the client gets a ticket by a `POST` on the endpoint, then opens the socket with `?ticket=`. Do not invent another authentication for sockets.
- `socket.user` is the user of the ticket. Check rights in `onOpen` when the endpoint needs one.
- `data.json` throws on invalid JSON and closes the socket with 1007: do not wrap it.
- Messages of one socket arrive in order, one at a time: no locking needed for per-socket state.
- To push events, keep the open sockets in the channel and give it a method (`notify`) the `EndPoints` call.

---

## 11. Workers and mutexes

Use a worker for CPU-heavy or long work that must not block the requests.

- All worker classes are registered in one entry file, which ends with `runWorker( )`.
- `onMessage( type, data )` returns the answer of a `call`.
- A worker that runs until its stop (periodic task, polling) puts its loop in `onRun`, paced by `while( await this.wait( ms ) )`. Never loop in `onStart`: `workers.start` would never return. Pass `this.signal` to anything that can be aborted (`fetch`...).
- A worker opens its own database connection (in `onStart`, closed in `onStop`): a connection cannot cross threads.
- A long task the user waits for reports its progress: the handler creates the task (`tasks.create( req.user )`), posts it to the worker and answers `202 { task }`; the worker calls `this.progress( data.task )`, then `step( text, percent? )` and `done( )` or `fail( text )`. Never send progress through `workers.on` or a channel of your own.
- Await the work inside `onMessage`: a progress still open when it returns is closed as done.
- A worker logs with `this.log`; the main thread writes the lines.
- Use `workers.call` when the request waits for the result, `workers.post` when it does not.
- Pass `onStop: ( ) => workers.stop( )` to `serve` so the workers stop after the requests.

A `Mutex` protects a resource shared by threads. Its name is a fixed string:

```ts
const stock = new Mutex( "stock" );
await stock.withLock( 5000, async ( ) => { ... } );
```

Never build a mutex name from data (an id per item): names are never freed and limited to 128.

---

## 12. Null and types

`strictNullChecks` is off on purpose. An object may be null implicitly.

- Never write `| null` or `| undefined` in a type.
- Test with `!v`. Write `=== null` only when `0`, `""` or `false` are valid values.
- A function that finds nothing returns `null`.

---

## 13. Code form

- Comments are in English.
- Every file of the framework (`src/`, `cli/`) starts with the z4 header: the ASCII logo, `@file`, `@author`, `@copyright` and the MIT notice (copy it from an existing file, change `@file`).
- Every class has a comment just above it that says what it is for.
- No duplicated code: before writing a helper, a list or a regular expression, look in `z4js` (`tools.ts` first) and in the application.
- A list of values is written once; types and tables derive from it.
- No global variable without thought. Models and the `Access` functions are the expected exceptions.
- A departure from these rules is explained by a comment at that place.

---

## 14. Dependencies

Every dependency is a real discussion.

Before adding a package, check whether Node (`node:crypto`, `node:sqlite`, `fetch`, `worker_threads`...) or z4js already provides it. Do not add a package to save a few lines.

---

## 15. Source inspection

The npm package distributes the z4js TypeScript sources.

When an API is unclear:

1. check `aicontext.md`;
2. inspect the installed source in `node_modules/@r-libre/z4js/src/`;
3. only then generate code.

Never infer a z4js API from NestJS, Fastify, Koa, AdonisJS or plain Express habits.

Never invent a plausible-looking z4js method.

---

## 16. AI error classification

When generated z4js code is wrong, determine why before proposing framework changes.

1. documentation was insufficient;
2. the z4js API was ambiguous;
3. the AI made an error despite sufficient information.

Do not modify z4js to accommodate habits learned from other frameworks.

Improve documentation when documentation is the actual problem. Improve an API when the API itself is genuinely unclear. Otherwise fix the generated code.

---

## 17. What good z4js code should look like

Good z4js application code should generally be:

- ordinary TypeScript
- explicit about who may reach what
- strict about what it accepts
- silent about its internals toward the client
- light on layers
- readable without a debugger

A typical request flows like this:

```text
RouteGroup (guard)
      ↓
EndPoints handler
      ↓
access check  →  values read  →  SQL  →  answer
```

These are guidelines, not mandatory layers.

Do not introduce an object merely to fill one of the boxes.

---

## Final rule

When generating z4js code:

> Prefer the simplest valid z4js solution that can be understood by reading the TypeScript, and that refuses by default.

If the solution requires several new architectural concepts to solve a simple application problem, reconsider it.

If the exact z4js API is uncertain, check the documentation or source instead of guessing.
