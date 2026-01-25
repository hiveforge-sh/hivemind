import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComfyUIClient } from '../../src/comfyui/client.js';
import axios from 'axios';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

describe('ComfyUIClient', () => {
  let client: ComfyUIClient;
  let mockAxiosInstance: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock axios instance
    mockAxiosInstance = {
      get: vi.fn(),
      post: vi.fn(),
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);

    client = new ComfyUIClient({
      enabled: true,
      endpoint: 'http://127.0.0.1:8188',
      timeout: 30000,
    });
  });

  describe('constructor', () => {
    it('should create axios instance with correct config', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'http://127.0.0.1:8188',
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });

    it('should use default endpoint if not provided', () => {
      vi.clearAllMocks();
      mockedAxios.create.mockReturnValue(mockAxiosInstance);
      
      new ComfyUIClient({ enabled: true });

      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'http://127.0.0.1:8188',
        })
      );
    });

    it('should use default timeout if not provided', () => {
      vi.clearAllMocks();
      mockedAxios.create.mockReturnValue(mockAxiosInstance);
      
      new ComfyUIClient({ enabled: true });

      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 300000, // 5 minutes
        })
      );
    });
  });

  describe('ping', () => {
    it('should return true when server is reachable', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: {} });

      const result = await client.ping();

      expect(result).toBe(true);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/system_stats');
    });

    it('should return false when server is unreachable', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Network error'));

      const result = await client.ping();

      expect(result).toBe(false);
    });
  });

  describe('getSystemStats', () => {
    it('should fetch and return system stats', async () => {
      const mockStats = { cpu: 50, memory: 8000 };
      mockAxiosInstance.get.mockResolvedValue({ data: mockStats });

      const result = await client.getSystemStats();

      expect(result).toEqual(mockStats);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/system_stats');
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

      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const result = await client.queuePrompt(workflow);

      expect(result).toEqual(mockResponse);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/prompt',
        expect.objectContaining({
          prompt: workflow,
        })
      );
    });
  });

  describe('getHistory', () => {
    it('should fetch history for a prompt ID', async () => {
      const promptId = 'test-prompt-id';
      const mockHistory = { [promptId]: { outputs: {} } };

      mockAxiosInstance.get.mockResolvedValue({ data: mockHistory });

      const result = await client.getHistory(promptId);

      expect(result).toEqual(mockHistory);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(`/history/${promptId}`);
    });
  });

  describe('downloadImage', () => {
    it('should download image as buffer', async () => {
      const mockBuffer = Buffer.from('fake-image-data');
      mockAxiosInstance.get.mockResolvedValue({ data: mockBuffer });

      const result = await client.downloadImage('test.png');

      expect(result).toBeInstanceOf(Buffer);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        expect.stringContaining('/view?'),
        expect.objectContaining({
          responseType: 'arraybuffer',
        })
      );
    });

    it('should include subfolder and type in request', async () => {
      const mockBuffer = Buffer.from('fake-image-data');
      mockAxiosInstance.get.mockResolvedValue({ data: mockBuffer });

      await client.downloadImage('test.png', 'characters', 'output');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        expect.stringContaining('filename=test.png'),
        expect.anything()
      );
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        expect.stringContaining('subfolder=characters'),
        expect.anything()
      );
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        expect.stringContaining('type=output'),
        expect.anything()
      );
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

  describe('disconnectWebSocket', () => {
    it('should not throw when no websocket is connected', () => {
      expect(() => client.disconnectWebSocket()).not.toThrow();
    });
  });
});
