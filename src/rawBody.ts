import { IncomingMessage, ServerResponse } from 'http';

export const rawBody = (req: IncomingMessage, _res: ServerResponse<IncomingMessage>, buf: Buffer, encoding: string) => {
  if (buf && buf.length) {
    req.headers['x-raw-body'] = buf.toString((encoding as BufferEncoding) || 'utf8') ?? '';
  }
};
