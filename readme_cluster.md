# Running z4js: one application, one process

z4js runs an application in **one Node process**. This is a design choice, not an
oversight: it keeps the framework small, keeps SQLite usable as a full backend, and
removes a whole class of distributed bugs. This page says what that means, what breaks
if you ignore it, and how a multi-instance mode could be added later without costing
anything to the light setup.

## What lives in the process

Several parts of z4js keep their state in memory. They are only correct when every
request of the application reaches the same process:

| State | Used for |
|---|---|
| `RateLimiter` counters | `/login`, `/refresh`, failed logins per account, the per-IP limit of the groups |
| `TicketStore` | the one-time tickets that open a WebSocket in a guarded group |
| `Channel` sockets | broadcasting to the connected clients (live events) |
| `Tasks` | the progress of the long tasks of the workers |
| `Workers` | the worker threads, one set per process |
| `Mutex` | locks shared by the threads of the process (`SharedArrayBuffer`) |
| session cache (5 s) | the guard does not query the database at every request |
| SQLite connection | a single connection with its own queue of queries and transactions |

What is **not** in memory: the sessions themselves (stored in the database) and the
data of the models.

## What breaks with several instances

Do not run two instances of the same application (load balancer, `pm2 -i`,
`node:cluster`). Nothing would fail loudly, but:

- **rate limits are multiplied** by the number of instances: brute force on `/login`
  becomes N times faster;
- **WebSocket tickets fail** whenever the `POST` and the socket reach different
  instances;
- **live events and task progress** only reach the clients connected to the instance
  that produced them;
- **workers run once per instance**: a worker that drives a machine would drive it
  twice, concurrently;
- **mutexes do not lock** across instances;
- **the session cache diverges**: a revoked session may still pass on another instance
  for 5 s, and a step-up granted on one instance may be refused on the next request;
- **SQLite**: two processes on the same file each have their own queue and end in
  `database is locked` errors.

## SQLite: always one process

The SQLite setup is the ultra-light mode of z4js (small projects, desktop). It stays
single-process by nature and will never pay for anything else: no extra code, no extra
dependency.

## Refusing a second instance (planned)

A second instance should fail at startup instead of running silently with weakened
protections:

- SQLite: an exclusive lock on the database file (`locking_mode = EXCLUSIVE`, to be
  validated with WAL and `checkAll`);
- Postgres: an advisory lock taken at startup on a connection kept open.

## A multi-instance mode (not planned until needed)

If an application one day needs several web instances, the shared state would move to
Postgres, behind an **optional module** (for instance `@r-libre/z4js/cluster`). An
application that does not import it ships none of it (`sideEffects: false`); the core
keeps its in-memory implementation unchanged.

| Part | With Postgres |
|---|---|
| login limits, failed logins | counters in a table (one query per attempt) |
| per-IP limit of the groups | stays local, divided by the number of instances (anti-DoS, approximate) |
| WebSocket tickets | a table, consumed atomically (`delete ... returning`) |
| live events, task progress, session invalidation | `LISTEN/NOTIFY` (identifiers only, not durable) |
| mutexes | advisory locks |
| workers bound to a machine | one holder per worker name (advisory lock), with automatic failover |

The hard part is **calling a worker that runs on another instance**. The clean answer
is to separate the roles: stateless web instances, and one worker service, linked by a
durable queue in the database (the planned `Spool`).

No abstraction is written for this mode before a real application needs it.