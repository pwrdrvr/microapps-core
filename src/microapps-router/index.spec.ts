import { describe, it } from 'mocha';
import { expect } from 'chai';
import { dynamoClient } from '../fixtures';
import Manager, { Application, Version, Rules } from '../common/microapps-datalib/index';
import { handler } from './index';
import * as lambda from 'aws-lambda';

describe('router', () => {
  it('should serve appframe with version substitued', async () => {
    const manager = new Manager(dynamoClient);

    const app = new Application({
      AppName: 'Bat',
      DisplayName: 'Bat App',
    });
    await app.SaveAsync(manager.DBClient);

    const version = new Version({
      AppName: 'Bat',
      DefaultFile: 'bat.html',
      IntegrationID: 'abcd',
      SemVer: '3.2.1-beta0',
      Status: 'deployed',
      Type: 'next.js',
    });
    await version.SaveAsync(manager.DBClient);

    const rules = new Rules({
      AppName: 'Bat',
      Version: 0,
      RuleSet: { default: { SemVer: '3.2.1-beta0', AttributeName: '', AttributeValue: '' } },
    });
    await rules.SaveAsync(manager.DBClient);

    // Call the handler
    const response = await handler(
      { rawPath: '/bat/' } as lambda.APIGatewayProxyEventV2,
      {} as lambda.Context,
    );

    expect(response).not.equal(undefined);
    expect(response).to.have.property('body');
    expect(response.body.length).greaterThan(80);
    expect(response.body).contains('<iframe src="/bat/3.2.1-beta0"');
    expect(response.body).contains('<iframe');
  });
});
