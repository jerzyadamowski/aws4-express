import express, { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { sign, Request as Aws4Request, Credentials as Aws4Credentials } from 'aws4';
import { awsVerify, AwsVerifyOptions, rawBodyFromStream, rawBodyFromVerify } from '../..';

export type MethodTypes = 'get' | 'post' | 'put' | 'delete';

export interface ExpressAppOptions {
  parser: 'json' | 'raw' | 'custom' | 'none';
  path: string;
  testRouter: (req: Request, res: Response, next: NextFunction) => void;
}

const expressApp = (optionsAwsVerify: AwsVerifyOptions, optionsExpress: ExpressAppOptions) => {
  const routePath = optionsExpress.path.substring(0, optionsExpress.path.indexOf('?')) ?? '/';
  const app = express();
  app.use(express.urlencoded({ extended: true }));
  switch (optionsExpress.parser) {
    case 'json': {
      app.use(
        express.json({
          verify: rawBodyFromVerify,
        }),
      );
      break;
    }
    case 'raw': {
      app.use(
        express.raw({
          type: '*/*',
          verify: rawBodyFromVerify,
        }),
      );
      break;
    }
    case 'none': {
      break;
    }
    case 'custom': {
      app.use(rawBodyFromStream);
      break;
    }
    default: {
      throw new Error('Parser not implemented');
    }
  }

  app.use(awsVerify(optionsAwsVerify));
  app.all(routePath, optionsExpress.testRouter);

  return app;
};

export const sendSignedRequest = async (
  optionsAwsVerify: AwsVerifyOptions,
  optionsAwsSigned: Aws4Request,
  optionsExpress: Partial<ExpressAppOptions>,
  aws4Credentials: Aws4Credentials,
  expectedHttpCode: number,
  afterSignedRequest?: Aws4Request,
  afterAuthorizationSignature?: string,
) => {
  const signedRequest = sign(optionsAwsSigned, aws4Credentials);
  const modifiedRequest = {
    ...signedRequest,
    ...afterSignedRequest,
    headers: {
      ...signedRequest.headers,
      ...afterSignedRequest?.headers,
      ['Authorization']: afterAuthorizationSignature ?? signedRequest.headers?.Authorization,
    },
  };

  const method = optionsAwsSigned.method?.toLowerCase() ?? 'NOT IMPLEMENTED';
  await request(
    expressApp(optionsAwsVerify, {
      parser: 'json',
      path: optionsAwsSigned.path ?? '/',
      testRouter: (req, res, _next) => {
        res.send(req.query);
      },
      ...optionsExpress,
    }),
  )
    [method as MethodTypes](optionsAwsSigned.path ?? '/')
    .set(modifiedRequest.headers ?? {})
    .send(optionsAwsSigned.body)
    .expect(expectedHttpCode);

  return modifiedRequest.headers?.Authorization;
};
