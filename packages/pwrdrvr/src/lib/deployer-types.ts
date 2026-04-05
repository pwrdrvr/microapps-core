export type AppType = 'lambda' | 'lambda-url' | 'url' | 'static';

export type AppStartupType = 'iframe' | 'direct';

export interface IDeployerResponse {
  readonly statusCode: number;
  readonly errorMessage?: string;
}

export interface ICreateApplicationRequest {
  readonly type: 'createApp';
  readonly appName: string;
  readonly displayName: string;
}

export interface IDeleteVersionRequest {
  readonly type: 'deleteVersion';
  readonly appName: string;
  readonly semVer: string;
  readonly requestFromChildAccount?: boolean;
}

interface IDeployVersionRequestBase {
  readonly appName: string;
  readonly semVer: string;
  readonly overwrite?: boolean;
}

export interface IDeployVersionRequest extends IDeployVersionRequestBase {
  readonly type: 'deployVersion' | 'deployVersionLite';
  readonly appType?: AppType;
  readonly startupType?: AppStartupType;
  readonly lambdaARN?: string;
  readonly defaultFile: string;
  readonly url?: string;
}

export interface IDeployVersionPreflightRequest extends IDeployVersionRequestBase {
  readonly type: 'deployVersionPreflight';
  readonly needS3Creds?: boolean;
}

export interface IDeployVersionPreflightResponse extends IDeployerResponse {
  readonly capabilities?: { readonly createAlias: string };
  readonly s3UploadUrl?: string;
  readonly awsCredentials?: {
    readonly accessKeyId: string;
    readonly secretAccessKey: string;
    readonly sessionToken: string;
  };
}

export interface ILambdaAliasRequest extends IDeployVersionRequestBase {
  readonly type: 'lambdaAlias';
  readonly lambdaARN: string;
}

export interface ILambdaAliasResponse extends IDeployerResponse {
  readonly type: 'lambdaAlias';
  readonly lambdaAliasARN: string;
  readonly actionTaken: 'created' | 'updated' | 'verified';
  readonly functionUrl?: string;
}
