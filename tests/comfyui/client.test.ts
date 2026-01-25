import { describe, it, expect, beforeEach } from '@jest/globals';
import { ComfyUIClient } from '../../src/comfyui/client.js';

describe('ComfyUIClient', () => {
  let client: ComfyUIClient;

  beforeEach(() => {
    client = new ComfyUIClient({
      enabled: true,
      endpoint: 'http://127.0.0.1:8188',
      timeout: 30000,
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
  });
});
