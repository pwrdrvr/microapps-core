/**
 * Application Type
 * - `lambda` - Lambda Function using API Gateway w/optional S3 files
 * - `lambda-url` - Lambda Function using Lambda Function URLs w/optional S3 files
 * - `url` - Any arbitrary URL
 * - `static` - Static files (only) served from S3
 */
export type AppType = 'lambda' | 'lambda-url' | 'url' | 'static';

/**
 * Application Startup Type
 * - `iframe` - Render an iframe that points to the version
 * - `direct` - Proxy directly to the version, incompatible with `static` and `apigwy` (`lambda`)
 */
export type AppStartupType = 'iframe' | 'direct';

/**
 * Represents a Base Request
 */
export interface IRequestBase {
  readonly type:
    | 'createApp'
    | 'deleteVersion'
    | 'deployVersion'
    | 'deployVersionLite'
    | 'deployVersionPreflight'
    | 'getVersion'
    | 'lambdaAlias';
}

/**
 * Represents a Deployer Response
 */
export interface IResponseBase {
  readonly statusCode: number;
  readonly errorMessage?: string;
}
