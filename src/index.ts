import crypto, { BinaryLike, BinaryToTextEncoding, KeyObject } from 'crypto';
import querystring from 'querystring';
import { NextFunction, Request, Response } from 'express';

const _secretKey = 'xyz';
type Dict = Record<string, string | string[] | undefined>;

export const awsSignMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get the AWS signature v4 headers from the request
    const authorization = req.header('authorization');
    const xAmzDate = req.header('x-amz-date');
    console.info(req.header('x-raw-body'));
    const bodyHash = req.header('x-amz-content-sha256') || hash(req.header('x-raw-body') ?? '');
    const url = req.url;
    const method = req.method;

    // Check if the required headers are present
    if (!authorization || !xAmzDate) {
      res.status(400).send('Required headers are missing');
      return;
    }

    // Extract the necessary information from the authorization header
    const [, credentialRaw, signedHeadersRaw, _signatureRaw] = authorization.split(/\s+/);
    const credential = /=([^,]*)/.exec(credentialRaw)?.[1] ?? ''; // credential.split('=');
    const signedHeaders = /=([^,]*)/.exec(signedHeadersRaw)?.[1] ?? '';
    const [accessKey, date, region, service, requestType] = credential.split('/');

    const sortedKeyHeaders = signedHeaders.split(';') ?? [];
    const headers = sortedKeyHeaders.reduce<Dict>((pv, cv) => {
      pv[cv] = req.headers[cv];
      return pv;
    }, {});

    const calculatedAuthorization = authHeader(
      accessKey,
      _secretKey,
      date,
      xAmzDate,
      region,
      service,
      requestType,
      signedHeaders,
      url,
      bodyHash,
      method,
      headers,
      sortedKeyHeaders,
    );

    if (calculatedAuthorization !== authorization) {
      res.status(401).send('The signature does not match');
      return;
    }

    return next();
  } catch (error) {
    return next(error);
  }
};

const encodeRfc3986 = (urlEncodedString: string) =>
  urlEncodedString.replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());

const encodeRfc3986Full = (str: string) => encodeRfc3986(encodeURIComponent(str));

const hmac = (secretKey: BinaryLike | KeyObject, data: string, encoding?: BinaryToTextEncoding | undefined) => {
  if (encoding) {
    return crypto.createHmac('sha256', secretKey).update(data, 'utf8').digest(encoding);
  } else {
    return crypto.createHmac('sha256', secretKey).update(data, 'utf8').digest();
  }
};

const hash = (data: string) => crypto.createHash('sha256').update(data, 'utf8').digest('hex');

const authHeader = (
  accessKey: string,
  secretKey: string,
  date: string,
  dateTime: string,
  region: string,
  service: string,
  requestType: string,
  signedHeaders: string,
  url: string,
  bodyHash: string,
  method: string,
  headers: Dict,
  sortedKeyHeaders: string[],
) =>
  [
    'AWS4-HMAC-SHA256 Credential=' + accessKey + '/' + credentialString(date, region, service, requestType),
    'SignedHeaders=' + signedHeaders,
    'Signature=' +
      signature(
        date,
        dateTime,
        secretKey,
        region,
        service,
        requestType,
        url,
        bodyHash,
        method,
        signedHeaders,
        headers,
        sortedKeyHeaders,
      ),
  ].join(', ');

const credentialString = (date: string, region: string, service: string, requestType: string) =>
  [date, region, service, requestType].join('/');

const signature = (
  date: string,
  dateTime: string,
  secretKey: string,
  region: string,
  service: string,
  requestType: string,
  url: string,
  bodyHash: string,
  method: string,
  signedHeaders: string,
  headers: Dict,
  sortedKeyHeaders: string[],
) => {
  const hmacDate = hmac('AWS4' + secretKey, date);
  const hmacRegion = hmac(hmacDate, region);
  const hmacService = hmac(hmacRegion, service);
  const hmacCredentials = hmac(hmacService, 'aws4_request');

  return hmac(
    hmacCredentials,
    stringToSign(
      date,
      dateTime,
      region,
      service,
      requestType,
      url,
      bodyHash,
      method,
      signedHeaders,
      headers,
      sortedKeyHeaders,
    ),
    'hex',
  );
};

const stringToSign = (
  date: string,
  dateTime: string,
  region: string,
  service: string,
  requestType: string,
  url: string,
  bodyHash: string,
  method: string,
  signedHeaders: string,
  headers: Dict,
  sortedKeyHeaders: string[],
) =>
  [
    'AWS4-HMAC-SHA256',
    dateTime,
    credentialString(date, region, service, requestType),
    hash(canonicalString(url, bodyHash, method, signedHeaders, headers, sortedKeyHeaders)),
  ].join('\n');

const canonicalString = (
  url: string,
  bodyHash: string,
  method: string,
  signedHeaders: string,
  headers: Dict,
  sortedKeyHeaders: string[],
) => {
  const { path, query } = parsePath(url);
  return [
    method,
    canonicalURI(path),
    canonicalQueryString(query),
    canonicalHeaders(sortedKeyHeaders, headers) + '\n',
    signedHeaders,
    bodyHash,
  ].join('\n');
};

const canonicalHeaders = (sortedKeyHeaders: string[], headers: Dict) => {
  const trimAll = (header: string | string[] | undefined) => header?.toString().trim().replace(/\s+/g, ' ');
  return sortedKeyHeaders.map((key) => key.toLowerCase() + ':' + trimAll(headers[key])).join('\n');
};

const parsePath = (url: string) => {
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

const canonicalQueryString = (query: Dict | undefined) => {
  if (!query) {
    return '';
  }
  const reducedQuery = Object.keys(query).reduce<Dict>((obj, key) => {
    if (!key) {
      return obj;
    }
    obj[encodeRfc3986Full(key)] = !Array.isArray(query[key]) ? query[key] : query[key];
    return obj;
  }, {});
  const encodedQueryPieces: string[] = [];
  Object.keys(reducedQuery)
    .sort()
    .forEach((key) => {
      if (!Array.isArray(reducedQuery[key])) {
        encodedQueryPieces.push(key + '=' + encodeRfc3986Full((reducedQuery[key] as string) ?? ''));
      } else {
        (reducedQuery[key] as string[])
          ?.map(encodeRfc3986Full)
          ?.sort()
          ?.forEach((val: string) => {
            encodedQueryPieces.push(key + '=' + val);
          });
      }
    });
  return encodedQueryPieces.join('&');
};

const canonicalURI = (path: string) => {
  let pathStr = path;
  if (pathStr !== '/') {
    pathStr = pathStr.replace(/\/{2,}/g, '/');
    pathStr = pathStr
      .split('/')
      .reduce((_path: string[], piece) => {
        if (piece === '..') {
          _path.pop();
        } else if (piece !== '.') {
          _path.push(encodeRfc3986Full(piece));
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
