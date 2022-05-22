import type * as lambda from 'aws-lambda';
import { HttpRequest } from '@aws-sdk/protocol-http';

const MUTABLE_HEADERS: { [key: string]: true } = {
  'x-forwarded-for': true,
  'x-amzn-trace-id': true,
};

/**
 * Convert a CloudFront request to an HTTP request that can be signed by AWS
 *
 * Note: will mutate the request.querystring if it contains un-escaped [] characters
 */
export function cloudfrontToSignableRequest(options: {
  request: lambda.CloudFrontRequest;
}): HttpRequest {
  const { request } = options;
  const { headers, method, body, querystring, uri } = request;
  // Lambda URL will reject query parameters with brackets
  // Similarly to API Gateway (maybe this feature was borrowed...)
  // https://stackoverflow.com/questions/51941139/aws-api-gateway-returns-400-error-when-square-bracket-is-in-path/51941567#51941567
  // Error modes:
  // - AWS_IAM auth enabled on the Lambda URL
  //   - 403 Forbidden
  //   - x-amzn-errortype: AccessDeniedException
  // - AWS_IAM auth disabled on the Lambda URL
  //   - 400 Bad Request
  //   - x-amzn-errortype: InvalidQueryStringException
  // CloudFront will not encode the brackets in the query string and Lambda URL will reject that request.
  // This is sufficient to get Lambda URLs to accept the requests
  // with [] characters in them.
  const fixedQueryString = querystring.replace(/\[/g, '%5B').replace(/]/g, '%5D');
  const hostname = headers['host'][0].value;
  const url = new URL(`https://${hostname}${uri}${querystring ? `?${querystring}` : ''}`);
  const headersMap: { [key: string]: string } = {};
  for (const key of Object.keys(headers)) {
    if (MUTABLE_HEADERS[key]) {
      continue;
    }
    headersMap[key] = headers[key][0].value;
  }
  const queryMap: { [key: string]: string } = {};
  for (const key of url.searchParams.keys()) {
    queryMap[key] = url.searchParams.get(key) || '';
  }

  // Clobber the query string if we had to fix some [ or ] characters
  request.querystring = fixedQueryString;

  let bodyData: Buffer | string | undefined;
  if (body && body.data && body.encoding === 'base64') {
    bodyData = Buffer.from(body.data, 'base64');
  } else if (body && body.data) {
    bodyData = body.data;
  }

  return new HttpRequest({
    headers: headersMap,
    hostname,
    method,
    port: 443,
    protocol: 'https:',
    path: request.uri,
    body: bodyData,
    query: queryMap,
  });
}
