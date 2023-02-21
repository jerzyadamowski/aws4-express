import { NextFunction, Request, Response } from 'express';

export const rawBodyFromVerify = (req: any, _res: any, buf: Buffer, encoding: string) => {
  req.rawBody = buf.toString((encoding as BufferEncoding) || 'utf8') ?? '';
};

export const rawBodyFromStream = (req: Request, _res: Response, next: NextFunction) => {
  (req as any).rawBody = '';

  req.setEncoding('utf8');

  req.on('data', (chunk) => {
    (req as any).rawBody += chunk;
  });

  req.on('end', () => {
    next();
  });
};
