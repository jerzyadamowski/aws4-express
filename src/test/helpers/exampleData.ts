import { Request as Aws4Request, Credentials as Aws4Credentials } from 'aws4';
import { AwsVerifyOptions } from '../../awsSignature';
import { Headers } from '../../headers';

const awsOptions = {
  service: 'execute-api',
  region: 'eu-central-1',
};

export const credentialsPairsExample: Record<string, string> = {
  xyz: 'xyz',
  test: 'test',
  test1: 'test1',
  test2: 'test2',
  test3: 'test3',
};

export const getAwsVerifyOptionsExample = (sampleData: Partial<AwsVerifyOptions> = {}): AwsVerifyOptions =>
  Object.assign<AwsVerifyOptions, Partial<AwsVerifyOptions>>(
    {
      secretKey: (message) => credentialsPairsExample[message.accessKey],
    },
    sampleData,
  );

export const getCredentialsExample = (sampleData: Partial<Aws4Credentials> = {}): Aws4Credentials =>
  Object.assign<Aws4Credentials, Partial<Aws4Credentials>>(
    {
      accessKeyId: 'xyz',
      secretAccessKey: 'xyz',
    },
    sampleData,
  );

export const getExample = (sampleData: Partial<Aws4Request> = {}): Aws4Request =>
  Object.assign<Aws4Request, Partial<Aws4Request>>(
    {
      region: awsOptions.region,
      service: awsOptions.service,
      host: 'my.web.domain.xyz.123567890',
      path: '/query/test?id=testvalue',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip',
        [Headers.XAmzDate]: '20230201T065635Z',
        header: 'value',
      },
    },
    sampleData,
  );

export const postExample = (sampleData: Partial<Aws4Request> = {}): Aws4Request =>
  Object.assign<Aws4Request, Partial<Aws4Request>>(
    {
      region: awsOptions.region,
      service: awsOptions.service,
      host: 'my.web.domain.xyz.123567890',
      path: '/command/test?id=testvalue&val1=1&val2=2',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip',
        [Headers.XAmzDate]: '20230201T065635Z',
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
    },
    sampleData,
  );
