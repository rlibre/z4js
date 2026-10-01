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

- Sources are published as TypeScript, as is. The application bundles them with x4build (esbuild).
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
EndPoints                   notes HTTP routes, reads request values (paramValue, bodyValue, queryValue)
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
type Handler = (req: Request, res: Response) => unknown   // may be async
interface RouteOptions { filter?: RequestHandler | RequestHandler[] }   // run before the handler

class EndPoints {
  get routes(): readonly RouteDef[]
  get(url: string, handler: Handler, options?: RouteOptions): void
  post(url: string, handler: Handler, options?: RouteOptions): void
  put(url: string, handler: Handler, options?: RouteOptions): void
  patch(url: string, handler: Handler, options?: RouteOptions): void
  del(url: string, handler: Handler, options?: RouteOptions): void
  protected route(method: Method, url: string, handler: Handler, options?: RouteOptions): void

  paramValue<K extends ArgType = "string">(req: Request, name: string, type?: K, mode?: ValueType): ArgTypes[K]  // /item/:id
  bodyValue<K extends ArgType = "string">(req: Request, name: string, type?: K, mode?: ValueType): ArgTypes[K]   // JSON body member
  queryValue<K extends ArgType = "string">(req: Request, name: string, type?: K, mode?: ValueType): ArgTypes[K]  // ?a=1
}
```

- Handlers are methods given unbound (`this.get( "/all", this.on_all )`): they run with the `EndPoints` object as `this`.
- Paths: segments are literals or `:name`. No wildcard, no optional part, no regex, no `.` or `..`. Compared case-insensitively. A duplicate route throws.
- A bad or missing value is a 400 that names the parameter, never its value.

### `ArgTypes` / `ValueType` (`src/params.ts`)

```ts
interface ArgTypes {
  "string": string;  "number": number;  "integer": number;  "boolean": boolean
  "array": any[];    "object": Record<string, any>;  "any": any
  "uuid": UUID;      "date": Date;  "sql-date": Date;  "sql-datetime": Date
  "time": string     // HH:MM or HH:MM:SS
}
type ArgType = keyof ArgTypes

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
  validator?: (data: unknown) => boolean   // last check, on the converted value (each item for arrays)
}
```

Conversions are tolerant (URL values are strings: `"12"` is an integer, `"yes"`/`"1"` a boolean, `?a=1` an array of one); checks are strict. `uuid` is returned lowercase. `date` accepts ISO text or a millisecond timestamp.

---

## `RouteGroup`

```ts
class RouteGroup {
  readonly prefix: string
  static guarded(prefix: string, guard: RequestHandler): RouteGroup   // every route behind the guard
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
  logger: Logger
  groups: readonly RouteGroup[]
  statics?: readonly StaticFolder[]   // { path: "/", folder: config.www }: never protected, dot files ignored
  handleSignals?: boolean             // SIGTERM / SIGINT, default true
  onStop?: () => Promise<void>        // after the HTTP requests: workers.stop( ), sql.end( ), logger.close( )
}
interface RunningServer { readonly server: Server; close(): Promise<void> }
```

Express `Request` gains: `id: string`, `log: Logger` (child logger carrying the request id), `user?: any` (set by the guard), `session?: { id: string; stepUpUntil: number }`.

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
interface WSOptions { maxPayload?: number }

class Channel {
  get routes(): readonly WSRouteDef[]
  route(path: string, handler: WSHandler | WSMessageHandler, options?: WSOptions): void
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
- Messages of one socket are processed one at a time, in order (above 100 waiting: close 1008). A handler error closes with 1011 and is logged. Ping every 30 s.

---

## `Model` (`src/model.ts`)

```ts
interface Db { <T extends readonly object[] = Record<string, any>[]>(strings: TemplateStringsArray, ...values: any[]): PromiseLike<T> }
interface DbRoot extends Db { begin<R>(fn: (db: Db) => Promise<R>): Promise<unknown> }

class Model {
  readonly modelName: string
  readonly priority: number               // lower migrates first
  constructor(modelName: string, priority?: number)

  static ensure(modelName: string, create: () => Model): Model
  static updateAll(sql: DbRoot, options?: MigrateOptions): Promise<void>
  static checkAll(sql: DbRoot, options?: MigrateOptions): Promise<MigrateFailure>   // dry run, rolled back
  static validateAll(sql: Db): Promise<void>

  onMigrate(db: Db, version: number): Promise<number>   // stored version (0 the first time) -> new one, never lower
  onValidate(db: Db): Promise<void>                     // throw on a mismatch

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
- `onMigrate` runs at every start and inspects the real state of the database (`hasTable`, `hasField`...). No numbered migration files.
- Models are global instances created at the import of their file. A model created after `Model.updateAll` throws.
- Built-in priorities: `GroupsModel` 10, `UsersModel` 20, `SessionsModel` 30 (application models after them).

---

## SQLite (`src/sqlite.ts`)

Same style as postgres.js. Values are always bound, never written into the SQL text.

```ts
function sqlite(path: string, options?: SqliteOptions): SqliteSql
interface SqliteOptions { readOnly?: boolean; busyTimeout?: number; cacheSize?: number /*100*/; maxTransactionMs?: number /*30 000, 0 = none*/ }

interface SqliteSql {
  <T extends readonly object[] = Row[]>(strings: TemplateStringsArray, ...values: unknown[]): Query<T>
  (value: unknown, ...columns: string[]): Helper     // identifier, in ( ), insert / update / select lists
  begin<R>(fn: (tx: SqliteTx) => R | Promise<R>, options?: BeginOptions): Promise<R>
  end(): Promise<void>
}
interface SqliteTx { /* same call signatures */ savepoint<R>(fn: (tx: SqliteTx) => R | Promise<R>): Promise<R> }

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
await sql.begin( async tx => { await tx`...`; await tx.savepoint( async sp => { ... } ) } )
```

- One connection: queries made outside a running transaction wait (FIFO). Using the root `sql` inside a transaction throws instead of blocking.
- Written: boolean → 0/1, Date → ISO text, object/array → JSON. Read back by declared column type (`boolean`, `date`/`datetime`/`timestamp`, `json`). Integers beyond `Number.MAX_SAFE_INTEGER` are refused.
- Not provided: `unsafe`, `listen`/`notify`, cursors.

Postgres: use postgres.js directly; its `sql` fits `Db` / `DbRoot`.

---

## `Access` (`src/access.ts`)

```ts
type UserRef = string | { id: string }

class Access {
  constructor(db: Db, options?: AccessOptions)          // registers GroupsModel and UsersModel
  readonly userHasAccess: (user: UserRef, right: string) => Promise<boolean>
  readonly noAccessCheck: (user: unknown) => void       // "this handler needs no right"
  readonly ungrantableGroups: (actor: UserRef, groupIds: readonly string[]) => Promise<string[]>  // groups the actor cannot give
}
interface AccessOptions { securityLog?: SecurityLog }

function rightMatches(rights: ReadonlySet<string>, right: string): boolean
function requestUser<U extends object>(user: U): U
function isAccessChecked(user: object): boolean
function noAccessCheck(user: unknown): void
```

- Rights are `"resource/action"`. Granted by the same right, by `"resource/*"`, or by `"*"`. The joker is accepted at the end only.
- Rights are cached 5 s per user (1000 users at most). Refusals go to the SecurityLog (`auth.forbidden`).
- Debug mode: a successful answer of a guarded route without `userHasAccess` or `noAccessCheck` logs `access.unchecked`.

---

## `Sessions` (`src/session.ts`)

```ts
class Sessions {
  constructor(db: Db, settings: SessionSettings, options: SessionOptions)   // registers UsersModel and SessionsModel
  readonly endPoints: EndPoints            // /login /refresh /logout /stepup: mount in an unprotected group
  readonly guard: RequestHandler             // sets req.user (SessionUser) or answers 401
  readonly stepUp: RequestHandler            // route filter: 403 "step-up required" without recent confirmation
  readonly loginLimiter: RateLimiter
  readonly refreshLimiter: RateLimiter

  readonly login: (login: string, password: string, requestId?: string) => Promise<SessionTokens>  // null if refused
  readonly create: (userId: string) => Promise<SessionTokens>      // after an external check (LDAP...)
  readonly refresh: (refreshToken: string) => Promise<SessionTokens>
  readonly logout: (refreshToken: string) => Promise<void>
  readonly revokeUser: (userId: string) => Promise<void>
  readonly loginBlockedFor: (login: string) => number              // ms to wait, 0 if allowed
  readonly grantStepUp: (req: Request) => Promise<void>            // identity checked by the application
  readonly stepUpWith: (req: Request, method: string) => Promise<boolean>
}

interface SessionSettings { accessMinutes: number; refreshMinutes: number; maxPerUser: number; stepUpMinutes: number }  // config.session
interface SessionRateLimits { loginPerMinute: number; loginFailures: number; loginFailureMinutes: number; refreshPerMinute: number }  // config.rateLimit
interface SessionOptions { rateLimit: SessionRateLimits; securityLog?: SecurityLog; stepUpVerifiers?: Record<string, StepUpVerifier> }
type StepUpVerifier = (user: SessionUser, req: Request) => Promise<boolean>
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
  readonly filter: RequestHandler // route filter keyed on req.ip: 429 + Retry-After
}
```

In memory, fixed window, 10 000 keys at most. `req.ip` follows `X-Forwarded-For` only with `trustProxy`.

---

## Workers (`src/workers.ts`)

Worker side, in the single entry file `workers.ts` (built as `workers.js` next to the main script):

```ts
abstract class Worker {
  readonly name: string
  readonly instance: number
  readonly config: Config         // loaded by the main thread, frozen again
  readonly log: WorkerLog         // debug / info / warn / error / fatal, written by the main thread
  static register(name: string, cls: new () => Worker, options?: WorkerOptions): void
  post(type: string, data?: unknown): void          // to the main thread
  onStart(): unknown
  onRun(): unknown                                  // runs until the stop, beside the messages
  abstract onMessage(type: string, data: unknown): unknown   // its result answers a call
  onStop(): unknown                                 // after the end of onRun
  get signal(): AbortSignal                         // fired as soon as the stop is asked
  wait(ms: number): Promise<boolean>                // true after ms, false at once on stop
  progress(task: string | { broadcast: true }): Progress   // see Tasks
}
interface WorkerOptions { multiple?: boolean }

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
  constructor(options: WorkersOptions)                 // { config, logger, file?, tasks? }
  start(name: string, instances?: number): Promise<void>
  post(name: string, type: string, data?: unknown): void          // one instance, in turn
  broadcast(name: string, type: string, data?: unknown): void     // every instance
  call<T = unknown>(name: string, type: string, data?: unknown, timeoutMs?: number): Promise<T>  // default 30 000, none in debug
  on(name: string, type: string, handler: (data: unknown, from: WorkerInfo) => unknown): void
  list(): WorkerInfo[]
  stop(timeoutMs?: number): Promise<void>              // default config.server.shutdownMs
}
interface WorkerInfo { name: string; instance: number; threadId: number; started: Date; state: "starting" | "running" | "stopping" }
```

Lifecycle: `onStart`, then the messages (one at a time, in order) and `onRun` beside them. `workers.start` resolves after `onStart`, without waiting for `onRun`. The stop fires `signal` at once, waits for the end of `onRun`, then runs `onStop`. An error that ends `onRun` is logged (`worker.run.failed`) and ends the worker.

A periodic task:

```ts
class Backup extends Worker {
  async onRun( ) {
    while( await this.wait( 60_000 ) ) {
      ...
    }
  }
  onMessage( type: string ) { throw new Error( `backup: unknown message "${type}"` ) }
}
```

A crashed worker is not restarted: logged, removed, its calls fail, its mutexes are released. Each thread is named `name#instance` in the debugger.

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
const workers = new Workers( { config, logger, tasks } )
const api = RouteGroup.guarded( "/api", sessions.guard ).add( "/tasks", tasks )

// handler
const task = tasks.create( req.user )
workers.post( "import", "run", { task, file } )
res.status( 202 ).json( { task } )

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
- A progress left open when `onMessage` (or `onRun`) ends is closed: `done` if it succeeded, `fail( "failed" )` if it threw. A worker that dies fails its tasks (`"worker ended"`).
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
  static create(options: LoggerOptions): Logger       // { level, file?, mode? }, file null = stdout
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
  constructor(options?: SecurityLogOptions)           // { file?, mode?, extraEvents? }
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
z4js apidoc [--project=tsconfig.json] [--out=api.json]
```

Writes the OpenAPI 3 description of the routes, read from the sources by the TypeScript compiler (nothing runs). Found: groups, routes, path/query/body values with their types and options (literals only), `res.status( n )`, `new HttpError( code, message )`, known filters (guard, step-up, rate limiter), the comment above each handler. Non-literal values are reported as warnings.

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
const securityLog = new SecurityLog( { file: config.securityLog.file } )
const sql = sqlite( join( config.data, "app.db" ) )

const access = new Access( sql, { securityLog } )
const sessions = new Sessions( sql, config.session, { rateLimit: config.rateLimit, securityLog } )

await Model.updateAll( sql )
await Model.validateAll( sql )

const workers = new Workers( { config, logger } )
await workers.start( "stats" )

const api = RouteGroup.guarded( "/api", sessions.guard )
  .add( "/notes", new NotesEP( { sql, access } ) )

const auth = RouteGroup.unprotected( "/auth" )
  .add( "/", sessions.endPoints )

await serve( {
  config, logger,
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
import type { Access, Request, Response, SqliteSql } from "@r-libre/z4js"

// the routes of the notes
export class NotesEP extends EndPoints {
  constructor( private readonly deps: { sql: SqliteSql, access: Access } ) {
    super( )
    this.get( "/item/:id", this.on_item )
    this.post( "/create", this.on_create )
  }

  // one note
  async on_item( req: Request, res: Response ) {
    await this.need( req, "notes/read" )
    const id = this.paramValue( req, "id", "uuid" )
    const [note] = await this.deps.sql`select * from notes where id = ${id}`
    if( !note ) {
      throw new HttpError( 404, "unknown note" )
    }
    res.json( note )
  }

  async on_create( req: Request, res: Response ) {
    await this.need( req, "notes/write" )
    const title = this.bodyValue( req, "title", "string", { maxlength: 100, trim: true } )
    ...
    res.status( 201 ).json( { id } )
  }

  private async need( req: Request, right: string ) {
    if( !await this.deps.access.userHasAccess( req.user, right ) ) {
      throw new HttpError( 403 )
    }
  }
}
```

### Model

```ts
import { Model } from "@r-libre/z4js"
import type { Db } from "@r-libre/z4js"

// the notes table
export class NotesModel extends Model {
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
    } )
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
		"build": "x4build build --debug",
		"dev": "x4build dev",
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

### `x4.config.json`

```json
{
	"entryPoints": ["src/main.ts", "src/workers.ts"],
	"outdir": "dist",
	"external": ["bufferutil", "utf-8-validate"],
	"dev": {
		"run": "dist/main.js",
		"nodeArgs": ["--enable-source-maps"],
		"args": ["--config=env/dev.json"]
	},
	"esbuild": {
		"target": "node24",
		"banner": {
			"js": "import { createRequire as __z4Require } from 'node:module'; const require = __z4Require( import.meta.url );"
		}
	}
}
```

The banner gives `require` to the CommonJS dependencies bundled in an ESM output.

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

- Never read a request value directly (`req.body.x`, `req.params.id`, `req.query.q`): use `paramValue`, `bodyValue`, `queryValue`.
- Every handler of a guarded group calls `userHasAccess` or `noAccessCheck`. In debug mode, forgetting it logs `access.unchecked`.
- Refuse with `throw new HttpError( code, "short message" )`. Never put a value, an id from the request or an internal detail in the message.
- SQL is written with tagged templates only. Never build SQL text by concatenation.
- `req.user` is a `SessionUser` (`id`, `login`, `grps`), a copy per request.
- Rights are `"resource/action"` strings; `"resource/*"` and `"*"` grant more.
- `Config` fields are `readonly` and frozen. Never read `process.env` for settings: add a field.
- A secret is never written in the config file: the key gives the path of a file holding it (`secret()`).
- `Model.updateAll` must run after `new Access( )` and `new Sessions( )`, which register their models.
- Group prefixes and mount sub-paths have no parameters; route paths may (`/item/:id`).
- Mutex names are fixed strings, never built from data.
- `res.locals.expectedSlow` exists for `/login` only (password hashing). Do not use it elsewhere.
- `strictNullChecks` is off on purpose: test with `!v`, write no `| null` / `| undefined`.
- When an API is unclear, read the installed sources: `node_modules/@r-libre/z4js/src/`.
