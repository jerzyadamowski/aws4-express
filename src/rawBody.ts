import { NextFunction, Request, Response } from 'express';

/*
  These handler are sugested way to fill req.rawBody with data.
  You can use own with library as long as you fill req.rawBody with data.
*/

export const rawBodyFromVerify = (req: any, _res: any, buf: Buffer, _encoding: string) => {
  req.rawBody = buf;
};

export const rawBodyFromStreamEncoding =
  (encoding: BufferEncoding = 'utf8') =>
  (req: Request & { rawBody?: string }, _res: Response, next: NextFunction) => {
    if (req.rawBody) {
      return next();
    }

    req.rawBody = '';

    req.setEncoding(encoding);

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

export const rawBodyFromStream = rawBodyFromStreamEncoding('utf8');

export const rawBodyBufferFromStreamEncoding =
  (encoding: BufferEncoding = 'utf8') =>
  (req: Request & { rawBody?: Buffer }, _res: Response, next: NextFunction) => {
    if (req.rawBody) {
      return next();
    }

    const chunks: Buffer[] = [];

    req.setEncoding(encoding);

    req.on('data', (chunk: string) => {
      // Konwertujemy string na Buffer
      chunks.push(Buffer.from(chunk, encoding));
    });

    req.on('end', () => {
      req.rawBody = Buffer.concat(chunks);
      next();
    });

    req.on('error', (err) => {
      next(err);
    });
  };

export const rawBodyBufferFromStream = rawBodyBufferFromStreamEncoding('utf8');
