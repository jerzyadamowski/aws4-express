# aws4-express

[![npm version](https://img.shields.io/npm/v/aws4-express.svg)](https://www.npmjs.com/package/aws4-express)
[![Known Vulnerabilities](https://snyk.io/test/npm/aws4-express/badge.svg)](https://snyk.io/test/npm/aws4-express)

This library is about to create on security layer of your API using well defined comunication standard known as AWS Signature V4.

We provide Express middleware handler `awsVerify` for validation your `AWS Signature V4` with your access and secret pair of key. So, your web app can mimic AWS services, and you can use benefits from already well-defined standard to securing your web API.

At this moment, library is based on general version of aws4 signature:
[Authenticating Requests (AWS Signature Version 4)](https://docs.aws.amazon.com/AmazonS3/latest/API/sig-v4-authenticating-requests.html)

### Beta stage
Until we hit >=1.x.x, there could be possible breaking changes on minor changes.
Use at least 0.8.0 version.

## Requirements
- Node.js >= 24.x

## Install


```shell
npm install aws4-express
```

## 🚀 Quick Start: Secure Your API in 3 Steps

Imagine you have a secret club (your API). To get in, you need a secret password (AWS Signature V4).

### Step 1: The Keys 🔑
You manage your own keys. Let's say you have a user with:
- **Access Key ID**: `MY_COOL_KEY`
- **Secret Access Key**: `MY_SUPER_SECRET`

### Step 2: The Server (The Bouncer) 🛡️
Your Express app needs to know how to check these keys.

```typescript
// app.ts
import express from 'express';
import { awsVerify, rawBodyFromVerify } from 'aws4-express';

const app = express();

// 1. Important: We need the raw body to check the signature!
app.use(express.json({ verify: rawBodyFromVerify }));

// 2. Add the security middleware
app.use(awsVerify({
  secretKey: (message) => {
    // 3. Find the secret for the incoming Access Key
    // In a real app, look this up in your DB
    if (message.accessKey === 'MY_COOL_KEY') {
      return 'MY_SUPER_SECRET';
    }
    return undefined; // Unknown key? Access denied! 🚫
  }
}));

// 4. If they pass, they get here!
app.get('/secret-club', (req, res) => {
  res.send('Welcome to the VIP area! 🎉');
});

app.listen(3000);
```

### Step 3: The Client (The Visitor) 🎫
You can't just knock. You need to sign your request.

**Using `aws4` library (Node.js client):**

```typescript
import aws4 from 'aws4';
import https from 'https';

// 1. Create the signed request options
const opts = aws4.sign({
  service: 'execute-api',
  path: '/secret-club',
  method: 'GET',
  headers: { 'Content-Type': 'application/json' }
}, {
  accessKeyId: 'MY_COOL_KEY',
  secretAccessKey: 'MY_SUPER_SECRET'
});

// 2. Send it!
https.request(opts, res => res.pipe(process.stdout)).end();
```

**Using `curl`?**
AWS Signature V4 is complex to calculate manually in `curl`. We recommend using a tool like Postman (which has "AWS Signature" auth type) or a library like `aws4`.

## Detailed Usage

There are prepared helpers to handle the original body with any changes, because if you change a single character, your request won't be valid anymore.

If you use express parsers like `express.raw()` or `express.json()` or `express.urlencoded` you can attach with handler `rawBodyFromVerify`. You can also write own stream parser or use our `rawBodyFromStream` as long as you attach `rawBody: string | Buffer` to request object.

```typescript
  import express from 'express';
  import { awsVerify, rawBodyFromVerify, rawBodyFromStream } from 'aws4-express';

  const app = express();
  // whenever you may need to get original body string and you case
  // when json parser u may use like this
  app.use(
    express.json({
      type: '*/*',
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

  // or when url encoded body u may use like this
  app.use(
    express.urlencoded({
      extended: true,
      type: '*/*',
      verify: rawBodyFromVerify,
    }),
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

## Example:

- [simpleIntegration.ts](/src/examples/simpleIntegration.ts)

## Features:

- [x] General implementation standard: aws4 signature.
- [x] Fully customized.
- [x] No strict rules on services, regions you can name it as you want as long your signing client support this.
- [x] Single chunk request
- [x] Tests with client: [aws4](https://www.npmjs.com/package/aws4)
- [ ] Query headers x-amz-*,
- [ ] Multiple chunks (no x-amz-decoded-content-length)

## Supported headers:

- `authorization` - [required] must have in proper format: **Authorization: AWS4-HMAC-SHA256
Credential=`ACCESS_KEY`/`DATE`/`REGION`/`SERVICE`/`TYPE_REQUEST`,
SignedHeaders=< SIGNED_HEADERS>,
Signature=`SIGNATURE`** :
  * `ACCESS_KEY` - any text without whitespaces and slashes (/) - Only have to do is handle distribution of access_key, secret_key and these keys have to be accessible on the server side.
  * `DATE` - is part of X-AMZ-DATE: in format YYYYMMDD.
  * `REGION` - any thing you need in this place or use something from [amz regions](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.RegionsAndAvailabilityZones.html).
  * `SERVICE` - any thing you need in this place or 'execute-api' for sake of simplicity.
  * `TYPE_REQUEST` - you can use your variations instead  of standard 'aws4_request'.
  * `SIGNED_HEADERS` - all signed headers - more headers mean harder to temper request. Required headers at this moment: *host:x-amz-date*
  * `SIGNATURE` - calculated signature based on [Authenticating Requests (AWS Signature Version 4)](https://docs.aws.amazon.com/AmazonS3/latest/API/sig-v4-authenticating-requests.html)
- `x-amz-date` - [required] must have in request to valid request signature
- `x-amz-content-sha256` - [optional] you can attach precalculated hash. When X-Amz-Content-Sha256 is sent we skip calculating hash from body. This way is less secure and recommended use at least with `X-Amz-Expires`.
  * There can provide your validation whenever you want handle this header `onBeforeParse` or `onAfterParse`.
  * You can also send `UNSIGNED-PAYLOAD` instead of sha-256 signature - this cloud speed up your bigger request, but signature will be same as long as headers remain same.
  * You can put your signature (most client don't include these headers) - should be calculated in this way:
    ```
    crypto.createHash('sha256').update(data, 'utf8').digest('hex')
    ```
- `x-amz-expires` - [optional] - format: `YYYY-mm-ddTHH:MM:SS`. If you want valid your request for a period of time and don't want to reuse signature when time is up.

Pull Requests are welcome.

## Documentation

# awsVerify Function Documentation

## Overview

The `awsVerify` function is an Express.js middleware that verifies AWS signatures in incoming requests.

## Usage

```javascript
import { awsVerify } from 'aws4-express';

app.use(awsVerify(options));
```

## Parameters

- `options`: An object of type `AwsVerifyOptions`

## Return Value

Returns an Express.js middleware function.

## Configuration: AwsVerifyOptions

The `AwsVerifyOptions` object can contain the following fields:

### secretKey (required)

- Type: `(message: AwsIncomingMessage, req: Request, res: Response, next: NextFunction) => Promise<string | undefined> | string | undefined`
- Description: Callback for retrieving the secret key. Should return the secret key based on incoming parameters or `undefined` if the key is not available.

### headers (optional)

- Type: `(headers: Dictionary) => Promise<Dictionary> | Dictionary`
- Description: Callback for modifying incoming headers before the parsing process.

### enabled (optional)

- Type: `(req: Request) => Promise<boolean> | boolean`
- Description: Function determining whether AWS signature validation should be performed. If it returns `false`, validation will be skipped.

### onMissingHeaders (optional)

- Type: `(req: Request, res: Response, next: NextFunction) => Promise<void> | void`
- Description: Custom response when required headers are missing.
- Default: Sends a 400 status with the message "Required headers are missing".

### onSignatureMismatch (optional)

- Type: `(req: Request, res: Response, next: NextFunction) => Promise<void> | void`
- Description: Custom response when the signature doesn't match.
- Default: Sends a 401 status with the message "The signature does not match".

### onExpired (optional)

- Type: `(req: Request, res: Response, next: NextFunction) => Promise<void> | void`
- Description: Custom response when the signature has expired.
- Default: Sends a 401 status with the message "Request is expired".

### onBeforeParse (optional)

- Type: `(req: Request, res: Response, next: NextFunction) => Promise<boolean> | boolean`
- Description: Callback invoked before the standard parser. If it returns `false`, validation will be stopped.
- Default: Always returns `true`.

### onAfterParse (optional)

- Type: `(message: AwsIncomingMessage, req: Request, res: Response, next: NextFunction) => Promise<boolean> | boolean`
- Description: Callback invoked after the standard parser completes. If it returns `false`, validation will be stopped.
- Default: Always returns `true`.

### onSuccess (optional)

- Type: `(message: AwsIncomingMessage | undefined, req: Request, res: Response, next: NextFunction) => Promise<void> | void`
- Description: Callback invoked after successful signature validation.
- Default: Calls `next()`.

## Example

```javascript
import express from 'express';
import { awsVerify, rawBodyFromVerify } from 'aws4-express';

const app = express();

app.use(express.json({ type: '*/*', verify: rawBodyFromVerify }));

app.use(awsVerify({
  secretKey: async (message) => {
    // Implement secret key retrieval logic
    return 'your_secret_key';
  },
  onSignatureMismatch: (req, res) => {
    res.status(403).send('Unauthorized');
  }
}));

app.get('/', (req, res) => {
  res.send('Hello, AWS-verified world!');
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
```

In this example, the `awsVerify` middleware is used to verify the AWS signature for all incoming requests. A custom `secretKey` function is used to provide the secret key, and `onSignatureMismatch` defines a custom response for signature mismatch cases.

### awsVerify:

#### Complete options configuration for `awsVerify`:
```typescript
express.use(awsVerify({
  secretKey: (message: AwsIncomingMessage, req: Request, res: Response, next: NextFunction) => Promise<string | undefined> | string | undefined;
  headers?: (headers: Dictionary) => Promise<Dictionary> | Dictionary;
  enabled?: (req: Request) => Promise<boolean> | boolean;
  onMissingHeaders?: (req: Request, res: Response, next: NextFunction) => Promise<void> | void;
  onSignatureMismatch?: (req: Request, res: Response, next: NextFunction) => Promise<void> | void;
  onExpired?: (req: Request, res: Response, next: NextFunction) => Promise<void> | void;
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

#### Default values for all optional configuration for `awsVerify`:
```typescript
  {
      enabled: () => true,
      headers: (req) => req.headers,
      onExpired: (res) => {
        res.status(401).send('Request is expired');
      },
      onMissingHeaders: (res) => {
        res.status(400).send('Required headers are missing');
      },
      onSignatureMismatch: (res) => {
        res.status(401).send('The signature does not match');
      },
      onBeforeParse: () => true,
      onAfterParse: () => true,
      onSuccess: () => next()
  }
```


