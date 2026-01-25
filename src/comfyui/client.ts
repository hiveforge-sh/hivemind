import axios, { AxiosInstance } from 'axios';
import WebSocket from 'ws';
import { ComfyUIConfig } from '../types/index.js';

export interface ComfyUIPrompt {
  prompt: Record<string, any>;
  client_id?: string;
}

export interface ComfyUIQueueResponse {
  prompt_id: string;
  number: number;
  node_errors: Record<string, any>;
}

export interface ComfyUIProgress {
  type: 'progress' | 'executing' | 'executed';
  data: {
    node?: string;
    value?: number;
    max?: number;
    output?: any;
  };
}

export class ComfyUIClient {
  private httpClient: AxiosInstance;
  private wsClient?: WebSocket;
  private endpoint: string;
  private timeout: number;
  private clientId: string;

  constructor(config: ComfyUIConfig) {
    this.endpoint = config.endpoint || 'http://127.0.0.1:8188';
    this.timeout = config.timeout || 300000; // 5 minutes default
    this.clientId = this.generateClientId();

    this.httpClient = axios.create({
      baseURL: this.endpoint,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  private generateClientId(): string {
    return `hivemind-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  async ping(): Promise<boolean> {
    try {
      await this.httpClient.get('/system_stats');
      return true;
    } catch (error) {
      return false;
    }
  }

  async getSystemStats(): Promise<any> {
    const response = await this.httpClient.get('/system_stats');
    return response.data;
  }

  async queuePrompt(workflow: Record<string, any>): Promise<ComfyUIQueueResponse> {
    const payload: ComfyUIPrompt = {
      prompt: workflow,
      client_id: this.clientId,
    };

    const response = await this.httpClient.post('/prompt', payload);
    return response.data;
  }

  async getHistory(promptId: string): Promise<any> {
    const response = await this.httpClient.get(`/history/${promptId}`);
    return response.data;
  }

  async downloadImage(filename: string, subfolder: string = '', type: string = 'output'): Promise<Buffer> {
    const params = new URLSearchParams({
      filename,
      subfolder,
      type,
    });

    const response = await this.httpClient.get(`/view?${params.toString()}`, {
      responseType: 'arraybuffer',
    });

    return Buffer.from(response.data);
  }

  connectWebSocket(onProgress: (progress: ComfyUIProgress) => void): void {
    const wsUrl = this.endpoint.replace('http', 'ws') + `/ws?clientId=${this.clientId}`;
    this.wsClient = new WebSocket(wsUrl);

    this.wsClient.on('message', (data: WebSocket.Data) => {
      try {
        const message = JSON.parse(data.toString());
        onProgress(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    });

    this.wsClient.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }

  disconnectWebSocket(): void {
    if (this.wsClient) {
      this.wsClient.close();
      this.wsClient = undefined;
    }
  }

  async executeWorkflow(
    workflow: Record<string, any>,
    onProgress?: (progress: ComfyUIProgress) => void
  ): Promise<any> {
    return new Promise(async (resolve, reject) => {
      try {
        if (onProgress) {
          this.connectWebSocket(onProgress);
        }

        const queueResponse = await this.queuePrompt(workflow);
        const promptId = queueResponse.prompt_id;

        if (Object.keys(queueResponse.node_errors).length > 0) {
          this.disconnectWebSocket();
          return reject(new Error(`Node errors: ${JSON.stringify(queueResponse.node_errors)}`));
        }

        const checkInterval = setInterval(async () => {
          try {
            const history = await this.getHistory(promptId);
            
            if (history[promptId]) {
              clearInterval(checkInterval);
              this.disconnectWebSocket();
              resolve(history[promptId]);
            }
          } catch (error) {
            clearInterval(checkInterval);
            this.disconnectWebSocket();
            reject(error);
          }
        }, 1000);

        setTimeout(() => {
          clearInterval(checkInterval);
          this.disconnectWebSocket();
          reject(new Error('Workflow execution timed out'));
        }, this.timeout);

      } catch (error) {
        this.disconnectWebSocket();
        reject(error);
      }
    });
  }

  injectContext(
    workflow: Record<string, any>,
    context: Record<string, any>,
    targetNodes?: string[]
  ): Record<string, any> {
    const workflowCopy = JSON.parse(JSON.stringify(workflow));
    const nodesToUpdate = targetNodes || this.findPromptNodes(workflowCopy);

    for (const nodeId of nodesToUpdate) {
      if (workflowCopy[nodeId] && workflowCopy[nodeId].inputs) {
        const inputs = workflowCopy[nodeId].inputs;
        
        if (inputs.text) {
          inputs.text = this.interpolateContext(inputs.text, context);
        }
        if (inputs.prompt) {
          inputs.prompt = this.interpolateContext(inputs.prompt, context);
        }
      }
    }

    return workflowCopy;
  }

  private findPromptNodes(workflow: Record<string, any>): string[] {
    const promptNodes: string[] = [];

    for (const [nodeId, node] of Object.entries(workflow)) {
      const nodeData = node as any;
      if (
        nodeData.class_type?.includes('CLIP') ||
        nodeData.class_type?.includes('Text') ||
        nodeData.class_type?.includes('Prompt') ||
        nodeData.inputs?.text ||
        nodeData.inputs?.prompt
      ) {
        promptNodes.push(nodeId);
      }
    }

    return promptNodes;
  }

  private interpolateContext(text: string, context: Record<string, any>): string {
    return text.replace(/\{\{([^}]+)\}\}/g, (_match, path) => {
      const trimmedPath = path.trim();
      const value = this.getNestedValue(context, trimmedPath);
      
      // If value is found, use it
      if (value !== undefined && value !== null && value !== '') {
        return String(value);
      }
      
      // Provide sensible defaults for common missing fields instead of leaving template vars
      const defaults: Record<string, string> = {
        'name': context.title || 'character',
        'age': 'adult',
        'species': 'humanoid',
        'race': 'humanoid',
        'appearance.build': 'average build',
        'appearance.height': 'average height',
        'appearance.hair': 'hair',
        'appearance.eyes': 'eyes',
        'appearance.clothing': 'clothing',
        'appearance.skin': 'skin',
        'appearance.distinctive_features': '',
      };
      
      return defaults[trimmedPath] || '';
    });
  }

  private getNestedValue(obj: Record<string, any>, path: string): any {
    const parts = path.split('.');
    let current = obj;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }

    return current;
  }
}
