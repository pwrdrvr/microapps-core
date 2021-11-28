import * as iam from '@aws-cdk/aws-iam';
import * as cdk from '@aws-cdk/core';
import { SharedProps } from './SharedProps';
import { SharedTags } from './SharedTags';

interface IMicroAppsBuilderStackProps extends cdk.StackProps {
  readonly shared: SharedProps;
}

export class MicroAppsBuilder extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: IMicroAppsBuilderStackProps) {
    super(scope, id, props);

    if (props === undefined) {
      throw new Error('props cannot be undefined');
    }
    if (props.env === undefined) {
      throw new Error('props.env cannot be undefined');
    }

    const { shared } = props;

    // This stack is deployed manually once per env, it's never a temp stack
    SharedTags.addEnvTag(this, shared.env, false);

    const nameRoot = `${shared.stackName}-builder${shared.envSuffix}`;

    //
    // Create a policy that grants permissions needed to deploy the stack
    //
    // const policyBuilder = new iam.Policy(this, 'microapps-builder-policy', {
    //   policyName: nameRoot,
    // });
    // policyBuilder.addStatements(
    //   new iam.PolicyStatement({
    //     sid: 's3-create-buckets',
    //     actions: ['s3:*'],
    //     resources: [`arn:aws:s3:::*-${nameRoot}*`, `arn:aws:s3:::*-microapps-staging*`],
    //   }),
    //   // FIXME: Limit delete by name pattern or condition
    //   new iam.PolicyStatement({
    //     sid: 'lambda-create',
    //     actions: ['lambda:*'],
    //     resources: ['*'],
    //   }),
    //   // FIXME: Limit delete by name pattern or condition
    //   new iam.PolicyStatement({
    //     sid: 'apigwy-create',
    //     actions: ['apigateway:*'],
    //     resources: ['*'],
    //   }),
    //   // FIXME: Limit delete by name pattern or condition
    //   new iam.PolicyStatement({
    //     sid: 'cloudfront-create',
    //     actions: ['cloudfront:*'],
    //     resources: ['*'],
    //   }),
    //   // FIXME: Limit delete by name pattern or condition
    //   new iam.PolicyStatement({
    //     sid: 'route53-create',
    //     actions: ['route53:*'],
    //     resources: ['*'],
    //   }),
    // );

    const userBuilder = new iam.User(this, 'microapps-builder-user', {
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AWSCertificateManagerReadOnly'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('CloudFrontFullAccess'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonAPIGatewayAdministrator'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AWSLambda_FullAccess'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchFullAccess'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonDynamoDBFullAccess'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerRegistryFullAccess'),
        // FIXME: Limit this to Role and Policy creation only (no users)
        iam.ManagedPolicy.fromAwsManagedPolicyName('IAMFullAccess'),
      ],
      userName: nameRoot,
    });
    userBuilder.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          'events:PutRule',
          'events:DeleteRule',
          'events:DescribeRule',
          'events:PutTargets',
          'events:RemoveTargets',
        ],
        resources: ['*'],
      }),
    );
    const groupBuilder = new iam.Group(this, 'microapps-builder-group-1', {
      groupName: `${nameRoot}-1`,
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AWSCloudFormationFullAccess'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonRoute53FullAccess'),
      ],
    });
    userBuilder.addToGroup(groupBuilder);
    // Always destroy this user if the stack is destroyed
    // This user is not critical and if we destroy the stack we should rotate the keys
    userBuilder.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);
    groupBuilder.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);
  }
}
