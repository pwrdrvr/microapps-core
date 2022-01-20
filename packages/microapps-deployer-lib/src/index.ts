/**
 * Represents a Base Request
 */
export interface IRequestBase {
  readonly type: 'createApp' | 'deleteVersion' | 'deployVersion' | 'deployVersionPreflight';
}

/**
 * Represents a Create Application Request
 */
export interface ICreateApplicationRequest extends IRequestBase {
  readonly type: 'createApp';

  /**
   * Name of the application
   */
  readonly appName: string;

  /**
   * Display name of the application
   */
  readonly displayName: string;
}

/**
 * Represents a Deploy Version Base Request
 */
export interface IDeployVersionRequestBase extends IRequestBase {
  /**
   * Name of the application
   */
  readonly appName: string;

  /**
   * SemVer being published
   */
  readonly semVer: string;

  /**
   * Allow overwrite of existing version
   *
   * @default false;
   */
  readonly overwrite?: boolean;
}

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
 * Represents a Deploy Version Request
 */
export interface IDeployVersionRequest extends IDeployVersionRequestBase {
  readonly type: 'deployVersion';
  readonly appType?: 'lambda' | 'static';
  readonly lambdaARN?: string;
  readonly defaultFile: string;
}

/**
 * Represents a Delete Version Request
 */
export interface IDeleteVersionRequest
  extends Pick<IDeployVersionRequestBase, 'appName' | 'semVer'> {
  readonly type: 'deleteVersion';
}

/**
 * Represents a Deployer Response
 */
export interface IDeployerResponse {
  readonly statusCode: number;
}

/**
 * Represents a Deploy Version Preflight Response
 */
export interface IDeployVersionPreflightResponse extends IDeployerResponse {
  readonly s3UploadUrl?: string;
  readonly awsCredentials?: {
    readonly accessKeyId: string;
    readonly secretAccessKey: string;
    readonly sessionToken: string;
  };
}
