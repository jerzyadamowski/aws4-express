import e from 'express';
import core from 'express-serve-static-core';
// import { RequestRawBody } from './requestRawBody';
// export type GetRequestHandler<T, R = unknown> = e.RequestHandler<core.ParamsDictionary, R, unknown, T>;
// export type PostRequestHandler<T, R = unknown> = e.RequestHandler<core.ParamsDictionary, R, T, unknown>;

// export type RequestBody = e.Request<core.ParamsDictionary, unknown, { rawBody: string }, core.Query>;
interface E extends core.ParamsDictionary {
  rawBody: string;
}
export type RequestBody = e.Request<E, E, E, core.Query>;
