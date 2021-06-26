import { Property } from 'ts-convict';

export interface IAPIGateway {
  name: string;
}

export class APIGateway implements IAPIGateway {
  @Property({
    doc: 'Name of API Gateway to integrate with',
    default: 'microapps-apis',
    env: 'APIGWY_NAME',
  })
  public name!: string;
}
