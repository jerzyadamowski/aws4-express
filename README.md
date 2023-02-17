# aws4-express
Express middleware handlers for validation AWS Signature V4. Your web app can mimic AWS services, and you can use benefit from already well-defined standard to securing web API.


At this moment, library is based on general version of aws4 signature:
[Authenticating Requests (AWS Signature Version 4)](https://docs.aws.amazon.com/AmazonS3/latest/API/sig-v4-authenticating-requests.html)

### Alpha stage
Until we hit >=1.x.x, there could be possible breaking changes on minor changes.
Use at least 0.5.2 version.

## Install


```shell
npm install aws4-express
```

## Use

There are prepared helpers to handle the original body with any changes, because if you change a single character, your request won't be valid anymore.

If you use express parsers like `express.raw()` or `express.json()` you can attach with handler `rawBodyFromVerify`. You can also write own stream parser or use our `rawBodyFromStream`.

**Don't mix express.json(), express.raw() or custom parser together in single configuration** - example below show different way to achieve to pull out raw body.


```typescript
  import express from 'express';
  import { awsVerify, rawBodyFromVerify, rawBodyFromStream } from 'aws4-express';

  const app = express();
  app.use(express.urlencoded({ extended: true }));

  // whenever you may need to get original body string and you case
  // when json parser u may use like this
  app.use(
    express.json({
      verify: rawBodyFromVerify,
    }),
  );

  // or when json parser u may use like this
  app.use(
    express.raw({
      type: '*/*',
      verify: rawBodyFromVerify,
    })
  );

  // or events on when json parser u may use like this
  app.use(rawBodyFromStream);

  // main handler to authorization incomming requests:
  app.use(awsVerify({
    secretKey: (message, req, res, next) => {
      // fetch secret key from your storage key/secret pairs (sql, nosql, memory)
      // you have to provide your own secret provider here.
      // retrun string | undefined

      return getMySecretByKey(message.accessKey),
    }
  }));

  // your routers ...
  app.all('*', ...);
  app.get('/get', ...);
  app.post('/post', ...);

  return app;
```

## Features:

- [x] General implementation standard: aws4 signature.
- [x] Fully customized.
- [x] No strict rules on services, regions you can name it as you want as long your signing client support this.
- [x] Single chunk request
- [x] Tests with client: [aws4](https://www.npmjs.com/package/aws4)
- [ ] Query headers x-amz-*,
- [ ] Multiple chunks (no x-amz-decoded-content-length)

## Supported headers:

- `authorization` - must have in proper format: **Authorization: AWS4-HMAC-SHA256
Credential=< ACCESS_KEY>/< DATE>/< REGION>/< SERVICE>/< TYPE_REQUEST>,
SignedHeaders=< SIGNED_HEADERS>,
Signature=< SIGNATURE>** :
  * **ACCESS_KEY** - any text without whitespaces and slashes (/) - Only have to do is handle distribution of access_key, secret_key and these keys have to be accessible on the server side.
  * **DATE** - is part of X-AMZ-DATE: in format YYYYMMDD.
  * **REGION** - any thing you need in this place or use something from [amz regions](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.RegionsAndAvailabilityZones.html).
  * **SERVICE** - any thing you need in this place or 'execute-api' for sake of simplicity.
  * **TYPE_REQUEST** - you can use your variations instead  of standard 'aws4_request'.
  * **SIGNED_HEADERS** - all signed headers - more headers mean harder to temper request. Required headers at this moment: *host:x-amz-date*
  * **SIGNATURE** - calculated signature based on [Authenticating Requests (AWS Signature Version 4)](https://docs.aws.amazon.com/AmazonS3/latest/API/sig-v4-authenticating-requests.html)
- `x-amz-date` - must have in request to valid request signature
- `x-amz-content-sha256` - [optional] you can attach this kind of header and remove all `bodyRaw` readers.
  * You can also send **UNSIGNED-PAYLOAD** instead of sha-256 signature - this cloud speed up your bigger request, but signature will be same as long as headers remain same.
  * You can put your signature (most client don't include these headers) - should be calculated in this way:
    ```
    crypto.createHash('sha256').update(data, 'utf8').digest('hex')
    ```
  * When you set this header in your request, `body parser` won't read `raw body` because this is redundant information. Literally, this means skip body calculation hash because I got body hash for you in this header.
- `x-amz-expires` - [optional] - format: `YYYY-mm-ddTHH:MM:SS`. If you want valid your request for a period of time and don't want to reuse signature when time is up.

Pull Requests are welcome.

## Documentation

```typescript
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
   * @returns { Dictionary } - Should return fixed incoming headers
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
   * Custom response on exired time signature. Validation stops here. Default value `onExpried: () => {
          res.status(401).send('Request is expired');
        },`
   *
   * @param req { Request }
   * @param res { Response }
   * @param next { NextFunction }
   * @returns  { Promise<void> | void }
   */
  onExpried?: (req: Request, res: Response, next: NextFunction) => Promise<void> | void;
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
```

### awsVerify:

```typescript
express.use(awsVerify({

  secretKey: (message: AwsIncomingMessage, req: Request, res: Response, next: NextFunction) => Promise<string> | string;
  headers?: (headers: Dictionary) => Promise<Dictionary> | Dictionary;
  enabled?: (req: Request) => Promise<boolean> | boolean;
  onMissingHeaders?: (req: Request, res: Response, next: NextFunction) => Promise<void> | void;
  onSignatureMismatch?: (req: Request, res: Response, next: NextFunction) => Promise<void> | void;
  onExpried?: (req: Request, res: Response, next: NextFunction) => Promise<void> | void;
  onBeforeParse?: (req: Request, res: Response, next: NextFunction) => Promise<boolean> | boolean;
  onAfterParse?: (
    message: AwsIncomingMessage,
    req: Request,
    res: Response,
    next: NextFunction,
  ) => Promise<boolean> | boolean;
  onSuccess?: (
    message: AwsIncomingMessage | undefined,
    req: Request,
    res: Response,
    next: NextFunction,
  ) => Promise<void> | void;
}))
```


