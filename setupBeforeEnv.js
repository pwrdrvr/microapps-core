// DynamoDB Local isolates databases by access key and region. Each Jest worker
// gets its own database, while suites in that worker reset their tables.
process.env.AWS_ACCESS_KEY_ID = `microappstest${process.env.JEST_WORKER_ID || '1'}`;
process.env.AWS_SECRET_ACCESS_KEY = 'local-only';
process.env.AWS_SESSION_TOKEN = '';
