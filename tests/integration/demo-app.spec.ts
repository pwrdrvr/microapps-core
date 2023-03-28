/// <reference types="jest" />
import axios from 'axios';

jest.setTimeout(10000);
jest.retryTimes(3);

describe('demo-app', () => {
  const baseUrl = new URL(process.env.BASE_URL || 'https://apps.ghpublic.pwrdrvr.com/');
  const demoAppUrl = new URL('demo-app/', baseUrl);

  describe('single account - non-root app', () => {
    it('should return a status of 200', async () => {
      const response = await axios.get(demoAppUrl.toString(), {
        headers: { Accept: 'text/html' },
      });
      expect(response.status).toEqual(200);
      expect(response.headers).toHaveProperty('powered-by', 'demo-app');
      expect(response.headers).toHaveProperty('x-microapps-appname', 'demo-app');
      expect(response.headers).toHaveProperty('x-microapps-semver', '0.0.0');
    });

    it('should return HTML with an expected string', async () => {
      const response = await axios.get(demoAppUrl.toString(), {
        headers: { Accept: 'text/html' },
      });
      const data = response.data;

      expect(data).toContain('<div>This is a simple demo app</div>');
      expect(response.headers).toHaveProperty('powered-by', 'demo-app');
      expect(response.headers).toHaveProperty('x-microapps-appname', 'demo-app');
      expect(response.headers).toHaveProperty('x-microapps-semver', '0.0.0');
    });

    it('should return JSON with an expected value', async () => {
      const response = await axios.get(
        new URL('/demo-app/serverIncrement?currValue=1', baseUrl).toString(),
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
      expect(response.headers).toHaveProperty('x-microapps-appname', 'demo-app');
      expect(response.headers).toHaveProperty('x-microapps-semver', '0.0.0');
    });
  });

  describe('single account - root app', () => {
    const rootVer = '0.0.0';

    it('should return a status of 200', async () => {
      const response = await axios.get(new URL(`/?appver=${rootVer}`, baseUrl).toString(), {
        headers: { Accept: 'text/html' },
      });
      expect(response.status).toEqual(200);
      expect(response.headers).toHaveProperty('powered-by', 'demo-app');
      expect(response.headers).toHaveProperty('x-microapps-appname', '[root]');
      expect(response.headers).toHaveProperty('x-microapps-semver', '0.0.0');
    });

    it('should return HTML with an expected string', async () => {
      const response = await axios.get(new URL(`/?appver=${rootVer}`, baseUrl).toString(), {
        headers: { Accept: 'text/html' },
      });
      const data = response.data;

      expect(data).toContain('<div>This is a simple demo app</div>');
      expect(response.headers).toHaveProperty('powered-by', 'demo-app');
      expect(response.headers).toHaveProperty('x-microapps-appname', '[root]');
      expect(response.headers).toHaveProperty('x-microapps-semver', '0.0.0');
    });

    it('should return JSON with an expected value', async () => {
      const response = await axios.get(
        new URL(`/serverIncrement?currValue=1&appver=${rootVer}`, baseUrl).toString(),
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
      expect(response.headers).toHaveProperty('x-microapps-appname', '[root]');
      expect(response.headers).toHaveProperty('x-microapps-semver', '0.0.0');
    });
  });

  describe('single account - child account version of app', () => {
    const childVer = '0.0.0-child.1';

    it('should return a status of 200', async () => {
      const response = await axios.get(
        new URL(`/demo-app?appver=${childVer}`, baseUrl).toString(),
        {
          headers: { Accept: 'text/html' },
        },
      );
      expect(response.status).toEqual(200);
      expect(response.headers).toHaveProperty('powered-by', 'demo-app');
      expect(response.headers).toHaveProperty('x-microapps-appname', 'demo-app');
      expect(response.headers).toHaveProperty('x-microapps-semver', '0.0.0-child.1');
    });

    it('should return HTML with an expected string', async () => {
      const response = await axios.get(
        new URL(`/demo-app?appver=${childVer}`, baseUrl).toString(),
        {
          headers: { Accept: 'text/html' },
        },
      );
      const data = response.data;

      expect(data).toContain('<div>This is a simple demo app</div>');
      expect(response.headers).toHaveProperty('powered-by', 'demo-app');
      expect(response.headers).toHaveProperty('x-microapps-appname', 'demo-app');
      expect(response.headers).toHaveProperty('x-microapps-semver', '0.0.0-child.1');
    });

    it('should return JSON with an expected value', async () => {
      const response = await axios.get(
        new URL(`/demo-app/serverIncrement?currValue=1&appver=${childVer}`, baseUrl).toString(),
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
      expect(response.headers).toHaveProperty('x-microapps-appname', 'demo-app');
      expect(response.headers).toHaveProperty('x-microapps-semver', '0.0.0-child.1');
    });
  });
});
