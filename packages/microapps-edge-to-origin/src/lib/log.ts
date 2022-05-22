import { LambdaLog } from 'lambda-log';

export default class Log {
  public static Instance = new LambdaLog({
    silent: process.env.JEST_WORKER_ID !== undefined,
  });
}
