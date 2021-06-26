import { Property } from 'ts-convict';

export interface IDeployer {
  lambdaName: string;
}

export class Deployer implements IDeployer {
  @Property({
    doc: 'Name of Deployer Lambda function',
    default: 'microapps-deployer',
    arg: 'lambda-name',
    env: 'DEPLOYER_LAMBDA_NAME',
  })
  public lambdaName!: string;
}
