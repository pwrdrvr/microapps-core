import * as lambda from '@aws-sdk/client-lambda';
import DeployClient from './DeployClient';
import { IConfig } from '../config/Config';

jest.mock('@aws-sdk/client-lambda', () => ({
  LambdaClient: jest.fn(() => ({ send: jest.fn() })),
  InvokeCommand: jest.fn((input) => ({ input })),
}));

describe('CreateApp aliases', () => {
  const send = DeployClient._client.send as jest.Mock;
  beforeEach(() => {
    jest.clearAllMocks();
    send.mockResolvedValue({
      $metadata: { httpStatusCode: 200 },
      Payload: Buffer.from(JSON.stringify({ statusCode: 200 })),
    });
  });
  it.each([undefined, [], ['search', 'product']])(
    'sends the explicit alias configuration: %j',
    async (extraAppNames) => {
      const config = {
        app: { name: 'shop', extraAppNames },
        deployer: { lambdaName: 'deployer' },
      } as IConfig;
      await DeployClient.CreateApp({ config });
      const input = (lambda.InvokeCommand as unknown as jest.Mock).mock.calls[0][0];
      const payload = JSON.parse(input.Payload.toString());
      expect(payload).toEqual({
        type: 'createApp',
        appName: 'shop',
        displayName: 'shop',
        ...(extraAppNames !== undefined ? { extraAppNames } : {}),
      });
    },
  );
  it('surfaces alias conflicts to the publish command', async () => {
    send.mockResolvedValue({
      $metadata: { httpStatusCode: 200 },
      Payload: Buffer.from(
        JSON.stringify({ statusCode: 409, errorMessage: 'Alias already owned' }),
      ),
    });
    await expect(
      DeployClient.CreateApp({
        config: {
          app: { name: 'shop', extraAppNames: ['search'] },
          deployer: { lambdaName: 'deployer' },
        } as IConfig,
      }),
    ).rejects.toThrow(/409/);
  });
});
