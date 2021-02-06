import * as template from '../payloads/apigwy2-stub.json';
import * as _ from 'lodash';
import { IncomingHttpHeaders } from 'http';

interface payloadType {
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
      method: 'POST' | 'GET' | 'PUT' | 'HEAD';
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
  private data: payloadType = _.cloneDeep(template) as payloadType;

  constructor() {
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

  public set headers(headers: IncomingHttpHeaders) {
    const newHeaders = {} as { [key: string]: string };
    for (const [key, value] of Object.entries(headers)) {
      newHeaders[key] = value as string;
    }
  }

  public set cookies(cookies: any) {
    this.data.cookies = [];
    if (cookies === undefined) return;
    for (const value of cookies) {
      this.data.cookies.push(value);
    }
  }

  public set queryString(value: string) {
    this.data.rawQueryString = value;
  }

  public set body(value: string) {
    this.data.body = value;
  }

  public get request(): payloadType {
    return this.data;
  }
}
