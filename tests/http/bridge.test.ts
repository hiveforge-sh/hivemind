import { afterEach, describe, expect, it } from 'vitest';
import { createHttpBridge } from '../../src/http/bridge.js';
import type { HttpBridgeContext } from '../../src/http/bridge.js';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

const activeServers: Server[] = [];

afterEach(async () => {
  await Promise.all(
    activeServers.splice(0).map(
      server =>
        new Promise<void>((resolve, reject) => {
          server.close(err => (err ? reject(err) : resolve()));
        })
    )
  );
});

async function startTestServer(context: HttpBridgeContext): Promise<string> {
  const app = createHttpBridge(
    {
      host: '127.0.0.1',
      port: 0,
      corsOrigins: ['*'],
    },
    context
  );

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

    const response = await fetch(`${baseUrl}/stats`);
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

    const response = await fetch(`${baseUrl}/stats`);
    const body = (await response.json()) as {
      error: string;
      message: string;
    };

    expect(response.status).toBe(500);
    expect(body.error).toBe('Failed to get stats');
    expect(body.message).toBe('boom');
  });
});
