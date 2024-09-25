import { NextFunction, Request, Response } from 'express';

export const rawBodyFromVerify = (req: any, _res: any, buf: Buffer, encoding: string) => {
  req.rawBody = buf.toString((encoding as BufferEncoding) || 'utf8') ?? '';
};

export const rawBodyFromStream = (req: Request & { rawBody: string }, _res: Response, next: NextFunction) => {
  if (req.rawBody) {
    return next();
  }

  req.rawBody = '';

  req.setEncoding('utf8');

  req.on('data', (chunk) => {
    (req as any).rawBody += chunk;
  });

  req.on('end', () => {
    next();
  });

  req.on('error', () => {
    next();
  });
};
