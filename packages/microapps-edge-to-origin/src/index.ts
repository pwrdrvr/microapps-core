import 'source-map-support/register';
// Used by ts-convict
import 'reflect-metadata';
import type * as lambda from 'aws-lambda';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { SignatureV4 } from '@aws-sdk/signature-v4';
import { Sha256 } from '@aws-crypto/sha256-browser';
import { signRequest, presignRequest } from './sign-request';
import { Config } from './config/config';
import Log from './lib/log';

const log = Log.Instance;
const config = Config.instance;

log.info('loading config', { config });

// TODO: get the target region from the config file

// NOTE: signing requires that we know the target region so R53 names with balancing
// across regions is not supported.  We could instead modify the target
// origin in this function to send to the region closest to this edge location.

const lambdaSigner = new SignatureV4({
  credentials: defaultProvider(),
  // This is the region of the target service
  region: config.originRegion || 'us-east-2',
  service: 'lambda',
  sha256: Sha256,
});

const executeApiSigner = new SignatureV4({
  credentials: defaultProvider(),
  // This is the region of the target service
  region: config.originRegion || 'us-east-2',
  service: 'execute-api',
  sha256: Sha256,
});

export const handler: lambda.CloudFrontRequestHandler = async (
  event: lambda.CloudFrontRequestEvent,
  context: lambda.Context,
): Promise<lambda.CloudFrontResultResponse> => {
  const request = event.Records[0].cf.request;
  try {
    let requestToReturn = request;

    // Add x-forwarded-host before signing
    if (config.addXForwardedHostHeader && request.headers['host']) {
      // Overwrite to prevent spoofed value from getting through
      request.headers['x-forwarded-host'] = [
        {
          key: 'X-Forwarded-Host',
          value: request.headers['host'][0].value,
        },
      ];
    }

    // Replace the Host header with the target origin host
    // This prevents API Gateway and Function URLs from rejecting
    // the request when the OriginRequestPolicy is forwarding all
    // headers to the origin
    if (config.replaceHostHeader && request.origin?.custom?.domainName) {
      request.headers['host'] = [{ key: 'host', value: request.origin.custom.domainName }];
    }

    // Lambda Function URLs cannot have a custom domain name
    // Function URLs will always contain `.lambda-url.`
    // API Gateway URLs can contain '.execute-api.' but will not
    // when customized, so we can only rely on the Lambda URL check.
    const signer = request.origin?.custom?.domainName.includes('.lambda-url.')
      ? lambdaSigner
      : executeApiSigner;
    if (config.signingMode === 'sign') {
      log.info('signing request');
      const signedRequest = await signRequest(request, context, signer);
      requestToReturn = signedRequest;
    } else if (config.signingMode === 'presign') {
      // TODO: presign does not quite work yet
      log.error('presign not yet implemented');
      const presignedRequest = await presignRequest(request, context, signer);
      requestToReturn = presignedRequest;
    } else {
      log.info('not signing request');
    }

    log.info('returning request', {
      requestToReturn,
    });

    return requestToReturn as unknown as lambda.CloudFrontResultResponse;
  } catch (error) {
    log.error('caught exception at top level', { error });

    return {
      status: '500',
      statusDescription: 'Failed Modifying Origin Request',
    };
  }
};
