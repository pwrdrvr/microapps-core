import 'source-map-support/register';
// Used by ts-convict
import 'reflect-metadata';
import type * as lambda from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { SignatureV4 } from '@aws-sdk/signature-v4';
import { Sha256 } from '@aws-crypto/sha256-browser';
import { DBManager, Rules, Version } from '@pwrdrvr/microapps-datalib';
import { signRequest, presignRequest } from './sign-request';
import { Config } from './config/config';
export { IConfigFile } from './config/config';
import Log from './lib/log';

const log = Log.Instance;
const config = Config.instance;

log.info('loaded config', { config });

// TODO: get the target region from the config file
const dynamoClient = config.tableName
  ? new DynamoDBClient({
      maxAttempts: 8,
    })
  : undefined;
const dbManager =
  config.tableName && dynamoClient
    ? new DBManager({ dynamoClient, tableName: config.tableName })
    : undefined;

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

    // Get the target if using direct to version routing
    // This can use API Gateway per app or Lambda per version
    // or ALBs or whatever you want (but it assumes IAM auth).
    let originHost = request.origin?.custom?.domainName;
    if (dbManager) {
      // We've got a table name to lookup targets
      const appName = 'release';
      const semVer = '0.3.4';

      // If there is no version in the path, then we need to get the default version
      // from the rules
      const rules = await Rules.Load({ dbManager, key: { AppName: appName } });

      // Lookup the URL for this specific version (or fall through to API Gateway)
      const version = await Version.LoadVersion({
        dbManager,
        key: { AppName: appName, SemVer: semVer },
      });

      originHost = 'TODO';
    }

    // Can't do anything without an origin
    if (!originHost) {
      log.error('No origin found', { request });
      return {
        status: '404',
        statusDescription: 'Origin Domain Missing',
      };
    }

    // Replace the Host header with the target origin host
    // This prevents API Gateway and Function URLs from rejecting
    // the request when the OriginRequestPolicy is forwarding all
    // headers to the origin
    if (config.tableName || (config.replaceHostHeader && originHost)) {
      request.headers['host'] = [{ key: 'host', value: originHost }];
    }

    // Lambda Function URLs cannot have a custom domain name
    // Function URLs will always contain `.lambda-url.`
    // API Gateway URLs can contain '.execute-api.' but will not
    // when customized, so we can only rely on the Lambda URL check.
    const signer = originHost.includes('.lambda-url.') ? lambdaSigner : executeApiSigner;
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
