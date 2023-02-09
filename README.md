# aws4-express
Express middleware handlers for validation AWS Signature V4. Your web app can mimic aws services and you can use benefit from already well defined standard to securing web API.


At this moment library is based on general version of aws4 signature:
[Authenticating Requests (AWS Signature Version 4)](https://docs.aws.amazon.com/AmazonS3/latest/API/sig-v4-authenticating-requests.html)

## Install


```shell
npm install aws4-express
```

## Use

There are prepare helpers to handle original body with any changes, because if you change single character your request wont be valid any more.

If you use express parsers like `express.raw()` or `express.json()` you can attach with handler `rawBodyFromVerify`. You can also write own stream parser or use our `rawBodyFromStream`.

**Don't mix express.json(), express.raw() or custom parser togheter in single configuration** - example below show different way to achive to pull out raw body.



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
  app.use(awsVerify);

  // your routers ...
  app.all('*', ...);
  app.get('/get', ...);
  app.post('/post', ...);

  return app;
```

## Features:

- [x] General implementation standard: aws4 signature.
- [p] Fully customized.
- [x] No strict rules on services, regions you can name it as you want as long your signing client support this.
- [x] Single chunk request
- [x] Tests with client: [aws4](https://www.npmjs.com/package/aws4)
- [ ] Query headers x-amz,
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
  * **TYPE_REQUEST** - you can use here any your variations instead  of standard 'aws4_request'.
  * **SIGNED_HEADERS** - all signed headers - more included harder to temper request. Required headers at this moment: *host:x-amz-date*
  * **SIGNATURE** - calculated signature based on [Authenticating Requests (AWS Signature Version 4)](https://docs.aws.amazon.com/AmazonS3/latest/API/sig-v4-authenticating-requests.html)
- `x-amz-date` - must have in request to valid request signature
- `x-amz-content-sha256` - [optional] you can attach this kind header and remove all bodyRaw readers.
  * You can also send **UNSIGNED-PAYLOAD** instead of sha-256 signature - this cloud speed up your bigger request but signature will be same as long as headers remain same.
  * You can put your signature (most client dont include this headers) - should be calculated in this way:
    ```
    crypto.createHash('sha256').update(data, 'utf8').digest('hex')
    ```
  * When you set this header in your request bodyParser wont read rawbody beacuse this is redundant information. Literally this means skip body calculation hash because i got body hash for you in this header.
- `x-amz-expires` - [optional] if you want to valid you request for period of time and dont want to reuse signature when time is up.

Pull Request are welcome.

## Documentation

### awsVerify:



