import * as cdk from '@aws-cdk/core';
import { Env } from './Types';

export default class SharedTags {
  public static addSharedTags(construct: cdk.IConstruct, prSuffix = ''): void {
    cdk.Tags.of(construct).add('Repository', 'https://github.com/pwrdrvr/microapps-core/');
    cdk.Tags.of(construct).add('Application', `microapps-core${prSuffix}`);
  }

  public static addEnvTag(construct: cdk.IConstruct, env: Env | '', isEphemeral: boolean): void {
    if (env !== '' && env !== undefined) cdk.Tags.of(construct).add('Environment', env);
    if (isEphemeral) {
      cdk.Tags.of(construct).add('Ephemeral', 'true');
      cdk.Tags.of(construct).add('Ephemeral-Created', new Date().toISOString());
    }
  }
}
