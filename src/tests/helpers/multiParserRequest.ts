import { Request as Aws4Request, Credentials as Aws4Credentials } from 'aws4';
import { AwsVerifyOptions } from '../..';
import { parsers, sendSignedRequest } from './sendSignedRequest';

export const multiParserRequest = async (
  optionsAwsVerify: AwsVerifyOptions,
  optionsAwsSigned: Aws4Request,
  aws4Credentials: Aws4Credentials,
  expectedHttpCode: number,
  afterSignedRequest?: Aws4Request,
  afterAuthorizationSignature?: string,
) => {
  await Promise.all(
    parsers
      .filter((p) => p !== 'none')
      .map(async (p) => {
        await sendSignedRequest(
          optionsAwsVerify,
          optionsAwsSigned,
          { parser: p },
          aws4Credentials,
          expectedHttpCode,
          afterSignedRequest,
          afterAuthorizationSignature,
        );
      }),
  );
};
