/**
 * This example simplifies the integration of the aws4-express middleware into an express application.
 * It demonstrates how to use the awsVerify middleware to authorize incoming requests.
 * The example uses the express.json() middleware to parse the incoming request body.
 * NOTE: aws4 is pretty strict about incoming request headers, so you may need to adjust the headers in your requests.
 * NOTE: the code in this example is for demonstration purposes only and should not be used in production.
 */

import express from 'express';
import { sign } from 'aws4';
// FIX ME: change to aws4-express
import { awsVerify, rawBodyFromStream, rawBodyFromVerify } from '../index'; // 'aws4-express';

const app = express();
// whenever you may need to get original body string and you case
// when json parser u may use like this
app.use(
  express.json({
    verify: rawBodyFromVerify,
  }),
);

app.use(rawBodyFromStream);

const getMySecretByKey = (key: string) => {
  // fetch secret key from your storage key/secret pairs (sql, nosql, memory)
  // you have to provide your own secret provider here.
  // retrun string | undefined
  const yourSecretsStorage: Record<string, string> = {
    xyz: 'xyz',
    test: 'test',
    test1: 'test1',
    test2: 'test2',
    test3: 'test3',
  };

  return yourSecretsStorage[key];
};

// main handler to authorization incomming requests:
app.use(
  awsVerify({
    enabled: (_req) => true,
    secretKey: (message, _req, _res, _next) =>
      // fetch secret key from your storage key/secret pairs (sql, nosql, memory)
      // you have to provide your own secret provider here.
      // retrun string | undefined

      getMySecretByKey(message.accessKey),
  }),
);

// your routers ...
app.all('*', (req, res, __) => {
  res.send(`${req.method} request through awsVerify middleware`);
});

if (require.main === module) {
  const port = 3000;
  const host = 'localhost';
  app.listen(port, 'localhost', async () => {
    // lets test it
    console.info('Testing...');
    // create initial request params
    const params = {
      region: 'eu-central-1',
      service: 'execute-api',
      path: '/',
      method: 'POST',
      host: `${host}:${port}`, // always and should be the same as incomming host
      headers: {
        'Content-Type': 'application/json', // always
      },
      body: JSON.stringify({ id: '123' }),
    };
    // sign params
    sign(params, {
      accessKeyId: 'xyz',
      secretAccessKey: 'xyz',
    });

    // send request wirh signed params to express server
    try {
      const response = await fetch(`http://${host}:${port}`, {
        method: 'POST',

        headers: {
          ...params.headers,
        },
        body: params.body,
      });

      console.info(`HTTP CODE: ${response.status}`);
      console.info(await response.text());
    } catch (e) {
      console.error(e);
    }
  });
  console.debug(`Server started on port ${port}`);
}
