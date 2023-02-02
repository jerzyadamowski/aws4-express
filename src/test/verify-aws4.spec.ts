import { Request as Aws4Request, Credentials as Aws4Credentials } from 'aws4';
import { sendSignedRequest } from './miniExpressApp';

const awsOptions = {
  service: 'execute-api',
  region: 'eu-central-1',
  key: 'xyz',
  secret: 'xyz',
};

describe('awsSignMiddleware', () => {
  const credentials: Aws4Credentials = {
    accessKeyId: awsOptions.key,
    secretAccessKey: awsOptions.secret,
  };
  beforeEach(() => {});

  afterEach(() => {});

  after(() => {});

  it('should validate GET request with aws4 signature', async () => {
    const options: Aws4Request = {
      region: awsOptions.region,
      service: awsOptions.service,
      host: 'my.web.domain.xyz.123567890',
      path: '/query/test?id=testvalue',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Amz-Date': '20230201T065635Z',
        header: 'value',
      },
    };

    await sendSignedRequest(options, { isJsonParser: false }, credentials, 200);
    await sendSignedRequest(options, { isJsonParser: true }, credentials, 200);
  });

  it('should validate POST request with aws4 signature', async () => {
    const options: Aws4Request = {
      region: awsOptions.region,
      service: awsOptions.service,
      host: 'my.web.domain.xyz.123567890',
      path: '/command/test?id=testvalue&val1=1&val2=2',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Amz-Date': '20230201T065635Z',
        header: 'value',
      },
      body: JSON.stringify({
        test1: 'test1',
        test2: {
          test3: {
            test4: 'test4',
            test5: 'test5',
            test6: ['test6', 'test6'],
            test7: ['test7', 'test7', 'test7'],
          },
          test8: 'test8',
        },
        test9: 'test9',
        test10: false,
        test11: true,
      }),
    };

    await sendSignedRequest(options, { isJsonParser: false }, credentials, 200);
    await sendSignedRequest(options, { isJsonParser: true }, credentials, 200);
  });

  it('should validate PUT request with aws4 signature', async () => {
    const options: Aws4Request = {
      region: awsOptions.region,
      service: awsOptions.service,
      host: 'my.web.123567890.com',
      path: '/command/test?id=testvalue&val1=1&val2=2',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Amz-Date': '20230201T065635Z',
        header: 'value',
      },
      body: JSON.stringify({
        test1: 'test1',
        test2: {
          test3: {
            test4: 'test4',
            test5: 'test5',
            test6: ['test6', 'test6'],
            test7: ['test7', 'test7', 'test7'],
          },
          test8: 'test8',
        },
        test9: 'test9',
        test10: false,
        test11: true,
      }),
    };

    await sendSignedRequest(options, { isJsonParser: false }, { ...credentials }, 200);
    await sendSignedRequest(options, { isJsonParser: true }, { ...credentials }, 200);
  });

  it('should validate DELETE request with aws4 signature', async () => {
    const options: Aws4Request = {
      region: awsOptions.region,
      service: awsOptions.service,
      host: 'my.web.domain.xyz.123567890',
      path: '/command/test?id=testvalue&val1=1&val2=2&sdfdsfdsfs= dsfds dsf dsf dsfdsf sd',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Amz-Date': '20230201T065635Z',
        header: 'value',
      },
      body: JSON.stringify({
        test1: 'test1',
        test2: {
          test3: {
            test4: 'test4',
            test5: 'test5',
            test6: ['test6', 'test6'],
            test7: ['test7', 'test7', 'test7'],
          },
          test8: 'test8',
        },
        test9: 'test9',
        test10: false,
        test11: true,
      }),
    };

    await sendSignedRequest(options, { isJsonParser: false }, credentials, 200);
    await sendSignedRequest(options, { isJsonParser: true }, credentials, 200);
  });

  it('should validate GET request with aws4 signature with any credentials', async () => {
    const options: Aws4Request = {
      region: awsOptions.region,
      service: awsOptions.service,
      host: 'my.web.domain.xyz.123567890',
      path: '/query/test?id=testvalue',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Amz-Date': '20230201T065635Z',
        header: 'value',
      },
    };

    await sendSignedRequest(options, { isJsonParser: false }, { ...credentials, accessKeyId: 'xxxxxxx' }, 200);
    await sendSignedRequest(options, { isJsonParser: true }, { ...credentials, accessKeyId: 'yyyyyyy' }, 200);
  });
});
