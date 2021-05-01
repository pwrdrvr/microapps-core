import { LambdaLog } from 'lambda-log';

export default class Log {
  public static Instance = new LambdaLog();
}
