// Runs the app's own Node-style proxy plugins (Vite middleware) inside a Worker.
// It collects the routes each plugin registers, then answers a fetch Request by
// handing the plugin a minimal Node-like request and response.
import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';

const PROXY_HEADERS = new Set([
  'forwarded',
  'via',
  'x-forwarded-for',
  'x-forwarded-host',
  'x-forwarded-port',
  'x-forwarded-proto',
  'x-real-ip',
  'cf-connecting-ip',
  'cf-ray',
]);

class FakeResponse extends EventEmitter {
  constructor(resolve) {
    super();
    this._resolve = resolve;
    this.statusCode = 200;
    this._headers = new Map();
    this._chunks = [];
    this.headersSent = false;
    this.writableEnded = false;
    this.destroyed = false;
  }
  setHeader(name, value) {
    this._headers.set(String(name).toLowerCase(), value);
    return this;
  }
  getHeader(name) {
    return this._headers.get(String(name).toLowerCase());
  }
  hasHeader(name) {
    return this._headers.has(String(name).toLowerCase());
  }
  removeHeader(name) {
    this._headers.delete(String(name).toLowerCase());
  }
  getHeaders() {
    return Object.fromEntries(this._headers);
  }
  writeHead(status, a, b) {
    this.statusCode = status;
    const headers = typeof a === 'object' && a ? a : b;
    if (headers) {
      if (Array.isArray(headers)) {
        for (let i = 0; i + 1 < headers.length; i += 2)
          this.setHeader(headers[i], headers[i + 1]);
      } else {
        for (const [k, v] of Object.entries(headers)) this.setHeader(k, v);
      }
    }
    this.headersSent = true;
    return this;
  }
  write(chunk) {
    if (chunk != null)
      this._chunks.push(
        typeof chunk === 'string' ? new TextEncoder().encode(chunk) : chunk,
      );
    this.headersSent = true;
    return true;
  }
  flushHeaders() {}
  end(chunk) {
    if (this.writableEnded) return this;
    if (chunk != null && typeof chunk !== 'function') this.write(chunk);
    this.writableEnded = true;
    this.headersSent = true;
    const headers = new Headers();
    for (const [k, v] of this._headers) {
      if (Array.isArray(v)) v.forEach((x) => headers.append(k, String(x)));
      else headers.set(k, String(v));
    }
    headers.delete('content-length');
    const parts = this._chunks;
    const total = parts.reduce((n, p) => n + p.byteLength, 0);
    const body = new Uint8Array(total);
    let offset = 0;
    for (const p of parts) {
      body.set(p, offset);
      offset += p.byteLength;
    }
    const noBody = [204, 205, 304].includes(this.statusCode);
    this._resolve(
      new Response(noBody ? null : body, { status: this.statusCode, headers }),
    );
    queueMicrotask(() => this.emit('close'));
    return this;
  }
}

function matches(mount, pathname) {
  if (mount === '' || mount === '/') return true;
  return pathname === mount || pathname.startsWith(`${mount}/`);
}

export function createNodeRouter(plugins) {
  const routes = [];
  const server = {
    middlewares: {
      use(a, b) {
        const [mount, fn] = typeof a === 'function' ? ['/', a] : [a, b];
        routes.push({ mount: mount.replace(/\/+$/, ''), fn });
      },
    },
    config: {},
    httpServer: null,
    watcher: { on() {}, add() {} },
    ws: { send() {}, on() {} },
  };
  for (const plugin of plugins) {
    try {
      (plugin.configurePreviewServer || plugin.configureServer)?.(server);
    } catch (error) {
      console.warn(
        `[worker] ${plugin?.name || 'plugin'} failed to start:`,
        error?.message,
      );
    }
  }

  return async function handle(request) {
    const url = new URL(request.url);
    const body =
      request.method === 'GET' || request.method === 'HEAD'
        ? Buffer.alloc(0)
        : Buffer.from(await request.arrayBuffer());
    const candidates = routes.filter((r) => matches(r.mount, url.pathname));
    if (!candidates.length) return null;
    return new Promise((resolve) => {
      let index = 0;
      const res = new FakeResponse(resolve);
      const run = (error) => {
        if (error) {
          console.warn('[worker] handler error:', error?.message);
          if (!res.writableEnded)
            res
              .writeHead(500, { 'Content-Type': 'application/json' })
              .end('{"error":"internal_error"}');
          return;
        }
        const route = candidates[index++];
        if (!route) {
          res
            .writeHead(404, { 'Content-Type': 'application/json' })
            .end('{"error":"not_found"}');
          return;
        }
        const rest = url.pathname.slice(route.mount.length) || '/';
        const req = Readable.from(body.length ? [body] : []);
        req.method = request.method;
        req.url = rest + url.search;
        req.originalUrl = url.pathname + url.search;
        // This Worker is the edge: hide the CDN's forwarding headers from the
        // plugins, which would otherwise refuse the request as proxied.
        req.headers = Object.fromEntries(
          [...request.headers]
            .map(([k, v]) => [k.toLowerCase(), v])
            .filter(([k]) => !PROXY_HEADERS.has(k)),
        );
        req.socket = {
          remoteAddress:
            request.headers.get('cf-connecting-ip') || '203.0.113.1',
          encrypted: url.protocol === 'https:',
        };
        req.connection = req.socket;
        try {
          const result = route.fn(req, res, run);
          if (result && typeof result.catch === 'function') result.catch(run);
        } catch (e) {
          run(e);
        }
      };
      run();
    });
  };
}
