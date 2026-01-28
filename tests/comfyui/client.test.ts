import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ComfyUIClient } from '../../src/comfyui/client.js';

// Mock ws module
const mockWsOn = vi.fn();
const mockWsClose = vi.fn();
vi.mock('ws', () => {
  const MockWebSocket = vi.fn(function(this: Record<string, unknown>) {
    this.on = mockWsOn;
    this.close = mockWsClose;
  });
  return { default: MockWebSocket };
});

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function mockJsonResponse(data: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    json: () => Promise.resolve(data),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
  };
}

describe('ComfyUIClient', () => {
  let client: ComfyUIClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockWsOn.mockReset();
    mockWsClose.mockReset();

    client = new ComfyUIClient({
      enabled: true,
      endpoint: 'http://127.0.0.1:8188',
      timeout: 30000,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should use default endpoint if not provided', () => {
      const c = new ComfyUIClient({ enabled: true });
      // Verify by calling ping which uses the endpoint
      mockFetch.mockResolvedValue(mockJsonResponse({}));
      void c.ping();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('http://127.0.0.1:8188'),
        expect.anything()
      );
    });
  });

  describe('ping', () => {
    it('should return true when server is reachable', async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({}));

      const result = await client.ping();

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://127.0.0.1:8188/system_stats',
        expect.anything()
      );
    });

    it('should return false when server is unreachable', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await client.ping();

      expect(result).toBe(false);
    });
  });

  describe('getSystemStats', () => {
    it('should fetch and return system stats', async () => {
      const mockStats = { cpu: 50, memory: 8000 };
      mockFetch.mockResolvedValue(mockJsonResponse(mockStats));

      const result = await client.getSystemStats();

      expect(result).toEqual(mockStats);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://127.0.0.1:8188/system_stats',
        expect.anything()
      );
    });
  });

  describe('queuePrompt', () => {
    it('should queue a workflow and return response', async () => {
      const workflow = { '1': { class_type: 'LoadImage' } };
      const mockResponse = {
        prompt_id: 'test-prompt-id',
        number: 1,
        node_errors: {},
      };

      mockFetch.mockResolvedValue(mockJsonResponse(mockResponse));

      const result = await client.queuePrompt(workflow);

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://127.0.0.1:8188/prompt',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"prompt"'),
        })
      );
    });
  });

  describe('getHistory', () => {
    it('should fetch history for a prompt ID', async () => {
      const promptId = 'test-prompt-id';
      const mockHistory = { [promptId]: { outputs: {} } };

      mockFetch.mockResolvedValue(mockJsonResponse(mockHistory));

      const result = await client.getHistory(promptId);

      expect(result).toEqual(mockHistory);
      expect(mockFetch).toHaveBeenCalledWith(
        `http://127.0.0.1:8188/history/${promptId}`,
        expect.anything()
      );
    });
  });

  describe('downloadImage', () => {
    it('should download image as buffer', async () => {
      const fakeData = new Uint8Array([1, 2, 3, 4]).buffer;
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        arrayBuffer: () => Promise.resolve(fakeData),
      });

      const result = await client.downloadImage('test.png');

      expect(result).toBeInstanceOf(Buffer);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/view?'),
        expect.anything()
      );
    });

    it('should include subfolder and type in request', async () => {
      const fakeData = new Uint8Array([1, 2, 3, 4]).buffer;
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        arrayBuffer: () => Promise.resolve(fakeData),
      });

      await client.downloadImage('test.png', 'characters', 'output');

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('filename=test.png');
      expect(calledUrl).toContain('subfolder=characters');
      expect(calledUrl).toContain('type=output');
    });
  });

  describe('injectContext', () => {
    it('should replace simple template variables', () => {
      const workflow = {
        '1': {
          inputs: {
            text: 'Character: {{name}}, Age: {{age}}',
          },
        },
      };

      const context = {
        name: 'Alice',
        age: 25,
      };

      const result = client.injectContext(workflow, context);

      expect(result['1'].inputs.text).toBe('Character: Alice, Age: 25');
    });

    it('should use defaults for missing values', () => {
      const workflow = {
        '1': {
          inputs: {
            text: 'Species: {{species}}',
          },
        },
      };

      const context = {
        title: 'Test',
      };

      const result = client.injectContext(workflow, context);

      expect(result['1'].inputs.text).toBe('Species: humanoid');
    });

    it('should handle nested property paths', () => {
      const workflow = {
        '1': {
          inputs: {
            text: 'Build: {{appearance.build}}, Hair: {{appearance.hair}}',
          },
        },
      };

      const context = {
        appearance: {
          build: 'athletic',
          hair: 'blonde',
        },
      };

      const result = client.injectContext(workflow, context);

      expect(result['1'].inputs.text).toBe('Build: athletic, Hair: blonde');
    });

    it('should replace in both text and prompt fields', () => {
      const workflow = {
        '1': {
          inputs: {
            text: 'Text: {{name}}',
            prompt: 'Prompt: {{name}}',
          },
        },
      };

      const context = { name: 'Alice' };

      const result = client.injectContext(workflow, context);

      expect(result['1'].inputs.text).toBe('Text: Alice');
      expect(result['1'].inputs.prompt).toBe('Prompt: Alice');
    });

    it('should only update specified nodes when targetNodes provided', () => {
      const workflow = {
        '1': { inputs: { text: 'Node 1: {{name}}' } },
        '2': { inputs: { text: 'Node 2: {{name}}' } },
      };

      const context = { name: 'Alice' };

      const result = client.injectContext(workflow, context, ['1']);

      expect(result['1'].inputs.text).toBe('Node 1: Alice');
      expect(result['2'].inputs.text).toBe('Node 2: {{name}}'); // Not updated
    });

    it('should not modify original workflow object', () => {
      const workflow = {
        '1': { inputs: { text: '{{name}}' } },
      };

      const context = { name: 'Alice' };

      client.injectContext(workflow, context);

      expect(workflow['1'].inputs.text).toBe('{{name}}'); // Original unchanged
    });

    it('should use title as fallback for name', () => {
      const workflow = {
        '1': { inputs: { text: '{{name}}' } },
      };

      const context = { title: 'Hero Character' };

      const result = client.injectContext(workflow, context);

      expect(result['1'].inputs.text).toBe('Hero Character');
    });

    it('should handle empty or null values gracefully', () => {
      const workflow = {
        '1': { inputs: { text: '{{name}} - {{missing}}' } },
      };

      const context = { name: '' };

      const result = client.injectContext(workflow, context);

      // Empty name falls back to title default which is 'character', missing uses empty default
      expect(result['1'].inputs.text).toBe('character - ');
    });

    it('should find prompt nodes automatically', () => {
      const workflow = {
        '1': { class_type: 'CLIPTextEncode', inputs: { text: '{{name}}' } },
        '2': { class_type: 'LoadImage', inputs: {} }, // Not a prompt node
        '3': { class_type: 'TextPrompt', inputs: { text: '{{name}}' } },
      };

      const context = { name: 'Alice' };

      const result = client.injectContext(workflow, context);

      expect(result['1'].inputs.text).toBe('Alice');
      expect(result['3'].inputs.text).toBe('Alice');
    });
  });

  describe('fetchJson error handling', () => {
    it('should throw on non-ok response', async () => {
      mockFetch.mockResolvedValue(mockJsonResponse({}, false, 500));
      await expect(client.getSystemStats()).rejects.toThrow('HTTP 500');
    });
  });

  describe('downloadImage error handling', () => {
    it('should throw on non-ok response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });
      await expect(client.downloadImage('missing.png')).rejects.toThrow('HTTP 404');
    });
  });

  describe('connectWebSocket', () => {
    it('should create WebSocket and register message handler', () => {
      const onProgress = vi.fn();
      client.connectWebSocket(onProgress);

      expect(mockWsOn).toHaveBeenCalledWith('message', expect.any(Function));
      expect(mockWsOn).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should parse and forward valid messages', () => {
      const onProgress = vi.fn();
      client.connectWebSocket(onProgress);

      const messageHandler = mockWsOn.mock.calls.find((c: unknown[]) => c[0] === 'message')![1] as (data: unknown) => void;
      messageHandler(JSON.stringify({ type: 'progress', data: { value: 1, max: 10 } }));

      expect(onProgress).toHaveBeenCalledWith({ type: 'progress', data: { value: 1, max: 10 } });
    });

    it('should handle invalid JSON messages gracefully', () => {
      const onProgress = vi.fn();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      client.connectWebSocket(onProgress);

      const messageHandler = mockWsOn.mock.calls.find((c: unknown[]) => c[0] === 'message')![1] as (data: unknown) => void;
      messageHandler('not-json');

      expect(consoleSpy).toHaveBeenCalledWith('Failed to parse WebSocket message:', expect.any(Error));
      expect(onProgress).not.toHaveBeenCalled();
    });

    it('should log WebSocket errors', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      client.connectWebSocket(vi.fn());

      const errorHandler = mockWsOn.mock.calls.find((c: unknown[]) => c[0] === 'error')![1] as (err: unknown) => void;
      errorHandler(new Error('ws fail'));

      expect(consoleSpy).toHaveBeenCalledWith('WebSocket error:', expect.any(Error));
    });
  });

  describe('disconnectWebSocket', () => {
    it('should not throw when no websocket is connected', () => {
      expect(() => client.disconnectWebSocket()).not.toThrow();
    });

    it('should close and clear websocket when connected', () => {
      client.connectWebSocket(vi.fn());
      client.disconnectWebSocket();

      expect(mockWsClose).toHaveBeenCalled();
    });
  });

  describe('executeWorkflow', () => {
    const historyEntry = {
      prompt: [0, 'id', {}, {}, []],
      outputs: {},
      status: { status_str: 'success', completed: true },
    };

    // Use a short-timeout client for these tests (real timers)
    let fastClient: ComfyUIClient;

    beforeEach(() => {
      fastClient = new ComfyUIClient({
        enabled: true,
        endpoint: 'http://127.0.0.1:8188',
        timeout: 3000,
      });
    });

    it('should queue prompt and poll history until complete', async () => {
      mockFetch
        .mockResolvedValueOnce(mockJsonResponse({ prompt_id: 'p1', number: 1, node_errors: {} }))
        .mockResolvedValueOnce(mockJsonResponse({ p1: historyEntry }));

      const result = await fastClient.executeWorkflow({ '1': {} });
      expect(result).toEqual(historyEntry);
    });

    it('should throw on node errors', async () => {
      mockFetch.mockResolvedValueOnce(mockJsonResponse({
        prompt_id: 'p1',
        number: 1,
        node_errors: { '1': { message: 'bad node' } },
      }));

      await expect(fastClient.executeWorkflow({ '1': {} })).rejects.toThrow('Node errors');
    });

    it('should connect WebSocket when onProgress provided', async () => {
      mockFetch
        .mockResolvedValueOnce(mockJsonResponse({ prompt_id: 'p1', number: 1, node_errors: {} }))
        .mockResolvedValueOnce(mockJsonResponse({ p1: historyEntry }));

      const onProgress = vi.fn();
      await fastClient.executeWorkflow({ '1': {} }, onProgress);

      expect(mockWsOn).toHaveBeenCalled();
    });

    it('should timeout if history never returns result', async () => {
      const tinyClient = new ComfyUIClient({
        enabled: true,
        endpoint: 'http://127.0.0.1:8188',
        timeout: 1500,
      });

      mockFetch
        .mockResolvedValueOnce(mockJsonResponse({ prompt_id: 'p1', number: 1, node_errors: {} }))
        .mockResolvedValue(mockJsonResponse({}));

      await expect(tinyClient.executeWorkflow({ '1': {} })).rejects.toThrow('Workflow execution timed out');
    }, 5000);

    it('should reject when history polling fails', async () => {
      mockFetch
        .mockResolvedValueOnce(mockJsonResponse({ prompt_id: 'p1', number: 1, node_errors: {} }))
        .mockRejectedValue(new Error('network down'));

      await expect(fastClient.executeWorkflow({ '1': {} })).rejects.toThrow('network down');
    }, 5000);

    it('should wrap non-Error rejections from history polling', async () => {
      mockFetch
        .mockResolvedValueOnce(mockJsonResponse({ prompt_id: 'p1', number: 1, node_errors: {} }))
        .mockRejectedValue('string error');

      await expect(fastClient.executeWorkflow({ '1': {} })).rejects.toThrow('string error');
    }, 5000);
  });

  describe('getNestedValue edge cases', () => {
    it('should return undefined for non-existent nested path', () => {
      const workflow = {
        '1': { inputs: { text: '{{a.b.c}}' } },
      };
      const result = client.injectContext(workflow, { a: { b: {} } });
      expect(result['1'].inputs.text).toBe('');
    });

    it('should return undefined when intermediate is not an object', () => {
      const workflow = {
        '1': { inputs: { text: '{{a.b.c}}' } },
      };
      const result = client.injectContext(workflow, { a: 'string' });
      expect(result['1'].inputs.text).toBe('');
    });
  });
});
