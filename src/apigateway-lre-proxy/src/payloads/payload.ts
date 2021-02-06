import * as template from '../payloads/apigwy2-stub.json';
import * as _ from 'lodash';
import express from 'express';

interface PayloadType {
  version: string;
  routeKey: string;
  rawPath: string;
  rawQueryString: string;
  cookies: string[];
  headers: { [key: string]: string };
  queryStringParameters: { [key: string]: string };
  requestContext: {
    accountId: string;
    apiId: string;
    authentication: {
      clientCert: {
        clientCertPem: string;
        subjectDN: string;
        issuerDN: string;
        serialNumber: string;
        validity: {
          notBefore: string;
          notAfter: string;
        };
      };
    };
    authorizer: {
      jwt: {
        claims: { [key: string]: string | undefined | string[] };
        scopes: string[];
      };
    };
    domainName: string;
    domainPrefix: string;
    http: {
      method: string; // 'POST' | 'GET' | 'PUT' | 'HEAD';
      path: string;
      protocol: 'HTTP/1.1';
      sourceIp: string;
      userAgent: string;
    };
    requestId: string;
    routeKey: string;
    stage: string;
    time: string;
    timeEpoch: Number;
  };
  body: string;
  pathParameters: { [key: string]: string };
  isBase64Encoded: boolean;
  stageVariables: { [key: string]: string };
}

export default class Payload {
  private data: PayloadType = _.cloneDeep(template) as PayloadType;

  constructor() {
    // Lodash seems to put this copy in default
    delete (this.data as any).default;

    this.data.cookies = [];
    this.data.headers = {};

    this.path = '';

    this.data.queryStringParameters = {};
    this.data.rawQueryString = '';
    this.data.pathParameters = {};
    this.data.stageVariables = {};
  }

  public set path(value: string) {
    this.data.rawPath = value;
    this.data.requestContext.http.path = value;
  }

  // public set headers(headers: IncomingHttpHeaders) {
  //   const newHeaders = {} as { [key: string]: string };
  //   for (const [key, value] of Object.entries(headers)) {
  //     newHeaders[key] = value as string;
  //   }
  // }

  public set cookies(cookies: any) {
    this.data.cookies = [];
    if (cookies === undefined) return;
    for (const value of cookies) {
      this.data.cookies.push(value);
    }
  }

  public set queryString(value: string) {
    if (value !== undefined && value !== null) {
      this.data.rawQueryString = value;
    } else {
      this.data.rawQueryString = '';
    }
  }

  public set body(value: string) {
    this.data.body = value;
  }

  public static fromExpress(req: express.Request): PayloadType {
    const payload = new Payload();

    payload.path = req.path;

    // Copy headers into payload
    payload.data.headers = _.cloneDeep(req.headers) as { [key: string]: string };
    if (payload.data.headers['content-length'] !== undefined) {
      delete payload.data.headers['content-length'];
    }

    // Copy cookies into payload
    payload.cookies = _.cloneDeep(req.cookies);

    // Set the query string
    // @ts-expect-error
    payload.queryString = req._parsedUrl.query;

    // Copy in the method
    payload.data.requestContext.http.method = req.method;

    // Copy in the body
    if (req.body !== undefined) {
      payload.data.body = JSON.stringify(req.body);
    }

    return payload.data;
  }

  public get request(): PayloadType {
    return this.data;
  }
}
