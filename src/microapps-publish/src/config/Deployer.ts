import { Property } from 'ts-convict';

export interface IDeployerConfig {
  lambdaName: string;
}

export class DeployerConfig implements IDeployerConfig {
  @Property({
    doc: 'Name of Deployer Lambda function',
    default: 'microapps-deployer',
    env: 'DEPLOYER_LAMBDA_NAME',
  })
  public lambdaName!: string;
}
