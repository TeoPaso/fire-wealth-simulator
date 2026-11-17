/**
 * The service worker (public/sw.js) in a simulated worker scope: precache of the whole build, offline cold start
 * after ONE online visit, redirected responses, query strings, 5xx and slow networks, other sites of the same origin,
 * pruning of old caches (ROB-02, ROB-06, ROB-08, ROB-09, ROB-13).
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { injectManifest } from '../../scripts/sw-precache.mjs';

const SOURCE = readFileSync(path.resolve(__dirname, '../../public/sw.js'), 'utf8');
const ORIGIN = 'https://app.test';

type Req = { url: string; method?: string; mode?: string };
const keyOf = (k: string | Req) => (typeof k === 'string' ? new URL(k, ORIGIN).href : k.url);
const noSearch = (href: string) => href.split('?')[0];

/** Like the Cache API, a cached copy keeps the URL of the response that was stored. */
function cachedCopy(response: Response): Response {
  const copy = response.clone();
  if (response.url) Object.defineProperty(copy, 'url', { value: response.url });
  return copy;
}

class FakeCache {
  entries = new Map<string, Response>();
  async match(key: string | Req, opts: { ignoreSearch?: boolean } = {}) {
    const href = keyOf(key);
    if (this.entries.has(href)) return cachedCopy(this.entries.get(href)!);
    if (opts.ignoreSearch) {
      for (const [k, v] of this.entries) if (noSearch(k) === noSearch(href)) return cachedCopy(v);
    }
    return undefined;
  }
  async put(key: string | Req, response: Response) {
    this.entries.set(keyOf(key), response);
  }
  async keys() {
    return [...this.entries.keys()].map((url) => ({ url }));
  }
  async delete(key: string | Req) {
    return this.entries.delete(keyOf(key));
  }
}

class FakeCaches {
  stores = new Map<string, FakeCache>();
  async open(name: string) {
    if (!this.stores.has(name)) this.stores.set(name, new FakeCache());
    return this.stores.get(name)!;
  }
  async keys() {
    return [...this.stores.keys()];
  }
  async delete(name: string) {
    return this.stores.delete(name);
  }
  async match(key: string | Req, opts?: { ignoreSearch?: boolean }) {
    for (const store of this.stores.values()) {
      const hit = await store.match(key, opts);
      if (hit) return hit;
    }
    return undefined;
  }
}

type Network = (req: Req) => Promise<Response>;

function redirected(body: string): Response {
  const res = new Response(body, { status: 200 });
  Object.defineProperty(res, 'redirected', { value: true });
  return res;
}

function loadWorker(opts: { build?: { version: string; urls: string[] }; network: { current: Network } }) {
  const handlers: Record<string, (event: unknown) => void> = {};
  const caches = new FakeCaches();
  const source = opts.build ? injectManifest(SOURCE, opts.build) : SOURCE;
  const self = {
    registration: { scope: `${ORIGIN}/` },
    addEventListener: (type: string, fn: (event: unknown) => void) => {
      handlers[type] = fn;
    },
    skipWaiting: async () => {},
    clients: { claim: async () => {} },
  };
  const fetch = (input: string | Req) => opts.network.current(typeof input === 'string' ? { url: new URL(input, ORIGIN).href } : input);
  const shortTimeout = (fn: () => void, ms: number) => setTimeout(fn, ms >= 1000 ? 20 : ms);
  runInNewContext(source, { self, caches, fetch, Response, URL, Promise, setTimeout: shortTimeout, console });

  const lifecycle = async (type: string) => {
    const pending: Promise<unknown>[] = [];
    handlers[type]({ waitUntil: (p: Promise<unknown>) => pending.push(p) });
    await Promise.all(pending);
  };
  const message = async (data: unknown) => {
    const pending: Promise<unknown>[] = [];
    handlers.message({ data, waitUntil: (p: Promise<unknown>) => pending.push(p) });
    await Promise.all(pending);
  };
  /** Dispatches a fetch; resolves with the response given to respondWith, or null when the worker passed. */
  const request = async (url: string, mode = 'no-cors', destination = '') => {
    let answer: Promise<Response> | null = null;
    const pending: Promise<unknown>[] = [];
    handlers.fetch({
      request: { url: new URL(url, ORIGIN).href, method: 'GET', mode, destination },
      respondWith: (p: Promise<Response>) => {
        answer = p;
      },
      waitUntil: (p: Promise<unknown>) => pending.push(p),
    });
    const response = answer ? await answer : null;
    // Background work (e.g. a shell refresh still waiting for a slow network) may never settle: do not wait forever.
    await Promise.race([Promise.all(pending), new Promise((r) => setTimeout(r, 100))]);
    return response as Response | null;
  };
  return { caches, lifecycle, message, request };
}

const files: Record<string, string> = {
  '/': '<html>shell</html>',
  '/manifest.json': '{}',
  '/icons/icon-192x192.png': 'png',
  '/icons/icon-512x512.png': 'png',
  '/_next/static/chunks/app.js': 'app',
  '/_next/static/chunks/main.css': 'css',
  '/_next/static/media/font.woff2': 'font',
};
const online: Network = async (req) => {
  const p = new URL(req.url).pathname;
  return p in files ? new Response(files[p], { status: 200 }) : new Response('nope', { status: 404 });
};
const offline: Network = async () => {
  throw new TypeError('Failed to fetch');
};

describe('service worker', () => {
  it('with the build manifest, one online visit precaches every file and the app starts offline', async () => {
    const network = { current: online };
    const build = { version: 'abc123', urls: ['_next/static/chunks/app.js', '_next/static/chunks/main.css', '_next/static/media/font.woff2'] };
    const sw = loadWorker({ build, network });
    await sw.lifecycle('install');
    await sw.lifecycle('activate');
    const cache = sw.caches.stores.get('fire-planner-abc123')!;
    expect([...cache.entries.keys()].sort()).toEqual(Object.keys(files).map((p) => `${ORIGIN}${p}`).sort());

    network.current = offline;
    expect(await (await sw.request('/', 'navigate'))?.text()).toBe(files['/']);
    expect(await (await sw.request('/?utm_source=whatsapp', 'navigate'))?.text()).toBe(files['/']);
    expect(await (await sw.request('/_next/static/chunks/main.css'))?.text()).toBe('css');
    expect(await (await sw.request('/_next/static/media/font.woff2'))?.text()).toBe('font');
  });

  it('without the manifest, the URLs posted by the page are cached (first visit before the worker took control)', async () => {
    const network = { current: online };
    const sw = loadWorker({ network });
    await sw.lifecycle('install');
    await sw.lifecycle('activate');
    await sw.message({
      type: 'precache',
      urls: [`${ORIGIN}/_next/static/chunks/app.js`, '/_next/static/chunks/main.css', 'https://evil.test/x.js', '/other/page.html'],
    });
    const cache = sw.caches.stores.get('fire-planner-v2-unversioned')!;
    expect(cache.entries.has(`${ORIGIN}/_next/static/chunks/app.js`)).toBe(true);
    expect(cache.entries.has(`${ORIGIN}/_next/static/chunks/main.css`)).toBe(true);
    expect([...cache.entries.keys()].some((k) => k.includes('evil') || k.includes('/other/'))).toBe(false);
    network.current = offline;
    expect(await (await sw.request('/_next/static/chunks/app.js'))?.text()).toBe('app');
  });

  it('answers a worker script with a URL-less copy, so the worker keeps the "#params=" fragment of its URL', async () => {
    // A real cached response carries the URL it was stored under (without the fragment): the worker would take it as
    // its location and Turbopack's bootstrap would miss its config.
    const withUrl = (body: string, url: string) => {
      const res = new Response(body, { status: 200, headers: { 'content-type': 'text/javascript' } });
      Object.defineProperty(res, 'url', { value: url });
      return res;
    };
    const network = { current: (async (req) => withUrl(new URL(req.url).pathname, req.url)) as Network };
    const build = { version: 'w1', urls: ['_next/static/chunks/turbopack-worker-abc.js', '_next/static/chunks/app.js'] };
    const sw = loadWorker({ build, network });
    await sw.lifecycle('install');
    network.current = offline;
    const worker = await sw.request('/_next/static/chunks/turbopack-worker-abc.js', 'same-origin', 'worker');
    expect(worker?.url).toBe('');
    expect(worker?.headers.get('content-type')).toBe('text/javascript');
    expect(await worker?.text()).toBe('/_next/static/chunks/turbopack-worker-abc.js');
    const script = await sw.request('/_next/static/chunks/app.js', 'no-cors', 'script');
    expect(script?.url).toBe(`${ORIGIN}/_next/static/chunks/app.js`);
  });

  it('stores a redirected shell without the redirect flag (hosts redirecting /index.html → /)', async () => {
    const network = { current: (async (req) => (new URL(req.url).pathname === '/' ? redirected(files['/']) : online(req))) as Network };
    const sw = loadWorker({ network });
    await sw.lifecycle('install');
    const shell = await sw.caches.stores.get('fire-planner-v2-unversioned')!.match('/');
    expect(shell?.redirected).toBe(false);
    network.current = offline;
    const answer = await sw.request('/?x=1', 'navigate');
    expect(answer?.redirected).toBe(false);
    expect(await answer?.text()).toBe(files['/']);
  });

  it('serves the cached shell on 5xx and on a slow network, the network page otherwise', async () => {
    const network = { current: online };
    const sw = loadWorker({ network });
    await sw.lifecycle('install');
    network.current = async () => new Response('Service Unavailable', { status: 503 });
    expect(await (await sw.request('/', 'navigate'))?.text()).toBe(files['/']);
    network.current = () => new Promise(() => {}); // never answers
    expect(await (await sw.request('/', 'navigate'))?.text()).toBe(files['/']);
    network.current = async () => new Response('<html>new</html>', { status: 200 });
    expect(await (await sw.request('/', 'navigate'))?.text()).toBe('<html>new</html>');
    // …and the new page becomes the cached shell.
    network.current = offline;
    expect(await (await sw.request('/', 'navigate'))?.text()).toBe('<html>new</html>');
  });

  it('never handles navigations to other sites of the same origin', async () => {
    const network = { current: online };
    const sw = loadWorker({ network });
    await sw.lifecycle('install');
    expect(await sw.request('/other-project/', 'navigate')).toBeNull();
    expect(await sw.request('/other-project/page.html', 'navigate')).toBeNull();
    network.current = offline;
    expect(await sw.request('/some-other-project/page', 'navigate')).toBeNull();
    const cached = [...sw.caches.stores.values()].flatMap((c) => [...c.entries.keys()]);
    expect(cached.some((k) => k.includes('other'))).toBe(false);
  });

  it('a new build gets a new cache; old caches and stale chunks are deleted on activate', async () => {
    const network = { current: online };
    const old = loadWorker({ network, build: { version: 'v1', urls: ['_next/static/chunks/app.js'] } });
    await old.lifecycle('install');
    const caches = old.caches;
    // Same CacheStorage, next deploy with another chunk set.
    const handlers = loadWorker({ network, build: { version: 'v2', urls: ['_next/static/chunks/main.css'] } });
    handlers.caches.stores = caches.stores;
    (await caches.open('fire-planner-v2')).entries.set(`${ORIGIN}/_next/static/chunks/stale.js`, new Response('old'));
    await handlers.lifecycle('install');
    await handlers.lifecycle('activate');
    expect([...caches.stores.keys()]).toEqual(['fire-planner-v2']);
    const keys = [...caches.stores.get('fire-planner-v2')!.entries.keys()];
    expect(keys).toContain(`${ORIGIN}/_next/static/chunks/main.css`);
    expect(keys).not.toContain(`${ORIGIN}/_next/static/chunks/stale.js`);
  });

  it('the injection is idempotent and refuses a worker without the marker', () => {
    const once = injectManifest(SOURCE, { version: 'a', urls: ['x.js'] });
    const twice = injectManifest(once, { version: 'b', urls: ['y.js'] });
    expect(twice).toContain('{"version":"b","urls":["y.js"]};');
    expect(twice).not.toContain('"a"');
    expect(() => injectManifest('const x = 1;', { version: 'a', urls: [] })).toThrow();
  });
});
