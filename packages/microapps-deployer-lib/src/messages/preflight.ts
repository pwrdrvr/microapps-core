import { IDeployVersionRequestBase } from './deploy-version';
import { IDeployerResponse } from './deployer';

/**
 * Represents a Deploy Version Preflight Request
 */
export interface IDeployVersionPreflightRequest extends IDeployVersionRequestBase {
  readonly type: 'deployVersionPreflight';

  /**
   * Retrieve S3 upload credentials
   *
   * @default true
   */
  readonly needS3Creds?: boolean;
}

/**
 * Represents a Deploy Version Preflight Response
 */
export interface IDeployVersionPreflightResponse extends IDeployerResponse {
  /**
   * Used to indicate which capabilities are available on this deployer
   */
  readonly capabilities?: { readonly createAlias: string };

  /**
   * S3 upload URL for the staging bucket
   */
  readonly s3UploadUrl?: string;

  /**
   * Temporary credentials for S3 upload to the staging bucket
   */
  readonly awsCredentials?: {
    readonly accessKeyId: string;
    readonly secretAccessKey: string;
    readonly sessionToken: string;
  };
}
