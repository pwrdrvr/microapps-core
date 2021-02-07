import express from 'express';
import request from 'request-promise-native';
import Http2Request from '../payloads/http2request';
import Http2Response from '../payloads/http2response';

export default class Proxy {
  private static HOST_AND_PORT = process.env.HOST_AND_PORT || 'localhost:9000';

  private static async ProxyInternal(req: express.Request, res: express.Response): Promise<void> {
    // Create the API Gateway2 HTTP Request payload
    const payload = Http2Request.fromExpress(req);

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
          json: true,
          //body: JSON.stringify(payload),
          body: payload,
        },
      );
      // Copy the incoming request to the upstream request
      // Then scrub headers on the response
      // Finally copy the upstream response back to the incoming response
      // req
      //   .pipe(proxyReq)
      //   .on('response', (_remoteRes) => {
      //     // NOTE: You can add/remove/modify headers here
      //     // TODO: Set the headers
      //     // TODO: Set the cookies
      //     // TODO: Extract the body and return it
      //   })
      //   .pipe(res);

      // Wait for the whole thing to finish
      // This also causes exceptions to be catchable below
      const remoteRes = await proxyReq;

      Http2Response.relayResponse(remoteRes, res);
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
