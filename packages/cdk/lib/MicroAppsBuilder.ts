import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { SharedProps } from './SharedProps';
import { SharedTags } from './SharedTags';

/**
 * Properties to initialize an instance of `MicroAppsBuilderStack`.
 */
interface IMicroAppsBuilderStackProps extends StackProps {
  readonly shared: SharedProps;
}

/**
 * Creates an IAM Role with permissions sufficient to deploy
 * {@link MicroAppsStack }
 */
export class MicroAppsBuilder extends Stack {
  constructor(scope: Construct, id: string, props?: IMicroAppsBuilderStackProps) {
    super(scope, id, props);

    if (props === undefined) {
      throw new Error('props cannot be undefined');
    }
    if (props.env === undefined) {
      throw new Error('props.env cannot be undefined');
    }

    const { shared } = props;

    SharedTags.addSharedTags(Stack.of(this));

    // This stack is deployed manually once per env, it's never a temp stack
    SharedTags.addEnvTag(Stack.of(this), shared.env, false);

    const nameRoot = Stack.of(this).stackName;

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

    const builderRole = new iam.Role(this, 'builder-role', {
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AWSCertificateManagerReadOnly'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('CloudFrontFullAccess'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonAPIGatewayAdministrator'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AWSLambda_FullAccess'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchFullAccess'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonDynamoDBFullAccess'),
        // FIXME: Limit this to Role and Policy creation only (no users)
        iam.ManagedPolicy.fromAwsManagedPolicyName('IAMFullAccess'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AWSCloudFormationFullAccess'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonRoute53FullAccess'),
      ],
      roleName: `${nameRoot}-builder-role`,
      assumedBy: new iam.WebIdentityPrincipal(
        `arn:aws:iam::${props.shared.account}:oidc-provider/token.actions.githubusercontent.com`,
        {
          StringEquals: { 'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com' },
          StringLike: {
            // Full example here of setting up OIDC via CDK with GitHub:
            // https://github.com/WojciechMatuszewski/github-oidc-aws-cdk-example
            // Notice the `ref:refs`. The `s` in the second `ref` is important!
            // `repo:${yourGitHubUsername}/${yourGitHubRepoName}:ref:refs/heads/${yourGitHubBranchName}`
            'token.actions.githubusercontent.com:sub': 'repo:pwrdrvr/*',
          },
        },
      ),
      maxSessionDuration: Duration.hours(1),
    });

    // Add permissions needed by the TTL construct
    builderRole.addToPolicy(
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

    // Always destroy this role if the stack is destroyed
    // This role is not critical
    builderRole.applyRemovalPolicy(RemovalPolicy.DESTROY);
  }
}
