import { Property } from 'ts-convict';

/**
 * Represents a API Gateway Config
 */
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
