/// <reference types="jest" />
import axios from 'axios';
import posixPath from 'path/posix';

jest.setTimeout(10000);
jest.retryTimes(2);

const DEMO_AND_ROOT_APP_VER = process.env.DEMO_AND_ROOT_APP_VER || '0.0.0';

describe('demo-app', () => {
  const baseUrl = new URL(process.env.BASE_URL || 'https://apps.ghpublic.pwrdrvr.com/');
  const demoAppUrl = new URL('demo-app', baseUrl);

  const describeOnlyOnCore =
    process.env.DEPLOY_NAME === 'microapps-core' ? describe : describe.skip;

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
        new URL(
          posixPath.join(baseUrl.pathname, '/demo-app/serverIncrement?currValue=1'),
          baseUrl,
        ).toString(),
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
    it('should return a status of 200', async () => {
      const response = await axios.get(
        new URL(
          posixPath.join(baseUrl.pathname, `/?appver=${DEMO_AND_ROOT_APP_VER}`),
          baseUrl,
        ).toString(),
        {
          headers: { Accept: 'text/html' },
        },
      );
      expect(response.status).toEqual(200);
      expect(response.headers).toHaveProperty('powered-by', 'demo-app');
      expect(response.headers).toHaveProperty('x-microapps-appname', '[root]');
      expect(response.headers).toHaveProperty('x-microapps-semver', DEMO_AND_ROOT_APP_VER);
    });

    it('should return HTML with an expected string', async () => {
      const response = await axios.get(
        new URL(
          posixPath.join(baseUrl.pathname, `/?appver=${DEMO_AND_ROOT_APP_VER}`),
          baseUrl,
        ).toString(),
        {
          headers: { Accept: 'text/html' },
        },
      );
      const data = response.data;

      expect(data).toContain('<div>This is a simple demo app</div>');
      expect(response.headers).toHaveProperty('powered-by', 'demo-app');
      expect(response.headers).toHaveProperty('x-microapps-appname', '[root]');
      expect(response.headers).toHaveProperty('x-microapps-semver', DEMO_AND_ROOT_APP_VER);
    });

    it('should return JSON with an expected value', async () => {
      const response = await axios.get(
        new URL(
          posixPath.join(
            baseUrl.pathname,
            `/serverIncrement?currValue=1&appver=${DEMO_AND_ROOT_APP_VER}`,
          ),
          baseUrl,
        ).toString(),
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
      expect(response.headers).toHaveProperty('x-microapps-semver', DEMO_AND_ROOT_APP_VER);
    });
  });

  describeOnlyOnCore('single account - child account version of app', () => {
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
