import * as cdk from '@aws-cdk/core';
import { SharedProps } from './SharedProps';
import { Env } from './Types';

interface SharedTagsProps {
  shared: SharedProps;
}

export class SharedTags {
  public static addSharedTags(construct: cdk.IConstruct, props: SharedTagsProps): void {
    const { shared } = props;
    cdk.Tags.of(construct).add('repository', 'https://github.com/pwrdrvr/microapps-core/');
    cdk.Tags.of(construct).add(
      'application',
      `${shared.stackName}-core${shared.envSuffix}${shared.prSuffix}`,
    );
  }

  public static addEnvTag(construct: cdk.IConstruct, env: Env | '', isEphemeral: boolean): void {
    if (env !== '' && env !== undefined) cdk.Tags.of(construct).add('environment', env);
    if (isEphemeral) {
      cdk.Tags.of(construct).add('ephemeral', 'true');
      // Note: a dynamic timestamp tag causes all dependency stacks
      // to redeploy to update the timestamp tag, which takes forever with
      // CloudFront.  It may be possible to preserve this in `cdk.context.json`
      // for local deploys, but this won't work well with CI builds of PRs as
      // there is no where to store the updated `cdk.context.json` for that PR.
      // cdk.Tags.of(construct).add('Ephemeral-Created', new Date().toISOString());
    }
  }
}
