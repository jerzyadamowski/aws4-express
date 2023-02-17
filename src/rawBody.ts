import { IncomingMessage, ServerResponse } from 'http';
import { NextFunction, Request, Response } from 'express';
import { Headers } from './headers';

export interface RequestRB extends Request {
  rawBody: string;
}

export interface IncomingMessageRB extends IncomingMessage {
  rawBody: string;
}

export const rawBodyFromVerify = (req: IncomingMessageRB, _res: ServerResponse, buf: Buffer, encoding: string) => {
  if (buf && buf.length && !req.headers[Headers.XAmzContentSha256]) {
    req.rawBody = buf.toString((encoding as BufferEncoding) || 'utf8') ?? '';
  }
};

export const rawBodyFromStream = (req: Request, _res: Response, next: NextFunction) => {
  (req as RequestRB).rawBody = '';

  if (req.headers[Headers.XAmzContentSha256]) {
    next();
  }
  req.setEncoding('utf8');

  req.on('data', (chunk) => {
    (req as RequestRB).rawBody += chunk;
  });

  req.on('end', () => {
    next();
  });
};
