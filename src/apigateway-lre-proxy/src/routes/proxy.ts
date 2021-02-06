import express from 'express';
import request from 'request-promise-native';
import Payload from '../payloads/payload';

export default class Proxy {
  private static HOST_AND_PORT = process.env.HOST_AND_PORT;

  private static async ProxyInternal(req: express.Request, res: express.Response): Promise<void> {
    // Create the API Gateway2 HTTP Request payload
    const payload = new Payload();
    payload.path = req.path;

    // Copy headers into payload
    payload.headers = req.headers;

    // Copy cookies into payload
    payload.cookies = req.cookies;

    // Set the query string
    // @ts-expect-error
    payload.queryString = req._parsedUrl.query;

    // Copy the body in
    payload.body = req.body;

    try {
      const proxyReq = request(
        `http://${Proxy.HOST_AND_PORT}/2015-03-31/functions/function/invocations`,
        {
          followRedirect: false,
          // Prevent 404 from throwing
          simple: false,
          headers: {
            'Content-Type': 'application/json',
          },
          // resolveWithFullResponse: true,
          method: 'POST',
        },
      );
      // Copy the incoming request to the upstream request
      // Then scrub headers on the response
      // Finally copy the upstream response back to the incoming response
      req
        .pipe(proxyReq)
        .on('response', (_remoteRes) => {
          // NOTE: You can add/remove/modify headers here
          // TODO: Set the headers
          // TODO: Set the cookies
          // TODO: Extract the body and return it
        })
        .pipe(res);

      // Wait for the whole thing to finish
      // This also causes exceptions to be catchable below
      await proxyReq;
    } catch (e) {
      console.error(`Caught Exception: ${JSON.stringify(e)}`);
      if (!res.headersSent) {
        res.status(500).send('Failed');
      } else {
        res.socket?.destroy();
      }

      req.destroy();
    }
  }

  public static async ProxyRequest(req: express.Request, res: express.Response): Promise<void> {
    try {
      // Wait for the whole thing to finish
      // This also causes exceptions to be catchable below
      await Proxy.ProxyInternal(req, res);
    } catch (e) {
      console.error(`Caught Exception: ${JSON.stringify(e)}`);
      if (!res.headersSent) {
        res.status(500).send('Failed');
      } else {
        res.socket?.destroy();
      }
    }
  }
}
