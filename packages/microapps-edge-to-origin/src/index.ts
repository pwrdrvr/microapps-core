import 'source-map-support/register';
// Used by ts-convict
import 'reflect-metadata';
import type * as lambda from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { SignatureV4 } from '@aws-sdk/signature-v4';
import { Sha256 } from '@aws-crypto/sha256-browser';
import { DBManager } from '@pwrdrvr/microapps-datalib';
import { GetRoute, loadAppFrame, normalizePathPrefix } from '@pwrdrvr/microapps-router-lib';
import { signRequest, presignRequest } from './sign-request';
import { Config } from './config/config';
export { IConfigFile } from './config/config';
import Log from './lib/log';

const log = Log.Instance;
const config = Config.instance;
const normalizedPathPrefix = normalizePathPrefix(Config.instance.rootPathPrefix);
const appFrame = loadAppFrame({ basePath: __dirname });

log.info('loaded config', { config });

const buildTrigger = '2023-02-01-01';
log.info('Edge-to-origin build trigger', { buildTrigger });

let dbManager: DBManager | undefined;
let dynamoClient = new DynamoDBClient({
  maxAttempts: 8,
  region: config.originRegion,
});

export function overrideDBManager(opts: {
  dbManager: DBManager;
  dynamoClient: DynamoDBClient;
}): void {
  dbManager = opts.dbManager;
  dynamoClient = opts.dynamoClient;
}
dbManager =
  config.tableName && dynamoClient
    ? new DBManager({
        dynamoClient,
        tableName: config.tableName,
      })
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

    // eslint-disable-next-line no-console
    log.info('got request', { event, context });

    // If the origin is S3 but the path is not `/signal` then we let the request
    // flow through to S3
    if (request.origin?.s3?.domainName && request.origin?.s3?.path !== '/signal') {
      log.info('request is for S3 origin', { request });
      return request as unknown as lambda.CloudFrontResultResponse;
    }

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
    let routeType = 'api-gateway';
    if (dbManager) {
      const url = new URL(
        `https://localhost${request.uri}${request.querystring ? `?${request.querystring}` : ''}`,
      );

      const route = await GetRoute({
        dbManager,
        rawPath: event.Records[0].cf.request.uri,
        queryStringParameters: url.searchParams,
        normalizedPathPrefix,
      });

      log.info('got route info', { route });

      // Write the app iframe to start an iframe-based app
      if (route.startupType === 'iframe' && route.iFrameAppVersionPath) {
        const frameHTML = appFrame.replace('{{iframeSrc}}', route.iFrameAppVersionPath);

        log.info('returning app frame', { frameHTML });

        return {
          status: '200',
          headers: {
            'content-type': [{ key: 'Content-Type', value: 'text/html; charset=UTF-8' }],
            'cache-control': [{ key: 'Cache-Control', value: 'no-store; private' }],
          },
          body: frameHTML,
          bodyEncoding: 'text',
        };
      }

      // Handle redirect if we got one
      if (route.redirectLocation) {
        // We strip off the appver query string so Next.js won't reject the request
        return {
          status: `${route.statusCode}`,
          headers: {
            location: [{ key: 'Location', value: route.redirectLocation }],
          },
        };
      }

      if (route.statusCode && route.statusCode !== 200) {
        return {
          status: `${route.statusCode}`,
          statusDescription: route.errorMessage,
        };
      }

      // Fall through to apigwy handling if type is not url
      if (route.url && (route.type === 'url' || route.type === 'lambda-url')) {
        log.info('rewriting to url', { url: route.url });

        routeType = route.type;

        const url = new URL(route.url);

        // Set the origin host to point to the Lambda Function URL for this version
        originHost = url.hostname;
      }

      // We've got a table name to lookup targets
      // const appName = 'release';
      // const semVer = '0.2.4';

      // TODO: If there is a verion in the path, bail out of this check
      // (e.g. /app1/0.3.4/...)

      // TODO: If there is a version in a cookie for this app and the request is not
      // for the root of the app, route to the version in the cookie

      // TODO: If the path has a version in a sub-path, route to that version
      // (e.g. /app1/_next/data/0.3.4/...)

      // TODO: Rules should have the version info denormalized onto each Rule
      // to make it one hit to the DB to get the target info.

      // const rules = await Rules.Load({ dbManager, key: { AppName: appName } });

      // // Lookup the URL for this specific version (or fall through to API Gateway)
      // const version = await Version.LoadVersion({
      //   dbManager,
      //   key: { AppName: appName, SemVer: semVer },
      // });

      // Dump the info
      // log.info('rules and version', { rules, version, event });

      // TODO: Check the rule - If it points to a Function URL, then change the origin
      // to the Function URL

      // Just pass everything through to this one app
      // originHost = version?.URL;
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
    if (
      config.tableName ||
      (config.replaceHostHeader && originHost) ||
      routeType === 'lambda-url' ||
      routeType === 'url'
    ) {
      request.headers['host'] = [{ key: 'Host', value: originHost }];
    }

    // Overwrite the origin
    // https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-examples.html#lambda-examples-content-based-routing-examples
    if (request.origin?.custom?.domainName) {
      request.origin = { ...request.origin };
      request.origin.custom.domainName = originHost;
    } else {
      request.origin = {
        custom: {
          domainName: originHost,
          keepaliveTimeout: 5,
          port: 443,
          protocol: 'https',
          readTimeout: 30,
          sslProtocols: ['TLSv1.2'],
          customHeaders: {},
          path: '',
        },
      };
    }

    // Remove the appver query string to avoid problems with some frameworks
    request.querystring = (request.querystring ?? '').replace(/&?appver=[^&]*/, '');

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

    // log.debug('returning request', {
    //   requestToReturn,
    // });

    return requestToReturn as unknown as lambda.CloudFrontResultResponse;
  } catch (error) {
    log.error('caught exception at top level', { error });

    return {
      status: '500',
      statusDescription: 'Failed Modifying Origin Request',
    };
  }
};
