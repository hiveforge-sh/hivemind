import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, TFolder, ItemView, WorkspaceLeaf, requestUrl } from 'obsidian';
import { spawn, ChildProcess } from 'child_process';
import { FolderMapper } from '../src/templates/folder-mapper.js';
import { templateRegistry } from '../src/templates/registry.js';
import { worldbuildingTemplate } from '../src/templates/builtin/worldbuilding.js';

interface HivemindSettings {
  mcpServerPath: string;
  comfyuiEnabled: boolean;
  comfyuiEndpoint: string;
  autoStartMCP: boolean;
  defaultEntityType: string;
  autoMergeFrontmatter: boolean;
  validationSeverity: 'error' | 'warning';
  showValidationNotices: boolean;
}

const DEFAULT_SETTINGS: HivemindSettings = {
  mcpServerPath: 'npx @hiveforge/hivemind-mcp start',
  comfyuiEnabled: false,
  comfyuiEndpoint: 'http://127.0.0.1:8188',
  autoStartMCP: false,
  defaultEntityType: '',
  autoMergeFrontmatter: false,
  validationSeverity: 'warning',
  showValidationNotices: false,
};

interface MCPToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

interface MCPResponse {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

// Folder-to-type mappings are now handled by shared FolderMapper
// (imported from ../src/templates/folder-mapper.js)

interface MCPMessage {
  id?: number;
  result?: unknown;
  error?: { message?: string };
}

// Frontmatter template definitions
const FRONTMATTER_TEMPLATES: Record<string, Record<string, unknown>> = {
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
  },
  lore: {
    id: '',
    type: 'lore',
    status: 'draft',
    title: '',
    importance: 'minor',
    tags: [],
    aliases: [],
    name: '',
    category: '',
    related_entities: [],
    source: ''
  },
  asset: {
    id: '',
    type: 'asset',
    status: 'draft',
    title: '',
    tags: [],
    aliases: [],
    asset_type: 'image',
    file_path: '',
    depicts: []
  },
  reference: {
    id: '',
    type: 'reference',
    status: 'draft',
    title: '',
    importance: 'minor',
    tags: [],
    aliases: [],
    name: '',
    category: '',
    source_url: '',
    related_entities: [],
    author: '',
    date_accessed: ''
  }
};

export default class HivemindPlugin extends Plugin {
  settings: HivemindSettings;
  private mcpProcess?: ChildProcess;
  private mcpStdin?: NodeJS.WritableStream | null;
  private mcpStdout?: NodeJS.ReadableStream | null;
  private pendingRequests: Map<number, {
    resolve: (value: unknown) => void;
    reject: (error: unknown) => void;
  }> = new Map();
  private requestId: number = 1;
  private statusBarItem: HTMLElement;
  folderMapper?: FolderMapper;

  async onload() {
    await this.loadSettings();

    // Initialize template registry if not already done
    if (!templateRegistry.has('worldbuilding')) {
      templateRegistry.register(worldbuildingTemplate, 'builtin');
      templateRegistry.activate('worldbuilding');
    }

    // Initialize folder mapper from active template config
    const folderMappings = templateRegistry.getFolderMappings();
    this.folderMapper = await FolderMapper.createFromTemplate(folderMappings);

    // Register validation sidebar view
    this.registerView(
      VIEW_TYPE_VALIDATION,
      (leaf) => new ValidationSidebarView(leaf, this)
    );

    // Add status bar item
    this.statusBarItem = this.addStatusBarItem();
    this.updateStatusBar('disconnected');

    // Add ribbon icon
    this.addRibbonIcon('brain-circuit', 'Hivemind', (evt: MouseEvent) => {
      new Notice('Hivemind MCP plugin');
    });

    // Commands
    this.addCommand({
      id: 'generate-image-from-note',
      name: 'Generate image from current note',
      editorCallback: (editor: Editor, view: MarkdownView) => {
        void this.generateImageFromNote(view.file);
      }
    });

    this.addCommand({
      id: 'browse-workflows',
      name: 'Browse ComfyUI workflows',
      callback: () => {
        void this.browseWorkflows();
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
        void this.startMCPServer();
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
      id: 'add-frontmatter',
      name: 'Add frontmatter',
      editorCallback: (editor: Editor, view: MarkdownView) => {
        if (view.file) {
          void this.addFrontmatterToFile(view.file);
        }
      }
    });

    this.addCommand({
      id: 'validate-frontmatter',
      name: 'Validate frontmatter',
      editorCallback: (editor: Editor, view: MarkdownView) => {
        if (view.file) {
          void this.validateCurrentFile(view.file);
        }
      }
    });

    this.addCommand({
      id: 'fix-frontmatter',
      name: 'Fix frontmatter',
      editorCallback: (editor: Editor, view: MarkdownView) => {
        if (view.file) {
          void this.fixCurrentFile(view.file);
        }
      }
    });

    this.addCommand({
      id: 'fix-all-frontmatter',
      name: 'Fix all frontmatter',
      callback: () => {
        void this.fixAllFiles();
      }
    });

    this.addCommand({
      id: 'open-validation-sidebar',
      name: 'Open validation sidebar',
      callback: () => {
        void this.activateValidationSidebar();
      }
    });

    // Register context menu events
    this.registerEvent(
      this.app.workspace.on('file-menu', (menu, file) => {
        if (file instanceof TFile && file.extension === 'md') {
          menu.addItem((item) => {
            item.setTitle('Hivemind: add frontmatter')
              .setIcon('plus-circle')
              .onClick(() => {
                void this.addFrontmatterToFile(file);
              });
          });

          menu.addItem((item) => {
            item.setTitle('Hivemind: validate')
              .setIcon('check-circle')
              .onClick(() => {
                void this.validateCurrentFile(file);
              });
          });

          menu.addItem((item) => {
            item.setTitle('Hivemind: fix frontmatter')
              .setIcon('wrench')
              .onClick(() => {
                void this.fixCurrentFile(file);
              });
          });
        }

        if (file instanceof TFolder) {
          menu.addItem((item) => {
            item.setTitle('Hivemind: add frontmatter to folder')
              .setIcon('folder-plus')
              .onClick(() => {
                void this.addFrontmatterToFolder(file);
              });
          });

          menu.addItem((item) => {
            item.setTitle('Hivemind: validate folder')
              .setIcon('check-circle')
              .onClick(() => {
                void this.validateFolder(file);
              });
          });

          menu.addItem((item) => {
            item.setTitle('Hivemind: fix all in folder')
              .setIcon('wrench')
              .onClick(() => {
                void this.fixFolder(file);
              });
          });
        }
      })
    );

    // Register file-open event for auto-validation if enabled
    if (this.settings.showValidationNotices) {
      this.registerEvent(
        this.app.workspace.on('file-open', (file) => {
          if (file instanceof TFile && file.extension === 'md') {
            void this.validateCurrentFile(file);
          }
        })
      );
    }

    // Settings tab
    this.addSettingTab(new HivemindSettingTab(this.app, this));

    // Auto-start if enabled
    if (this.settings.autoStartMCP) {
      void this.startMCPServer();
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

  startMCPServer() {
    if (this.mcpProcess) {
      new Notice('MCP server already running');
      return;
    }

    try {
      console.debug('[Plugin] Starting MCP server with command:', this.settings.mcpServerPath);
      const [command, ...args] = this.settings.mcpServerPath.split(' ');

      this.mcpProcess = spawn(command, args, {
        cwd: (this.app.vault.adapter as unknown as {basePath: string}).basePath,
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
          console.debug('[MCP Server]', chunk.toString());
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
            } catch {
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
        console.debug('MCP process exited with code:', code);
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
        this.statusBarItem.setText('Hivemind: connected');
        break;
      case 'disconnected':
        this.statusBarItem.setText('Hivemind: disconnected');
        break;
      case 'error':
        this.statusBarItem.setText('Hivemind: error');
        break;
    }
  }

  private handleMCPMessage(message: MCPMessage) {
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

  private generateImageFromNote(file: TFile | null) {
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
        new Notice('Note must have ID and type fields set');
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

  private async addFrontmatterToFile(file: TFile) {
    try {
      // Read file content and existing frontmatter
      const content = await this.app.vault.read(file);
      const existingFrontmatter = this.extractFrontmatter(content);

      // If no type, use shared FolderMapper to infer from folder path
      if (!existingFrontmatter.type && this.folderMapper) {
        const result = await this.folderMapper.resolveType(file.path);

        if (result.confidence === 'exact') {
          // Single type - check autoMergeFrontmatter setting
          if (this.settings.autoMergeFrontmatter) {
            // Auto-merge: apply frontmatter immediately
            const template = FRONTMATTER_TEMPLATES[result.types[0]];
            if (template) {
              const fileName = file.basename;
              const id = this.generateId(fileName, result.types[0]);
              const autoFilledTemplate = {
                ...template,
                id: id,
                name: fileName,
                title: fileName
              };
              const newFields = this.computeNewFieldsForBulk(existingFrontmatter, autoFilledTemplate);

              if (Object.keys(newFields).length > 0) {
                await this.insertMissingFrontmatter(file, existingFrontmatter, newFields);
              } else {
                new Notice('All frontmatter fields already present');
              }
            }
            return;
          } else {
            // Show preview modal
            new AddFrontmatterModal(this.app, this, file, result.types[0], existingFrontmatter).open();
            return;
          }
        } else if (result.confidence === 'ambiguous') {
          // Multiple types - show selection modal with callback to open AddFrontmatterModal
          new TypeSelectionModal(this.app, this, file, result.types, (selectedType: string) => {
            new AddFrontmatterModal(this.app, this, file, selectedType, existingFrontmatter).open();
          }).open();
          return;
        } else {
          // No match - show full type selection with callback
          new TypeSelectionModal(this.app, this, file, undefined, (selectedType: string) => {
            new AddFrontmatterModal(this.app, this, file, selectedType, existingFrontmatter).open();
          }).open();
          return;
        }
      } else if (existingFrontmatter.type) {
        // Type already exists, open AddFrontmatterModal with existing type
        new AddFrontmatterModal(this.app, this, file, String(existingFrontmatter.type), existingFrontmatter).open();
      } else {
        // No folder mapping and no type - show full type selection
        new TypeSelectionModal(this.app, this, file, undefined, (selectedType: string) => {
          new AddFrontmatterModal(this.app, this, file, selectedType, existingFrontmatter).open();
        }).open();
      }

    } catch (error) {
      console.error('Failed to add frontmatter:', error);
      new Notice('Failed to add frontmatter: ' + (error as Error).message);
    }
  }

  private async addFrontmatterToFolder(folder: TFolder) {
    try {
      // Get all markdown files in folder (recursive)
      const allMarkdownFiles = this.app.vault.getMarkdownFiles();
      const folderFiles = allMarkdownFiles.filter(f => f.path.startsWith(folder.path + '/'));

      if (folderFiles.length === 0) {
        new Notice('No markdown files found in this folder');
        return;
      }

      // Check if folderMapper can resolve all files to the same type
      if (!this.folderMapper) {
        new Notice('Folder mapping not available. Use per-file command instead.');
        return;
      }

      // Resolve types for all files
      const typeMap = new Map<string, string[]>();
      for (const file of folderFiles) {
        const result = await this.folderMapper.resolveType(file.path);
        if (result.confidence === 'exact' && result.types.length > 0) {
          const type = result.types[0];
          if (!typeMap.has(type)) {
            typeMap.set(type, []);
          }
          typeMap.get(type)!.push(file.path);
        }
      }

      // Check if all files resolve to same type
      if (typeMap.size === 0) {
        new Notice('Could not determine entity type for files in this folder. Use per-file command.');
        return;
      }

      if (typeMap.size > 1) {
        const types = Array.from(typeMap.keys()).join(', ');
        new Notice(`Files in this folder have different types (${types}). Use per-file command for ambiguous folders.`);
        return;
      }

      // All files have same type - proceed with bulk add
      const entityType = Array.from(typeMap.keys())[0];
      const filesToProcess = [];

      for (const f of folderFiles) {
        const result = await this.folderMapper.resolveType(f.path);
        if (result && result.confidence === 'exact') {
          filesToProcess.push(f);
        }
      }

      new Notice(`Adding frontmatter to ${filesToProcess.length} files...`);

      let successCount = 0;
      let skipCount = 0;

      for (const file of filesToProcess) {
        try {
          const content = await this.app.vault.read(file);
          const existingFrontmatter = this.extractFrontmatter(content);

          // Skip if already has all fields
          const template = FRONTMATTER_TEMPLATES[entityType];
          if (!template) continue;

          const fileName = file.basename;
          const id = this.generateId(fileName, entityType);
          const autoFilledTemplate = {
            ...template,
            id: id,
            name: fileName,
            title: fileName
          };

          const newFields = this.computeNewFieldsForBulk(existingFrontmatter, autoFilledTemplate);

          if (Object.keys(newFields).length === 0) {
            skipCount++;
            continue;
          }

          // Apply frontmatter
          await this.insertMissingFrontmatter(file, existingFrontmatter, newFields);
          successCount++;

        } catch (error) {
          console.error(`Failed to add frontmatter to ${file.path}:`, error);
        }
      }

      new Notice(`Added frontmatter to ${successCount} files (${skipCount} already complete)`);

    } catch (error) {
      console.error('Failed to add frontmatter to folder:', error);
      new Notice('Failed to add frontmatter to folder: ' + (error as Error).message);
    }
  }

  private computeNewFieldsForBulk(existing: Record<string, unknown>, template: Record<string, unknown>): Record<string, unknown> {
    const newFields: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(template)) {
      // Skip if exists and not empty
      if (existing[key] !== undefined && existing[key] !== null && existing[key] !== '') {
        continue;
      }

      // Field is missing or empty - add it
      newFields[key] = value;
    }

    return newFields;
  }

  private generateId(name: string, entityType: string): string {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return `${entityType}-${slug}`;
  }

  private findMissingFields(existing: Record<string, unknown>, template: Record<string, unknown>, prefix = ''): Record<string, unknown> {
    const missing: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(template)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      // Skip if exists and not empty
      if (existing[key] !== undefined && existing[key] !== null && existing[key] !== '') {
        // If it's an object, check nested fields
        if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
          const nestedMissing = this.findMissingFields((existing[key] as Record<string, unknown>) || {}, value as Record<string, unknown>, fullKey);
          Object.assign(missing, nestedMissing);
        }
        continue;
      }

      // Field is missing or empty
      missing[fullKey] = value;
    }

    return missing;
  }

  async insertMissingFrontmatter(file: TFile, existingFrontmatter: Record<string, unknown>, newFields: Record<string, unknown>) {
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

      new Notice('Frontmatter updated successfully!');

    } catch (error) {
      console.error('Failed to insert frontmatter:', error);
      throw error;
    }
  }

  private deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
    const result = { ...target };

    for (const [key, value] of Object.entries(source)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = this.deepMerge((target[key] as Record<string, unknown>) || {}, value as Record<string, unknown>);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  private objectToYaml(obj: Record<string, unknown>, indent = 0): string {
    const lines: string[] = [];
    const indentStr = '  '.repeat(indent);

    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) {
        lines.push(`${indentStr}${key}:`);
      } else if (value instanceof Date) {
        // Preserve Date objects as ISO date string
        const iso = value.toISOString().split('T')[0];
        lines.push(`${indentStr}${key}: ${iso}`);
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
        lines.push(this.objectToYaml(value as Record<string, unknown>, indent + 1));
      } else if (typeof value === 'string') {
        // Escape strings that might need quotes
        if (value.includes(':') || value.includes('#') || value.startsWith('[')) {
          lines.push(`${indentStr}${key}: "${value}"`);
        } else {
          lines.push(`${indentStr}${key}: ${value}`);
        }
      } else {
        const stringified = typeof value === 'object' && value !== null
          ? JSON.stringify(value)
          : String(value);
        lines.push(`${indentStr}${key}: ${stringified}`);
      }
    }

    return lines.join('\n');
  }

  private parseFrontmatter(yaml: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const lines = yaml.split('\n');

    for (const line of lines) {
      const match = line.match(/^(\w+):\s*(.+)$/);
      if (match) {
        result[match[1]] = match[2].trim();
      }
    }

    return result;
  }

  /**
   * Extract frontmatter data from raw file content (replaces gray-matter).
   * Returns the parsed frontmatter object.
   */
  extractFrontmatter(content: string): Record<string, unknown> {
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return {};
    return this.parseFrontmatter(match[1]);
  }

  async executeWorkflow(workflowId: string, contextId: string, contextType: string) {
    try {
      // Show starting notice
      new Notice('Starting image generation...');

      // Open ComfyUI in browser so user can watch
      const comfyUrl = 'http://127.0.0.1:8000';
      window.open(comfyUrl, '_blank');

      // Show progress notice
      new Notice('Generating... (check ComfyUI window)', 5000);

      const response = await this.callMCPTool({
        name: 'generate_image',
        arguments: {
          workflowId,
          contextId,
          contextType,
        },
      });

      if (response.isError) {
        new Notice('Image generation failed: ' + (response.content?.[0]?.text || 'Unknown error'), 8000);
        return;
      }

      // Parse the response to get image path
      const resultText = response.content?.[0]?.text || '';

      // Show success with details
      new Notice('Image generated successfully!', 5000);

      // Show result modal with image path
      if (resultText) {
        new ResultModal(this.app, resultText).open();
      }

    } catch (error) {
      console.error('Workflow execution failed:', error);
      new Notice('Workflow execution failed: ' + (error as Error).message, 8000);
    }
  }

  private async validateCurrentFile(file: TFile) {
    try {
      // Read file content
      const content = await this.app.vault.read(file);

      // Parse frontmatter
      const frontmatter = this.extractFrontmatter(content);

      // Validation issues
      const issues: Array<{type: string, detail: string}> = [];

      // Check if frontmatter exists and has content
      if (!frontmatter || Object.keys(frontmatter).length === 0) {
        issues.push({
          type: 'missing_frontmatter',
          detail: 'No frontmatter found'
        });
        new ValidationResultModal(this.app, file, issues).open();
        return;
      }

      // Check required fields: id, type, status
      const requiredFields = ['id', 'type', 'status'];
      for (const field of requiredFields) {
        if (frontmatter[field] === undefined || frontmatter[field] === null || frontmatter[field] === '') {
          issues.push({
            type: 'missing_field',
            detail: `Missing required field: ${field}`
          });
        }
      }

      // Check type against template entity types
      if (frontmatter.type) {
        const entityTypeStr = String(frontmatter.type);
        const template = templateRegistry.getActive();
        const validTypes = template?.entityTypes.map((e) => e.name) || [];

        if (!validTypes.includes(entityTypeStr)) {
          issues.push({
            type: 'invalid_type',
            detail: `Invalid type '${entityTypeStr}'. Valid types: ${validTypes.join(', ')}`
          });
        }
      }

      // Check folder mismatch via folderMapper
      if (frontmatter.type && this.folderMapper && issues.length === 0) {
        try {
          const resolved = await this.folderMapper.resolveType(file.path);

          // Only warn if folder mapping is exact and differs from declared type
          if (resolved.confidence === 'exact' && resolved.types[0] !== frontmatter.type) {
            issues.push({
              type: 'folder_mismatch',
              detail: `Type '${frontmatter.type}' doesn't match folder (expected '${resolved.types[0]}')`
            });
          }
        } catch (error) {
          // Folder mapping is optional - don't fail validation if it errors
          console.error('Warning: Folder mapping check failed:', error);
        }
      }

      // Show result
      if (issues.length === 0) {
        new Notice('Valid frontmatter', 3000);
      } else {
        new ValidationResultModal(this.app, file, issues).open();
      }

    } catch (error) {
      console.error('Failed to validate frontmatter:', error);
      new Notice('Failed to validate frontmatter: ' + (error as Error).message);
    }
  }

  private async fixCurrentFile(file: TFile) {
    try {
      // Read file and parse frontmatter
      const content = await this.app.vault.read(file);
      const existingFrontmatter = this.extractFrontmatter(content);

      // If no frontmatter at all, redirect to add-frontmatter flow
      if (!existingFrontmatter || Object.keys(existingFrontmatter).length === 0) {
        new Notice('No frontmatter found. Use "add frontmatter" command instead.');
        return;
      }

      // If no type, try to resolve it
      let entityType: string = typeof existingFrontmatter.type === 'string' ? existingFrontmatter.type : '';
      if (!entityType && this.folderMapper) {
        const result = await this.folderMapper.resolveType(file.path);
        if (result.confidence === 'exact') {
          entityType = result.types[0];
        } else if (result.confidence === 'ambiguous') {
          new Notice('Cannot determine entity type. Multiple types match this folder. Please add type field manually.');
          return;
        } else {
          new Notice('Cannot determine entity type. Please add type field manually.');
          return;
        }
      } else if (!entityType) {
        new Notice('No type field found and folder mapping not available. Please add type field manually.');
        return;
      }

      // Get template for this type
      const template = FRONTMATTER_TEMPLATES[entityType];
      if (!template) {
        new Notice(`Unknown entity type: ${entityType}`);
        return;
      }

      // Find missing fields
      const missingFields = this.findMissingFields(existingFrontmatter, template);

      if (Object.keys(missingFields).length === 0) {
        new Notice('No issues to fix', 3000);
        return;
      }

      // Open FixFieldsModal with missing fields
      new FixFieldsModal(this.app, this, file, existingFrontmatter, missingFields, entityType).open();

    } catch (error) {
      console.error('Failed to fix frontmatter:', error);
      new Notice('Failed to fix frontmatter: ' + (error as Error).message);
    }
  }

  async fixAllFiles() {
    try {
      new Notice('Starting bulk fix operation...');

      // Get all markdown files in vault
      const allFiles = this.app.vault.getMarkdownFiles();

      let fixedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;

      for (const file of allFiles) {
        try {
          // Read file and parse frontmatter
          const content = await this.app.vault.read(file);
          const existingFrontmatter = this.extractFrontmatter(content);

          // Skip files without frontmatter
          if (!existingFrontmatter || Object.keys(existingFrontmatter).length === 0) {
            skippedCount++;
            continue;
          }

          // Resolve type
          let entityType: string = typeof existingFrontmatter.type === 'string' ? existingFrontmatter.type : '';
          if (!entityType && this.folderMapper) {
            const result = await this.folderMapper.resolveType(file.path);
            if (result.confidence === 'exact') {
              entityType = result.types[0];
            } else {
              // Skip ambiguous files
              skippedCount++;
              continue;
            }
          } else if (!entityType) {
            skippedCount++;
            continue;
          }

          // Get template
          const template = FRONTMATTER_TEMPLATES[entityType];
          if (!template) {
            skippedCount++;
            continue;
          }

          // Auto-fill id and name/title from filename if missing
          const fileName = file.basename;
          const autoFilledTemplate = {
            ...template,
            id: existingFrontmatter.id || this.generateId(fileName, entityType),
            name: existingFrontmatter.name || fileName,
            title: existingFrontmatter.title || fileName
          };

          // Find missing fields
          const missingFields = this.computeNewFieldsForBulk(existingFrontmatter, autoFilledTemplate);

          if (Object.keys(missingFields).length === 0) {
            skippedCount++;
            continue;
          }

          // Apply fixes automatically
          await this.insertMissingFrontmatter(file, existingFrontmatter, missingFields);
          fixedCount++;

        } catch (error) {
          console.error(`Failed to fix ${file.path}:`, error);
          errorCount++;
        }
      }

      new Notice(`Fixed ${fixedCount} files (${skippedCount} skipped, ${errorCount} errors)`);

    } catch (error) {
      console.error('Failed to fix all files:', error);
      new Notice('Failed to fix all files: ' + (error as Error).message);
    }
  }

  async validateFolder(folder: TFolder) {
    try {
      // Get all markdown files in folder (recursive)
      const allMarkdownFiles = this.app.vault.getMarkdownFiles();
      const folderFiles = allMarkdownFiles.filter(f => f.path.startsWith(folder.path + '/'));

      if (folderFiles.length === 0) {
        new Notice('No markdown files found in this folder');
        return;
      }

      let validCount = 0;
      let invalidCount = 0;
      const issues: Array<{file: string, issues: Array<{type: string, detail: string}>}> = [];

      for (const file of folderFiles) {
        try {
          const content = await this.app.vault.read(file);
          const frontmatter = this.extractFrontmatter(content);
          const fileIssues: Array<{type: string, detail: string}> = [];

          if (!frontmatter || Object.keys(frontmatter).length === 0) {
            fileIssues.push({
              type: 'missing_frontmatter',
              detail: 'No frontmatter found'
            });
          } else {
            const requiredFields = ['id', 'type', 'status'];
            for (const field of requiredFields) {
              if (frontmatter[field] === undefined || frontmatter[field] === null || frontmatter[field] === '') {
                fileIssues.push({
                  type: 'missing_field',
                  detail: `Missing required field: ${field}`
                });
              }
            }

            if (frontmatter.type) {
              const typeStr = String(frontmatter.type);
              const template = templateRegistry.getActive();
              const validTypes = template?.entityTypes.map((e) => e.name) || [];
              if (!validTypes.includes(typeStr)) {
                fileIssues.push({
                  type: 'invalid_type',
                  detail: `Invalid type '${typeStr}'`
                });
              }
            }
          }

          if (fileIssues.length > 0) {
            invalidCount++;
            issues.push({ file: file.path, issues: fileIssues });
          } else {
            validCount++;
          }
        } catch (error) {
          console.error(`Failed to validate ${file.path}:`, error);
        }
      }

      new FolderValidationResultModal(this.app, folder.path, validCount, invalidCount, issues).open();

    } catch (error) {
      console.error('Failed to validate folder:', error);
      new Notice('Failed to validate folder: ' + (error as Error).message);
    }
  }

  async fixFolder(folder: TFolder) {
    try {
      // Get all markdown files in folder (recursive)
      const allMarkdownFiles = this.app.vault.getMarkdownFiles();
      const folderFiles = allMarkdownFiles.filter(f => f.path.startsWith(folder.path + '/'));

      if (folderFiles.length === 0) {
        new Notice('No markdown files found in this folder');
        return;
      }

      new Notice(`Fixing ${folderFiles.length} files...`);

      let fixedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;

      for (const file of folderFiles) {
        try {
          const content = await this.app.vault.read(file);
          const existingFrontmatter = this.extractFrontmatter(content);

          if (!existingFrontmatter || Object.keys(existingFrontmatter).length === 0) {
            skippedCount++;
            continue;
          }

          let entityType: string = typeof existingFrontmatter.type === 'string' ? existingFrontmatter.type : '';
          if (!entityType && this.folderMapper) {
            const result = await this.folderMapper.resolveType(file.path);
            if (result.confidence === 'exact') {
              entityType = result.types[0];
            } else {
              skippedCount++;
              continue;
            }
          } else if (!entityType) {
            skippedCount++;
            continue;
          }

          const template = FRONTMATTER_TEMPLATES[entityType];
          if (!template) {
            skippedCount++;
            continue;
          }

          const fileName = file.basename;
          const autoFilledTemplate = {
            ...template,
            id: existingFrontmatter.id || this.generateId(fileName, entityType),
            name: existingFrontmatter.name || fileName,
            title: existingFrontmatter.title || fileName
          };

          const missingFields = this.computeNewFieldsForBulk(existingFrontmatter, autoFilledTemplate);

          if (Object.keys(missingFields).length === 0) {
            skippedCount++;
            continue;
          }

          await this.insertMissingFrontmatter(file, existingFrontmatter, missingFields);
          fixedCount++;

        } catch (error) {
          console.error(`Failed to fix ${file.path}:`, error);
          errorCount++;
        }
      }

      new Notice(`Fixed ${fixedCount} files in folder (${skippedCount} skipped, ${errorCount} errors)`);

    } catch (error) {
      console.error('Failed to fix folder:', error);
      new Notice('Failed to fix folder: ' + (error as Error).message);
    }
  }

  activateValidationSidebar() {
    this.app.workspace.detachLeavesOfType('hivemind-validation-sidebar');

    void this.app.workspace.getRightLeaf(false)?.setViewState({
      type: 'hivemind-validation-sidebar',
      active: true,
    });

    const leaves = this.app.workspace.getLeavesOfType('hivemind-validation-sidebar');
    if (leaves[0]) {
      void this.app.workspace.revealLeaf(leaves[0]);
    }
  }
}

const VIEW_TYPE_VALIDATION = 'hivemind-validation-sidebar';

class ValidationSidebarView extends ItemView {
  plugin: HivemindPlugin;

  constructor(leaf: WorkspaceLeaf, plugin: HivemindPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_VALIDATION;
  }

  getDisplayText(): string {
    return 'Hivemind validation';
  }

  getIcon(): string {
    return 'check-circle';
  }

  async onOpen() {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass('hivemind-validation-sidebar');

    // Header
    const headerEl = container.createDiv({ cls: 'hivemind-validation-header hvmd-validation-header' });

    headerEl.createEl('h2', { text: 'Validation results' });

    // Buttons
    const buttonContainer = headerEl.createDiv({ cls: 'button-container hvmd-button-row' });

    const refreshBtn = buttonContainer.createEl('button', {
      text: 'Refresh',
      cls: 'mod-cta'
    });
    refreshBtn.addEventListener('click', () => {
      void this.runValidation();
    });

    const fixAllBtn = buttonContainer.createEl('button', {
      text: 'Fix all',
    });
    fixAllBtn.addEventListener('click', async () => {
      await this.plugin.fixAllFiles();
      void this.runValidation();
    });

    // Results container
    container.createDiv({ cls: 'hivemind-validation-results hvmd-results-container' });

    // Run initial validation
    await this.runValidation();
  }

  async runValidation() {
    const container = this.containerEl.children[1];
    const resultsContainer = container.querySelector('.hivemind-validation-results') as HTMLElement;

    if (!resultsContainer) return;

    resultsContainer.empty();

    // Show scanning message
    const scanningEl = resultsContainer.createDiv({ cls: 'hvmd-scanning' });
    scanningEl.setText('Scanning vault...');

    // Get all markdown files
    const allFiles = this.app.vault.getMarkdownFiles();
    const validFiles: TFile[] = [];
    const invalidFiles: Array<{file: TFile, issues: Array<{type: string, detail: string}>}> = [];

    for (const file of allFiles) {
      try {
        const content = await this.app.vault.read(file);
        const frontmatter = this.plugin.extractFrontmatter(content);
        const issues: Array<{type: string, detail: string}> = [];

        if (!frontmatter || Object.keys(frontmatter).length === 0) {
          issues.push({
            type: 'missing_frontmatter',
            detail: 'No frontmatter found'
          });
        } else {
          const requiredFields = ['id', 'type', 'status'];
          for (const field of requiredFields) {
            if (frontmatter[field] === undefined || frontmatter[field] === null || frontmatter[field] === '') {
              issues.push({
                type: 'missing_field',
                detail: `Missing required field: ${field}`
              });
            }
          }

          if (frontmatter.type) {
            const typeStr = String(frontmatter.type);
            const template = templateRegistry.getActive();
            const validTypes = template?.entityTypes.map((e) => e.name) || [];
            if (!validTypes.includes(typeStr)) {
              issues.push({
                type: 'invalid_type',
                detail: `Invalid type '${typeStr}'`
              });
            }

            // Check folder mismatch (based on severity setting)
            if (this.plugin.folderMapper && issues.length === 0) {
              try {
                const resolved = await this.plugin.folderMapper.resolveType(file.path);
                if (resolved.confidence === 'exact' && resolved.types[0] !== typeStr) {
                  const severity = this.plugin.settings.validationSeverity || 'warning';
                  issues.push({
                    type: severity === 'error' ? 'folder_mismatch_error' : 'folder_mismatch',
                    detail: `Type '${frontmatter.type}' doesn't match folder (expected '${resolved.types[0]}')`
                  });
                }
              } catch {
                // Folder mapping is optional
              }
            }
          }
        }

        if (issues.length > 0) {
          invalidFiles.push({ file, issues });
        } else {
          validFiles.push(file);
        }
      } catch (error) {
        console.error(`Failed to validate ${file.path}:`, error);
      }
    }

    // Clear scanning message
    resultsContainer.empty();

    // Show summary
    const summaryEl = resultsContainer.createDiv({ cls: 'validation-summary hvmd-summary' });

    summaryEl.createEl('div', {
      text: `Valid: ${validFiles.length}`,
      cls: 'validation-summary-item hvmd-text-success'
    });

    summaryEl.createEl('div', {
      text: `Issues: ${invalidFiles.length}`,
      cls: 'validation-summary-item hvmd-text-warning'
    });

    // Show invalid files
    if (invalidFiles.length > 0) {
      resultsContainer.createEl('h3', { text: 'Files with issues' });

      for (const { file, issues } of invalidFiles) {
        const fileEl = resultsContainer.createDiv({ cls: 'validation-file-item hvmd-file-item' });

        fileEl.addEventListener('click', () => {
          void this.app.workspace.getLeaf().openFile(file);
        });

        const fileNameEl = fileEl.createDiv({ cls: 'validation-file-name hvmd-file-name' });
        fileNameEl.setText(file.path);

        const issuesEl = fileEl.createDiv({ cls: 'validation-file-issues hvmd-file-issues' });

        for (const issue of issues) {
          const issueEl = issuesEl.createDiv();
          issueEl.setText(`- ${issue.detail}`);
        }
      }
    } else {
      const noIssuesEl = resultsContainer.createDiv({ cls: 'hvmd-no-issues' });
      noIssuesEl.setText('All files have valid frontmatter!');
    }
  }

  async onClose() {
    // Cleanup
  }
}

// Folder Validation Result Modal
class FolderValidationResultModal extends Modal {
  folderPath: string;
  validCount: number;
  invalidCount: number;
  issues: Array<{file: string, issues: Array<{type: string, detail: string}>}>;

  constructor(app: App, folderPath: string, validCount: number, invalidCount: number, issues: Array<{file: string, issues: Array<{type: string, detail: string}>}>) {
    super(app);
    this.folderPath = folderPath;
    this.validCount = validCount;
    this.invalidCount = invalidCount;
    this.issues = issues;
  }

  onOpen() {
    const { contentEl } = this;

    contentEl.createEl('h2', { text: 'Folder validation results' });

    contentEl.createEl('p', {
      text: this.folderPath,
      cls: 'setting-item-description'
    });

    // Summary
    const summaryEl = contentEl.createDiv({ cls: 'validation-summary hvmd-summary-with-margin-top' });

    summaryEl.createEl('div', {
      text: `Valid: ${this.validCount}`,
      cls: 'hvmd-text-success'
    });

    summaryEl.createEl('div', {
      text: `Issues: ${this.invalidCount}`,
      cls: 'hvmd-text-warning'
    });

    // Issues list
    if (this.issues.length > 0) {
      const issuesContainer = contentEl.createDiv({ cls: 'validation-issues hvmd-issues-container' });

      for (const { file, issues } of this.issues) {
        const fileItem = issuesContainer.createDiv({ cls: 'validation-file-item hvmd-file-item-no-cursor' });

        fileItem.createEl('strong', { text: file });

        const issuesList = fileItem.createDiv({ cls: 'hvmd-issues-list' });

        for (const issue of issues) {
          issuesList.createDiv({ text: `- ${issue.detail}` });
        }
      }
    }

    // Close button
    const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container hvmd-button-container-end' });

    const closeBtn = buttonContainer.createEl('button', {
      text: 'Close',
      cls: 'mod-cta'
    });
    closeBtn.addEventListener('click', () => {
      this.close();
    });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

// Validation Result Modal
class ValidationResultModal extends Modal {
  file: TFile;
  issues: Array<{type: string, detail: string}>;

  constructor(app: App, file: TFile, issues: Array<{type: string, detail: string}>) {
    super(app);
    this.file = file;
    this.issues = issues;
  }

  onOpen() {
    const { contentEl } = this;

    // Heading
    contentEl.createEl('h2', { text: 'Validation issues' });

    // Subheading with file name
    contentEl.createEl('p', {
      text: this.file.name,
      cls: 'setting-item-description'
    });

    // Issues list container
    const issuesContainer = contentEl.createDiv({ cls: 'validation-issues hvmd-issues-container-with-margin-top' });

    // Display each issue with icon and text
    for (const issue of this.issues) {
      const issueItem = issuesContainer.createDiv({ cls: 'validation-issue-item hvmd-issue-item' });

      // Warning icon
      const icon = issueItem.createDiv({ cls: 'validation-issue-icon hvmd-issue-icon' });
      icon.setText('⚠️');

      // Issue text
      const text = issueItem.createDiv({ cls: 'validation-issue-text hvmd-issue-text' });
      text.setText(issue.detail);
    }

    // Close button
    const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container hvmd-button-container-end' });

    const closeBtn = buttonContainer.createEl('button', {
      text: 'Close',
      cls: 'mod-cta'
    });
    closeBtn.addEventListener('click', () => {
      this.close();
    });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

// Fix Fields Modal
class FixFieldsModal extends Modal {
  plugin: HivemindPlugin;
  file: TFile;
  existingFrontmatter: Record<string, unknown>;
  missingFields: Record<string, unknown>;
  entityType: string;
  private editedValues: Record<string, unknown> = {};

  constructor(
    app: App,
    plugin: HivemindPlugin,
    file: TFile,
    existingFrontmatter: Record<string, unknown>,
    missingFields: Record<string, unknown>,
    entityType: string
  ) {
    super(app);
    this.plugin = plugin;
    this.file = file;
    this.existingFrontmatter = existingFrontmatter;
    this.missingFields = missingFields;
    this.entityType = entityType;

    // Initialize edited values with defaults
    this.editedValues = { ...missingFields };
  }

  onOpen() {
    const { contentEl } = this;

    // Heading
    contentEl.createEl('h2', { text: 'Fix frontmatter' });

    // Subheading with file name and entity type
    const subheading = contentEl.createDiv({ cls: 'hvmd-subheading' });

    subheading.createEl('p', {
      text: this.file.name,
      cls: 'setting-item-description'
    });

    const typeBadge = subheading.createEl('span', {
      cls: 'frontmatter-type-badge hvmd-type-badge'
    });
    typeBadge.setText(this.entityType);

    // Fields container
    const fieldsContainer = contentEl.createDiv({ cls: 'fix-fields-container hvmd-fields-container' });

    // Create editable Settings for each missing field
    for (const [fieldPath, defaultValue] of Object.entries(this.missingFields)) {
      const displayValue = this.getDefaultDisplay(fieldPath, defaultValue);

      new Setting(fieldsContainer)
        .setName(fieldPath)
        .setDesc(`Default: ${this.formatValueForDisplay(defaultValue)}`)
        .addText(text => text
          .setValue(displayValue)
          .onChange(value => {
            this.editedValues[fieldPath] = value;
          })
        );
    }

    // Buttons
    const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container hvmd-button-container' });

    const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel' });
    cancelBtn.addEventListener('click', () => {
      this.close();
    });

    const applyBtn = buttonContainer.createEl('button', {
      text: 'Apply all',
      cls: 'mod-cta'
    });
    applyBtn.addEventListener('click', async () => {
      await this.applyChanges();
    });
  }

  private getDefaultDisplay(fieldPath: string, defaultValue: unknown): string {
    // For id field, auto-generate from filename
    if (fieldPath === 'id' && (!defaultValue || defaultValue === '')) {
      const slug = this.file.basename
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      return `${this.entityType}-${slug}`;
    }

    // For arrays, show as comma-separated
    if (Array.isArray(defaultValue)) {
      return defaultValue.join(', ');
    }

    // For objects, show as JSON
    if (typeof defaultValue === 'object' && defaultValue !== null) {
      return JSON.stringify(defaultValue);
    }

    // For null/undefined, show empty
    if (defaultValue === null || defaultValue === undefined) {
      return '';
    }

    return String(defaultValue);
  }

  private formatValueForDisplay(value: unknown): string {
    if (value === null || value === undefined) {
      return '(empty)';
    } else if (Array.isArray(value)) {
      return value.length === 0 ? '[]' : `[${value.length} items]`;
    } else if (typeof value === 'object') {
      return '{...}';
    } else if (typeof value === 'string') {
      return value === '' ? '(empty)' : `"${value}"`;
    } else {
      return String(value);
    }
  }

  private async applyChanges() {
    try {
      // Convert edited values back to proper types
      const fieldsToInsert: Record<string, unknown> = {};

      for (const [fieldPath, value] of Object.entries(this.editedValues)) {
        // Check if original value was an array
        const originalValue = this.missingFields[fieldPath];

        if (Array.isArray(originalValue)) {
          // Convert comma-separated string back to array
          fieldsToInsert[fieldPath] = typeof value === 'string'
            ? value.split(',').map(s => s.trim()).filter(s => s !== '')
            : [];
        } else if (typeof originalValue === 'object' && originalValue !== null) {
          // Try to parse as JSON
          try {
            fieldsToInsert[fieldPath] = typeof value === 'string' ? JSON.parse(value) : value;
          } catch {
            fieldsToInsert[fieldPath] = originalValue;
          }
        } else {
          fieldsToInsert[fieldPath] = value;
        }
      }

      // Convert flat field paths to nested object
      const nestedFields = this.flatToNested(fieldsToInsert);

      // Apply to file
      await this.plugin.insertMissingFrontmatter(this.file, this.existingFrontmatter, nestedFields);

      this.close();

    } catch (error) {
      console.error('Failed to apply changes:', error);
      new Notice('Failed to apply changes: ' + (error as Error).message);
    }
  }

  private flatToNested(flat: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [path, value] of Object.entries(flat)) {
      const parts = path.split('.');
      let current: Record<string, unknown> = result;

      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part] as Record<string, unknown>;
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
    contentEl.createEl('h2', { text: 'Select workflow' });

    try {
      console.debug('[Plugin] Calling list_workflows...');
      const response = await this.plugin.callMCPTool({
        name: 'list_workflows',
        arguments: {},
      });

      console.debug('[Plugin] list_workflows response:', response);

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
          text: 'No workflows found',
          cls: 'mod-warning'
        });

        contentEl.createEl('p', {
          text: 'Create a new workflow to get started:',
        });

        const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container hvmd-button-container-top' });

        const createBtn = buttonContainer.createEl('button', {
          text: 'Create new workflow',
          cls: 'mod-cta'
        });

        createBtn.addEventListener('click', () => {
          this.close();
          new CreateWorkflowModal(this.app, this.plugin).open();
        });

        const reconnectBtn = buttonContainer.createEl('button', {
          text: 'Reconnect MCP',
          cls: 'mod-warning'
        });

        reconnectBtn.addEventListener('click', async () => {
          this.close();
          this.plugin.stopMCPServer();
          await new Promise(resolve => setTimeout(resolve, 1000));
          this.plugin.startMCPServer();
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
          void this.plugin.executeWorkflow(workflow.id, this.contextId, this.contextType);
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
    contentEl.createEl('h2', { text: 'Create new workflow' });

    contentEl.createEl('p', {
      text: 'This will create a basic workflow template. You can customize it later by editing the JSON file or importing from ComfyUI.'
    });

    // Workflow ID
    new Setting(contentEl)
      .setName('Workflow ID')
      .setDesc('Unique identifier (lowercase, no spaces)')
      .addText(text => text
        .setPlaceholder('Enter workflow ID')
        .onChange(value => {
          this.result.id = value.toLowerCase().replace(/\s+/g, '-');
        }));

    // Workflow Name
    new Setting(contentEl)
      .setName('Workflow name')
      .setDesc('Human-readable name')
      .addText(text => text
        .setPlaceholder('My character portrait')
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
      text: 'Basic template',
      cls: 'mod-cta hvmd-margin-right'
    });

    basicTemplate.addEventListener('click', async () => {
      await this.createWorkflow('basic');
    });

    const advancedTemplate = templateContainer.createEl('button', {
      text: 'Advanced template (with context)',
    });

    advancedTemplate.addEventListener('click', async () => {
      await this.createWorkflow('advanced');
    });
  }

  async createWorkflow(template: 'basic' | 'advanced') {
    if (!this.result.id || !this.result.name) {
      new Notice('Please fill in ID and name');
      return;
    }

    try {
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

      const workflowFolder = 'workflows';
      if (!this.app.vault.getAbstractFileByPath(workflowFolder)) {
        await this.app.vault.createFolder(workflowFolder);
      }

      const workflowFilePath = `${workflowFolder}/${this.result.id}.json`;
      await this.app.vault.create(workflowFilePath, JSON.stringify(workflowData, null, 2));

      new Notice(`Workflow created: ${this.result.name}`);

      // Show info modal
      new WorkflowCreatedModal(this.app, workflowFilePath, this.plugin).open();

      this.close();

    } catch (error) {
      console.error('Failed to create workflow:', error);
      new Notice('Failed to create workflow: ' + (error as Error).message);
    }
  }

  getBasicTemplate(): Record<string, unknown> {
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

  getAdvancedTemplate(): Record<string, unknown> {
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
    contentEl.createEl('h2', { text: 'Workflow created!' });

    contentEl.createEl('p', {
      text: `Your workflow has been created at:`
    });

    contentEl.createEl('code', {
      text: this.filePath
    });

    contentEl.createEl('p', {
      text: 'Note: JSON files won\'t appear in Obsidian\'s file explorer (this is normal!). Use file explorer to verify the file exists.'
    });

    contentEl.createEl('p', {
      text: 'To use it with ComfyUI, you need to export a real workflow from ComfyUI and replace the workflow JSON in this file.'
    });

    contentEl.createEl('h3', { text: 'Next steps:' });

    const steps = contentEl.createEl('ol');
    steps.createEl('li', { text: 'Open ComfyUI in your browser' });
    steps.createEl('li', { text: 'Create/load your workflow' });
    steps.createEl('li', { text: 'Click the save (API format) button' });
    steps.createEl('li', { text: 'Copy the JSON output' });
    steps.createEl('li', { text: 'Paste it into the "workflow" field in your JSON file' });

    const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container hvmd-button-container-margin-top' });

    const reconnectBtn = buttonContainer.createEl('button', {
      text: 'Reconnect MCP to load workflow',
      cls: 'mod-cta'
    });

    reconnectBtn.addEventListener('click', async () => {
      this.close();
      this.plugin.stopMCPServer();
      await new Promise(resolve => setTimeout(resolve, 1000));
      this.plugin.startMCPServer();
      new Notice('MCP server reconnected - workflow loaded!');
    });
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

// Add Frontmatter Modal - shows preview of what will be added
class AddFrontmatterModal extends Modal {
  plugin: HivemindPlugin;
  file: TFile;
  entityType: string;
  existingFrontmatter: Record<string, unknown>;
  newFields: Record<string, unknown> = {};

  constructor(
    app: App,
    plugin: HivemindPlugin,
    file: TFile,
    entityType: string,
    existingFrontmatter: Record<string, unknown>
  ) {
    super(app);
    this.plugin = plugin;
    this.file = file;
    this.entityType = entityType;
    this.existingFrontmatter = existingFrontmatter;
  }

  onOpen() {
    const { contentEl } = this;

    contentEl.createEl('h2', { text: 'Add frontmatter' });

    // Show file name
    contentEl.createEl('p', {
      text: `File: ${this.file.name}`,
      cls: 'setting-item-description'
    });

    // Show detected/selected type with badge
    const typeBadge = contentEl.createEl('div', {
      cls: 'frontmatter-type-badge hvmd-type-badge-large'
    });
    typeBadge.setText(`Type: ${this.entityType}`);

    // Get template for this type
    const template = FRONTMATTER_TEMPLATES[this.entityType];
    if (!template) {
      contentEl.createEl('p', {
        text: `Error: Unknown entity type "${this.entityType}"`,
        cls: 'mod-error'
      });
      return;
    }

    // Auto-fill id and name/title from filename
    const fileName = this.file.basename;
    const id = this.generateId(fileName, this.entityType);
    const autoFilledTemplate = {
      ...template,
      id: id,
      name: fileName,
      title: fileName
    };

    // Compute fields to add: template fields NOT in existing frontmatter
    this.newFields = this.computeNewFields(this.existingFrontmatter, autoFilledTemplate);

    if (Object.keys(this.newFields).length === 0) {
      contentEl.createEl('p', {
        text: 'All frontmatter fields are already present in this file.',
        cls: 'mod-success'
      });

      const closeBtn = contentEl.createEl('button', {
        text: 'Close',
        cls: 'mod-cta hvmd-close-btn-margin'
      });
      closeBtn.addEventListener('click', () => {
        this.close();
      });
      return;
    }

    // Display preview section
    contentEl.createEl('h3', { text: 'Fields to add:' });

    const previewContainer = contentEl.createDiv({ cls: 'frontmatter-preview hvmd-preview-container' });

    // List each field name and its default value
    const fieldList = previewContainer.createEl('ul', { cls: 'hvmd-field-list' });

    for (const [fieldPath, value] of Object.entries(this.newFields)) {
      const listItem = fieldList.createEl('li', { cls: 'hvmd-field-list-item' });

      const fieldName = listItem.createEl('strong');
      fieldName.setText(fieldPath);

      const fieldValue = listItem.createEl('div', { cls: 'hvmd-field-value' });

      // Format value for display
      const displayValue = this.formatValueForDisplay(value);
      fieldValue.setText(`→ ${displayValue}`);
    }

    // Buttons
    const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container hvmd-button-container' });

    const cancelBtn = buttonContainer.createEl('button', { text: 'Cancel' });
    cancelBtn.addEventListener('click', () => {
      this.close();
    });

    const applyBtn = buttonContainer.createEl('button', {
      text: 'Apply',
      cls: 'mod-cta'
    });
    applyBtn.addEventListener('click', async () => {
      try {
        applyBtn.setAttr('disabled', 'true');
        applyBtn.setText('Applying...');

        // Convert flat field paths back to nested object
        const fieldsToInsert = this.flatToNested(this.newFields);

        await this.plugin.insertMissingFrontmatter(
          this.file,
          this.existingFrontmatter,
          fieldsToInsert
        );

        this.close();
      } catch (error) {
        new Notice('Failed to add frontmatter: ' + (error as Error).message);
        applyBtn.removeAttribute('disabled');
        applyBtn.setText('Apply');
      }
    });
  }

  private computeNewFields(existing: Record<string, unknown>, template: Record<string, unknown>, prefix = ''): Record<string, unknown> {
    const newFields: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(template)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      // Skip if exists and not empty
      if (existing[key] !== undefined && existing[key] !== null && existing[key] !== '') {
        // If it's an object, check nested fields
        if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
          const nestedNew = this.computeNewFields((existing[key] as Record<string, unknown>) || {}, value as Record<string, unknown>, fullKey);
          Object.assign(newFields, nestedNew);
        }
        continue;
      }

      // Field is missing or empty
      newFields[fullKey] = value;
    }

    return newFields;
  }

  private formatValueForDisplay(value: unknown): string {
    if (value === null || value === undefined) {
      return '(empty)';
    } else if (Array.isArray(value)) {
      return value.length === 0 ? '[]' : `[${value.length} items]`;
    } else if (typeof value === 'object') {
      return '{...}';
    } else if (typeof value === 'string') {
      return value === '' ? '(empty)' : `"${value}"`;
    } else {
      return String(value);
    }
  }

  private flatToNested(flat: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [path, value] of Object.entries(flat)) {
      const parts = path.split('.');
      let current: Record<string, unknown> = result;

      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part] as Record<string, unknown>;
      }

      current[parts[parts.length - 1]] = value;
    }

    return result;
  }

  private generateId(name: string, entityType: string): string {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return `${entityType}-${slug}`;
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

// Type Selection Modal - lets user pick an entity type
class TypeSelectionModal extends Modal {
  plugin: HivemindPlugin;
  file: TFile;
  suggestedTypes?: string[];  // Optional suggested types from folder mapping
  onTypeSelected?: (type: string) => void;  // Optional callback for reuse

  constructor(app: App, plugin: HivemindPlugin, file: TFile, suggestedTypes?: string[], onTypeSelected?: (type: string) => void) {
    super(app);
    this.plugin = plugin;
    this.file = file;
    this.suggestedTypes = suggestedTypes;
    this.onTypeSelected = onTypeSelected;
  }

  onOpen() {
    const { contentEl } = this;

    contentEl.createEl('h2', { text: 'Select entity type' });

    contentEl.createEl('p', {
      text: 'Choose the type of entity for this note:',
      cls: 'setting-item-description'
    });

    contentEl.createEl('p', {
      text: `File: ${this.file.path}`,
      cls: 'setting-item-description'
    });

    const typeDescriptions: Record<string, string> = {
      character: 'NPCs, PCs, and historical figures',
      location: 'Places, regions, and buildings',
      event: 'Historical and current events',
      faction: 'Organizations and groups',
      lore: 'Mythology, magic, and culture',
      asset: 'Images and media files',
      reference: 'Out-of-world reference material'
    };

    // If we have suggested types (from ambiguous mapping), show them first
    if (this.suggestedTypes && this.suggestedTypes.length > 0) {
      contentEl.createEl('h3', { text: 'Suggested types based on folder:' });

      const suggestedGrid = contentEl.createDiv({ cls: 'type-selection-grid hvmd-type-grid' });

      for (const type of this.suggestedTypes) {
        const description = typeDescriptions[type] || 'Custom type';
        const typeBtn = suggestedGrid.createEl('button', {
          cls: 'type-selection-btn mod-cta hvmd-type-btn'
        });

        typeBtn.createEl('div', {
          text: type.charAt(0).toUpperCase() + type.slice(1),
          cls: 'hvmd-type-name'
        });

        typeBtn.createEl('div', {
          text: description,
          cls: 'hvmd-type-desc'
        });

        typeBtn.addEventListener('click', async () => {
          await this.applyType(type);
          this.close();
        });
      }

      contentEl.createEl('h3', { text: 'Or choose a different type:' });
    }

    // Create type buttons grid for all types
    const typeGrid = contentEl.createDiv({ cls: 'type-selection-grid hvmd-type-grid-bottom' });

    for (const [type, description] of Object.entries(typeDescriptions)) {
      // Skip types already shown in suggested section
      if (this.suggestedTypes && this.suggestedTypes.includes(type)) {
        continue;
      }

      const typeBtn = typeGrid.createEl('button', {
        cls: 'type-selection-btn hvmd-type-btn'
      });

      typeBtn.createEl('div', {
        text: type.charAt(0).toUpperCase() + type.slice(1),
        cls: 'hvmd-type-name'
      });

      typeBtn.createEl('div', {
        text: description,
        cls: 'hvmd-type-desc'
      });

      typeBtn.addEventListener('click', async () => {
        await this.applyType(type);
        this.close();
      });
    }

    // Cancel button
    const cancelContainer = contentEl.createDiv({ cls: 'hvmd-cancel-container' });

    const cancelBtn = cancelContainer.createEl('button', { text: 'Cancel' });
    cancelBtn.addEventListener('click', () => {
      this.close();
    });
  }

  async applyType(entityType: string) {
    // If callback provided, call it instead of directly applying
    if (this.onTypeSelected) {
      this.onTypeSelected(entityType);
      return;
    }

    // Default behavior: directly apply frontmatter
    try {
      const template = FRONTMATTER_TEMPLATES[entityType];
      if (!template) {
        new Notice(`Unknown type: ${entityType}`);
        return;
      }

      const fileName = this.file.basename;
      const id = this.generateId(fileName, entityType);

      // Create frontmatter with auto-filled values
      const frontmatter = {
        ...template,
        id: id,
        name: fileName,
        title: fileName
      };

      await this.plugin.insertMissingFrontmatter(this.file, {}, frontmatter);
      new Notice(`Added ${entityType} frontmatter to ${this.file.name}`);
    } catch (error) {
      new Notice('Failed to add frontmatter: ' + (error as Error).message);
    }
  }

  generateId(name: string, entityType: string): string {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return `${entityType}-${slug}`;
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

    new Setting(containerEl).setName('MCP connection').setHeading();

    // Info banner about local connections
    const infoBanner = containerEl.createDiv({ cls: 'hivemind-info-banner hvmd-info-banner' });
    infoBanner.createEl('p', {
      text: 'Privacy: all connections are local (localhost). No data leaves your computer.',
      cls: 'setting-item-description'
    });

    new Setting(containerEl)
      .setName('MCP server command')
      .setDesc('Command to start the MCP server')
      .addText(text => text
        .setPlaceholder('Enter server start command')
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

    new Setting(containerEl).setName('Frontmatter commands').setHeading();

    const frontmatterInfoEl = containerEl.createEl('p', { cls: 'setting-item-description hvmd-info-text' });
    frontmatterInfoEl.setText('Configure how frontmatter commands behave in your vault.');

    new Setting(containerEl)
      .setName('Default entity type')
      .setDesc('Default type when adding frontmatter (leave empty for folder-based inference)')
      .addDropdown(dropdown => {
        dropdown.addOption('', '(auto-detect from folder)');
        dropdown.addOption('character', 'Character');
        dropdown.addOption('location', 'Location');
        dropdown.addOption('event', 'Event');
        dropdown.addOption('faction', 'Faction');
        dropdown.addOption('lore', 'Lore');
        dropdown.addOption('asset', 'Asset');
        dropdown.addOption('reference', 'Reference');

        dropdown.setValue(this.plugin.settings.defaultEntityType);
        dropdown.onChange(async (value) => {
          this.plugin.settings.defaultEntityType = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName('Auto-merge frontmatter')
      .setDesc('Skip preview modal when type is exact match (applies frontmatter immediately)')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.autoMergeFrontmatter)
        .onChange(async (value) => {
          this.plugin.settings.autoMergeFrontmatter = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Validation severity')
      .setDesc('How to handle folder mismatches during validation')
      .addDropdown(dropdown => {
        dropdown.addOption('warning', 'Warning (show but continue)');
        dropdown.addOption('error', 'Error (block operations)');

        dropdown.setValue(this.plugin.settings.validationSeverity);
        dropdown.onChange(async (value: 'error' | 'warning') => {
          this.plugin.settings.validationSeverity = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName('Show validation notices')
      .setDesc('Automatically validate frontmatter when opening files')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showValidationNotices)
        .onChange(async (value) => {
          this.plugin.settings.showValidationNotices = value;
          await this.plugin.saveSettings();

          // Reload plugin to apply event handler changes
          new Notice('Please reload Obsidian for this setting to take effect');
        }));

    new Setting(containerEl).setName('ComfyUI integration').setHeading();

    const comfyInfoEl = containerEl.createEl('p', { cls: 'setting-item-description hvmd-info-text' });
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
        .setButtonText('Test connection')
        .setCta()
        .onClick(async () => {
          button.setDisabled(true);
          button.setButtonText('Testing...');

          try {
            const endpoint = this.plugin.settings.comfyuiEndpoint || 'http://127.0.0.1:8188';
            const response = await requestUrl({
              url: `${endpoint}/system_stats`,
              method: 'GET',
            });

            if (response.status === 200) {
              new Notice('ComfyUI connection successful!', 5000);
            } else {
              new Notice(`ComfyUI responded with status ${response.status}`, 5000);
            }
          } catch (error) {
            new Notice(`Failed to connect to ComfyUI: ${(error as Error).message}`, 8000);
          } finally {
            button.setDisabled(false);
            button.setButtonText('Test connection');
          }
        }));
  }
}
