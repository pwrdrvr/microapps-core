import * as _ from 'lodash';
import express from 'express';

//
// API Gateway payloads are defined here:
// https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html
//

interface Http2ResponseType {
  cookies: string[];
  isBase64Encoded: boolean;
  statusCode: number;
  headers: { [key: string]: string };
  body?: string;
}

const binaryMimeTypes = new Set<string>([
  'application/octet-stream',
  'image/bmp',
  'image/jpeg',
  'image/gif',
  'image/vnd.microsoft.icon',
  'image/png',
  'image/svg+xml',
  'image/tiff',
  'image/webp',
]);

export default class Http2Response {
  public static relayResponse(nestedResponse: Http2ResponseType, res: express.Response) {
    res.status(nestedResponse.statusCode);

    if (nestedResponse.headers !== undefined) {
      for (const [key, value] of Object.entries(nestedResponse.headers)) {
        // Don't write content-length, let express do that
        if (key === 'content-length') {
          continue;
        }
        res.setHeader(key, value);
      }
    }
    if (nestedResponse.cookies !== undefined) {
      for (const cookie of nestedResponse.cookies) {
        res.setHeader('Set-Cookie', cookie);
      }
    }
    if (nestedResponse.body !== undefined) {
      // For binary mime types we want to decode the base64 response just like
      // API Gateway will do for configured mime types.

      const contentType = nestedResponse.headers['content-type'];
      if (contentType !== undefined) {
        const mainType = contentType.split(';');
        if (binaryMimeTypes.has(mainType[0])) {
          // TODO: Decode the base64 encoded response
          const binaryBody = Buffer.from(nestedResponse.body, 'base64');
          res.send(binaryBody);
          return;
        }
      }

      res.send(nestedResponse.body);
    } else {
      res.send();
    }
  }
}
