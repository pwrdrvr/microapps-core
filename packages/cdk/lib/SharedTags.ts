import { Stack, Tags } from 'aws-cdk-lib';
import { IConstruct } from 'constructs';
import { SharedProps } from './SharedProps';
import { Env } from './Types';

interface SharedTagsProps {
  shared: SharedProps;
}

export class SharedTags {
  public static addSharedTags(construct: IConstruct, props: SharedTagsProps): void {
    const { shared } = props;
    Tags.of(construct).add('repository', 'https://github.com/pwrdrvr/microapps-core/');
    Tags.of(construct).add(
      'application',
      // Note: this value is excluded from the strict S3 deny rules in microapps-cdk,
      // which will allow the TTL deletion lambda in this construct to delete the S3
      // buckets - if these tags do not match then the delete by the lambda will fail.
      `${Stack.of(construct).stackName}-core${shared.envSuffix}${shared.prSuffix}`,
    );
  }

  public static addEnvTag(construct: IConstruct, env: Env | '', isEphemeral: boolean): void {
    if (env !== '' && env !== undefined) Tags.of(construct).add('environment', env);
    if (isEphemeral) {
      Tags.of(construct).add('ephemeral', 'true');
      // Note: a dynamic timestamp tag causes all dependency stacks
      // to redeploy to update the timestamp tag, which takes forever with
      // CloudFront.  It may be possible to preserve this in `cdk.context.json`
      // for local deploys, but this won't work well with CI builds of PRs as
      // there is no where to store the updated `cdk.context.json` for that PR.
      // cdk.Tags.of(construct).add('Ephemeral-Created', new Date().toISOString());
    }
  }
}
