# aws4-express
Middleware for validation AWS Signature V4. Implement aws v4 in your web app.

## Install


```
npm install aws4-express
```

## Use

```
import express from 'express';

const app = express();
... all required action with express middleware

app.use(awsSignMiddleware)
```

### Solution to parsed body (json, ...)

1. Your use case will be different in two way whenever you will use parsedBody on previous middleware it could be something like this:

```
import express from 'express';

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(
  express.json(),
);
```

We need use orginal Body becasue on validation every bytes counts. Thats way we need rawBody and you can achive it like this with help:

```
import express from 'express';
import { rawBody } from 'aws4-express';

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(
  express.json({
    verify: rawBody,
  }),
);
```

This handler fill req.headers['x-raw-body'] with raw Body.

Or just inline call:

```
import express from 'express';
import { rawBody } from 'aws4-express';

app.use(
  express.json({
    verify: (req, _, buf, encoding) => {
      if (buf && buf.length) {
        req.headers['x-raw-body'] = buf.toString((encoding as BufferEncoding) || 'utf8') ?? '';
      }
    },
  }),
);
```

2. When you use

// TODO

```
import express from 'express';
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(
  express.raw(),
);
```



## Limitations:

- [x] Library will generally validate aws4 request and custom implementations based on this standard.
- [x] A lot of implementation is simplified becasue you implement your custom web app and often for instance you don't need quirks included into S3. You can override any custom behaviour with your need at configuration app.use().
-[x] you can use region and service, request type known as 'aws4_request' in your needs there isn't constraint.
- [x] At this moment we can validate request based on http headers.
- [ ] If you need validate request similar to S3 presigned url => PR
- [ ] At this moment we also dont implement X-Amz-Expires in header (soon will be included) => PR


