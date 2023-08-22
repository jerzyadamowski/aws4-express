import crypto, { BinaryLike, KeyObject } from 'crypto';
import querystring from 'querystring';
import { NextFunction, Request, Response } from 'express';
import { Headers } from './headers';

export type Dictionary = Record<string, string | string[] | undefined>;

/**
 * Middleware configuration
 */
export interface AwsVerifyOptions {
  /**
   * Callback for secretKey. You have to provide process to get proper secret or return undefined secret.
   *
   * @param message { AwsIncomingMessage }
   * @param req { Request }
   * @param res { Response }
   * @param next { NextFunction }
   * @returns { Promise<string | undefined> | string | undefined } - Should return secretKey on incoming parameters - but if secret is missing which it will be normal case when someone want to guess - you should return undefined;
   */
  secretKey: (
    message: AwsIncomingMessage,
    req: Request,
    res: Response,
    next: NextFunction,
  ) => Promise<string | undefined> | string | undefined;
  /**
   * Callback for changes in incoming headers before it goes through parse process. Help to more sophisticated changes to preserve proper headers.
   *
   * @param headers { Dictionary }
   * @returns { Promise<Dictionary> | Dictionary } - Should return fixed incoming headers
   */
  headers?: (headers: Dictionary) => Promise<Dictionary> | Dictionary;
  /**
   * You can skip aws signature validation.
   *
   * @param req { Request }
   * @returns { Promise<boolean> | boolean } If return false will skip aws validation and go to next middleware.
   */
  enabled?: (req: Request) => Promise<boolean> | boolean;
  /**
   * Custom response on header missing. Validation stops here. Default value `onMissingHeaders: () => {
          res.status(400).send('Required headers are missing');
        },`
   *
   * @param req { Request }
   * @param res { Response }
   * @param next { NextFunction }
   * @returns { Promise<void> | void }
   */
  onMissingHeaders?: (req: Request, res: Response, next: NextFunction) => Promise<void> | void;
  /**
   * Custom response on signature mismatch. Validation stops here. Default value `onSignatureMismatch: () => {
          res.status(401).send('The signature does not match');
        },`
   *
   * @param req { Request }
   * @param res { Response }
   * @param next { NextFunction }
   * @returns { Promise<void> | void }
   */
  onSignatureMismatch?: (req: Request, res: Response, next: NextFunction) => Promise<void> | void;
  /**
   * Custom response on exired time signature. Validation stops here. Default value `onExpired: () => {
          res.status(401).send('Request is expired');
        },`
   *
   * @param req { Request }
   * @param res { Response }
   * @param next { NextFunction }
   * @returns  { Promise<void> | void }
   */
  onExpired?: (req: Request, res: Response, next: NextFunction) => Promise<void> | void;
  /**
   * Custom callback before standard parser comes. On false validation stops here. Default value `onBeforeParse: () => true,`
   *
   * @param req { Request }
   * @param res { Response }
   * @param next { NextFunction }
   * @returns  { Promise<boolean> | boolean } Should return true if you need to let parse request further.
   */
  onBeforeParse?: (req: Request, res: Response, next: NextFunction) => Promise<boolean> | boolean;
  /**
   * Custom callback after standard parser done. On false validation stops here. Default value `onAfterParse: () => true,`
   *
   * @param message { AwsIncomingMessage }
   * @param req { Request }
   * @param res { Response }
   * @param next { NextFunction }
   * @returns  { Promise<boolean> | boolean } Should return true if you need to let parse request further.
   */
  onAfterParse?: (
    message: AwsIncomingMessage,
    req: Request,
    res: Response,
    next: NextFunction,
  ) => Promise<boolean> | boolean;
  /**
   * Last callback after when validation signature is done. You can even stop here process. Default value `onSuccess: () => next()`. Dont forget to return next or next(error) or your validation hangs here.
   *
   * @param req { Request }
   * @param res { Response }
   * @param next { NextFunction }
   * @returns  { Promise<void> | void }
   */
  onSuccess?: (
    message: AwsIncomingMessage | undefined,
    req: Request,
    res: Response,
    next: NextFunction,
  ) => Promise<void> | void;
}

/**
 * Parsed Incomming Message
 */
export interface AwsIncomingMessage {
  /**
   * Incoming authorization headers string. Required.
   */
  authorization: string;
  /**
   * DateTime from incoming header. Required.
   */
  xAmzDate: string;
  /**
   * Additional header to set message exiration time even if signature message is valid. Optional.
   */
  xAmzExpires?: number;
  /**
   * Sha256 + formated hex for body. Empty body has own bodyHash. If there is no need to sign body for performance reason you can put UNSIGNED-PAYLOAD in request headers['x-amz-content-sha256'].
   */
  bodyHash: string;
  /**
   * Request path: /..
   */
  path: string;
  /**
   * Query params as key value dictionary;
   */
  query?: Dictionary;
  /**
   * Http method.
   */
  method: string;
  /**
   * accessKey used to sign this message.
   */
  accessKey: string;
  /**
   * Date used in authorization header.
   */
  date: string;
  /**
   * Region used in authorization header. Here can be any value.
   */
  region: string;
  /**
   * Service used in authorization header. Here can be any value.
   */
  service: string;
  /**
   * For aws4 will be aws4_request. Here can be any value.
   */
  requestType: string;
  /**
   * List of signed headers separated with semicolon.
   */
  signedHeaders: string;
  /**
   * Formated encoded header paris.
   */
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
        onExpired: () => {
          res.status(401).send('Request is expired');
        },
        onMissingHeaders: () => {
          res.status(400).send('Required headers are missing');
        },
        onSignatureMismatch: () => {
          res.status(401).send('The signature does not match');
        },
        onBeforeParse: () => true,
        onAfterParse: () => true,
        onSuccess: () => next(),
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

      return this.options.onSuccess?.(this?.message, req, res, next);
    } catch (error) {
      return next(error);
    }
  };

  protected parse = async (req: Request, res: Response, next: NextFunction) => {
    if (!this.options) {
      throw new Error('Missing options setup');
    }

    if (!(await this.options.onBeforeParse?.(req, res, next))) {
      return false;
    }

    // Get the AWS signature v4 headers from the request
    const authorization = req.header(Headers.Authorization);
    const xAmzDate = req.header(Headers.XAmzDate);
    const xAmzExpires = Number(req.header(Headers.XAmzExpires));
    const contentSha256 = req.header(Headers.XAmzContentSha256);
    const bodyHash = contentSha256 || this.hash((req as any).rawBody ?? '');
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
      return await this.options.onExpired?.(req, res, next);
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

    this.secretKey = await this.options.secretKey(this.message, req, res, next);
    if (!this.secretKey) {
      await this.options.onSignatureMismatch?.(req, res, next);
      return false;
    }

    if (!(await this.options.onAfterParse?.(this.message, req, res, next))) {
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
    if (!this.message || !this.secretKey) {
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
