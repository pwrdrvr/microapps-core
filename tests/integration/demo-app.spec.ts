/// <reference types="jest" />
import axios from 'axios';

jest.setTimeout(10000);
jest.retryTimes(3);

describe('demo-app', () => {
  const remoteUrl = new URL(
    process.env.DEMO_APP_URL || 'https://apps.ghpublic.pwrdrvr.com/demo-app',
  );

  it('should return a status of 200', async () => {
    const response = await axios.get(remoteUrl.toString(), {
      headers: { Accept: 'text/html' },
    });
    expect(response.status).toEqual(200);
    expect(response.headers).toHaveProperty('powered-by', 'demo-app');
  });

  it('should return HTML with an expected string', async () => {
    const response = await axios.get(remoteUrl.toString(), {
      headers: { Accept: 'text/html' },
    });
    const data = response.data;

    expect(data).toContain('<div>This is a simple demo app</div>');
    expect(response.headers).toHaveProperty('powered-by', 'demo-app');
  });

  it('should return HTML with an expected string', async () => {
    const response = await axios.get(
      new URL('/demo-app/serverIncrement?currValue=1', remoteUrl).toString(),
      {
        headers: { Accept: 'application/json' },
      },
    );
    const data = response.data;

    expect(data).toMatchObject({
      newValue: 2,
      source: 'demo-app',
    });
    expect(response.headers).toHaveProperty('powered-by', 'demo-app');
  });
});
