import crypto, { BinaryLike, KeyObject } from 'crypto';
import querystring from 'querystring';
import { NextFunction, Request, Response } from 'express';
import { RequestRB } from './rawBody';
import { Headers } from './headers';

export type Dictionary = Record<string, string | string[] | undefined>;

export interface AwsVerifyOptions {
  secretKey: (
    key: string,
    message: AwsIncomingMessage,
    req: Request,
    res: Response,
    next: NextFunction,
  ) => Promise<string> | string;
  headers?: (headers: Dictionary) => Promise<Dictionary> | Dictionary;
  enabled?: (req: Request) => Promise<boolean> | boolean;
  onMissingHeaders?: (req: Request, res: Response, next: NextFunction) => Promise<void> | void;
  onSignatureMismatch?: (req: Request, res: Response, next: NextFunction) => Promise<void> | void;
  onExpried?: (req: Request, res: Response, next: NextFunction) => Promise<void> | void;
  onAfterParseValidate?: (
    message: AwsIncomingMessage,
    req: Request,
    res: Response,
    next: NextFunction,
  ) => Promise<boolean> | boolean;
}

export interface AwsIncomingMessage {
  authorization: string;
  xAmzDate: string;
  xAmzExpires?: number;
  bodyHash: string;
  path: string;
  query?: Dictionary;
  method: string;
  accessKey: string;
  date: string;
  region: string;
  service: string;
  requestType: string;
  signedHeaders: string;
  canonicalHeaders: string;
}

export class AwsSignature {
  protected message?: AwsIncomingMessage;
  protected options?: AwsVerifyOptions;
  private secretKey?: string;
  public constructor() {}

  public verify = (options: AwsVerifyOptions) => async (req: Request, res: Response, next: NextFunction) => {
    try {
      this.options = {
        enabled: () => true,
        headers: () => req.headers,
        onExpried: () => {
          res.status(401).send('Request is expired');
        },
        onMissingHeaders: () => {
          res.status(400).send('Required headers are missing');
        },
        onSignatureMismatch: () => {
          res.status(401).send('The signature does not match');
        },
        onAfterParseValidate: () => true,
        ...options,
      };

      if (await this.options.enabled?.(req)) {
        if (!(await this.parse(req, res, next))) {
          return;
        }

        const calculatedAuthorization = this.authHeader();
        if (calculatedAuthorization !== this.message?.authorization) {
          return this.options.onSignatureMismatch?.(req, res, next);
        }
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };

  protected parse = async (req: Request, res: Response, next: NextFunction) => {
    if (!this.options) {
      throw new Error('Missing options setup');
    }

    // Get the AWS signature v4 headers from the request
    const authorization = req.header(Headers.Authorization);
    const xAmzDate = req.header(Headers.XAmzDate);
    const xAmzExpires = Number(req.header(Headers.XAmzExpires));
    const contentSha256 = req.header(Headers.XAmzContentSha256);
    const bodyHash = contentSha256 || this.hash((req as RequestRB).rawBody ?? '');
    const { path, query } = this.parsePath(req.url);
    const method = req.method;

    // Check if the required headers are present
    if (!authorization || !xAmzDate) {
      return this.options.onMissingHeaders?.(req, res, next);
    }

    // Expires? use xAmzExpires [seconds] to calculate
    // if xAmzExpires not set will be ignored.
    const expired = this.expires(xAmzDate, xAmzExpires);
    if (expired) {
      return await this.options.onExpried?.(req, res, next);
    }

    // Extract the necessary information from the authorization header
    const [, credentialRaw, signedHeadersRaw, _signatureRaw] = authorization.split(/\s+/);
    const credential = /=([^,]*)/.exec(credentialRaw)?.[1] ?? ''; // credential.split('=');
    const signedHeaders = /=([^,]*)/.exec(signedHeadersRaw)?.[1] ?? '';
    const [accessKey, date, region, service, requestType] = credential.split('/');
    const incommingHeaders = this.options.headers ? await this.options.headers(req.headers) : req.headers;
    const canonicalHeaders = signedHeaders
      .split(';')
      .map((key) => key.toLowerCase() + ':' + this.trimAll(incommingHeaders[key]))
      .join('\n');

    if (
      !accessKey ||
      !bodyHash ||
      !canonicalHeaders ||
      !date ||
      !method ||
      !path ||
      !region ||
      !requestType ||
      !service ||
      !signedHeaders ||
      !xAmzDate
    ) {
      await this.options.onSignatureMismatch?.(req, res, next);
      return false;
    }

    this.message = {
      accessKey,
      authorization,
      bodyHash,
      canonicalHeaders,
      date,
      method,
      path,
      region,
      requestType,
      query,
      service,
      signedHeaders,
      xAmzDate,
      xAmzExpires,
    };

    this.secretKey = await this.options.secretKey(accessKey, this.message, req, res, next);

    if (!(await this.options.onAfterParseValidate?.(this.message, req, res, next))) {
      return false;
    }

    return true;
  };

  protected authHeader = () => {
    if (!this.message) {
      throw new Error('Missing parsed incoming message');
    }
    return [
      'AWS4-HMAC-SHA256 Credential=' + this.message.accessKey + '/' + this.credentialString(),
      'SignedHeaders=' + this.message.signedHeaders,
      'Signature=' + this.signature(),
    ].join(', ');
  };

  protected credentialString = () => {
    if (!this.message) {
      throw new Error('Missing parsed incoming message');
    }

    return [this.message?.date, this.message?.region, this.message?.service, this.message?.requestType].join('/');
  };

  protected signature = () => {
    if (!this.message) {
      throw new Error('Missing parsed incoming message');
    }

    const hmacDate = this.hmac('AWS4' + this.secretKey, this.message.date);
    const hmacRegion = this.hmac(hmacDate, this.message.region);
    const hmacService = this.hmac(hmacRegion, this.message.service);
    const hmacCredentials = this.hmac(hmacService, 'aws4_request');

    return this.hmacHex(hmacCredentials, this.stringToSign());
  };

  protected stringToSign = () => {
    if (!this.message) {
      throw new Error('Missing parsed incoming message');
    }

    return ['AWS4-HMAC-SHA256', this.message.xAmzDate, this.credentialString(), this.hash(this.canonicalString())].join(
      '\n',
    );
  };

  protected canonicalString = () => {
    if (!this.message) {
      throw new Error('Missing parsed incoming message');
    }

    return [
      this.message.method,
      this.canonicalURI(),
      this.canonicalQueryString(),
      this.message.canonicalHeaders + '\n',
      this.message.signedHeaders,
      this.message.bodyHash,
    ].join('\n');
  };

  protected parsePath = (url: string) => {
    let path = url || '/';
    if (/[^0-9A-Za-z;,/?:@&=+$\-_.!~*'()#%]/.test(path)) {
      path = encodeURI(decodeURI(path));
    }

    const queryIx = path.indexOf('?');
    let query;

    if (queryIx >= 0) {
      query = querystring.parse(path.slice(queryIx + 1));
      path = path.slice(0, queryIx);
    }

    return {
      path,
      query,
    };
  };

  protected canonicalQueryString = () => {
    if (!this.message) {
      throw new Error('Missing parsed incoming message');
    }

    if (!this.message.query) {
      return '';
    }
    const reducedQuery = Object.keys(this.message.query).reduce<Dictionary>((obj, key) => {
      if (!key) {
        return obj;
      }
      obj[this.encodeRfc3986Full(key)] = this.message?.query?.[key];
      return obj;
    }, {});
    const encodedQueryPieces: string[] = [];
    Object.keys(reducedQuery)
      .sort()
      .forEach((key) => {
        if (!Array.isArray(reducedQuery[key])) {
          encodedQueryPieces.push(key + '=' + this.encodeRfc3986Full((reducedQuery[key] as string) ?? ''));
        } else {
          (reducedQuery[key] as string[])
            ?.map(this.encodeRfc3986Full)
            ?.sort()
            ?.forEach((val: string) => {
              encodedQueryPieces.push(key + '=' + val);
            });
        }
      });
    return encodedQueryPieces.join('&');
  };

  protected canonicalURI = () => {
    if (!this.message) {
      throw new Error('Missing parsed incoming message');
    }

    let pathStr = this.message.path;
    if (pathStr !== '/') {
      pathStr = pathStr.replace(/\/{2,}/g, '/');
      pathStr = pathStr
        .split('/')
        .reduce((_path: string[], piece) => {
          if (piece === '..') {
            _path.pop();
          } else if (piece !== '.') {
            _path.push(this.encodeRfc3986Full(piece));
          }
          return _path;
        }, [])
        .join('/');
      if (pathStr[0] !== '/') {
        pathStr = '/' + pathStr;
      }
    }
    return pathStr;
  };

  protected trimAll = (header: string | string[] | undefined) => header?.toString().trim().replace(/\s+/g, ' ');

  protected encodeRfc3986 = (urlEncodedString: string) =>
    urlEncodedString.replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());

  protected encodeRfc3986Full = (str: string) => this.encodeRfc3986(encodeURIComponent(str));

  protected hmacHex = (secretKey: BinaryLike | KeyObject, data: string) =>
    crypto.createHmac('sha256', secretKey).update(data, 'utf8').digest('hex');

  protected hmac = (secretKey: BinaryLike | KeyObject, data: string) =>
    crypto.createHmac('sha256', secretKey).update(data, 'utf8').digest();

  protected hash = (data: string) => crypto.createHash('sha256').update(data, 'utf8').digest('hex');

  protected expires = (dateTime: string, expires: number | undefined): boolean => {
    if (!expires) {
      return false;
    }

    const stringISO8601 = dateTime.replace(/^(.{4})(.{2})(.{2})T(.{2})(.{2})(.{2})Z$/, '$1-$2-$3T$4:$5:$6Z');
    const localDateTime = new Date(stringISO8601);
    localDateTime.setSeconds(localDateTime.getSeconds(), expires);

    return localDateTime < new Date();
  };
}

export const awsVerify = (options: AwsVerifyOptions) => new AwsSignature().verify(options);
