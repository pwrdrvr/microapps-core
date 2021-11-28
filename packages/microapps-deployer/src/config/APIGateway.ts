import { Property } from 'ts-convict';

export interface IAPIGateway {
  /**
   * ID of the API Gateway to integrate with
   */
  apiId: string;
}

export class APIGateway implements IAPIGateway {
  @Property({
    doc: 'ID of API Gateway to integrate with',
    nullable: false,
    default: 'none',
    env: 'APIGWY_ID',
  })
  public apiId!: string;
}
