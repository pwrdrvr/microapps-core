import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { SharedTags } from './SharedTags';

/**
 * Properties to initialize an instance of `MicroAppsChildPrivStack`.
 */
export interface MicroAppsChildPrivStackProps extends StackProps {
  /**
   * Parent deployer Lambda ARN
   */
  readonly parentDeployerLambdaARN: string;

  /**
   * Child account deployer role ARNs that
   * can invoke this parent deployer Lambda
   *
   * @default []
   */
  readonly childDeployerRoleArns: string[];
}

export class MicroAppsChildPrivStack extends Stack {
  constructor(scope: Construct, id: string, props?: MicroAppsChildPrivStackProps) {
    super(scope, id, props);

    if (props === undefined) {
      throw new Error('props must be set');
    }

    SharedTags.addSharedTags(this);

    const { parentDeployerLambdaARN, childDeployerRoleArns } = props;

    if (childDeployerRoleArns.length > 0 && parentDeployerLambdaARN) {
      const deployerFunc = lambda.Function.fromFunctionArn(
        this,
        'deployer',
        parentDeployerLambdaARN,
      );
      const deployerFuncAlias = lambda.Function.fromFunctionArn(
        this,
        'deployer-alias',
        `${parentDeployerLambdaARN}:currentVersion`,
      );

      const childRole = new iam.ArnPrincipal(childDeployerRoleArns[0]);

      deployerFunc.addPermission('deployer-child-permission', {
        principal: childRole,
        scope: this,
      });

      deployerFuncAlias.addPermission('deployer-child-permission-alias', {
        principal: childRole,
        scope: this,
      });
    }
  }
}
