import express, { Express } from 'express';
import http from 'http';
import https from 'https';
import Proxy from './routes/proxy';

// Enable HTTP keep-alive (reuse of connections to services instead of 1 request / connection)
const keepAliveOptions = {
  keepAlive: true,
};
http.globalAgent = new http.Agent(keepAliveOptions);
https.globalAgent = new https.Agent(keepAliveOptions);

// Create the Express app
const app = express();

// Trust the X-Forwarded-Proto header coming from the ELB
app.enable('trust proxy');

// Setup app routes
app.get('/healthcheck', (_req, res: express.Response) => {
  // console.debug('/healthcheck - Got request');
  res.status(200).send('OK\n');
});
app.all('/*', Proxy.ProxyRequest);

// Time to listen
const port = 3000;
const server = app.listen(port, () => {
  console.info(`Listening on port: ${port}`);
});

server.headersTimeout = 120 * 1000;
server.keepAliveTimeout = 120 * 1000;

export default app;
