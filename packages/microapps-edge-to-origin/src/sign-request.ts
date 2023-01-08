import type * as lambda from 'aws-lambda';
import { SignatureV4 } from '@aws-sdk/signature-v4';
import { cloudfrontToSignableRequest } from './translate-request';

const sigHeaders = ['authorization', 'x-amz-date', 'x-amz-security-token', 'x-amz-content-sha256'];

/**
 * Sign (headers) a request with AWS Signature V4
 * @param request
 * @param context
 * @param signer
 * @returns
 */
export async function signRequest(
  request: lambda.CloudFrontRequest,
  context: lambda.Context,
  signer: SignatureV4,
): Promise<lambda.CloudFrontRequest> {
  const httpRequest = cloudfrontToSignableRequest({ request });

  // Remove SigV4 headers before we sign because we will overwrite them
  for (const key of sigHeaders) {
    delete httpRequest.headers[key];
  }

  const signedRequest = await signer.sign(httpRequest);

  // Copy the signature headers into the request to forward to origin
  for (const key of sigHeaders) {
    request.headers[key] = [{ key: key, value: signedRequest.headers[key] }];
  }

  return request;
}

/**
 * Presign (querystring) a request with AWS Signature V4
 * @param request
 * @param context
 * @param signer
 * @returns
 */
export async function presignRequest(
  request: lambda.CloudFrontRequest,
  context: lambda.Context,
  signer: SignatureV4,
): Promise<lambda.CloudFrontRequest> {
  const httpRequest = cloudfrontToSignableRequest({ request });

  const signedRequest = await signer.presign(httpRequest);

  // Copy the signature headers into the request to forward to origin
  for (const key of sigHeaders) {
    request.headers[key] = [{ key: key, value: signedRequest.headers[key] }];
  }

  return request;
}
