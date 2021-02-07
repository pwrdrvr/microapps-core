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

export default class Http2Response {
  public static relayResponse(nestedResponse: Http2ResponseType, res: express.Response) {
    res.status(nestedResponse.statusCode);

    if (nestedResponse.headers !== undefined) {
      for (const [key, value] of Object.entries(nestedResponse.headers)) {
        res.setHeader(key, value);
      }
    }
    if (nestedResponse.cookies !== undefined) {
      for (const cookie of nestedResponse.cookies) {
        res.setHeader('Set-Cookie', cookie);
      }
    }
    if (nestedResponse.body !== undefined) {
      res.send(nestedResponse.body);
    } else {
      res.send();
    }
  }
}
