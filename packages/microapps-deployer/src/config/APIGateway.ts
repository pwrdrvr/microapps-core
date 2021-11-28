import { Property } from 'ts-convict';

export interface IAPIGateway {
  /**
   * @deprecated - 2021-11-28 - Use apiId instead
   */
  name: string;

  /**
   * ID of the API Gateway to integrate with
   */
  apiId: string;
}

export class APIGateway implements IAPIGateway {
  @Property({
    doc: 'Name of API Gateway to integrate with',
    default: 'microapps-apis',
    env: 'APIGWY_NAME',
  })
  public name!: string;

  @Property({
    doc: 'ID of API Gateway to integrate with',
    nullable: false,
    default: 'none',
    env: 'APIGWY_ID',
  })
  public apiId!: string;
}
