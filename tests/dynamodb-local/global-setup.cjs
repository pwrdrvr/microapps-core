const { spawn, execFileSync } = require('node:child_process');
const { existsSync, mkdirSync, writeFileSync } = require('node:fs');
const { resolve } = require('node:path');
const net = require('node:net');

module.exports = async () => {
  const directory = resolve(process.env.DYNAMODB_LOCAL_DIR || '.local/dynamodb-local');
  if (!existsSync(resolve(directory, 'DynamoDBLocal.jar'))) {
    mkdirSync(directory, { recursive: true });
    const response = await fetch(
      'https://s3.us-west-2.amazonaws.com/dynamodb-local/dynamodb_local_latest.tar.gz',
    );
    if (!response.ok) throw new Error(`DynamoDB Local download failed: ${response.status}`);
    const archive = resolve(directory, 'archive.tar.gz');
    writeFileSync(archive, Buffer.from(await response.arrayBuffer()));
    execFileSync('tar', ['-xzf', archive, '-C', directory]);
  }
  const port = await new Promise((resolvePort, reject) => {
    const server = net.createServer();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolvePort(port));
    });
  });
  const child = spawn(
    'java',
    [
      `-Djava.library.path=${resolve(directory, 'DynamoDBLocal_lib')}`,
      '-jar',
      resolve(directory, 'DynamoDBLocal.jar'),
      '-inMemory',
      '-port',
      String(port),
      '-disableTelemetry',
    ],
    { cwd: directory, stdio: ['ignore', 'ignore', 'pipe'] },
  );
  let failure;
  let stderr = '';
  child.on('error', (error) => {
    failure = error;
  });
  child.stderr.on('data', (data) => {
    stderr += data;
  });
  global.__microappsDynamoDB = child;
  process.env.MOCK_DYNAMODB_ENDPOINT = `http://127.0.0.1:${port}`;
  try {
    for (let attempt = 0; attempt < 200; attempt++) {
      if (failure) throw failure;
      if (child.exitCode !== null) throw new Error(`DynamoDB Local exited: ${stderr}`);
      const ready = await new Promise((resolveReady) => {
        const socket = net.connect(port, '127.0.0.1');
        socket.once('connect', () => {
          socket.destroy();
          resolveReady(true);
        });
        socket.once('error', () => {
          socket.destroy();
          resolveReady(false);
        });
      });
      if (ready) return;
      await new Promise((resolveWait) => setTimeout(resolveWait, 100));
    }
    throw new Error(`DynamoDB Local did not start: ${stderr}`);
  } catch (error) {
    child.kill();
    throw error;
  }
};
