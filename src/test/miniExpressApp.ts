import express, { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { sign, Request as Aws4Request, Credentials as Aws4Credentials } from 'aws4';
import { awsSignMiddleware } from '..';
import { rawBody } from '../rawBody';

type MethodTypes = 'get' | 'post' | 'put' | 'delete';
interface MiniExpressAppOptions {
  isJsonParser?: boolean;
  path?: string;
  testRouter?: (req: Request, res: Response, next: NextFunction) => void;
}

const miniExpressApp = (options: MiniExpressAppOptions) => {
  const routePath = options.path?.substring(0, options.path?.indexOf('?')) ?? '/';
  const app = express();
  app.use(express.urlencoded({ extended: true }));
  if (options.isJsonParser) {
    app.use(
      express.json({
        verify: rawBody,
      }),
    );
  } else {
    app.use(
      express.raw({
        type: '*/*',
        verify: rawBody,
      }),
    );
  }

  app.use(awsSignMiddleware);
  if (options.testRouter) {
    app.all(routePath, options?.testRouter);
  }

  return app;
};

export const sendSignedRequest = async (
  optionsAwsSigned: Aws4Request,
  optionsExpress: MiniExpressAppOptions,
  aws4Credentials: Aws4Credentials,
  expectedHttpCode: number,
) => {
  const signedRequest = sign(optionsAwsSigned, aws4Credentials);
  const method = optionsAwsSigned?.method?.toLowerCase() ?? 'NOT IMPLEMENTED';
  await request(
    miniExpressApp({
      isJsonParser: true,
      path: optionsAwsSigned.path ?? '/',
      testRouter: (req, res, _next) => {
        res.send(req.query);
      },
      ...optionsExpress,
    }),
  )
    [method as MethodTypes](optionsAwsSigned.path ?? '/')
    .set(signedRequest.headers ?? {})
    .send(optionsAwsSigned.body)
    .expect(expectedHttpCode);

  return signedRequest.headers?.Authorization;
};
