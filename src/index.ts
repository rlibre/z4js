/**
 *     _____ __
 *    |__   /  / _
 *      /  /  /_| |_
 *     /  /\____   _|
 *    /_____|   |_|
 *
 * @file index.ts
 * @author Etienne Cochard
 *
 * @copyright (c) 2026 R-libre ingenierie
 *
 * Use of this source code is governed by an MIT-style license
 * that can be found in the LICENSE file or at https://opensource.org/licenses/MIT.
 **/

export { HttpError } from "./http-error";
export { Logger, SecurityLog, SECURITY_EVENTS, LOG_LEVELS } from "./logger";
export type { LogLevel, LoggerOptions, SecurityEvent, SecurityLogOptions } from "./logger";
export { Shape, ShapeError, ObjectValidator } from "./shared/shape";
export type { DateFormat } from "./shared/shape";
export * from "./tools";
export { Model, MigrationError, isInfraError } from "./model";
export type { MigrateFailure, MigrateOptions, Db, DbRoot } from "./model";
export { Access, GroupsModel, UsersModel, requestUser, isAccessChecked, rightMatches, noAccessCheck } from "./access";
export type { AccessOptions } from "./access";
export { hashPassword, verifyPassword, needsRehash } from "./password";
export { Sessions, SessionsModel } from "./session";
export type { SessionSettings, SessionOptions, SessionRateLimits, SessionUser, SessionTokens, StepUpVerifier } from "./session";
export { RateLimiter } from "./ratelimit";
export { Config, ConfigError } from "./config";
export type { ConfigOptions, NumberOptions, FolderOptions, FileOptions } from "./config";
export { sqlite, isSqlite, Query, Helper, TX_TIMEOUT_CODE } from "./sqlite";
export type { SqliteSql, SqliteTx, SqliteOptions, BeginOptions, Row, Result, ResultMeta } from "./sqlite";
export { EndPoints, RouteGroup } from "./endpoints";
export { checkPath } from "./paths";
export { Channel, WSocket, WSData, WSDataError, createUpgradeHandler } from "./ws";
export type { WSHandler, WSMessageHandler, WSOptions, WSRouteDef, UpgradeOptions, UpgradeHandler } from "./ws";
export type { Request, Response, Handler, Method, RouteDef, RouteInfo, RouteOptions } from "./endpoints";
export { createErrorHandler, notFoundHandler } from "./http-handlers";
export { Worker, Workers, WorkerHandle, Progress, runWorker } from "./workers";
export { Tasks, MAX_TASK_TEXT } from "./tasks";
export { UploadedFile } from "./uploads";
export type { FileSpec, FilesOptions } from "./uploads";
export type { TaskMessage, TaskOptions, TaskPhase, TaskReport } from "./tasks";
export type { StartOptions, WorkerLog, WorkerMessage, WorkersOptions, WorkerInfo } from "./workers";
export { Mutex, LockError } from "./mutex";
export { serve } from "./server";
export type { ServeOptions, RunningServer, StaticFolder } from "./server";
export { getParam } from "./params";
export type { ArgType, ArgTypes, ValueType } from "./params";
