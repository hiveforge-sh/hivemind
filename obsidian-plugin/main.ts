import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';
import { spawn, ChildProcess } from 'child_process';

interface HivemindSettings {
  mcpServerPath: string;
  comfyuiEnabled: boolean;
  comfyuiEndpoint: string;
  autoStartMCP: boolean;
}

const DEFAULT_SETTINGS: HivemindSettings = {
  mcpServerPath: 'npx @hiveforge/hivemind-mcp start',
  comfyuiEnabled: false,
  comfyuiEndpoint: 'http://127.0.0.1:8188',
  autoStartMCP: false,
};

interface MCPToolCall {
  name: string;
  arguments: Record<string, any>;
}

interface MCPResponse {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

export default class HivemindPlugin extends Plugin {
  settings: HivemindSettings;
  private mcpProcess?: ChildProcess;
  private mcpStdin?: NodeJS.WritableStream | null;
  private mcpStdout?: NodeJS.ReadableStream | null;
  private pendingRequests: Map<number, {
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = new Map();
  private requestId: number = 1;
  private statusBarItem: HTMLElement;

  async onload() {
    await this.loadSettings();

    // Add status bar item
    this.statusBarItem = this.addStatusBarItem();
    this.statusBarItem.setText('Hivemind: Disconnected');

    // Add ribbon icon
    this.addRibbonIcon('brain-circuit', 'Hivemind', (evt: MouseEvent) => {
      new Notice('Hivemind MCP Plugin');
    });

    // Commands
    this.addCommand({
      id: 'generate-image-from-note',
      name: 'Generate image from current note',
      editorCallback: (editor: Editor, view: MarkdownView) => {
        this.generateImageFromNote(view.file);
      }
    });

    this.addCommand({
      id: 'browse-workflows',
      name: 'Browse ComfyUI workflows',
      callback: () => {
        this.browseWorkflows();
      }
    });

    this.addCommand({
      id: 'view-assets',
      name: 'View generated assets',
      callback: () => {
        new Notice('Asset gallery coming soon!');
      }
    });

    this.addCommand({
      id: 'connect-mcp',
      name: 'Connect to MCP server',
      callback: () => {
        this.startMCPServer();
      }
    });

    this.addCommand({
      id: 'disconnect-mcp',
      name: 'Disconnect from MCP server',
      callback: () => {
        this.stopMCPServer();
      }
    });

    // Settings tab
    this.addSettingTab(new HivemindSettingTab(this.app, this));

    // Auto-start if enabled
    if (this.settings.autoStartMCP) {
      this.startMCPServer();
    }
  }

  onunload() {
    this.stopMCPServer();
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  // MCP Server Communication

  async startMCPServer() {
    if (this.mcpProcess) {
      new Notice('MCP server already running');
      return;
    }

    try {
      const [command, ...args] = this.settings.mcpServerPath.split(' ');
      
      this.mcpProcess = spawn(command, args, {
        cwd: (this.app.vault.adapter as any).basePath,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      this.mcpStdin = this.mcpProcess.stdin;
      this.mcpStdout = this.mcpProcess.stdout;

      if (!this.mcpStdout) {
        throw new Error('Failed to get MCP stdout');
      }

      let buffer = '';
      this.mcpStdout.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const message = JSON.parse(line);
              this.handleMCPMessage(message);
            } catch (e) {
              console.error('Failed to parse MCP message:', line);
            }
          }
        }
      });

      this.mcpProcess.on('error', (error) => {
        console.error('MCP process error:', error);
        new Notice('Failed to start MCP server: ' + error.message);
        this.statusBarItem.setText('Hivemind: Error');
      });

      this.mcpProcess.on('exit', (code) => {
        console.log('MCP process exited with code:', code);
        this.mcpProcess = undefined;
        this.statusBarItem.setText('Hivemind: Disconnected');
      });

      this.statusBarItem.setText('Hivemind: Connected');
      new Notice('Connected to Hivemind MCP server');

    } catch (error) {
      console.error('Failed to start MCP server:', error);
      new Notice('Failed to start MCP server');
      this.statusBarItem.setText('Hivemind: Error');
    }
  }

  stopMCPServer() {
    if (this.mcpProcess) {
      this.mcpProcess.kill();
      this.mcpProcess = undefined;
      this.statusBarItem.setText('Hivemind: Disconnected');
      new Notice('Disconnected from MCP server');
    }
  }

  private handleMCPMessage(message: any) {
    if (message.id && this.pendingRequests.has(message.id)) {
      const request = this.pendingRequests.get(message.id)!;
      this.pendingRequests.delete(message.id);

      if (message.error) {
        request.reject(new Error(message.error.message || 'MCP error'));
      } else {
        request.resolve(message.result);
      }
    }
  }

  // Public method for modals to call MCP tools
  async callMCPTool(toolCall: MCPToolCall): Promise<MCPResponse> {
    if (!this.mcpStdin) {
      throw new Error('MCP server not connected');
    }

    return new Promise((resolve, reject) => {
      const id = this.requestId++;
      
      this.pendingRequests.set(id, { resolve, reject });

      const request = {
        jsonrpc: '2.0',
        id,
        method: 'tools/call',
        params: toolCall,
      };

      this.mcpStdin!.write(JSON.stringify(request) + '\n');

      // Timeout after 60 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('MCP request timeout'));
        }
      }, 60000);
    });
  }

  // Plugin Features

  private async generateImageFromNote(file: TFile | null) {
    if (!file) {
      new Notice('No active file');
      return;
    }

    try {
      // Parse frontmatter to get entity ID and type
      const content = await this.app.vault.read(file);
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      
      if (!frontmatterMatch) {
        new Notice('No frontmatter found in note');
        return;
      }

      const frontmatter = this.parseFrontmatter(frontmatterMatch[1]);
      
      if (!frontmatter.id || !frontmatter.type) {
        new Notice('Note must have id and type in frontmatter');
        return;
      }

      if (frontmatter.type !== 'character' && frontmatter.type !== 'location') {
        new Notice('Can only generate images for characters and locations');
        return;
      }

      // Show workflow selection modal
      new WorkflowSelectionModal(this.app, this, frontmatter.id, frontmatter.type).open();

    } catch (error) {
      console.error('Failed to generate image:', error);
      new Notice('Failed to generate image: ' + (error as Error).message);
    }
  }

  private async browseWorkflows() {
    if (!this.mcpProcess) {
      new Notice('Please connect to MCP server first');
      return;
    }

    try {
      const response = await this.callMCPTool({
        name: 'list_workflows',
        arguments: {},
      });

      if (response.isError || !response.content || response.content.length === 0) {
        new Notice('Failed to fetch workflows');
        return;
      }

      new WorkflowListModal(this.app, response.content[0].text).open();

    } catch (error) {
      console.error('Failed to browse workflows:', error);
      new Notice('Failed to browse workflows: ' + (error as Error).message);
    }
  }

  private parseFrontmatter(yaml: string): Record<string, any> {
    const result: Record<string, any> = {};
    const lines = yaml.split('\n');

    for (const line of lines) {
      const match = line.match(/^(\w+):\s*(.+)$/);
      if (match) {
        result[match[1]] = match[2].trim();
      }
    }

    return result;
  }

  async executeWorkflow(workflowId: string, contextId: string, contextType: string) {
    try {
      new Notice('Generating image...');

      const response = await this.callMCPTool({
        name: 'generate_image',
        arguments: {
          workflowId,
          contextId,
          contextType,
        },
      });

      if (response.isError) {
        new Notice('Image generation failed');
        return;
      }

      new Notice('Image generated successfully!');
      
      // Show result
      if (response.content && response.content[0]) {
        new ResultModal(this.app, response.content[0].text).open();
      }

    } catch (error) {
      console.error('Workflow execution failed:', error);
      new Notice('Workflow execution failed: ' + (error as Error).message);
    }
  }
}

// Workflow Selection Modal
class WorkflowSelectionModal extends Modal {
  plugin: HivemindPlugin;
  contextId: string;
  contextType: string;

  constructor(app: App, plugin: HivemindPlugin, contextId: string, contextType: string) {
    super(app);
    this.plugin = plugin;
    this.contextId = contextId;
    this.contextType = contextType;
  }

  async onOpen() {
    const { contentEl } = this;
    contentEl.createEl('h2', { text: 'Select Workflow' });

    try {
      const response = await this.plugin.callMCPTool({
        name: 'list_workflows',
        arguments: {},
      });

      if (!response.content || response.content.length === 0) {
        contentEl.createEl('p', { text: 'No workflows available' });
        return;
      }

      // Parse workflow list (simple parsing)
      const workflows = this.parseWorkflowList(response.content[0].text);

      workflows.forEach(workflow => {
        const button = contentEl.createEl('button', {
          text: workflow.name,
          cls: 'mod-cta',
        });
        
        button.addEventListener('click', () => {
          this.close();
          this.plugin.executeWorkflow(workflow.id, this.contextId, this.contextType);
        });
      });

    } catch (error) {
      contentEl.createEl('p', { text: 'Failed to load workflows: ' + (error as Error).message });
    }
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }

  private parseWorkflowList(text: string): Array<{ id: string; name: string }> {
    const workflows: Array<{ id: string; name: string }> = [];
    const matches = text.matchAll(/## (.+)\n- \*\*ID\*\*: `(.+)`/g);

    for (const match of matches) {
      workflows.push({
        name: match[1],
        id: match[2],
      });
    }

    return workflows;
  }
}

// Workflow List Modal
class WorkflowListModal extends Modal {
  content: string;

  constructor(app: App, content: string) {
    super(app);
    this.content = content;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl('div', { text: this.content, cls: 'markdown-preview-view' });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

// Result Modal
class ResultModal extends Modal {
  content: string;

  constructor(app: App, content: string) {
    super(app);
    this.content = content;
  }

  onOpen() {
    const { contentEl } = this;
    const pre = contentEl.createEl('pre');
    pre.createEl('code', { text: this.content });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

// Settings Tab
class HivemindSettingTab extends PluginSettingTab {
  plugin: HivemindPlugin;

  constructor(app: App, plugin: HivemindPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'Hivemind MCP Settings' });

    new Setting(containerEl)
      .setName('MCP server command')
      .setDesc('Command to start the MCP server')
      .addText(text => text
        .setPlaceholder('npx @hiveforge/hivemind-mcp start')
        .setValue(this.plugin.settings.mcpServerPath)
        .onChange(async (value) => {
          this.plugin.settings.mcpServerPath = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Auto-start MCP server')
      .setDesc('Automatically start MCP server when Obsidian loads')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.autoStartMCP)
        .onChange(async (value) => {
          this.plugin.settings.autoStartMCP = value;
          await this.plugin.saveSettings();
        }));

    containerEl.createEl('h3', { text: 'ComfyUI Integration' });

    new Setting(containerEl)
      .setName('Enable ComfyUI')
      .setDesc('Enable ComfyUI image generation features')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.comfyuiEnabled)
        .onChange(async (value) => {
          this.plugin.settings.comfyuiEnabled = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('ComfyUI endpoint')
      .setDesc('URL of your ComfyUI instance')
      .addText(text => text
        .setPlaceholder('http://127.0.0.1:8188')
        .setValue(this.plugin.settings.comfyuiEndpoint)
        .onChange(async (value) => {
          this.plugin.settings.comfyuiEndpoint = value;
          await this.plugin.saveSettings();
        }));
  }
}
