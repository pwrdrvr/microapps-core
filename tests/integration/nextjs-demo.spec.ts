/// <reference types="jest" />
import axios from 'axios';
import posixPath from 'path/posix';

jest.setTimeout(10000);
jest.retryTimes(2);

const NEXTJS_DEMO_APP_VER = process.env.NEXTJS_DEMO_APP_VER || '0.0.0';

describe('nextjs-demo', () => {
  const baseUrl = new URL(process.env.BASE_URL || 'https://apps.ghpublic.pwrdrvr.com/');
  const demoAppUrl = new URL(posixPath.join(baseUrl.pathname, 'nextjs-demo'), baseUrl);

  const itSkipBasicPrefix = process.env.DEPLOY_NAME === 'microapps-basic-prefix' ? it.skip : it;

  it('should return a status of 200', async () => {
    const response = await axios.get(demoAppUrl.toString(), {
      headers: { Accept: 'text/html' },
    });
    expect(response.status).toEqual(200);
    expect(response.headers).toHaveProperty('x-powered-by', 'Next.js');
  });

  it('should return HTML with an expected string', async () => {
    const response = await axios.get(demoAppUrl.toString(), {
      headers: { Accept: 'text/html' },
    });
    const data = response.data;

    expect(data).toContain('<title>PwrDrvr');
    expect(response.headers).toHaveProperty('x-powered-by', 'Next.js');
  });

  it('should sub page HTML with an expected string - ssg-ssr', async () => {
    const response = await axios.get(
      new URL(posixPath.join(baseUrl.pathname, '/nextjs-demo/posts/ssg-ssr'), baseUrl).toString(),
      {
        headers: { Accept: 'text/html' },
      },
    );
    const data = response.data;

    expect(data).toContain(
      '<title>When to Use Static Generation v.s. Server-side Rendering</title>',
    );
    expect(response.headers).toHaveProperty('x-powered-by', 'Next.js');
  });

  it('should sub page HTML with an expected string - pre-rendering', async () => {
    const response = await axios.get(
      new URL(
        posixPath.join(baseUrl.pathname, '/nextjs-demo/posts/pre-rendering'),
        baseUrl,
      ).toString(),
      {
        headers: { Accept: 'text/html' },
      },
    );
    const data = response.data;

    expect(data).toContain('<title>Two Forms of Pre-rendering</title>');
    expect(response.headers).toHaveProperty('x-powered-by', 'Next.js');
  });

  itSkipBasicPrefix('should return JSON for home page _next/data route', async () => {
    const response = await axios.get(
      new URL(
        posixPath.join(baseUrl.pathname, `/_next/data/${NEXTJS_DEMO_APP_VER}/sv/nextjs-demo.json`),
        baseUrl,
      ).toString(),
      {
        headers: { Accept: 'application/json' },
      },
    );
    const data = response.data;

    expect(data).toMatchObject({
      __N_SSG: true,
      pageProps: {
        allPostsData: [
          {
            date: '2020-01-02',
            id: 'ssg-ssr',
            title: 'When to Use Static Generation v.s. Server-side Rendering',
          },
          {
            date: '2020-01-01',
            id: 'pre-rendering',
            title: 'Two Forms of Pre-rendering',
          },
        ],
      },
    });
  });
});
