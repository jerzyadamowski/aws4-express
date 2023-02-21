import sinon from 'sinon';
import { Headers } from '../headers';
import {
  getExample,
  postExample,
  getAwsVerifyOptionsExample,
  getCredentialsExample,
  credentialsPairsExample,
} from './helpers/exampleData';
import { multiParserRequest } from './helpers/multiParserRequest';

describe('awsVerify', () => {
  let sandbox: sinon.SinonSandbox;
  let clock: sinon.SinonFakeTimers;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    clock = sinon.useFakeTimers(new Date('2023-01-01T00:00:00Z'));
  });

  afterEach(() => {
    sandbox.restore();
    clock.restore();
  });

  after(() => {});

  it('should validate GET request with aws4 signature', async () => {
    const optionsAwsVerify = getAwsVerifyOptionsExample();
    const optionsAwsSigned = getExample();
    const credentials = getCredentialsExample();

    await multiParserRequest(optionsAwsVerify, optionsAwsSigned, credentials, 200);
  });

  it('should validate POST request with aws4 signature', async () => {
    const optionsAwsVerify = getAwsVerifyOptionsExample();
    const optionsAwsSigned = postExample();
    const credentials = getCredentialsExample();

    await multiParserRequest(optionsAwsVerify, optionsAwsSigned, credentials, 200);
  });

  it('should validate PUT request with aws4 signature', async () => {
    const optionsAwsVerify = getAwsVerifyOptionsExample();
    const optionsAwsSigned = postExample();
    const credentials = getCredentialsExample();

    await multiParserRequest(optionsAwsVerify, optionsAwsSigned, { ...credentials }, 200);
  });

  it('should validate DELETE request with aws4 signature', async () => {
    const optionsAwsVerify = getAwsVerifyOptionsExample();
    const optionsAwsSigned = postExample();
    const credentials = getCredentialsExample();

    await multiParserRequest(optionsAwsVerify, optionsAwsSigned, credentials, 200);
  });

  it('should validate GET request with aws4 signature with credentials available on server side', async () => {
    const optionsAwsVerify = getAwsVerifyOptionsExample();
    const options = getExample();
    const keys = Object.keys(credentialsPairsExample).map((k) => ({
      accessKey: k,
      secretKey: credentialsPairsExample[k],
    }));
    await Promise.all(
      keys.map((k) =>
        multiParserRequest(optionsAwsVerify, options, { accessKeyId: k.accessKey, secretAccessKey: k.secretKey }, 200),
      ),
    );
  });

  it('should validate GET request with aws4 signature with reversed querystring', async () => {
    const optionsAwsVerify = getAwsVerifyOptionsExample();
    const options = getExample({
      path: '/get?z=1&y=1000&x=test&s=1000',
    });
    const credentials = getCredentialsExample({});

    await multiParserRequest(optionsAwsVerify, options, credentials, 200);
  });

  it('should not validate request with aws4 signature incorrect credentials', async () => {
    const optionsAwsVerify = getAwsVerifyOptionsExample();
    const options = getExample();

    await multiParserRequest(optionsAwsVerify, options, { accessKeyId: 'xyz', secretAccessKey: 'test' }, 401);
    await multiParserRequest(optionsAwsVerify, options, { accessKeyId: 'test', secretAccessKey: 'test1' }, 401);
    await multiParserRequest(optionsAwsVerify, options, { accessKeyId: '1', secretAccessKey: '2' }, 401);
    await multiParserRequest(optionsAwsVerify, options, { accessKeyId: '1', secretAccessKey: undefined }, 401);
  });

  it('should validate request with aws4 body unsigned with UNSIGNED-PAYLOAD', async () => {
    const optionsAwsVerify = getAwsVerifyOptionsExample();
    const optionsAwsSigned = postExample({
      headers: { ...postExample().headers, 'x-amz-content-sha256': 'UNSIGNED-PAYLOAD' },
    });
    const credentials = getCredentialsExample();

    await multiParserRequest(optionsAwsVerify, optionsAwsSigned, credentials, 200);
  });

  it('should validate request with aws4 with time greater than now', async () => {
    const optionsAwsVerify = getAwsVerifyOptionsExample();
    const optionsAwsSigned = postExample({
      headers: { ...postExample().headers, [Headers.XAmzExpires]: '60', [Headers.XAmzDate]: '20230202T000000Z' },
    });
    const credentials = getCredentialsExample();

    await multiParserRequest(optionsAwsVerify, optionsAwsSigned, credentials, 200);
  });

  it('should validate request with aws4 with time equal now', async () => {
    const optionsAwsVerify = getAwsVerifyOptionsExample();
    const optionsAwsSigned = postExample({
      headers: { ...postExample().headers, [Headers.XAmzExpires]: '60', [Headers.XAmzDate]: '20230101T000100Z' },
    });
    const credentials = getCredentialsExample();

    await multiParserRequest(optionsAwsVerify, optionsAwsSigned, credentials, 200);
  });

  it('should not validate request with aws4 with time lesser than now', async () => {
    const optionsAwsVerify = getAwsVerifyOptionsExample();
    const optionsAwsSigned = postExample({
      headers: { ...postExample().headers, [Headers.XAmzExpires]: '60', [Headers.XAmzDate]: '20220101T000000Z' },
    });
    const credentials = getCredentialsExample();

    await multiParserRequest(optionsAwsVerify, optionsAwsSigned, credentials, 401);
  });

  it('should validate request with aws4 on ignore validation', async () => {
    const optionsAwsVerify = getAwsVerifyOptionsExample({
      enabled: () => false,
    });
    const optionsAwsSigned = postExample();
    const credentials = getCredentialsExample();

    await multiParserRequest(optionsAwsVerify, optionsAwsSigned, credentials, 200);
  });

  it('should validate request with aws4 when original host was replaced by routers inside your network', async () => {
    const optionsAwsVerify = getAwsVerifyOptionsExample({
      headers: (headers) => {
        headers.host = headers['x-forwarded-host'];
        return headers;
      },
    });
    const optionsAwsSigned = postExample();
    const credentials = getCredentialsExample();
    const afterSignedRequest = {
      ...optionsAwsSigned,
      host: 'nginx.local.corporate.router',

      headers: {
        ...optionsAwsSigned.headers,
        host: 'nginx.local.corporate.router',
        'x-forwarded-host': optionsAwsSigned.host,
      },
    };

    await multiParserRequest(optionsAwsVerify, optionsAwsSigned, credentials, 200, afterSignedRequest);
  });

  it('should not validate request with aws4 with replaced host', async () => {
    const optionsAwsVerify = getAwsVerifyOptionsExample({});
    const optionsAwsSigned = postExample();
    const credentials = getCredentialsExample();
    const afterSignedRequest = {
      ...optionsAwsSigned,
      host: 'nginx.local.corporate.router',
      headers: {
        ...optionsAwsSigned.headers,
        host: 'nginx.local.corporate.router',
        'x-forwarded-host': optionsAwsSigned.host,
      },
    };

    await multiParserRequest(optionsAwsVerify, optionsAwsSigned, credentials, 401, afterSignedRequest);
  });

  it('should not validate request with incorrect authorization header', async () => {
    const optionsAwsVerify = getAwsVerifyOptionsExample({});
    const optionsAwsSigned = postExample();
    const credentials = getCredentialsExample();

    const strangeAuthorizationHeaders = [
      'AWS4-HMAC-SHA256 Credential=xyz/20230208/eu-central-1/execute-api/aws4_request, SignedHeaders=accept-encoding;cache-control;content-length;content-type;host;user-agent;x-amz-date, Signature=0230022437e5f1b668997ede2e55d4b00c7a3af802d000a2788d7b3c057503a4',
      'AWS4-HMAC-SHA256 Credential=test/2011/us-east-1/execute-api/aws4_request, SignedHeaders=accept-encoding;cache-control;content-length;content-type;host;user-agent;x-amz-date, Signature=0230022437e5f1b668997ede2e55d4b00c7a3af802d000a2788d7b3c057503a4',
      'AWS4-HMAC-SHA256',
      'AWS4-HMAC-SHA256 Credential=xyz',
      'AWS4-HMAC-SHA256 Credential=xyz/20230208',
      'AWS4-HMAC-SHA256 Credential=xyz/20230208/eu-central-1',
      'AWS4-HMAC-SHA256 Credential=xyz/20230208/eu-central-1/execute-api',
      'AWS4-HMAC-SHA256 Credential=xyz/20230208/eu-central-1/execute-api/aws4_request',
      'AWS4-HMAC-SHA256 Credential=xyz/20230208/eu-central-1/execute-api/aws4_request, SignedHeaders=accept-encoding;cache-control',
    ];

    await Promise.all(
      strangeAuthorizationHeaders.map(
        async (modifiedAuthorization) =>
          await multiParserRequest(
            optionsAwsVerify,
            optionsAwsSigned,
            credentials,
            401,
            undefined,
            modifiedAuthorization,
          ),
      ),
    );
  });

  it('should not validate request with aws4 onBeforeParse when limit api', async () => {
    const optionsAwsVerify = getAwsVerifyOptionsExample({
      onBeforeParse: (_req, res, _next) => {
        res.status(429).send('Api limit');
        return false;
      },
    });
    const optionsAwsSigned = postExample();
    const credentials = getCredentialsExample();

    await multiParserRequest(optionsAwsVerify, optionsAwsSigned, credentials, 429);
  });

  it('should not validate request with aws4 onAfterParse when limit api', async () => {
    const optionsAwsVerify = getAwsVerifyOptionsExample({
      onAfterParse: (_message, _req, res, _next) => {
        res.status(429).send('Api limit');
        return false;
      },
    });
    const optionsAwsSigned = postExample();
    const credentials = getCredentialsExample();

    await multiParserRequest(optionsAwsVerify, optionsAwsSigned, credentials, 429);
  });
  it('should not validate request with aws4 onSuccess something goes wrong and need to notify user', async () => {
    const optionsAwsVerify = getAwsVerifyOptionsExample({
      onSuccess: (_message, _req, res, _next) => {
        res.status(500).send('Server error');
        // next('Server error');
      },
    });
    const optionsAwsSigned = postExample();
    const credentials = getCredentialsExample();

    await multiParserRequest(optionsAwsVerify, optionsAwsSigned, credentials, 500);
  });
  it('should not validate request with aws4 onExpired header', async () => {
    const optionsAwsVerify = getAwsVerifyOptionsExample({
      onExpried: (_req, res, _next) => {
        res.status(408).send('Request expired.');
      },
    });
    const optionsAwsSigned = postExample({
      headers: { ...postExample().headers, [Headers.XAmzExpires]: '60', [Headers.XAmzDate]: '20220101T000000Z' },
    });
    const credentials = getCredentialsExample();

    await multiParserRequest(optionsAwsVerify, optionsAwsSigned, credentials, 408);
  });
  it('should not validate request with aws4 missing authorization and xAmzDate', async () => {
    const optionsAwsVerify = getAwsVerifyOptionsExample({
      onMissingHeaders: (_req, res, _next) => {
        res.status(417).send('Expectation failed');
      },
    });
    const optionsAwsSigned = postExample();
    const credentials = getCredentialsExample();
    const afterSignedRequest = {
      ...optionsAwsSigned,
      headers: {
        ...optionsAwsSigned.headers,
        'X-Amz-Date': '',
      },
    };

    await multiParserRequest(optionsAwsVerify, optionsAwsSigned, credentials, 417, afterSignedRequest, '');
  });
  it('should not validate request with aws4 mismatch signature', async () => {
    const optionsAwsVerify = getAwsVerifyOptionsExample({
      onSignatureMismatch: (_req, res, _next) => {
        res.status(400).send('Invalid Signature');
      },
    });
    const optionsAwsSigned = postExample();
    const credentials = getCredentialsExample();

    const authorization =
      'AWS4-HMAC-SHA256 Credential=test/2011/us-east-1/execute-api/aws4_request, SignedHeaders=accept-encoding;cache-control;content-length;content-type;host;user-agent;x-amz-date, Signature=0230022437e5f1b668997ede2e55d4b00c7a3af802d000a2788d7b3c057503a4';

    await multiParserRequest(optionsAwsVerify, optionsAwsSigned, credentials, 400, undefined, authorization);
  });
});
