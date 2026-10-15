# z4js — AI Context

> Compact API reference intended for AI assistants, written from the TypeScript declarations of `src/`.
> Signatures are exact; prose is condensed. How to write idiomatic z4js code: see `aiguide.md`.

---

## Overview

z4js is a TypeScript backend framework for Node. Express 5, Postgres (postgres.js) or SQLite (`node:sqlite`), WebSockets (`ws`). Its UI counterpart is x4js.

```ts
import { ... } from "@r-libre/z4js"           // src/index.ts: everything
import { Shape } from "@r-libre/z4js/shape" // src/shared/shape.ts: also usable in a browser
```

- Sources are published as TypeScript, as is. The application bundles them with `z4js build` (esbuild).
- `strictNullChecks` is off: an object may be null implicitly. Types never say `| null` or `| undefined`.
- Every refusal from a client is an `HttpError`: the client receives `{ error: "short message" }` and a status, never an internal detail.

**Repository**: https://github.com/rlibre/z4js
**License**: MIT

---

## Startup sequence (the main)

```
Config.load            read and check the configuration file (--config=<file>)
Logger / SecurityLog   destinations
sql                    the database connection (sqlite( ) or postgres( ))
Access, Sessions       they register the models they need (groups, users, sessions)
Model.updateAll        every model migrated in one transaction
Model.validateAll      refuses to start on a mismatch
Workers.start          background threads
RouteGroup             guarded / unprotected groups of end points and channels
serve                  the HTTP(S) server, WebSockets, statics, clean stop
```

---

## Class map

```
Config                      the configuration: its readonly fields are the schema of the file
EndPoints                   notes HTTP routes (handler, need, filters)
Ctx                         context of one request: reads its values, sends the answer
Channel                     notes WebSocket endpoints
RouteGroup                  a prefix, its end points and channels, guarded or unprotected
Model                       migration and validation of one part of the database
  ├── GroupsModel           groups: id, name, rights
  ├── UsersModel            users: id, login, grps, password
  └── SessionsModel         sessions
Access                      users, groups, rights: userHasAccess
Sessions                    tokens, guard, /login /refresh /logout /stepup, step-up filter
RateLimiter                 fixed window counter per key, route filter
Worker / Workers            background threads (worker side / main side)
Tasks / Progress            progress of the long tasks of the workers, sent to the clients by WebSocket
Mutex                       named lock shared by every thread
Logger / SecurityLog        line + JSON logs; closed list of security events
HttpError                   an error that answers with its status and a short message
Shape                       validators (@r-libre/z4js/shape), never mandatory
WSocket / WSData            an open socket, a received message
```

---

## `Config`

The class is the schema of the JSON file. The application extends it; each `readonly` field is read by a helper. Nothing happens at import: `Config.load` builds it. (`src/config.ts`)

```ts
class Config {
  readonly mode: "debug" | "production"          // "mode", default "production"
  readonly debug: boolean                        // mode === "debug"
  readonly server: {
    host: string                // "127.0.0.1"
    port: number                // 4400
    trustProxy: boolean         // false: X-Forwarded-* ignored
    bodyLimit: number           // 100 KB, 413 above
    headersTimeoutMs: number    // 10 000
    requestTimeoutMs: number    // 30 000
    keepAliveTimeoutMs: number  // 5 000
    slowRequestMs: number       // 75: slower requests are logged as warnings
    shutdownMs: number          // 10 000
    cors: string[]              // allowed origins, none by default
  }
  readonly session: { accessMinutes: number /*15*/, refreshMinutes: number /*60*/, maxPerUser: number /*10*/, stepUpMinutes: number /*5*/ }
  readonly rateLimit: { loginPerMinute: number /*10*/, loginFailures: number /*10*/, loginFailureMinutes: number /*15*/, refreshPerMinute: number /*30*/, apiPerMinute: number /*300, 0 = none*/ }
  readonly tls: { cert: string, key: string }    // mandatory outside the loopback address
  readonly log: { level: LogLevel, file: string }  // file null = stdout, ${date} accepted
  readonly securityLog: { file: string }
  readonly uploads: { folder: string }           // null = <system temp>/z4js-uploads

  static load<T extends Config>(cls: new () => T, file?: string): T   // file default: --config=<file>

  protected onCheck(): string[]                  // cross-field checks: return the errors
  protected string(key: string, opts?: ConfigOptions<string>): string
  protected number(key: string, opts?: NumberOptions): number
  protected int(key: string, opts?: NumberOptions): number
  protected bool(key: string, opts?: ConfigOptions<boolean>): boolean
  protected strings(key: string, opts?: ConfigOptions<string[]>): string[]
  protected oneOf<T extends string>(key: string, values: readonly T[], opts?: ConfigOptions<T>): T
  protected folder(key: string, opts?: FolderOptions): string     // absolute path
  protected file(key: string, opts?: FileOptions): string         // absolute path
  protected secret(key: string, opts?: ConfigOptions<string>): string  // content of the file named by the key
}

interface ConfigOptions<T> { def?: T }           // absent key: def. def: null makes the key optional
interface NumberOptions extends ConfigOptions<number> { min?: number; max?: number }
interface FolderOptions extends ConfigOptions<string> { create?: boolean }
interface FileOptions extends ConfigOptions<string> { mustExist?: boolean }   // default true

class ConfigError extends Error { readonly errors: readonly string[] }
```

- Keys are dotted paths in the file: `"server.port"` reads `{ "server": { "port": 4400 } }`.
- A key of the file that no field reads is an error. Errors are accumulated in one `ConfigError`.
- Relative paths are resolved from the folder of the config file (no `chdir`).
- Secrets are separate files (mode 600 outside Windows). The loaded configuration is frozen.
- The JSON accepts comments and trailing commas.

---

## `EndPoints`

Notes routes; touches neither Express nor the configuration. Mounted by a `RouteGroup`. (`src/endpoints.ts`)

```ts
type Method = "get" | "post" | "put" | "patch" | "delete"
type Handler = (ctx: Ctx<any>) => unknown                 // may be async
type Need = string | readonly string[] | ((ctx: Ctx<any>) => boolean | Promise<boolean>)   // null: no right
type Filter = (ctx: Ctx<any>) => unknown                  // may be async, refuses by throwing an HttpError, never answers (throws)
interface RouteOptions {
  need: Need                            // REQUIRED. right(s) checked by the Access of the group (all of them), a function (false: 403), or null (no right)
  filter?: Filter | readonly Filter[]   // run after need, before the handler
}

class EndPoints {
  get routes(): readonly RouteDef[]
  get(url: string, handler: Handler, options: RouteOptions): void
  post(url: string, handler: Handler, options: RouteOptions): void
  put(url: string, handler: Handler, options: RouteOptions): void
  patch(url: string, handler: Handler, options: RouteOptions): void
  del(url: string, handler: Handler, options: RouteOptions): void
  protected route(method: Method, url: string, handler: Handler, options: RouteOptions): void
}
```

- Handlers are methods given unbound (`this.get( "/all", this.on_all, { need: "notes/read" } )`): they run with the `EndPoints` object as `this`, and receive the context of the request.
- Order of a request: guard of the group (401) → `need` (403) → filters → handler. A step that throws ends the request.
- `need` is required in every route (`{ need: null }` for no right): a route without it is refused at its declaration. In an unprotected group `need` is `null`, even for a function: a check without a session (webhook signature...) is a filter. Anything else there is refused at startup (`add`). An empty list or an empty right is refused at declaration.
- Paths: segments are literals or `:name`. No wildcard, no optional part, no regex, no `.` or `..`. Compared case-insensitively. A duplicate route throws.
- A bad or missing value is a 400 that names the parameter, never its value.

## `Ctx` (`src/context.ts`)

The only thing a handler receives. Express `req` and `res` are not reachable.

```ts
interface Binary { }                                // marker: binary answer
type RequestSession = Readonly<{ id: string; user: SessionUser; stepUpUntil: number }>

class Ctx<T = unknown> {                            // T: type of the JSON answer (Ctx alone: not typed)
  // request
  get session(): RequestSession                     // set by the guard, null in an unprotected group
  get ip(): string                                  // follows X-Forwarded-For only with trustProxy
  get rawBody(): unknown                            // decoded JSON body (the text fields after filesOf)
  header(name: string): string

  // values: a bad or missing value is a 400 that names the parameter, never its value
  // same two signatures for each: /item/:id, JSON body member, ?a=1
  paramValue<const V extends readonly string[]>(name: string, type: "enum", mode: EnumMode<V>): V[number]   // values required
  paramValue<K extends Exclude<ArgType, "enum"> = "string">(name: string, type?: K, mode?: ValueType): ArgTypes[K]
  bodyValue(...): ...
  bodyValue<T>(name: string, type: "object", mode: ShapeMode<T>): T          // bodyValue only: checked and typed by the Shape
  bodyValue<T>(name: string, type: "object[]", mode: ShapeMode<T>): T[]      // each item, maxitems applies
  queryValue(...): ...
  filesOf<F extends string>(spec: Record<F, FileSpec>, options?: FilesOptions): Promise<Record<F, UploadedFile>>  // multipart

  // answer
  status(code: number): this
  addHeader(name: string, value: string): this
  json(value: T): void
  ok(): void                                                                // 200 {}
  send(this: Ctx<Binary>, data: Buffer | Uint8Array | string, contentType: string): void
  download(this: Ctx<Binary>, path: string, name: string): Promise<void>  // absolute path; missing file: 404
}
```

- `Ctx` is invariant in `T`: `send` and `download` exist only for `Ctx<Binary>`, which cannot `json`.
- Nothing sent by the handler: z4js answers the status set by `status` with an empty body; without status a 200, and `http.empty` in the log in debug.
- Answering twice throws.

### `ArgTypes` / `ValueType` (`src/params.ts`)

```ts
interface ArgTypes {
  "string": string;  "number": number;  "integer": number;  "boolean": boolean
  "object": Record<string, any>;  "any": any;  "uuid": UUID;  "enum": string   // the union of its values, see EnumMode
  "date": Date;  "sql-date": Date;  "sql-datetime": Date
  "time": string     // HH:MM or HH:MM:SS
  "string[]": string[];  "number[]": number[];  "integer[]": number[];  "uuid[]": UUID[];  "boolean[]": boolean[];  "object[]": Record<string, any>[]
}
type ArgType = keyof ArgTypes

type EnumMode<V extends readonly string[]> = ValueType & { values: V }   // the options of an "enum"
type ShapeMode<T> = ValueType & { shape: ObjectValidator<T> }            // an "object" / "object[]" of the body checked by a Shape: only its fields are kept; a refusal is a 400 naming the member and the field

interface ValueType {
  required?: boolean     // default true
  nullable?: boolean
  default?: unknown      // when absent and not required
  maxlength?: number     // strings, in characters (code points); longer = 400
  truncate?: boolean     // strings: cut to maxlength instead of rejecting
  trim?: boolean         // strings
  minval?: number        // numbers
  maxval?: number        // numbers
  utc?: boolean          // sql-date, sql-datetime
  values?: readonly string[]   // enum: the accepted values (required by EnumMode); the result is their union, no `as const`
  maxitems?: number      // arrays: 100 by default, more = 400
  validator?: (data: unknown) => boolean   // last check, on the converted value (each item for arrays)
}
```

Conversions are tolerant (URL values are strings: `"12"` is an integer, `"yes"`/`"1"` a boolean, `?a=1` an array of one, `?a=1&a=2` an array of two); checks are strict, each item of an array with the options. No comma separated lists. `uuid` is returned lowercase. `date` accepts ISO text or a millisecond timestamp.

---

### Uploads (`src/uploads.ts`)

```ts
interface FileSpec { maxBytes: number; types?: readonly string[]; required?: boolean }   // required default true
interface FilesOptions { fields?: number /*20*/; fieldBytes?: number /*64 KB*/ }           // text fields

class UploadedFile {
  readonly id: string        // random UUID, also the name of the file on disk
  readonly name: string      // given by the client, cleaned (no path, no control character): information only
  readonly type: string      // given by the client: a hint only
  readonly size: number
  get path(): string
  get kept(): boolean
  keep(dest: string): Promise<void>   // moves the file (copy across disks); an existing dest is refused
}
```

```ts
this.post( "/import", this.on_import, { need: "notes/create" } )   // checked before reading a byte

async on_import( ctx: Ctx<{ id: string }> ) {
  const { data } = await ctx.filesOf( { data: { maxBytes: 1_000_000, types: ["text/csv"] } } )
  const comment = ctx.bodyValue( "comment", "string", { required: false } )   // the text fields
  await data.keep( join( config.data, "imports", data.id ) )   // else deleted at the end of the request
  ctx.status( 201 ).json( { id: data.id } )
}
```

- Parsed by `@fastify/busboy`, streamed to `config.uploads.folder`, mode 600, never kept whole in memory.
- Refused: not multipart (400), undeclared file field or second file in a field (400), missing required file (400), file over `maxBytes`, too many fields or a field too long (413), type not in `types` (415).
- A refused body is not read further: the connection is closed after the answer. A client still sending a large file may see a connection reset instead of the 413: check `file.size` before sending.
- Every file not kept is deleted when the answer is sent or the request aborted. Call `keep` before answering.
- `requestTimeoutMs` (30 s) applies to the whole request: raise it in the configuration for large files on slow links.
- From the browser: `const form = new FormData( ); form.append( "data", file ); fetch( url, { method: "POST", body: form } )` (no content-type header: the browser writes it).

## `RouteGroup`

```ts
class RouteGroup {
  readonly prefix: string
  static guarded(prefix: string, guard: RequestHandler, access: Access): RouteGroup   // every route behind the guard; access checks the needs
  static unprotected(prefix: string): RouteGroup                      // no control at all
  add(path: string, target: EndPoints | Channel): this         // "/" = the prefix itself
  list(): RouteInfo[]                                                 // whole exposed surface
  toRouter(): Router                                                  // used by serve
}
interface RouteInfo { method: Method | "ws"; path: string; guarded: boolean }
```

- No parameter in a prefix nor in a sub-path. The same object may be added to several groups.
- The same route in two groups is refused at startup.
- In a guarded group, each WebSocket endpoint also gets a `POST` on the same path that issues one-time tickets.

---

## `serve` (`src/server.ts`)

```ts
function serve(options: ServeOptions): Promise<RunningServer>

interface ServeOptions {
  config: Config
  groups: readonly RouteGroup[]
  statics?: readonly StaticFolder[]   // { path: "/", folder: config.www }: never protected, dot files ignored
  handleSignals?: boolean             // SIGTERM / SIGINT, default true
  onStop?: () => Promise<void>        // after the HTTP requests: workers.stop( ), sql.end( ), logger.close( )
}
interface RunningServer { readonly server: Server; close(): Promise<void> }
```

Express `Request` gains (internal to z4js, see `Ctx`): `id: string`, `log: Logger` (child logger carrying the request id), `session?: { id: string; user: SessionUser; stepUpUntil: number }` (set by the guard).

What `serve` does: HTTPS if `tls.cert`, `trust proxy` from the config, no `X-Powered-By`, strict `express.json` limited to `bodyLimit`, timeouts, `nosniff` everywhere, HSTS under TLS, `no-store` on the groups, CORS by whitelist without credentials, `X-Request-Id`, one log line per request once answered (`http.request`, `http.slow`, `http.aborted`), global API rate limit, 404 and error handlers, WebSocket upgrades, clean stop.

---

## `HttpError` (`src/http-error.ts`)

```ts
class HttpError extends Error {
  readonly code: number
  constructor(code: number, message?: string, options?: { cause?: unknown })  // message default: standard text
}
function statusText(code: number): string     // "Not Found"
```

The cause is logged, never sent. Any other error is a 500 with no detail. Express errors keep their 4xx (413, invalid JSON).

---

## `Channel` (`src/ws.ts`)

```ts
type WSMessageHandler = (socket: WSocket, data: WSData) => unknown
interface WSHandler {
  onOpen?(socket: WSocket): unknown
  onMessage: WSMessageHandler
  onClose?(socket: WSocket, code: number): unknown
}
interface WSOptions { need: Need; maxPayload?: number }   // need required, as for an HTTP route

class Channel {
  get routes(): readonly WSRouteDef[]
  route(path: string, handler: WSHandler | WSMessageHandler, options: WSOptions): void
}

class WSocket {
  readonly path: string
  readonly user: any            // the user of the ticket (guarded group), else null
  get isOpen(): boolean
  send(data: unknown): void     // strings and buffers as is, anything else as JSON
  close(code?: number, reason?: string): void
}

class WSData {
  readonly buffer: Buffer
  readonly isBinary: boolean
  get text(): string
  get json(): any               // invalid JSON closes the socket with 1007
}
```

- Paths have no parameter. Handlers are bound to the channel.
- Guarded group: the client `POST`s on the endpoint path (with `Authorization`) and receives `{ ticket }`, then opens `ws(s)://host/path?ticket=...` within one second. The ticket is one-time, bound to the endpoint and the user.
- Every endpoint declares `need` (required, `null` for no right). In a guarded group it is checked by the ticket `POST` (no right: 403, no ticket, no socket); in an unprotected group only `null` is accepted. Rights are checked at the opening only.
- Messages of one socket are processed one at a time, in order (above 100 waiting: close 1008). A handler error closes with 1011 and is logged. Ping every 30 s.

---

## `Model` (`src/model.ts`)

```ts
interface Db { <T extends readonly object[] = Record<string, any>[]>(strings: TemplateStringsArray, ...values: any[]): PromiseLike<T> }
interface DbTx extends Db { savepoint<R>(fn: (db: DbTx) => Promise<R>): Promise<unknown> }
interface DbRoot extends Db { begin<R>(fn: (db: DbTx) => Promise<R>): Promise<unknown> }

class Model<D extends Db = Db> {               // D: type of this.db (SqliteDb: the connection or a transaction)
  readonly modelName: string
  readonly priority: number               // lower migrates first
  constructor(modelName: string, priority?: number)

  static ensure<M extends Model<any>>(modelName: string, cls: new () => M): M   // the registered one (must be a cls), else a new cls
  static transaction<R>(fn: () => Promise<R>): Promise<R>   // every query made from fn belongs to it; nested: a savepoint
  static updateAll(sql: DbRoot, options?: MigrateOptions): Promise<void>
  static checkAll(sql: DbRoot, options?: MigrateOptions): Promise<MigrateFailure>   // dry run, rolled back
  static validateAll(sql: Db): Promise<void>

  onMigrate(db: Db, version: number): Promise<number>   // stored version (0 the first time) -> new one, never lower
  onValidate(db: Db): Promise<void>                     // throw on a mismatch

  protected get db(): D                   // the transaction in progress, else the connection given to updateAll (throws before)
  protected hasTable(db: Db, table: string): Promise<boolean>
  protected hasField(db: Db, table: string, field: string): Promise<boolean>
  protected fieldType(db: Db, table: string, field: string): Promise<string>
  protected hasIndex(db: Db, table: string, index: string): Promise<boolean>
}

interface MigrateOptions { lockTimeout?: string; maxTransactionMs?: number }
interface MigrateFailure { model: string; priority: number; error: unknown }
class MigrationError extends Error { readonly model: string; readonly priority: number }
function isInfraError(e: unknown): boolean
```

- Every model migrates in one transaction. Versions are stored in the table `__versions`.
- Single instance: z4js keeps state in memory (sessions, rate limits, tickets, tasks, mutexes). With Postgres, `updateAll` first takes an advisory lock (keys: a z4js constant and the hash of `current_schema( )`) on a connection reserved for the life of the process (`sql.reserve( )`, postgres.js 3.4+): a second instance on the same schema fails to start ("another instance of the application uses this database"). Released when the process ends, even on a crash. `checkAll` does not take it.
- `onMigrate` runs at every start and inspects the real state of the database (`hasTable`, `hasField`...). No numbered migration files.
- Models are global instances created at the import of their file. A model created after `Model.updateAll` throws.
- Nothing started in a `Model.transaction` may outlive it (promise not awaited, timer): `this.db` refuses it with a clear error.
- A model is the only access to its data: its queries are its methods (`this.db`), the end points, channels and workers import the model and call them. No SQL anywhere else, no `sql.begin` anywhere: transactions are opened with `Model.transaction`, and the models see them without any parameter. During `onMigrate`, `this.db` is the migration transaction (same as its `db` parameter).
- Initial data (demo accounts, reference rows) is written by a model in its `onMigrate`, never by the main.
- Built-in priorities: `GroupsModel` 10, `UsersModel` 20, `SessionsModel` 30 (application models after them).

---

## SQLite (`src/sqlite.ts`)

Same style as postgres.js. Values are always bound, never written into the SQL text.

```ts
function sqlite(path: string, options?: SqliteOptions): SqliteSql
interface SqliteOptions { readOnly?: boolean; busyTimeout?: number; cacheSize?: number /*100*/; maxTransactionMs?: number /*30 000, 0 = none*/; exclusive?: boolean }
// exclusive: the only connection to the file (single instance): its lock is taken at the opening and held until end( ).
// a second instance fails to open, any other connection (SQL editor, a worker) fails. typically { exclusive: !config.debug }

interface SqliteDb {                               // the connection or a transaction: what a model sees (Model<SqliteDb>)
  <T extends readonly object[] = Row[]>(strings: TemplateStringsArray, ...values: unknown[]): Query<T>
  (value: unknown, ...columns: string[]): Helper     // identifier, in ( ), insert / update / select lists
}
interface SqliteSql extends SqliteDb {
  begin<R>(fn: (tx: SqliteTx) => R | Promise<R>, options?: BeginOptions): Promise<R>
  end(): Promise<void>
}
interface SqliteTx extends SqliteDb { savepoint<R>(fn: (tx: SqliteTx) => R | Promise<R>): Promise<R> }

type Result<T> = T & { count: number; lastInsertRowid: number | bigint }
const TX_TIMEOUT_CODE = "SQLITE_TX_TIMEOUT"
function isSqlite(db: unknown): db is SqliteSql | SqliteTx
```

```ts
const [note] = await sql`select * from notes where id = ${id}`
await sql`insert into notes ${sql( note )}`
await sql`insert into users ${sql( [a, b] )}`
await sql`update notes set ${sql( changes, "title", "text" )} where id = ${id}`
await sql`select * from notes where id in ${sql( ids )}`
await sql`select ${sql( ["id", "title"] )} from ${sql( "notes" )}`   // a string is an identifier
const { count } = await sql`delete from notes where id = ${id}`
await sql.begin( async tx => { await tx`...`; await tx.savepoint( async sp => { ... } ) } )   // used by Model.transaction
```

These calls are written in the methods of the models, on `this.db`. An application opens its transactions with `Model.transaction`, never with `sql.begin`.

- One connection: queries made outside a running transaction wait (FIFO). Using the root `sql` inside a transaction throws instead of blocking.
- Written: boolean → 0/1, Date → ISO text, object/array → JSON. Read back by declared column type (`boolean`, `date`/`datetime`/`timestamp`, `json`). Integers beyond `Number.MAX_SAFE_INTEGER` are refused.
- Not provided: `unsafe`, `listen`/`notify`, cursors.

Postgres: use postgres.js directly; its `sql` fits `Db` / `DbRoot`.

---

## `Access` (`src/access.ts`)

```ts
type UserRef = string | { id: string }

class Access {
  constructor()                                        // registers GroupsModel and UsersModel (reads its data through them)
  readonly userHasAccess: (user: UserRef, right: string) => Promise<boolean>
  readonly ungrantableGroups: (actor: UserRef, groupIds: readonly string[]) => Promise<string[]>  // groups the actor cannot give
}
```

- Rights are `"resource/action"`. Granted by the same right, by `"resource/*"`, or by `"*"`. The joker is accepted at the end only.
- Rights are cached 5 s per user (1000 users at most). Refusals go to the SecurityLog (`auth.forbidden`).
- The `Access` is given to the guarded groups, which check the `need` of their routes with it.
- Refusals carry the request id (hidden by the guard on the user object of the request).

---

## `Sessions` (`src/session.ts`)

```ts
class Sessions {
  constructor(settings: SessionSettings, options: SessionOptions)   // registers UsersModel and SessionsModel (reads its data through them)
  readonly endPoints: EndPoints            // /login /refresh /logout /stepup: mount in an unprotected group
  readonly guard: RequestHandler             // group guard: sets the session of the request (ctx.session) or answers 401
  static readonly stepUp: Filter             // route filter (Sessions.stepUp): 403 "step-up required" without recent confirmation
  readonly loginLimiter: RateLimiter
  readonly refreshLimiter: RateLimiter

  readonly login: (login: string, password: string, requestId?: string) => Promise<SessionTokens>  // null if refused
  readonly create: (userId: string) => Promise<SessionTokens>      // after an external check (LDAP...)
  readonly refresh: (refreshToken: string) => Promise<SessionTokens>
  readonly logout: (refreshToken: string) => Promise<void>
  readonly revokeUser: (userId: string) => Promise<void>
  readonly loginBlockedFor: (login: string) => number              // ms to wait, 0 if allowed
  readonly grantStepUp: (ctx: Ctx) => Promise<void>                // identity checked by the application
  readonly stepUpWith: (ctx: Ctx, method: string) => Promise<boolean>
}

interface SessionSettings { accessMinutes: number; refreshMinutes: number; maxPerUser: number; stepUpMinutes: number }  // config.session
interface SessionRateLimits { loginPerMinute: number; loginFailures: number; loginFailureMinutes: number; refreshPerMinute: number }  // config.rateLimit
interface SessionOptions { rateLimit: SessionRateLimits; stepUpVerifiers?: Record<string, StepUpVerifier> }   // security events: SecurityLog.app
type StepUpVerifier = (user: SessionUser, ctx: Ctx) => Promise<boolean>   // reads its proof with ctx.bodyValue
interface SessionUser { id: string; login: string; grps: string[] }
interface SessionTokens { access: string; refresh: string; accessExpiresIn: number; refreshExpiresIn: number }
```

Routes of `sessions.endPoints`:

```
POST /login    { login, password }   -> SessionTokens        (rate limited per IP and per login)
POST /refresh  { refresh }           -> SessionTokens        (both tokens replaced; a reused refresh token ends the session)
POST /logout   { refresh }           -> {}
POST /stepup   { method?, ...proof } -> {}                   (behind the guard; method default "password")
```

The client sends `Authorization: Bearer <access>`. No cookies. Opaque tokens, only their SHA-256 is stored.

---

## Passwords (`src/password.ts`)

```ts
function hashPassword(password: string): Promise<string>     // "pbkdf2-sha256$iterations$salt$hash"
function verifyPassword(password: string, stored: string): Promise<boolean>
function needsRehash(stored: string): boolean
```

PBKDF2-SHA256, 600 000 iterations (about 100 ms). NFC normalized, 64 characters at most, constant time comparison.

---

## `RateLimiter` (`src/ratelimit.ts`)

```ts
class RateLimiter {
  constructor(name: string, max: number, windowMs: number)
  hit(key: string): number        // ms to wait, 0 if allowed
  waitFor(key: string): number
  reset(key: string): void
  readonly filter: Filter         // route filter keyed on ctx.ip: 429 + Retry-After
}
```

In memory, fixed window, 10 000 keys at most. `ctx.ip` follows `X-Forwarded-For` only with `trustProxy`.

---

## Workers (`src/workers.ts`)

Worker side, in the single entry file `workers.ts` (built as `workers.js` next to the main script):

```ts
abstract class Worker {
  readonly class: string          // the name its class is registered under
  readonly name: string           // its own name (workers.start), default: the name of its class
  readonly instance: number
  readonly id: string             // "name@class", or "name@class#instance" when started with instances
  readonly data: unknown          // what workers.start gave it (options.data): its own copy
  readonly config: Config         // loaded by the main thread, frozen again
  readonly log: WorkerLog         // debug / info / warn / error / fatal, written by the main thread
  static register(name: string, cls: new () => Worker): void   // a class, under the name workers.start asks for
  post(type: string, data?: unknown): void          // to the main thread
  onStart(): unknown
  onRun(): unknown                                  // runs until the stop, beside the messages
  onMessage?(type: string, data: unknown): unknown  // its result answers a call. absent: the worker reads its messages itself
  onStop(): unknown                                 // after the end of onRun
  get signal(): AbortSignal                         // fired as soon as the stop is asked
  wait(ms: number): Promise<boolean>                // true after ms, false at once on stop
  peekMessage(): WorkerMessage                      // the next message at once, null if none. never waits
  waitMessage(): Promise<void>                      // until a message is there (not read) or the stop
  getMessage(): Promise<WorkerMessage>              // the next message, waited for. null: the worker stops
  progress(task: string | { broadcast: true }): Progress   // see Tasks
}
interface WorkerMessage { type: string; data: unknown; reply(value?: unknown): void }   // reply answers a call, nothing for a post

class Progress {                  // one task, seen from the worker: "start" sent at its creation
  readonly id: string
  get isEnded(): boolean
  step(text: string, percent?: number): void      // plain text, percent 0..100 or absent
  done(text?: string): void
  fail(text: string): void
}
function runWorker(): Promise<void>     // last line of the entry file
```

Main side:

```ts
class Workers {
  constructor(options: WorkersOptions)                 // { config, file?, tasks? }; logs with Logger.app
  start(cls: string, options?: StartOptions): Promise<WorkerHandle>   // a worker of this registered class
  get(cls: string, name?: string): WorkerHandle        // found again by class and name, null if not started or ended
  list(): WorkerInfo[]
  stop(timeoutMs?: number): Promise<void>              // every worker. default config.server.shutdownMs
}
interface StartOptions {
  name?: string         // default: the name of the class. two workers of one class need a name each
  instances?: number    // interchangeable instances, served in turn. given (even 1): each has its number in its id
  data?: unknown        // given to the worker (this.data). plain data, copied to its thread
}

class WorkerHandle {              // a started worker: the object the application talks to
  readonly id: string             // "name@class"
  readonly class: string
  readonly name: string
  post(type: string, data?: unknown): void          // one instance, in turn
  broadcast(type: string, data?: unknown): void     // every instance
  call<T = unknown>(type: string, data?: unknown, timeoutMs?: number): Promise<T>  // default 30 000, none in debug
  on(type: string, handler: (data: unknown, from: WorkerInfo) => unknown): void   // posted by the worker
}
interface WorkerInfo { id: string; class: string; name: string; instance: number; threadId: number; started: Date; state: "starting" | "running" | "stopping" }
```

```ts
const stats = await workers.start( "stats" )                                     // stats@stats
const render = await workers.start( "render", { instances: 4 } )                 // render@render#0 .. #3
const press = await workers.start( "autom", { name: "press", data: { ip } } )    // press@autom
const oven = await workers.start( "autom", { name: "oven", data: { ip } } )      // same class, its own thread

press.post( "write", { address: 12, value: 1 } )
const pdf = await render.call( "pdf", { id } )
Workers.get( "autom", "oven" ).post( "write", { ... } )   // anywhere: a handler finds its worker
```

- A worker is a class and a name. Without `name` it is named like its class, so a class can then be started once.
- The instances of a worker are interchangeable: `post` and `call` take one in turn, none can be addressed. What must be addressed (one automaton, one device) is a worker of its own, with its name.
- The id is `name@class`; an instance adds `#n` when the worker was started with `instances`. It is the name of the thread in the debugger and the `worker` field of its log lines. A class or a name holds no `@`, `#` nor space.
- `Workers` has no `post`, `call`, `broadcast` nor `on`: only the `WorkerHandle` talks. One `Workers` per process (a second one throws): a handler finds a worker with the static `Workers.get( class, name? )` (`null` if not started: answer 503), never with a handle passed down from the main.
- A handle whose worker ended throws (`not running`), `Workers.get` returns `null`, and the same class and name may be started again.

Lifecycle: `onStart`, then the messages (one at a time, in order) and `onRun` beside them. `workers.start` resolves after `onStart`, without waiting for `onRun`. The stop fires `signal` at once, waits for the end of `onRun`, then runs `onStop`. An error that ends `onRun` is logged (`worker.run.failed`) and ends the worker.

A periodic task:

```ts
class Poller extends Worker {
  async onRun( ) {
    while( await this.wait( 60_000 ) ) {
      ...
    }
  }
  onMessage( type: string ) { throw new Error( `poller: unknown message "${type}"` ) }
}
```

A worker without `onMessage` reads its messages itself, in `onRun`, when it chooses to (`peekMessage`, `waitMessage` and `getMessage` throw in a worker that has an `onMessage`):

```ts
class Indexer extends Worker {
  private readonly files: string[] = []

  async onRun( ) {
    let msg: WorkerMessage

    while( !this.signal.aborted ) {
      if( msg = this.peekMessage( ) ) {
        this.dispatch( msg )                 // "add": this.files.push( ... ), "status": msg.reply( { ... } )
      }
      else if( this.files.length ) {
        indexFile( this.files.shift( ) )     // heavy, synchronous
      }
      else {
        await this.waitMessage( )            // nothing to do: sleeps until a message or the stop
      }
    }
  }
}
```

- `peekMessage` reads the port itself: a loop that never awaits still receives its messages. It also sees the stop: it fires `signal` and returns `null`. Such a loop must call it regularly, or the worker is terminated at the stop timeout.
- A loop that only handles messages: `while( msg = await this.getMessage( ) ) { ... }`.
- `msg.reply( value )` answers a `call`, before the next message is read: a call left without answer at the next `peekMessage` or `getMessage` (or at the end of `onRun`) is rejected (`"no answer"`).
- The messages not read yet wait in a queue of 100: above, a `call` is rejected (`"worker busy"`), a `post` is logged (`worker.message.dropped`) and lost.

A crashed worker is not restarted: logged, removed, its calls fail, its mutexes are released. Each thread is named by its id in the debugger (`press@autom`, `render@render#2`).

---

## `Tasks` (`src/tasks.ts`)

The progress of a long task of a worker, followed by the client through a WebSocket. The main thread creates the task (the client gets its id in the answer), the worker reports on it.

```ts
class Tasks extends Channel {                     // mount it: api.add( "/tasks", tasks )
  create(user: string | { id: string }, options?: TaskOptions): string   // the task id
  report(r: TaskReport, worker: string): string   // called by Workers: null, or why it is refused
  workerEnded(worker: string): void               // called by Workers: its tasks fail
}
interface TaskOptions { broadcast?: boolean }     // every connected user, not only the one who created it
interface TaskMessage { task: string; phase: "start" | "step" | "end"; text?: string; percent?: number; ok?: boolean }
const MAX_TASK_TEXT = 256
```

```ts
// main
const tasks = new Tasks( )
const workers = new Workers( { config, tasks } )
const api = RouteGroup.guarded( "/api", sessions.guard, access ).add( "/tasks", tasks )

// handler (importer: the object given by workers.start( "import" ))
const task = tasks.create( ctx.session.user )
importer.post( "run", { task, file } )
ctx.status( 202 ).json( { task } )

// worker
const progress = this.progress( data.task )       // "start"
progress.step( "line 300 / 1200", 25 )
progress.done( "1200 lines" )                     // or progress.fail( "bad file" )

// a task nobody asked for (scheduled job): created by the worker, always broadcast
const progress = this.progress( { broadcast: true } )
```

- The client opens the socket like any channel (ticket by `POST /api/tasks`, then `?ticket=`) and receives `TaskMessage`s. The text is plain text, never HTML.
- A task is followed by its creator only, unless `broadcast`. A socket without user (unprotected group) is closed.
- A worker reports only on a task created by the main thread, except a broadcast task it creates itself. Another worker may not report on a started task. Refusals are logged (`worker.task.refused`).
- A progress left open when `onMessage` (or `onRun`) ends is closed: `done` if it succeeded, `fail( "failed" )` if it threw. A worker that dies fails its tasks (`"worker ended"`). A worker that reads its messages itself ends its progresses itself: they belong to `onRun`, which ends at the stop only.
- A socket opened while a task runs receives its current state: `start`, then the last `step`.
- 1000 tasks at most at the same time (`create` answers 503 above). The text of a step is cut to `MAX_TASK_TEXT`, the percent bounded to 0..100.
- A worker processes its messages one at a time: a long task in `onMessage` delays the next messages of that worker.

---

## `Mutex` (`src/mutex.ts`)

```ts
class Mutex {
  readonly name: string
  constructor(name: string)                                         // ASCII, 64 characters at most
  withLock<T>(timeoutMs: number, fn: () => T): Promise<Awaited<T>>   // LockError if not taken in time (503 in HTTP)
  tryLock<T>(timeoutMs: number, fn: () => T): Promise<Awaited<T>>    // null if not taken
}
class LockError extends Error { readonly reason: "timeout" | "shutdown" }
```

Shared by every thread. 128 names at most over the life of the process, never freed: fixed names (`"stock"`, `"backup"`), never one per resource.

---

## `Logger` / `SecurityLog` (`src/logger.ts`)

```ts
const LOG_LEVELS = ["debug", "info", "warn", "error", "fatal"] as const
type LogLevel = (typeof LOG_LEVELS)[number]

class Logger {
  static create(options: LoggerOptions): Logger       // { level, file?, mode? }, file null = stdout. once per process (by the main)
  static get app(): Logger                            // the logger of the application, read by z4js and the application (throws before create)
  child(requestId: string): Logger
  debug(event: string, data?: Record<string, unknown>): void
  info(event: string, data?: Record<string, unknown>): void
  warn(event: string, data?: Record<string, unknown>): void
  error(event: string, data?: Record<string, unknown>): void
  fatal(event: string, data?: Record<string, unknown>): void
  close(): void
}

const SECURITY_EVENTS = ["auth.login.ok", "auth.login.failed", "auth.unauthorized", "auth.forbidden",
  "auth.stepup.required", "auth.stepup.ok", "auth.stepup.failed", "auth.session.revoked",
  "auth.ticket.refused", "auth.rights.changed"] as const

class SecurityLog {
  static create(options?: SecurityLogOptions): SecurityLog   // { file?, mode?, extraEvents? }. once per process, by the main (required)
  static get app(): SecurityLog                       // read by Access and Sessions (throws before create)
  log(event: string, data?: Record<string, unknown>, requestId?: string): void   // unknown event: throws
  close(): void
}
```

Line format: `<ISO date> <LEVEL> <request id or -> <event> [<JSON data>]`. Everything before the JSON is written by z4js; values from a client go only in the JSON (escaped, strings truncated to 256 characters). SecurityLog: fixed level `SEC`, never filtered.

---

## `Shape` (`@r-libre/z4js/shape`, `src/shared/shape.ts`)

Never mandatory. No Node or browser dependency.

```ts
class Shape {
  static string(): StringValidator     // .trim() .minLen(n) .maxLen(n) .truncate() .email() .uuid() .format(regex, name?)
  static email(): StringValidator
  static uuid(): StringValidator
  static number(): NumberValidator     // .minMax(min, max) .integer() .notZero()
  static boolean(): BoolValidator      // strict: only true / false
  static enum(...values: string[]): EnumValidator
  static date(format: DateFormat): DateValidator   // "sql-date" | "sql-datetime" | "iso", always UTC
  static object<T = any>(fields: Fields<T>): ObjectValidator<T>
}
// every validator: .optional() .nullable()

class ObjectValidator<T> {
  parse(data: unknown): T
  parse(data: unknown, partial: true): Partial<T>
  parseArray(data: unknown): T[]
}
class ShapeError extends Error {}     // names the field, never the value
```

Only the declared fields are kept. `Fields<T>` must describe every key of `T`: a forgotten field fails to compile. Strings are rejected when too long unless `.truncate()`.

---

## Utilities (`src/tools.ts`)

```ts
isString(v) isNumber(v) isIntNumber(v) isUIntNumber(v) isArray(v) isFunction(v) isDate(v) isPlainObject(v)
deepFreeze<T>(obj: T): T
dropOldest(map: Map<unknown, unknown>, max: number): void   // bounded cache: drops the oldest keys until one more fits
groupInt(m: RegExpExecArray, i: number): number            // integer of a regex group, 0 if it did not match
argValue(name: string, args?: string[]): string          // --name=value or --name value, null if absent
errorCode(e: unknown): string                            // "ENOENT", SQLSTATE..., "" if none
clamp<T>(v: T, min: T, max: T): T
pad(what: any, size: number, ch?: string): string
sprintf(format: string, ...args: any[]): string
kebabCase(text: string): string
camelCase(text: string): string
sanitizeHtml(input: string): string
getMemberValue(obj: any, path: string): any              // protected against prototype pollution
setMemberValue(obj: any, path: string, value: any): boolean
type UUID = string & { ... }
isUUID(v: unknown): v is UUID
toUUID(v: unknown): UUID
parseSqlDate(text: string, part: "date" | "datetime" | "any", utc: boolean): Date
checkedDate(utc: boolean, y, mo, d, h?, mi?, s?, ms?): Date   // null if the date does not exist
date_to_sql(date: Date, withHours: boolean): string
parseIntlDate(value: string, fmts: string): Date
formatIntlDate(date: Date, fmt: string, utc?: boolean): string
date_clone, date_hash, date_calc_weeknum, calcAge, date_sql_utc
```

---

## Command line (`z4js`)

```
z4js build [--config <file>] [--debug]
z4js dev [--config <file>] [--no-restart|--no-run]
z4js apidoc [--project=tsconfig.json] [--out=api.json]
npm start | z4js log [--level=warn]
```

`build` bundles the project described by `z4.config.json` (see the default project), with esbuild: a production build is minified, without source map; `--debug` keeps it readable and writes linked source maps. The output folder is emptied first. Two constants are defined in the sources: `DEBUG_MODE` (`false` in a production build) and `VERSION_ID` (the date of the build, `yymmdd`).

`dev` watches the sources, rebuilds, and runs the output with Node after each successful build (`dev.run`, `dev.nodeArgs`, `dev.args`). `--no-restart` launches Node once and keeps building, `--no-run` only builds. A change of the configuration file reloads it.

`--config <file>` gives another configuration file (it must exist). Relative paths are resolved from the folder of the project; `$VAR` and `${VAR}` are replaced by the environment variable.

`log` colors the log lines read on the standard input, by level, when the output is a terminal (`NO_COLOR` disables it); `--level` hides the lines below a level, the security lines (`SEC`) are always shown. The logger itself never writes colors.

`apidoc` writes the OpenAPI 3 description of the routes, read from the sources by the TypeScript compiler (nothing runs). Found: groups, routes, path/query/body values with their types and options (literals only), `res.status( n )`, `new HttpError( code, message )`, known filters (guard, step-up, rate limiter), the comment above each handler. Non-literal values are reported as warnings.

---

## Common patterns

### Main

```ts
import { join } from "node:path"
import { Access, Config, ConfigError, Logger, Model, RouteGroup, SecurityLog, Sessions, Workers, serve, sqlite } from "@r-libre/z4js"
import { AppConfig } from "./config"
import { NotesEP } from "./notes"

let config: AppConfig
try {
  config = Config.load( AppConfig )
}
catch( e ) {
  console.error( e instanceof ConfigError ? e.message : e )
  process.exit( 1 )
}

const logger = Logger.create( config.log )
SecurityLog.create( { file: config.securityLog.file } )
const sql = sqlite( join( config.data, "app.db" ) )

const access = new Access( )
const sessions = new Sessions( config.session, { rateLimit: config.rateLimit } )

await Model.updateAll( sql )
await Model.validateAll( sql )

const workers = new Workers( { config } )
await workers.start( "stats" )                    // found by the end points with Workers.get

const api = RouteGroup.guarded( "/api", sessions.guard, access )
  .add( "/notes", new NotesEP( ) )

const auth = RouteGroup.unprotected( "/auth" )
  .add( "/", sessions.endPoints )

await serve( {
  config,
  groups: [api, auth],
  statics: [{ path: "/", folder: config.www }],
  onStop: async ( ) => {
    await workers.stop( )
    await sql.end( )
    logger.close( )
  },
} )
```

### Application configuration

```ts
import { Config } from "@r-libre/z4js"

// the configuration of the application
export class AppConfig extends Config {
  readonly data = this.folder( "data", { create: true } )
  readonly www = this.folder( "www" )
  readonly smtp = {
    host: this.string( "smtp.host" ),
    port: this.int( "smtp.port", { def: 587, min: 1, max: 65535 } ),
    password: this.secret( "smtp.passwordFile" ),
  }
}
```

### EndPoints

```ts
import { EndPoints, HttpError } from "@r-libre/z4js"
import type { Ctx } from "@r-libre/z4js"
import { notesModel } from "./models"
import type { Note } from "./models"

// the routes of the notes
export class NotesEP extends EndPoints {
  constructor( ) {
    super( )
    this.get( "/item/:id", this.on_item, { need: "notes/read" } )
    this.post( "/create", this.on_create, { need: "notes/create" } )
  }

  // one note
  async on_item( ctx: Ctx<Note> ) {
    const id = ctx.paramValue( "id", "uuid" )
    const note = await notesModel.get( id )
    if( !note ) {
      throw new HttpError( 404, "unknown note" )
    }
    ctx.json( note )
  }

  async on_create( ctx: Ctx<{ id: string }> ) {
    const title = ctx.bodyValue( "title", "string", { maxlength: 100, trim: true } )
    ...
    ctx.status( 201 ).json( { id } )
  }
}
```

### Model

```ts
import { Model } from "@r-libre/z4js"
import type { Db, SqliteDb } from "@r-libre/z4js"

// the notes table and its queries
export class NotesModel extends Model<SqliteDb> {
  constructor( ) {
    super( "notes", 40 )    // after users (20)
  }

  override async onMigrate( db: Db, version: number ): Promise<number> {
    if( !await this.hasTable( db, "notes" ) ) {
      await db`create table notes ( id text primary key, title text not null, created datetime not null )`
    }
    if( !await this.hasField( db, "notes", "author" ) ) {
      await db`alter table notes add column author text`
    }
    return Math.max( version, 2 )
  }

  // null if unknown
  async get( id: string ): Promise<Note> {
    const [note] = await this.db`select * from notes where id = ${id}` as Note[]
    return note ?? null
  }

  async add( title: string, author: string ): Promise<string> {
    const note = { id: randomUUID( ), title, author, created: new Date( ) }
    await this.db`insert into notes ${this.db( note )}`
    return note.id
  }
}

export const notesModel = new NotesModel( )
```

### WebSocket endpoint

```ts
import { Channel } from "@r-libre/z4js"
import type { WSocket } from "@r-libre/z4js"

// live notifications of the notes
export class LiveChannel extends Channel {
  private readonly sockets = new Set<WSocket>( )

  constructor( ) {
    super( )
    this.route( "/notes", {
      onOpen: socket => { this.sockets.add( socket ) },
      onMessage: ( ) => { },
      onClose: socket => { this.sockets.delete( socket ) },
    }, { need: "notes/read" } )      // checked before the ticket is given
  }

  notify( event: object ) {
    for( const socket of this.sockets ) {
      socket.send( event )
    }
  }
}
```

### Worker entry file

```ts
import { Mutex, Worker, runWorker } from "@r-libre/z4js"

// counts the words of the notes
class Stats extends Worker {
  private readonly mutex = new Mutex( "stats" )

  async onMessage( type: string, data: { texts: string[] } ) {
    if( type !== "count" ) {
      throw new Error( `stats: unknown message "${type}"` )
    }
    return this.mutex.withLock( 1000, ( ) => ( { notes: data.texts.length } ) )
  }
}

Worker.register( "stats", Stats )
runWorker( )
```

---

## Default project

### `package.json`

```json
{
	"name": "my-backend",
	"private": true,
	"type": "module",
	"scripts": {
		"build": "z4js build --debug",
		"dev": "z4js dev",
		"start": "node --enable-source-maps dist/main.js --config=env/dev.json",
		"apidoc": "z4js apidoc --out=api.json"
	},
	"dependencies": {
		"@r-libre/z4js": "latest"
	},
	"devDependencies": {
		"@types/node": "^22.0.0",
		"typescript": "^5.6.0"
	}
}
```

### `z4.config.json`

```json
{
	"entryPoints": ["src/main.ts", "src/workers.ts"],
	"outdir": "dist",
	"external": ["bufferutil", "utf-8-validate"],
	"dev": {
		"run": "src/main.ts",
		"nodeArgs": ["--enable-source-maps"],
		"args": ["--config=env/dev.json"]
	},
	"esbuild": {
		"target": "node24",
		"alias": {
			"iconv-lite": "@r-libre/z4js/iconv-lite",
			"mime-db": "@r-libre/z4js/mime-db"
		},
		"banner": {
			"js": "import { createRequire as __z4Require } from 'node:module'; const require = __z4Require( import.meta.url );"
		}
	}
}
```

The banner gives `require` to the CommonJS dependencies bundled in an ESM output. `dev.run` names the entry point to run (the source, one of `entryPoints`); it is required as soon as there are several. Other keys: `define` (esbuild define expressions), `copy` (`[{ "from": "assets", "to": "assets" }]`, copied into `outdir` after each build). Defaults: `entryPoints` `["src/main.ts"]`, `outdir` `./bin`, target `node20`; the `esbuild` object is applied last.

The alias replaces `iconv-lite` (loaded by Express through body-parser, more than 500 KB of encoding tables) by `src/iconv-lite.ts`, which decodes with the `TextDecoder` of Node: about 340 KB less in the bundle. Only difference: a JSON body in utf-32 or utf-7 gets a 415. Optional: without the alias, the real iconv-lite is bundled. Details, and how to remove it, in the header of `src/iconv-lite.ts`.

The second alias replaces `mime-db` (loaded by Express through mime-types: 2522 types, 157 KB) by `src/mime-db.json`, reduced to what mime-types reads (1042 types, 54 KB), with no difference: `npm run mime-db` regenerates it and checks every extension and type against the full database. Details, and how to remove it, in the header of `scripts/mime-db.ts`.

### `tsconfig.json`

```jsonc
{
	"compilerOptions": {
		"target": "ES2022",
		"lib": ["ES2024"],
		"module": "ESNext",
		"moduleResolution": "Bundler",
		"strict": true,
		"strictNullChecks": false,
		"noEmit": true,
		"skipLibCheck": true,
		"types": ["node"]
	},
	"include": ["src"]
}
```

### `env/dev.json`

```jsonc
// every relative path is relative to this folder
{
	"mode": "debug",
	"server": { "host": "127.0.0.1", "port": 4400 },
	"log": { "level": "info" },
	"data": "../data",
	"www": "../www"
}
```

---

## Important notes for AI

- A handler receives only `ctx: Ctx<T>`: read with `ctx.paramValue`, `ctx.bodyValue`, `ctx.queryValue`, files with `ctx.filesOf` (never another multipart parser). Express `req` / `res` are not reachable.
- Every route declares `need` (`null` for no right): a route without it is refused at its declaration.
- Refuse with `throw new HttpError( code, "short message" )`. Never put a value, an id from the request or an internal detail in the message.
- SQL is written with tagged templates only, in the methods of the model that owns the data, nowhere else. Never build SQL text by concatenation.
- `ctx.session.user` is a `SessionUser` (`id`, `login`, `grps`), a copy per request. Log with `Logger.app`: there is no logger in `ctx`, and a logger is never passed around.
- Rights are `"resource/create"`, `"resource/read"`, `"resource/update"` or `"resource/delete"`, nothing else; `"resource/*"` and `"*"` grant more. A business action (import, export, recount) takes the CRUD right it amounts to: an import creates, so `"notes/create"`.
- `Config` fields are `readonly` and frozen. Never read `process.env` for settings: add a field.
- A secret is never written in the config file: the key gives the path of a file holding it (`secret()`).
- `Model.updateAll` must run after `new Access( )` and `new Sessions( )`, which register their models.
- Group prefixes and mount sub-paths have no parameters; route paths may (`/item/:id`).
- Mutex names are fixed strings, never built from data.
- Slow by design (no `http.slow` warning) exists for `/login` and `/stepup` only, internally (password hashing). There is no API for it.
- `strictNullChecks` is off on purpose: test with `!v`, write no `| null` / `| undefined`.
- When an API is unclear, read the installed sources: `node_modules/@r-libre/z4js/src/`.
