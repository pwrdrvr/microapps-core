const { basePort } = require('./test-dynamodb-config');

const port = basePort + Number(process.env.JEST_WORKER_ID || 1);
process.env.MOCK_DYNAMODB_PORT = String(port);
process.env.MOCK_DYNAMODB_ENDPOINT = `http://localhost:${port}`;
process.env.AWS_ACCESS_KEY_ID ||= 'access-key';
process.env.AWS_SECRET_ACCESS_KEY ||= 'secret-key';
