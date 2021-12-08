import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as lambdaNodejs from '@aws-cdk/aws-lambda-nodejs';
import * as logs from '@aws-cdk/aws-logs';
import { SharedProps } from './SharedProps';

export interface IDemoApp {
  shared: SharedProps;

  /**
   * Name of the application in microapps
   *
   * @default 'demo-app'
   */
  appName?: string;
}

export class DemoApp extends cdk.Construct {
  constructor(scope: cdk.Construct, id: string, props: IDemoApp) {
    super(scope, id);

    const { appName = 'demo-app', shared } = props;

    //
    // Lambda Function
    //
    const svc = new lambdaNodejs.NodejsFunction(this, 'app-lambda', {
      entry: './packages/demo-app/src/index.ts',
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'handler',
      functionName: `${shared.stackName}-app-${appName}${shared.envSuffix}${shared.prSuffix}`,
      logRetention: logs.RetentionDays.ONE_WEEK,
      memorySize: 512,
      timeout: cdk.Duration.seconds(3),
      bundling: {
        minify: true,
        sourceMap: true,
      },
    });

    if (shared.isPR) {
      svc.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);
    }
  }
}
