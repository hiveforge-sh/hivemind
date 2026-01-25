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

// Frontmatter template definitions
const FRONTMATTER_TEMPLATES: Record<string, any> = {
  character: {
    id: '',
    type: 'character',
    status: 'draft',
    title: '',
    importance: 'minor',
    tags: [],
    aliases: [],
    name: '',
    age: null,
    gender: '',
    race: '',
    appearance: {
      height: '',
      build: '',
      hair: '',
      eyes: '',
      distinctive_features: ''
    },
    personality: {
      traits: [],
      motivations: [],
      flaws: []
    },
    background: {
      birthplace: '',
      occupation: '',
      affiliations: []
    },
    relationships: [],
    assets: []
  },
  location: {
    id: '',
    type: 'location',
    status: 'draft',
    title: '',
    importance: 'minor',
    tags: [],
    aliases: [],
    location_type: '',
    parent_location: '',
    population: null,
    notable_features: [],
    climate: '',
    resources: [],
    factions: [],
    assets: []
  },
  event: {
    id: '',
    type: 'event',
    status: 'draft',
    title: '',
    importance: 'minor',
    tags: [],
    aliases: [],
    date: '',
    location: '',
    participants: [],
    outcome: '',
    consequences: [],
    assets: []
  },
  faction: {
    id: '',
    type: 'faction',
    status: 'draft',
    title: '',
    importance: 'minor',
    tags: [],
    aliases: [],
    faction_type: '',
    leader: '',
    members: [],
    goals: [],
    resources: [],
    territory: [],
    assets: []
  }
};

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
    this.updateStatusBar('disconnected');

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

    this.addCommand({
      id: 'check-missing-frontmatter',
      name: 'Check and insert missing frontmatter',
      editorCallback: (editor: Editor, view: MarkdownView) => {
        this.checkMissingFrontmatter(view.file);
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
      console.log('[Plugin] Starting MCP server with command:', this.settings.mcpServerPath);
      const [command, ...args] = this.settings.mcpServerPath.split(' ');
      
      this.mcpProcess = spawn(command, args, {
        cwd: (this.app.vault.adapter as any).basePath,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      this.mcpStdin = this.mcpProcess.stdin;
      this.mcpStdout = this.mcpProcess.stdout;
      const mcpStderr = this.mcpProcess.stderr;

      if (!this.mcpStdout) {
        throw new Error('Failed to get MCP stdout');
      }
      
      // Log stderr for debugging
      if (mcpStderr) {
        mcpStderr.on('data', (chunk) => {
          console.log('[MCP Server]', chunk.toString());
        });
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
        this.updateStatusBar('error');
      });

      this.mcpProcess.on('exit', (code) => {
        console.log('MCP process exited with code:', code);
        this.mcpProcess = undefined;
        this.updateStatusBar('disconnected');
      });

      this.updateStatusBar('connected');
      new Notice('Connected to Hivemind MCP server');

    } catch (error) {
      console.error('Failed to start MCP server:', error);
      new Notice('Failed to start MCP server');
      this.updateStatusBar('error');
    }
  }

  stopMCPServer() {
    if (this.mcpProcess) {
      this.mcpProcess.kill();
      this.mcpProcess = undefined;
      this.updateStatusBar('disconnected');
      new Notice('Disconnected from MCP server');
    }
  }

  private updateStatusBar(status: 'connected' | 'disconnected' | 'error') {
    switch (status) {
      case 'connected':
        this.statusBarItem.setText('🟢 Hivemind: Connected');
        break;
      case 'disconnected':
        this.statusBarItem.setText('⚫ Hivemind: Disconnected');
        break;
      case 'error':
        this.statusBarItem.setText('🔴 Hivemind: Error');
        break;
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
      // Use Obsidian's cache to get frontmatter
      const cache = this.app.metadataCache.getFileCache(file);
      
      if (!cache || !cache.frontmatter) {
        new Notice('No frontmatter found in note');
        return;
      }

      const frontmatter = cache.frontmatter;
      
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

  private async checkMissingFrontmatter(file: TFile | null) {
    if (!file) {
      new Notice('No active file');
      return;
    }

    try {
      // Get the file content
      const content = await this.app.vault.read(file);
      const cache = this.app.metadataCache.getFileCache(file);
      
      const frontmatter = cache?.frontmatter || {};
      const noteType = frontmatter.type;

      // If no type, ask user to specify
      if (!noteType) {
        new Notice('Note must have a "type" field in frontmatter (character, location, event, faction, etc.)');
        return;
      }

      // Get template for this type
      const template = FRONTMATTER_TEMPLATES[noteType];
      if (!template) {
        new Notice(`Unknown note type: ${noteType}. Supported types: ${Object.keys(FRONTMATTER_TEMPLATES).join(', ')}`);
        return;
      }

      // Find missing fields
      const missingFields = this.findMissingFields(frontmatter, template);

      if (Object.keys(missingFields).length === 0) {
        new Notice('✅ All required frontmatter fields are present!');
        return;
      }

      // Show modal to insert missing fields
      new MissingFrontmatterModal(this.app, this, file, frontmatter, missingFields, noteType).open();

    } catch (error) {
      console.error('Failed to check frontmatter:', error);
      new Notice('Failed to check frontmatter: ' + (error as Error).message);
    }
  }

  private findMissingFields(existing: Record<string, any>, template: Record<string, any>, prefix = ''): Record<string, any> {
    const missing: Record<string, any> = {};

    for (const [key, value] of Object.entries(template)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      // Skip if exists and not empty
      if (existing[key] !== undefined && existing[key] !== null && existing[key] !== '') {
        // If it's an object, check nested fields
        if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
          const nestedMissing = this.findMissingFields(existing[key] || {}, value, fullKey);
          Object.assign(missing, nestedMissing);
        }
        continue;
      }

      // Field is missing or empty
      missing[fullKey] = value;
    }

    return missing;
  }

  async insertMissingFrontmatter(file: TFile, existingFrontmatter: Record<string, any>, newFields: Record<string, any>) {
    try {
      const content = await this.app.vault.read(file);
      
      // Merge frontmatter
      const merged = this.deepMerge(existingFrontmatter, newFields);
      
      // Convert to YAML
      const yaml = this.objectToYaml(merged);
      
      // Replace frontmatter in content
      let newContent: string;
      const frontmatterRegex = /^---\n([\s\S]*?)\n---\n/;
      
      if (frontmatterRegex.test(content)) {
        // Replace existing frontmatter
        newContent = content.replace(frontmatterRegex, `---\n${yaml}\n---\n`);
      } else {
        // Add new frontmatter at the top
        newContent = `---\n${yaml}\n---\n\n${content}`;
      }
      
      // Write back to file
      await this.app.vault.modify(file, newContent);
      
      new Notice('✅ Frontmatter updated successfully!');
      
    } catch (error) {
      console.error('Failed to insert frontmatter:', error);
      throw error;
    }
  }

  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    
    for (const [key, value] of Object.entries(source)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = this.deepMerge(target[key] || {}, value);
      } else {
        result[key] = value;
      }
    }
    
    return result;
  }

  private objectToYaml(obj: Record<string, any>, indent = 0): string {
    const lines: string[] = [];
    const indentStr = '  '.repeat(indent);
    
    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) {
        lines.push(`${indentStr}${key}:`);
      } else if (Array.isArray(value)) {
        if (value.length === 0) {
          lines.push(`${indentStr}${key}: []`);
        } else {
          lines.push(`${indentStr}${key}:`);
          for (const item of value) {
            if (typeof item === 'object') {
              lines.push(`${indentStr}  -`);
              const subYaml = this.objectToYaml(item, indent + 2);
              lines.push(subYaml.split('\n').map(l => '  ' + l).join('\n'));
            } else {
              lines.push(`${indentStr}  - ${item}`);
            }
          }
        }
      } else if (typeof value === 'object') {
        lines.push(`${indentStr}${key}:`);
        lines.push(this.objectToYaml(value, indent + 1));
      } else if (typeof value === 'string') {
        // Escape strings that might need quotes
        if (value.includes(':') || value.includes('#') || value.startsWith('[')) {
          lines.push(`${indentStr}${key}: "${value}"`);
        } else {
          lines.push(`${indentStr}${key}: ${value}`);
        }
      } else {
        lines.push(`${indentStr}${key}: ${value}`);
      }
    }
    
    return lines.join('\n');
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
      // Show starting notice
      new Notice('🎨 Starting image generation...');
      
      // Open ComfyUI in browser so user can watch
      const comfyUrl = 'http://127.0.0.1:8000';
      window.open(comfyUrl, '_blank');
      
      // Show progress notice
      new Notice('⏳ Generating... (check ComfyUI window)', 5000);

      const response = await this.callMCPTool({
        name: 'generate_image',
        arguments: {
          workflowId,
          contextId,
          contextType,
        },
      });

      if (response.isError) {
        new Notice('❌ Image generation failed: ' + (response.content?.[0]?.text || 'Unknown error'), 8000);
        return;
      }

      // Parse the response to get image path
      const resultText = response.content?.[0]?.text || '';
      
      // Show success with details
      new Notice('✅ Image generated successfully!', 5000);
      
      // Show result modal with image path
      if (resultText) {
        new ResultModal(this.app, resultText).open();
      }

    } catch (error) {
      console.error('Workflow execution failed:', error);
      new Notice('❌ Workflow execution failed: ' + (error as Error).message, 8000);
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
      console.log('[Plugin] Calling list_workflows...');
      const response = await this.plugin.callMCPTool({
        name: 'list_workflows',
        arguments: {},
      });

      console.log('[Plugin] list_workflows response:', response);

      if (!response.content || response.content.length === 0) {
        console.error('[Plugin] No content in response');
        contentEl.createEl('p', { 
          text: 'No workflows available. Loading...',
          cls: 'mod-warning'
        });
        return;
      }

      // Parse workflow list (simple parsing)
      const workflows = this.parseWorkflowList(response.content[0].text);

      if (workflows.length === 0) {
        // Show helpful message
        contentEl.createEl('p', { 
          text: '📭 No workflows found',
          cls: 'mod-warning'
        });
        
        contentEl.createEl('p', { 
          text: 'Create a new workflow to get started:',
        });

        const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = '10px';
        buttonContainer.style.marginTop = '20px';

        const createBtn = buttonContainer.createEl('button', {
          text: '➕ Create New Workflow',
          cls: 'mod-cta'
        });
        
        createBtn.addEventListener('click', () => {
          this.close();
          new CreateWorkflowModal(this.app, this.plugin).open();
        });

        const reconnectBtn = buttonContainer.createEl('button', {
          text: '🔄 Reconnect MCP',
          cls: 'mod-warning'
        });
        
        reconnectBtn.addEventListener('click', async () => {
          this.close();
          this.plugin.stopMCPServer();
          await new Promise(resolve => setTimeout(resolve, 1000));
          await this.plugin.startMCPServer();
        });

        return;
      }

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
      console.error('[Plugin] Error loading workflows:', error);
      contentEl.createEl('p', { 
        text: 'Failed to load workflows: ' + (error as Error).message,
        cls: 'mod-error'
      });
      
      contentEl.createEl('p', {
        text: 'Make sure MCP server is connected and ComfyUI is enabled in config.json'
      });
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

// Create Workflow Modal
class CreateWorkflowModal extends Modal {
  plugin: HivemindPlugin;
  result: {
    id: string;
    name: string;
    description: string;
  } = { id: '', name: '', description: '' };

  constructor(app: App, plugin: HivemindPlugin) {
    super(app);
    this.plugin = plugin;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl('h2', { text: 'Create New Workflow' });

    contentEl.createEl('p', {
      text: 'This will create a basic workflow template. You can customize it later by editing the JSON file or importing from ComfyUI.'
    });

    // Workflow ID
    new Setting(contentEl)
      .setName('Workflow ID')
      .setDesc('Unique identifier (lowercase, no spaces)')
      .addText(text => text
        .setPlaceholder('my-portrait')
        .onChange(value => {
          this.result.id = value.toLowerCase().replace(/\s+/g, '-');
        }));

    // Workflow Name
    new Setting(contentEl)
      .setName('Workflow Name')
      .setDesc('Human-readable name')
      .addText(text => text
        .setPlaceholder('My Character Portrait')
        .onChange(value => {
          this.result.name = value;
        }));

    // Description
    new Setting(contentEl)
      .setName('Description')
      .setDesc('Optional description')
      .addTextArea(text => text
        .setPlaceholder('High-quality character portraits...')
        .onChange(value => {
          this.result.description = value;
        }));

    // Template Selection
    contentEl.createEl('h3', { text: 'Template' });
    
    const templateContainer = contentEl.createDiv();
    
    const basicTemplate = templateContainer.createEl('button', {
      text: '📝 Basic Template',
      cls: 'mod-cta'
    });

    basicTemplate.style.marginRight = '10px';
    
    basicTemplate.addEventListener('click', async () => {
      await this.createWorkflow('basic');
    });

    const advancedTemplate = templateContainer.createEl('button', {
      text: '🎨 Advanced Template (with context)',
    });
    
    advancedTemplate.addEventListener('click', async () => {
      await this.createWorkflow('advanced');
    });
  }

  async createWorkflow(template: 'basic' | 'advanced') {
    if (!this.result.id || !this.result.name) {
      new Notice('Please fill in ID and Name');
      return;
    }

    try {
      const vaultPath = (this.app.vault.adapter as any).basePath;
      const workflowDir = `${vaultPath}/workflows`;
      const workflowPath = `${workflowDir}/${this.result.id}.json`;

      // Create workflow object based on template
      const workflow = template === 'basic' 
        ? this.getBasicTemplate()
        : this.getAdvancedTemplate();

      const workflowData = {
        id: this.result.id,
        name: this.result.name,
        description: this.result.description || undefined,
        workflow: workflow,
        contextFields: template === 'advanced' ? ['appearance', 'personality', 'age'] : [],
        outputPath: 'assets/images'
      };

      // Write file using Node fs
      const fs = require('fs');
      if (!fs.existsSync(workflowDir)) {
        fs.mkdirSync(workflowDir, { recursive: true });
      }

      fs.writeFileSync(workflowPath, JSON.stringify(workflowData, null, 2));

      new Notice(`✅ Workflow created: ${this.result.name}`);
      
      // Show info modal
      new WorkflowCreatedModal(this.app, workflowPath, this.plugin).open();
      
      this.close();

    } catch (error) {
      console.error('Failed to create workflow:', error);
      new Notice('Failed to create workflow: ' + (error as Error).message);
    }
  }

  getBasicTemplate(): Record<string, any> {
    return {
      "1": {
        "class_type": "CheckpointLoaderSimple",
        "inputs": {
          "ckpt_name": "model.safetensors"
        }
      },
      "3": {
        "class_type": "KSampler",
        "inputs": {
          "seed": 12345,
          "steps": 20,
          "cfg": 7.5,
          "sampler_name": "euler_a"
        }
      },
      "6": {
        "class_type": "CLIPTextEncode",
        "inputs": {
          "text": "your prompt here"
        }
      },
      "7": {
        "class_type": "CLIPTextEncode",
        "inputs": {
          "text": "negative prompt"
        }
      }
    };
  }

  getAdvancedTemplate(): Record<string, any> {
    return {
      "1": {
        "class_type": "CheckpointLoaderSimple",
        "inputs": {
          "ckpt_name": "model.safetensors"
        }
      },
      "3": {
        "class_type": "KSampler",
        "inputs": {
          "seed": 12345,
          "steps": 20,
          "cfg": 7.5,
          "sampler_name": "euler_a"
        }
      },
      "6": {
        "class_type": "CLIPTextEncode",
        "inputs": {
          "text": "A portrait of a {{age}} year old person with {{appearance.hair}} hair and {{appearance.eyes}} eyes. {{personality.traits}} expression. Fantasy art style."
        }
      },
      "7": {
        "class_type": "CLIPTextEncode",
        "inputs": {
          "text": "ugly, distorted, low quality, blurry"
        }
      }
    };
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

// Workflow Created Modal
class WorkflowCreatedModal extends Modal {
  filePath: string;
  plugin: HivemindPlugin;

  constructor(app: App, filePath: string, plugin: HivemindPlugin) {
    super(app);
    this.filePath = filePath;
    this.plugin = plugin;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl('h2', { text: '✅ Workflow Created!' });

    contentEl.createEl('p', {
      text: `Your workflow has been created at:`
    });

    contentEl.createEl('code', {
      text: this.filePath
    });
    
    contentEl.createEl('p', {
      text: '⚠️ Note: JSON files won\'t appear in Obsidian\'s file explorer (this is normal!). Use File Explorer to verify the file exists.'
    });

    contentEl.createEl('p', {
      text: 'To use it with ComfyUI, you need to export a real workflow from ComfyUI and replace the workflow JSON in this file.'
    });

    contentEl.createEl('h3', { text: 'Next Steps:' });
    
    const steps = contentEl.createEl('ol');
    steps.createEl('li', { text: 'Open ComfyUI in your browser' });
    steps.createEl('li', { text: 'Create/load your workflow' });
    steps.createEl('li', { text: 'Click "Save (API Format)" button' });
    steps.createEl('li', { text: 'Copy the JSON output' });
    steps.createEl('li', { text: 'Paste it into the "workflow" field in your JSON file' });

    const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });
    buttonContainer.style.marginTop = '20px';

    const reconnectBtn = buttonContainer.createEl('button', {
      text: '🔄 Reconnect MCP to Load Workflow',
      cls: 'mod-cta'
    });
    
    reconnectBtn.addEventListener('click', async () => {
      this.close();
      this.plugin.stopMCPServer();
      await new Promise(resolve => setTimeout(resolve, 1000));
      await this.plugin.startMCPServer();
      new Notice('MCP server reconnected - workflow loaded!');
    });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

// Missing Frontmatter Modal
class MissingFrontmatterModal extends Modal {
  plugin: HivemindPlugin;
  file: TFile;
  existingFrontmatter: Record<string, any>;
  missingFields: Record<string, any>;
  noteType: string;
  fieldValues: Record<string, any> = {};

  constructor(
    app: App, 
    plugin: HivemindPlugin, 
    file: TFile, 
    existingFrontmatter: Record<string, any>, 
    missingFields: Record<string, any>,
    noteType: string
  ) {
    super(app);
    this.plugin = plugin;
    this.file = file;
    this.existingFrontmatter = existingFrontmatter;
    this.missingFields = missingFields;
    this.noteType = noteType;
    
    // Initialize field values with defaults
    this.fieldValues = { ...missingFields };
  }

  onOpen() {
    const { contentEl } = this;
    
    contentEl.createEl('h2', { text: '🔍 Missing Frontmatter Fields' });
    
    contentEl.createEl('p', { 
      text: `Found ${Object.keys(this.missingFields).length} missing field(s) in this ${this.noteType} note.`
    });

    const infoBox = contentEl.createDiv({ cls: 'missing-frontmatter-info' });
    infoBox.createEl('p', {
      text: '💡 Tip: You can edit the values below before inserting them. Leave empty for default values.',
      cls: 'mod-info'
    });

    // Create a scrollable container for fields
    const fieldsContainer = contentEl.createDiv({ cls: 'missing-frontmatter-fields' });
    fieldsContainer.style.maxHeight = '400px';
    fieldsContainer.style.overflowY = 'auto';
    fieldsContainer.style.marginBottom = '20px';
    fieldsContainer.style.padding = '10px';
    fieldsContainer.style.border = '1px solid var(--background-modifier-border)';
    fieldsContainer.style.borderRadius = '5px';

    // Display missing fields with input options
    for (const [fieldPath, defaultValue] of Object.entries(this.missingFields)) {
      const fieldContainer = fieldsContainer.createDiv({ cls: 'missing-field-item' });
      fieldContainer.style.marginBottom = '15px';
      fieldContainer.style.paddingBottom = '10px';
      fieldContainer.style.borderBottom = '1px solid var(--background-modifier-border-focus)';

      // Field name
      fieldContainer.createEl('strong', { text: fieldPath });
      
      // Default value preview
      const defaultText = Array.isArray(defaultValue) 
        ? '[]' 
        : typeof defaultValue === 'object' && defaultValue !== null
        ? '{...}'
        : String(defaultValue || '(empty)');
      
      fieldContainer.createEl('div', { 
        text: `Default: ${defaultText}`,
        cls: 'setting-item-description'
      });

      // Input field (for simple types)
      if (typeof defaultValue === 'string' || typeof defaultValue === 'number' || defaultValue === null) {
        new Setting(fieldContainer)
          .setName('Custom value (optional)')
          .addText(text => text
            .setPlaceholder(defaultText)
            .setValue(String(defaultValue || ''))
            .onChange(value => {
              this.fieldValues[fieldPath] = value || defaultValue;
            }));
      }
    }

    // Buttons
    const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '10px';
    buttonContainer.style.justifyContent = 'flex-end';
    buttonContainer.style.marginTop = '20px';

    const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel' });
    cancelBtn.addEventListener('click', () => {
      this.close();
    });

    const insertBtn = buttonContainer.createEl('button', {
      text: '✅ Insert Missing Fields',
      cls: 'mod-cta'
    });
    insertBtn.addEventListener('click', async () => {
      try {
        insertBtn.setAttr('disabled', 'true');
        insertBtn.setText('Inserting...');
        
        // Convert flat field paths back to nested object
        const fieldsToInsert = this.flatToNested(this.fieldValues);
        
        await this.plugin.insertMissingFrontmatter(
          this.file,
          this.existingFrontmatter,
          fieldsToInsert
        );
        
        this.close();
      } catch (error) {
        new Notice('Failed to insert frontmatter: ' + (error as Error).message);
        insertBtn.removeAttribute('disabled');
        insertBtn.setText('✅ Insert Missing Fields');
      }
    });
  }

  private flatToNested(flat: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const [path, value] of Object.entries(flat)) {
      const parts = path.split('.');
      let current = result;
      
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      }
      
      current[parts[parts.length - 1]] = value;
    }
    
    return result;
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

    // Info banner about local connections
    const infoBanner = containerEl.createDiv({ cls: 'hivemind-info-banner' });
    infoBanner.style.padding = '10px';
    infoBanner.style.marginBottom = '20px';
    infoBanner.style.backgroundColor = 'var(--background-secondary)';
    infoBanner.style.borderRadius = '5px';
    infoBanner.createEl('p', { 
      text: '🔒 Privacy: All connections are local (localhost). No data leaves your computer.',
      cls: 'setting-item-description'
    });

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
      .setDesc('Automatically start MCP server when Obsidian loads (runs locally via Node.js)')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.autoStartMCP)
        .onChange(async (value) => {
          this.plugin.settings.autoStartMCP = value;
          await this.plugin.saveSettings();
        }));

    containerEl.createEl('h3', { text: 'ComfyUI Integration' });

    const comfyInfoEl = containerEl.createEl('p', { cls: 'setting-item-description' });
    comfyInfoEl.style.marginTop = '10px';
    comfyInfoEl.style.marginBottom = '10px';
    comfyInfoEl.setText('ComfyUI runs on your local machine. Enable only if you have ComfyUI installed and running.');

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
      .setDesc('URL of your ComfyUI instance (e.g., http://127.0.0.1:8000)')
      .addText(text => text
        .setPlaceholder('http://127.0.0.1:8188')
        .setValue(this.plugin.settings.comfyuiEndpoint)
        .onChange(async (value) => {
          this.plugin.settings.comfyuiEndpoint = value;
          await this.plugin.saveSettings();
        }))
      .addButton(button => button
        .setButtonText('Test Connection')
        .setCta()
        .onClick(async () => {
          button.setDisabled(true);
          button.setButtonText('Testing...');
          
          try {
            const endpoint = this.plugin.settings.comfyuiEndpoint || 'http://127.0.0.1:8188';
            const response = await fetch(`${endpoint}/system_stats`, {
              method: 'GET',
              signal: AbortSignal.timeout(5000)
            });
            
            if (response.ok) {
              new Notice('✅ ComfyUI connection successful!', 5000);
            } else {
              new Notice(`❌ ComfyUI responded with status ${response.status}`, 5000);
            }
          } catch (error) {
            new Notice(`❌ Failed to connect to ComfyUI: ${(error as Error).message}`, 8000);
          } finally {
            button.setDisabled(false);
            button.setButtonText('Test Connection');
          }
        }));
  }
}
