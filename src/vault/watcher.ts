import chokidar, { type FSWatcher } from 'chokidar';
import type { VaultConfig } from '../types/index.js';

export type FileChangeEvent = 'add' | 'change' | 'unlink';

export interface FileChangeHandler {
  (event: FileChangeEvent, filePath: string): void | Promise<void>;
}

export class VaultWatcher {
  private config: VaultConfig;
  private watcher: FSWatcher | null = null;
  private handlers: FileChangeHandler[] = [];
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: VaultConfig) {
    this.config = config;
  }

  /**
   * Start watching the vault for changes
   */
  start(): void {
    if (!this.config.watchForChanges) {
      console.error('File watching disabled in config');
      return;
    }

    console.error(`Starting file watcher on: ${this.config.path}`);

     this.watcher = chokidar.watch('**/*.md', {
      cwd: this.config.path,
      ignored: [
        '**/node_modules/**',
        '**/.obsidian/**',
        '**/.trash/**',
        '**/.git/**',
        '**/_template.md',
        ...(this.config.excludePatterns || []),
      ],
      ignoreInitial: true, // Don't trigger on initial scan
      persistent: true,
      // Increase thresholds for Obsidian's atomic writes
      awaitWriteFinish: {
        stabilityThreshold: 500,  // Wait 500ms for file to be stable
        pollInterval: 100,
      },
      // Enable additional events for debugging
      alwaysStat: true,
      atomic: true, // Handle atomic writes (rename operations)
    });

    console.error(`Watcher configuration:
  - Pattern: **/*.md
  - CWD: ${this.config.path}
  - Debounce: ${this.config.debounceMs || 100}ms
  - Atomic writes: enabled
  - Stability threshold: 500ms
  - Ignored: ${JSON.stringify(this.watcher.options.ignored)}`);

    // Set up event handlers with debouncing
    this.watcher
      .on('add', (path: string) => {
        console.error(`[Watcher] ADD event: ${path}`);
        this.handleChange('add', path);
      })
      .on('change', (path: string) => {
        console.error(`[Watcher] CHANGE event: ${path}`);
        this.handleChange('change', path);
      })
      .on('unlink', (path: string) => {
        console.error(`[Watcher] UNLINK event: ${path}`);
        this.handleChange('unlink', path);
      })
      .on('raw', (event: string, path: string, details: any) => {
        console.error(`[Watcher] RAW event: ${event} on ${path}`, details);
      })
      .on('error', (error: unknown) => console.error('❌ Watcher error:', error))
      .on('ready', () => console.error('✅ File watcher ready and listening for changes...'));
  }

  /**
   * Stop watching
   */
  async stop(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
      console.error('File watcher stopped');
    }
  }

  /**
   * Register a handler for file changes
   */
  onChange(handler: FileChangeHandler): void {
    this.handlers.push(handler);
  }

  /**
   * Handle file change with debouncing
   */
  private handleChange(event: FileChangeEvent, filePath: string): void {
    const debounceMs = this.config.debounceMs || 100;

    // Clear existing timer for this file
    const existingTimer = this.debounceTimers.get(filePath);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      this.debounceTimers.delete(filePath);
      this.notifyHandlers(event, filePath);
    }, debounceMs);

    this.debounceTimers.set(filePath, timer);
  }

  /**
   * Notify all registered handlers
   */
  private async notifyHandlers(event: FileChangeEvent, filePath: string): Promise<void> {
    console.error(`📝 File ${event}: ${filePath}`);

    for (const handler of this.handlers) {
      try {
        await handler(event, filePath);
      } catch (error) {
        console.error(`❌ Error in change handler for ${filePath}:`, error);
      }
    }
  }
}
