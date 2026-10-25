import crypto from 'node:crypto';
import request from 'supertest';

import createApp from '../../../src/app';

const app = createApp();

type Method = 'get' | 'post' | 'put' | 'delete';

// A client of the API, like a browser: keeps the cookies of the session. The app sets them
// `secure`, so supertest's jar wouldn't send them back over http: they're kept here.
export function apiClient() {
  const cookies = new Map<string, string>();

  const keepCookies = (res: request.Response) => {
    const setCookie = res.headers['set-cookie'] as unknown as string[] | undefined;

    (setCookie ?? []).forEach((cookie) => {
      const [pair] = cookie.split(';');
      const index = pair.indexOf('=');
      const name = pair.slice(0, index);
      const value = pair.slice(index + 1);

      // res.clearCookie: empty, expired in 1970
      if (!value || cookie.includes('Expires=Thu, 01 Jan 1970')) {
        cookies.delete(name);
      } else {
        cookies.set(name, value);
      }
    });

    return res;
  };

  const send = async (method: Method, url: string, body?: object) => {
    let req = request(app)[method](url);

    if (cookies.size > 0) {
      req = req.set('Cookie', [...cookies].map(([name, value]) => `${name}=${value}`).join('; '));
    }

    return keepCookies(await (body === undefined ? req : req.send(body)));
  };

  return {
    cookies,
    get: (url: string) => send('get', url),
    post: (url: string, body?: object) => send('post', url, body),
    put: (url: string, body?: object) => send('put', url, body),
    delete: (url: string, body?: object) => send('delete', url, body),
    login: (username: string, password: string) => send('post', '/api/auth/login', { username, password }),
  };
}

export type ApiClient = ReturnType<typeof apiClient>;

// The gateway: posts the messages of the collars with its API key
export function gatewayClient(apiKey: string) {
  return {
    send: (message: object) => request(app)
      .post('/api/rf')
      .set('X-API-Key', apiKey)
      .send(message),
  };
}

export const sha256 = (text: string) => crypto.createHash('sha256').update(text).digest('hex');
