import { Stack, Tags } from 'aws-cdk-lib';
import { Env } from './Types';

export class SharedTags {
  public static addSharedTags(stack: Stack): void {
    Tags.of(stack).add('repository', 'https://github.com/pwrdrvr/microapps-core/');
    Tags.of(stack).add(
      'application',
      // Note: this value is excluded from the strict S3 deny rules in microapps-cdk,
      // which will allow the TTL deletion lambda in this stack to delete the S3
      // buckets - if these tags do not match then the delete by the lambda will fail.
      `${stack.stackName}`,
    );
  }

  public static addEnvTag(stack: Stack, env: Env | '', isEphemeral: boolean): void {
    if (env !== '' && env !== undefined) Tags.of(stack).add('environment', env);
    if (isEphemeral) {
      Tags.of(stack).add('ephemeral', 'true');
      // Note: a dynamic timestamp tag causes all dependency stacks
      // to redeploy to update the timestamp tag, which takes forever with
      // CloudFront.  It may be possible to preserve this in `cdk.context.json`
      // for local deploys, but this won't work well with CI builds of PRs as
      // there is no where to store the updated `cdk.context.json` for that PR.
      // cdk.Tags.of(construct).add('Ephemeral-Created', new Date().toISOString());
    }
  }
}
