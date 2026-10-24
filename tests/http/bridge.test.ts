import { afterEach, describe, expect, it } from 'vitest';
import {
  createAuthMiddleware,
  createHttpBridge,
  getAllowedHostnames,
  resolveApiKey,
  startHttpBridge,
} from '../../src/http/bridge.js';
import type { HttpBridgeConfig, HttpBridgeContext } from '../../src/http/bridge.js';
import { HttpConfigSchema } from '../../src/config/schema.js';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { request as httpRequest } from 'node:http';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const API_KEY = 'test-key-0123456789';
const ALLOWED_ORIGIN = 'http://localhost:8000';

const activeServers: Server[] = [];
const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    activeServers.splice(0).map(
      server =>
        new Promise<void>((resolve, reject) => {
          server.close(err => (err ? reject(err) : resolve()));
        })
    )
  );
  await Promise.all(tempDirs.splice(0).map(dir => rm(dir, { recursive: true, force: true })));
});

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'hivemind-bridge-'));
  tempDirs.push(dir);
  return dir;
}

function baseConfig(overrides?: Partial<HttpBridgeConfig>): HttpBridgeConfig {
  return {
    host: '127.0.0.1',
    port: 0,
    corsOrigins: [ALLOWED_ORIGIN],
    apiKey: API_KEY,
    ...overrides,
  };
}

/**
 * fetch() won't let us override Host, so use node:http for raw requests
 */
function rawGet(
  baseUrl: string,
  path: string,
  headers: Record<string, string>
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = httpRequest(`${baseUrl}${path}`, { method: 'GET', headers }, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => (body += chunk));
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function startTestServer(
  context: HttpBridgeContext,
  config: HttpBridgeConfig = baseConfig()
): Promise<string> {
  const app = createHttpBridge(config, context);

  const server = app.listen(0, '127.0.0.1');
  activeServers.push(server);

  await new Promise<void>((resolve, reject) => {
    server.once('listening', () => resolve());
    server.once('error', reject);
  });

  const address = server.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}`;
}

function createContext(overrides?: Partial<HttpBridgeContext>): HttpBridgeContext {
  const database = {
    getStats: () => ({ nodes: 3, relationships: 7 }),
  };

  const vaultReader = {
    getStats: () => ({
      totalNotes: 2,
      byType: { character: 1, location: 1 },
      byStatus: { canon: 2 },
    }),
  };

  return {
    searchEngine: {} as HttpBridgeContext['searchEngine'],
    vaultReader: vaultReader as HttpBridgeContext['vaultReader'],
    database: database as HttpBridgeContext['database'],
    ...overrides,
  };
}

describe('HTTP bridge top-level endpoints', () => {
  it('returns health response at /health', async () => {
    const baseUrl = await startTestServer(createContext());

    const response = await fetch(`${baseUrl}/health`);
    const body = (await response.json()) as {
      status: string;
      timestamp: string;
      stats: { nodes: number; relationships: number };
    };

    expect(response.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(Number.isNaN(Date.parse(body.timestamp))).toBe(false);
    expect(body.stats).toEqual({ nodes: 3, relationships: 7 });
  });

  it('returns stats response at /stats', async () => {
    const baseUrl = await startTestServer(createContext());

    const response = await fetch(`${baseUrl}/stats`, { headers: { 'X-API-Key': API_KEY } });
    const body = (await response.json()) as {
      vault: {
        totalNotes: number;
        byType: Record<string, number>;
        byStatus: Record<string, number>;
      };
      graph: { nodes: number; relationships: number };
    };

    expect(response.status).toBe(200);
    expect(body).toEqual({
      vault: {
        totalNotes: 2,
        byType: { character: 1, location: 1 },
        byStatus: { canon: 2 },
      },
      graph: {
        nodes: 3,
        relationships: 7,
      },
    });
  });

  it('returns 500 from /stats when vault stats fail', async () => {
    const baseUrl = await startTestServer(
      createContext({
        vaultReader: {
          getStats: () => {
            throw new Error('boom');
          },
        } as HttpBridgeContext['vaultReader'],
      })
    );

    const response = await fetch(`${baseUrl}/stats`, { headers: { 'X-API-Key': API_KEY } });
    const body = (await response.json()) as {
      error: string;
      message: string;
    };

    expect(response.status).toBe(500);
    expect(body.error).toBe('Failed to get stats');
    expect(body.message).toBe('boom');
  });

  it('returns 500 from /health when database stats fail', async () => {
    const baseUrl = await startTestServer(
      createContext({
        database: {
          getStats: () => {
            throw new Error('db unavailable');
          },
        } as HttpBridgeContext['database'],
      })
    );

    const response = await fetch(`${baseUrl}/health`);
    const body = (await response.json()) as {
      error: string;
      message: string;
    };

    expect(response.status).toBe(500);
    expect(body.error).toBe('Failed to get health status');
    expect(body.message).toBe('db unavailable');
  });
});

describe('HTTP bridge configuration guards', () => {
  it('refuses to create a bridge without an API key', () => {
    expect(() => createHttpBridge(baseConfig({ apiKey: undefined }), createContext())).toThrow(
      /without an API key/
    );
    expect(() => createHttpBridge(baseConfig({ apiKey: '' }), createContext())).toThrow(
      /without an API key/
    );
  });

  it('rejects "*" in corsOrigins', () => {
    expect(() => createHttpBridge(baseConfig({ corsOrigins: ['*'] }), createContext())).toThrow(
      /"\*" is not allowed/
    );
  });

  it('rejects "*" in corsOrigins at config validation time', () => {
    const result = HttpConfigSchema.safeParse({ enabled: true, corsOrigins: ['*'] });
    expect(result.success).toBe(false);
  });

  it('keeps existing http configs without apiKey or allowedHosts valid', () => {
    const result = HttpConfigSchema.safeParse({
      enabled: true,
      port: 3847,
      host: 'localhost',
      corsOrigins: ['http://localhost:8000'],
    });
    expect(result.success).toBe(true);
  });
});

describe('HTTP bridge API key authentication', () => {
  it('rejects /api requests without a key', async () => {
    const baseUrl = await startTestServer(createContext());

    const response = await fetch(`${baseUrl}/api/health`);

    expect(response.status).toBe(401);
  });

  it('rejects /api requests with a wrong key, including a same-length one', async () => {
    const baseUrl = await startTestServer(createContext());
    const sameLength = `${API_KEY.slice(0, -1)}x`;

    for (const key of ['nope', sameLength, `${API_KEY}extra`]) {
      const response = await fetch(`${baseUrl}/api/health`, { headers: { 'X-API-Key': key } });
      expect(response.status).toBe(401);
    }
  });

  it('accepts /api requests with the right key', async () => {
    const baseUrl = await startTestServer(createContext());

    const response = await fetch(`${baseUrl}/api/health`, { headers: { 'X-API-Key': API_KEY } });

    expect(response.status).toBe(200);
  });

  it('protects /stats but leaves /health open', async () => {
    const baseUrl = await startTestServer(createContext());

    expect((await fetch(`${baseUrl}/stats`)).status).toBe(401);
    expect((await fetch(`${baseUrl}/health`)).status).toBe(200);
  });

  it('rejects a non-string X-API-Key header', () => {
    const middleware = createAuthMiddleware(API_KEY);
    let status = 0;
    let nextCalled = false;
    const res = {
      status: (code: number) => {
        status = code;
        return { json: () => undefined };
      },
    };

    middleware({ headers: { 'x-api-key': [API_KEY, API_KEY] } } as never, res as never, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(false);
    expect(status).toBe(401);
  });
});

describe('HTTP bridge Host header validation', () => {
  it.each(['localhost', '127.0.0.1', '[::1]', 'LOCALHOST'])('accepts Host: %s', async host => {
    const baseUrl = await startTestServer(createContext());
    const port = new URL(baseUrl).port;

    const response = await rawGet(baseUrl, '/health', { Host: `${host}:${port}` });

    expect(response.status).toBe(200);
  });

  it('rejects a rebinding Host even with a valid key', async () => {
    const baseUrl = await startTestServer(createContext());
    const port = new URL(baseUrl).port;

    for (const path of ['/health', '/stats', '/api/health']) {
      const response = await rawGet(baseUrl, path, {
        Host: `attacker.example:${port}`,
        'X-API-Key': API_KEY,
      });
      expect(response.status).toBe(403);
      expect(JSON.parse(response.body)).toEqual({ error: 'Host not allowed' });
    }
  });

  it('accepts the configured host and allowedHosts but not a wildcard bind address', async () => {
    const baseUrl = await startTestServer(
      createContext(),
      baseConfig({ host: '0.0.0.0', allowedHosts: ['hivemind.lan'] })
    );
    const port = new URL(baseUrl).port;

    expect((await rawGet(baseUrl, '/health', { Host: `hivemind.lan:${port}` })).status).toBe(200);
    expect((await rawGet(baseUrl, '/health', { Host: `0.0.0.0:${port}` })).status).toBe(403);
  });

  it('builds the allowed hostname set', () => {
    expect([...getAllowedHostnames(baseConfig({ host: 'My-Box.local' }))].sort()).toEqual(
      ['127.0.0.1', '::1', 'localhost', 'my-box.local'].sort()
    );
    expect(getAllowedHostnames(baseConfig({ host: '::' })).has('::')).toBe(false);
    expect(getAllowedHostnames(baseConfig({ host: '[::1]' })).has('::1')).toBe(true);
  });
});

describe('HTTP bridge CORS', () => {
  it('allows a configured origin', async () => {
    const baseUrl = await startTestServer(createContext());

    const response = await fetch(`${baseUrl}/health`, { headers: { Origin: ALLOWED_ORIGIN } });

    expect(response.status).toBe(200);
    expect(response.headers.get('access-control-allow-origin')).toBe(ALLOWED_ORIGIN);
  });

  it('rejects an unlisted origin with 403', async () => {
    const baseUrl = await startTestServer(createContext());

    const response = await fetch(`${baseUrl}/api/health`, {
      headers: { Origin: 'http://evil.example', 'X-API-Key': API_KEY },
    });

    expect(response.status).toBe(403);
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
  });
});

describe('HTTP bridge API key provisioning', () => {
  it('prefers the configured key and writes no file', async () => {
    const dir = await makeTempDir();
    const apiKeyFile = join(dir, 'http-api-key');

    const result = await resolveApiKey(baseConfig({ apiKeyFile }));

    expect(result).toEqual({ apiKey: API_KEY, source: 'config' });
    await expect(stat(apiKeyFile)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('refuses when there is neither a key nor a key file', async () => {
    await expect(resolveApiKey(baseConfig({ apiKey: undefined }))).rejects.toThrow(
      /without an API key/
    );
  });

  it('generates a key with mode 0o600 and reuses it afterwards', async () => {
    const dir = await makeTempDir();
    const apiKeyFile = join(dir, 'nested', 'http-api-key');

    const first = await resolveApiKey(baseConfig({ apiKey: undefined, apiKeyFile }));
    const second = await resolveApiKey(baseConfig({ apiKey: undefined, apiKeyFile }));

    expect(first.source).toBe('generated');
    expect(first.apiKey).toMatch(/^[0-9a-f]{64}$/);
    expect(second).toEqual({ apiKey: first.apiKey, source: 'file' });
    expect((await readFile(apiKeyFile, 'utf-8')).trim()).toBe(first.apiKey);
    if (process.platform !== 'win32') {
      expect((await stat(apiKeyFile)).mode & 0o777).toBe(0o600);
    }
  });

  it('replaces an empty key file and tightens its mode', async () => {
    const dir = await makeTempDir();
    const apiKeyFile = join(dir, 'http-api-key');
    await writeFile(apiKeyFile, '\n', { mode: 0o644 });

    const result = await resolveApiKey(baseConfig({ apiKey: undefined, apiKeyFile }));

    expect(result.source).toBe('generated');
    expect((await readFile(apiKeyFile, 'utf-8')).trim()).toBe(result.apiKey);
    if (process.platform !== 'win32') {
      expect((await stat(apiKeyFile)).mode & 0o777).toBe(0o600);
    }
  });

  it('starts without a configured key by generating one', async () => {
    const dir = await makeTempDir();
    const apiKeyFile = join(dir, 'http-api-key');

    const bridge = await startHttpBridge(
      baseConfig({ apiKey: undefined, apiKeyFile }),
      createContext()
    );
    try {
      const key = (await readFile(apiKeyFile, 'utf-8')).trim();
      expect(key).toMatch(/^[0-9a-f]{64}$/);
      expect(bridge.app).toBeDefined();
    } finally {
      await bridge.close();
    }
  });
});
