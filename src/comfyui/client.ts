import WebSocket from 'ws';
import { ComfyUIConfig } from '../types/index.js';

export interface ComfyUINodeData {
  class_type?: string;
  inputs?: Record<string, unknown>;
  [key: string]: unknown;
}

export type ComfyUIWorkflowData = Record<string, ComfyUINodeData>;

export interface ComfyUIPrompt {
  prompt: Record<string, unknown>;
  client_id?: string;
}

export interface ComfyUIQueueResponse {
  prompt_id: string;
  number: number;
  node_errors: Record<string, ComfyUINodeError>;
}

export interface ComfyUINodeError {
  message?: string;
  details?: string;
  [key: string]: unknown;
}

export interface ComfyUISystemStats {
  system: {
    os: string;
    python_version: string;
    embedded_python: boolean;
    [key: string]: unknown;
  };
  devices: Array<{
    name: string;
    type: string;
    vram_total: number;
    vram_free: number;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

export interface ComfyUIHistoryEntry {
  prompt: [number, string, ComfyUIWorkflowData, Record<string, unknown>, string[]];
  outputs: Record<string, ComfyUINodeOutput>;
  status: {
    status_str: string;
    completed: boolean;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface ComfyUINodeOutput {
  images?: Array<{ filename: string; subfolder: string; type: string }>;
  [key: string]: unknown;
}

export type ComfyUIHistory = Record<string, ComfyUIHistoryEntry>;

export interface ComfyUIProgress {
  type: 'progress' | 'executing' | 'executed';
  data: {
    node?: string;
    value?: number;
    max?: number;
    output?: Record<string, unknown>;
  };
}

export class ComfyUIClient {
  private endpoint: string;
  private timeout: number;
  private clientId: string;
  private wsClient?: WebSocket;

  constructor(config: ComfyUIConfig) {
    this.endpoint = config.endpoint || 'http://127.0.0.1:8188';
    this.timeout = config.timeout || 300000; // 5 minutes default
    this.clientId = this.generateClientId();
  }

  private generateClientId(): string {
    return `hivemind-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  private async fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${this.endpoint}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json() as T;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async ping(): Promise<boolean> {
    try {
      await this.fetchJson('/system_stats');
      return true;
    } catch (_error) {
      return false;
    }
  }

  async getSystemStats(): Promise<ComfyUISystemStats> {
    return this.fetchJson<ComfyUISystemStats>('/system_stats');
  }

  async queuePrompt(workflow: Record<string, unknown>): Promise<ComfyUIQueueResponse> {
    const payload: ComfyUIPrompt = {
      prompt: workflow,
      client_id: this.clientId,
    };

    return this.fetchJson<ComfyUIQueueResponse>('/prompt', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getHistory(promptId: string): Promise<ComfyUIHistory> {
    return this.fetchJson<ComfyUIHistory>(`/history/${promptId}`);
  }

  async downloadImage(filename: string, subfolder: string = '', type: string = 'output'): Promise<Buffer> {
    const params = new URLSearchParams({
      filename,
      subfolder,
      type,
    });

    const url = `${this.endpoint}/view?${params.toString()}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, { signal: controller.signal });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } finally {
      clearTimeout(timeoutId);
    }
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
    workflow: Record<string, unknown>,
    onProgress?: (progress: ComfyUIProgress) => void
  ): Promise<ComfyUIHistoryEntry> {
    if (onProgress) {
      this.connectWebSocket(onProgress);
    }

    try {
      const queueResponse = await this.queuePrompt(workflow);
      const promptId = queueResponse.prompt_id;

      if (Object.keys(queueResponse.node_errors).length > 0) {
        this.disconnectWebSocket();
        throw new Error(`Node errors: ${JSON.stringify(queueResponse.node_errors)}`);
      }

      return await new Promise<ComfyUIHistoryEntry>((resolve, reject) => {
        const checkInterval = setInterval(() => {
          this.getHistory(promptId)
            .then((history) => {
              if (history[promptId]) {
                clearInterval(checkInterval);
                this.disconnectWebSocket();
                resolve(history[promptId]);
              }
            })
            .catch((error: unknown) => {
              clearInterval(checkInterval);
              this.disconnectWebSocket();
              reject(error instanceof Error ? error : new Error(String(error)));
            });
        }, 1000);

        setTimeout(() => {
          clearInterval(checkInterval);
          this.disconnectWebSocket();
          reject(new Error('Workflow execution timed out'));
        }, this.timeout);
      });
    } catch (error) {
      this.disconnectWebSocket();
      throw error;
    }
  }

  injectContext(
    workflow: Record<string, unknown>,
    context: Record<string, unknown>,
    targetNodes?: string[]
  ): Record<string, unknown> {
    const workflowCopy = JSON.parse(JSON.stringify(workflow)) as ComfyUIWorkflowData;
    const nodesToUpdate = targetNodes || this.findPromptNodes(workflowCopy);

    for (const nodeId of nodesToUpdate) {
      if (workflowCopy[nodeId] && workflowCopy[nodeId].inputs) {
        const inputs = workflowCopy[nodeId].inputs;

        if (typeof inputs.text === 'string') {
          inputs.text = this.interpolateContext(inputs.text, context);
        }
        if (typeof inputs.prompt === 'string') {
          inputs.prompt = this.interpolateContext(inputs.prompt, context);
        }
      }
    }

    return workflowCopy;
  }

  private findPromptNodes(workflow: ComfyUIWorkflowData): string[] {
    const promptNodes: string[] = [];

    for (const [nodeId, node] of Object.entries(workflow)) {
      const nodeData = node as ComfyUINodeData;
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

  private interpolateContext(text: string, context: Record<string, unknown>): string {
    return text.replace(/\{\{([^}]+)\}\}/g, (_match, path) => {
      const trimmedPath = path.trim();
      const value = this.getNestedValue(context, trimmedPath);

      // If value is found, use it
      if (value !== undefined && value !== null && value !== '') {
        return String(value);
      }

      // Provide sensible defaults for common missing fields instead of leaving template vars
      const defaults: Record<string, string> = {
        'name': (typeof context.title === 'string' ? context.title : '') || 'character',
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

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return current;
  }
}
