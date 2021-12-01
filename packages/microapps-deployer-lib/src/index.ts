export interface IRequestBase {
  readonly type: 'createApp' | 'deployVersion' | 'deployVersionPreflight';
}

export interface ICreateApplicationRequest extends IRequestBase {
  readonly type: 'createApp';
  readonly appName: string;
  readonly displayName: string;
}

export interface IDeployVersionRequestBase extends IRequestBase {
  readonly appName: string;
  readonly semVer: string;
}

export interface IDeployVersionPreflightRequest extends IDeployVersionRequestBase {
  readonly type: 'deployVersionPreflight';

  /**
   * Retrieve S3 upload credentials
   *
   * @default true
   */
  readonly needS3Creds?: boolean;
}

export interface IDeployVersionRequest extends IDeployVersionRequestBase {
  readonly type: 'deployVersion';
  readonly appType?: 'lambda' | 'static';
  readonly lambdaARN?: string;
  readonly defaultFile: string;
}

export interface IDeployerResponse {
  readonly statusCode: number;
}

export interface IDeployVersionPreflightResponse extends IDeployerResponse {
  readonly s3UploadUrl?: string;
  readonly awsCredentials?: {
    readonly accessKeyId: string;
    readonly secretAccessKey: string;
    readonly sessionToken: string;
  };
}