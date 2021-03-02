import express from 'express';
import fetch from 'node-fetch';
import Http2Request from '../payloads/http2request';
import Http2Response from '../payloads/http2response';

export default class Proxy {
  public static HOST_AND_PORT = process.env.HOST_AND_PORT || 'localhost:9000';

  private static async ProxyInternal(req: express.Request, res: express.Response): Promise<void> {
    // Create the API Gateway2 HTTP Request payload
    const payload = Http2Request.fromExpress(req);

    try {
      const upstreamRes = await fetch(
        `http://${Proxy.HOST_AND_PORT}/2015-03-31/functions/function/invocations`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        },
      );
      const upstreamResBody = await upstreamRes.json();

      console.info(`Proxy: got a remote response ${upstreamRes.status} for ${req.url}`);

      Http2Response.relayResponse(upstreamResBody, res);
    } catch (e) {
      try {
        console.log(`Caught Exception: ${JSON.stringify(e)}`);
        if (!res.headersSent) {
          res.status(500).send('Failed');
        } else {
          res.socket?.destroy();
        }
      } catch (e2) {
        console.log(`Caught 2nd Exception: ${JSON.stringify(e2)}`);
      }
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
