export interface IRequestBase {
  type: 'createApp' | 'deployVersion' | 'deployVersionPreflight';
}

export interface ICreateApplicationRequest extends IRequestBase {
  type: 'createApp';
  appName: string;
  displayName: string;
}

export interface IDeployVersionRequestBase extends IRequestBase {
  appName: string;
  semVer: string;
}

export interface IDeployVersionPreflightRequest extends IDeployVersionRequestBase {
  type: 'deployVersionPreflight';
}

export interface IDeployVersionRequest extends IDeployVersionRequestBase {
  type: 'deployVersion';
  lambdaARN: string;
  defaultFile: string;
}

export interface IDeployerResponse {
  statusCode: number;
}

export interface IDeployVersionPreflightResponse extends IDeployerResponse {
  s3UploadUrl?: string;
  awsCredentials?: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken: string;
  };
}
