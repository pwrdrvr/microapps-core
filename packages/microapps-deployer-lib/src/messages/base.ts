/**
 * Represents a Base Request
 */
export interface IRequestBase {
  readonly type: 'createApp' | 'deleteVersion' | 'deployVersion' | 'deployVersionPreflight';
}

/**
 * Represents a Deployer Response
 */
export interface IResponseBase {
  readonly statusCode: number;
}
