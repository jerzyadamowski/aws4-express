import sinon from 'sinon';
import { Headers } from '../headers';
import { getExample, postExample, getAwsVerifyOptionsExample, getCredentialsExample } from './helpers/exampleData';
import { sendSignedRequest } from './helpers/sendSignedRequest';

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

    await sendSignedRequest(optionsAwsVerify, optionsAwsSigned, { parser: 'raw' }, credentials, 200);
    await sendSignedRequest(optionsAwsVerify, optionsAwsSigned, { parser: 'json' }, credentials, 200);
    await sendSignedRequest(optionsAwsVerify, optionsAwsSigned, { parser: 'custom' }, credentials, 200);
  });

  it('should validate POST request with aws4 signature', async () => {
    const optionsAwsVerify = getAwsVerifyOptionsExample();
    const optionsAwsSigned = postExample();
    const credentials = getCredentialsExample();

    await sendSignedRequest(optionsAwsVerify, optionsAwsSigned, { parser: 'raw' }, credentials, 200);
    await sendSignedRequest(optionsAwsVerify, optionsAwsSigned, { parser: 'json' }, credentials, 200);
    await sendSignedRequest(optionsAwsVerify, optionsAwsSigned, { parser: 'custom' }, credentials, 200);
  });

  it('should validate PUT request with aws4 signature', async () => {
    const optionsAwsVerify = getAwsVerifyOptionsExample();
    const optionsAwsSigned = postExample();
    const credentials = getCredentialsExample();

    await sendSignedRequest(optionsAwsVerify, optionsAwsSigned, { parser: 'raw' }, { ...credentials }, 200);
    await sendSignedRequest(optionsAwsVerify, optionsAwsSigned, { parser: 'json' }, { ...credentials }, 200);
    await sendSignedRequest(optionsAwsVerify, optionsAwsSigned, { parser: 'custom' }, { ...credentials }, 200);
  });

  it('should validate DELETE request with aws4 signature', async () => {
    const optionsAwsVerify = getAwsVerifyOptionsExample();
    const optionsAwsSigned = postExample();
    const credentials = getCredentialsExample();

    await sendSignedRequest(optionsAwsVerify, optionsAwsSigned, { parser: 'raw' }, credentials, 200);
    await sendSignedRequest(optionsAwsVerify, optionsAwsSigned, { parser: 'json' }, credentials, 200);
    await sendSignedRequest(optionsAwsVerify, optionsAwsSigned, { parser: 'custom' }, credentials, 200);
  });

  it('should validate GET request with aws4 signature with credentials available on server side', async () => {
    const optionsAwsVerify = getAwsVerifyOptionsExample();
    const options = getExample();

    await sendSignedRequest(
      optionsAwsVerify,
      options,
      { parser: 'raw' },
      { accessKeyId: 'test1', secretAccessKey: 'test1' },
      200,
    );
    await sendSignedRequest(
      optionsAwsVerify,
      options,
      { parser: 'json' },
      { accessKeyId: 'test2', secretAccessKey: 'test2' },
      200,
    );
    await sendSignedRequest(
      optionsAwsVerify,
      options,
      { parser: 'custom' },
      { accessKeyId: 'test3', secretAccessKey: 'test3' },
      200,
    );
  });

  it('should validate GET request with aws4 signature with reversed querystring', async () => {
    const optionsAwsVerify = getAwsVerifyOptionsExample();
    const options = getExample({
      path: '/get?z=1&y=1000&x=test&s=1000',
    });
    const credentials = getCredentialsExample({});

    await sendSignedRequest(optionsAwsVerify, options, { parser: 'raw' }, credentials, 200);
    await sendSignedRequest(optionsAwsVerify, options, { parser: 'json' }, credentials, 200);
    await sendSignedRequest(optionsAwsVerify, options, { parser: 'custom' }, credentials, 200);
  });

  it('should not validate request with aws4 signature incorrect credentials', async () => {
    const optionsAwsVerify = getAwsVerifyOptionsExample();
    const options = getExample();

    await sendSignedRequest(
      optionsAwsVerify,
      options,
      { parser: 'raw' },
      { accessKeyId: 'xyz', secretAccessKey: 'test' },
      401,
    );
    await sendSignedRequest(
      optionsAwsVerify,
      options,
      { parser: 'json' },
      { accessKeyId: 'test', secretAccessKey: 'test1' },
      401,
    );
    await sendSignedRequest(
      optionsAwsVerify,
      options,
      { parser: 'custom' },
      { accessKeyId: '1', secretAccessKey: '2' },
      401,
    );
  });

  it('should validate request with aws4 body unsigned with UNSIGNED-PAYLOAD', async () => {
    const optionsAwsVerify = getAwsVerifyOptionsExample();
    const optionsAwsSigned = postExample({
      headers: { ...postExample().headers, 'x-amz-content-sha256': 'UNSIGNED-PAYLOAD' },
    });
    const credentials = getCredentialsExample();

    await sendSignedRequest(optionsAwsVerify, optionsAwsSigned, { parser: 'raw' }, credentials, 200);
    await sendSignedRequest(optionsAwsVerify, optionsAwsSigned, { parser: 'json' }, credentials, 200);
    await sendSignedRequest(optionsAwsVerify, optionsAwsSigned, { parser: 'custom' }, credentials, 200);
  });

  it('should validate request with aws4 with time greater than now', async () => {
    const optionsAwsVerify = getAwsVerifyOptionsExample();
    const optionsAwsSigned = postExample({
      headers: { ...postExample().headers, [Headers.XAmzExpires]: '60', [Headers.XAmzDate]: '20230202T000000Z' },
    });
    const credentials = getCredentialsExample();

    await sendSignedRequest(optionsAwsVerify, optionsAwsSigned, { parser: 'raw' }, credentials, 200);
    await sendSignedRequest(optionsAwsVerify, optionsAwsSigned, { parser: 'json' }, credentials, 200);
    await sendSignedRequest(optionsAwsVerify, optionsAwsSigned, { parser: 'custom' }, credentials, 200);
  });

  it('should validate request with aws4 with time equal now', async () => {
    const optionsAwsVerify = getAwsVerifyOptionsExample();
    const optionsAwsSigned = postExample({
      headers: { ...postExample().headers, [Headers.XAmzExpires]: '60', [Headers.XAmzDate]: '20230101T000100Z' },
    });
    const credentials = getCredentialsExample();

    await sendSignedRequest(optionsAwsVerify, optionsAwsSigned, { parser: 'raw' }, credentials, 200);
    await sendSignedRequest(optionsAwsVerify, optionsAwsSigned, { parser: 'json' }, credentials, 200);
    await sendSignedRequest(optionsAwsVerify, optionsAwsSigned, { parser: 'custom' }, credentials, 200);
  });

  it('should not validate request with aws4 with time lesser than now', async () => {
    const optionsAwsVerify = getAwsVerifyOptionsExample();
    const optionsAwsSigned = postExample({
      headers: { ...postExample().headers, [Headers.XAmzExpires]: '60', [Headers.XAmzDate]: '20220101T000000Z' },
    });
    const credentials = getCredentialsExample();

    await sendSignedRequest(optionsAwsVerify, optionsAwsSigned, { parser: 'raw' }, credentials, 401);
    await sendSignedRequest(optionsAwsVerify, optionsAwsSigned, { parser: 'json' }, credentials, 401);
    await sendSignedRequest(optionsAwsVerify, optionsAwsSigned, { parser: 'custom' }, credentials, 401);
  });

  it('should validate request with aws4 on ignore validation', async () => {
    const optionsAwsVerify = getAwsVerifyOptionsExample({
      enabled: () => false,
    });
    const optionsAwsSigned = postExample();
    const credentials = getCredentialsExample();

    await sendSignedRequest(optionsAwsVerify, optionsAwsSigned, { parser: 'raw' }, credentials, 200);
    await sendSignedRequest(optionsAwsVerify, optionsAwsSigned, { parser: 'json' }, credentials, 200);
    await sendSignedRequest(optionsAwsVerify, optionsAwsSigned, { parser: 'custom' }, credentials, 200);
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

    await sendSignedRequest(
      optionsAwsVerify,
      optionsAwsSigned,
      { parser: 'raw' },
      credentials,
      200,
      afterSignedRequest,
    );
    await sendSignedRequest(
      optionsAwsVerify,
      optionsAwsSigned,
      { parser: 'json' },
      credentials,
      200,
      afterSignedRequest,
    );
    await sendSignedRequest(
      optionsAwsVerify,
      optionsAwsSigned,
      { parser: 'custom' },
      credentials,
      200,
      afterSignedRequest,
    );
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

    await sendSignedRequest(
      optionsAwsVerify,
      optionsAwsSigned,
      { parser: 'raw' },
      credentials,
      401,
      afterSignedRequest,
    );
    await sendSignedRequest(
      optionsAwsVerify,
      optionsAwsSigned,
      { parser: 'json' },
      credentials,
      401,
      afterSignedRequest,
    );
    await sendSignedRequest(
      optionsAwsVerify,
      optionsAwsSigned,
      { parser: 'custom' },
      credentials,
      401,
      afterSignedRequest,
    );
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
          await sendSignedRequest(
            optionsAwsVerify,
            optionsAwsSigned,
            { parser: 'raw' },
            credentials,
            401,
            undefined,
            modifiedAuthorization,
          ),
      ),
    );
  });
});
