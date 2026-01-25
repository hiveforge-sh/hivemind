import { promises as fs } from 'fs';
import { join, relative } from 'path';
import type { VaultConfig, VaultNote } from '../types/index.js';
import { MarkdownParser } from '../parser/markdown.js';

export interface ParseError {
  filePath: string;
  reason: string;
  error?: any;
}

export interface VaultIndex {
  notes: Map<string, VaultNote>;
  notesByType: Map<string, Set<string>>;
  notesByStatus: Map<string, Set<string>>;
  totalNotes: number;
  lastUpdated: Date;
  ignoredFiles: ParseError[];
}

export class VaultReader {
  private config: VaultConfig;
  private index: VaultIndex;
  private parser: MarkdownParser;

  constructor(config: VaultConfig) {
    this.config = config;
    this.parser = new MarkdownParser();
    this.index = {
      notes: new Map(),
      notesByType: new Map(),
      notesByStatus: new Map(),
      totalNotes: 0,
      lastUpdated: new Date(),
      ignoredFiles: [],
    };
  }

  /**
   * Generate a visual progress bar
   */
  private generateProgressBar(current: number, total: number, width: number = 30): string {
    const percent = current / total;
    const filled = Math.floor(percent * width);
    const empty = width - filled;
    
    const bar = '='.repeat(Math.max(0, filled - 1)) + (filled > 0 ? '>' : '') + ' '.repeat(empty);
    const percentStr = Math.floor(percent * 100).toString().padStart(3, ' ');
    
    return `[${bar}] ${percentStr}% (${current}/${total})`;
  }

  /**
   * Scan the vault directory and build an index of all markdown files
   */
  async scanVault(): Promise<VaultIndex> {
    const startTime = Date.now();
    const files = await this.findMarkdownFiles(this.config.path);
    
    console.error(`\n📂 Scanning vault: ${files.length} markdown files found`);
    
    // Clear existing index
    this.index.notes.clear();
    this.index.notesByType.clear();
    this.index.notesByStatus.clear();
    this.index.ignoredFiles = [];
    
    // Process each file with progress
    const total = files.length;
    let processed = 0;
    
    for (const filePath of files) {
      try {
        await this.indexFile(filePath);
      } catch (error) {
        const relPath = relative(this.config.path, filePath);
        this.index.ignoredFiles.push({
          filePath: relPath,
          reason: 'Failed to parse file',
          error: error instanceof Error ? error.message : String(error),
        });
      }
      
      // Update progress bar
      processed++;
      const progressBar = this.generateProgressBar(processed, total);
      process.stderr.write(`\r⏳ Indexing ${progressBar}`);
    }
    
    process.stderr.write('\n');
    
    this.index.totalNotes = this.index.notes.size;
    this.index.lastUpdated = new Date();
    
    const elapsed = Date.now() - startTime;
    console.error(`✅ Vault scan complete: ${this.index.totalNotes} notes indexed in ${elapsed}ms`);
    
    // Report ignored files summary
    if (this.index.ignoredFiles.length > 0) {
      console.error(`⚠️  ${this.index.ignoredFiles.length} file(s) skipped (missing frontmatter or errors)`);
      await this.writeSkippedFilesLog();
    }
    
    return this.index;
  }

  /**
   * Write a log file of skipped files, organized by root folder
   */
  private async writeSkippedFilesLog(): Promise<void> {
    try {
      const hivemindDir = join(this.config.path, '.hivemind');
      await fs.mkdir(hivemindDir, { recursive: true });
      
      const logPath = join(hivemindDir, 'skipped-files.log');
      
      // Group files by their root folder
      const byFolder = new Map<string, ParseError[]>();
      
      for (const error of this.index.ignoredFiles) {
        const parts = error.filePath.split(/[/\\]/);
        const folder = parts.length > 1 ? parts[0] : '(root)';
        
        if (!byFolder.has(folder)) {
          byFolder.set(folder, []);
        }
        byFolder.get(folder)!.push(error);
      }
      
      // Build log content
      const lines: string[] = [
        '═══════════════════════════════════════════════════════════════',
        '                    SKIPPED FILES REPORT',
        '═══════════════════════════════════════════════════════════════',
        '',
        `Generated: ${new Date().toISOString()}`,
        `Total Skipped: ${this.index.ignoredFiles.length} files`,
        '',
        'These files were not indexed because they are missing required',
        'YAML frontmatter. Each file needs:',
        '',
        '---',
        'id: unique-identifier',
        'type: character|location|event|faction|item|lore|etc',
        'status: canon|draft|pending|non-canon|archived',
        '---',
        '',
        '═══════════════════════════════════════════════════════════════',
        '',
      ];
      
      // Sort folders alphabetically
      const sortedFolders = Array.from(byFolder.keys()).sort();
      
      for (const folder of sortedFolders) {
        const files = byFolder.get(folder)!;
        lines.push(`📁 ${folder}/ (${files.length} files)`);
        lines.push('─'.repeat(60));
        
        for (const error of files) {
          lines.push(`  • ${error.filePath}`);
          if (error.error) {
            lines.push(`    ↳ ${error.error}`);
          }
        }
        
        lines.push('');
      }
      
      lines.push('═══════════════════════════════════════════════════════════════');
      lines.push('To fix: Add frontmatter to each file listed above.');
      lines.push('See documentation for frontmatter requirements.');
      lines.push('═══════════════════════════════════════════════════════════════');
      
      await fs.writeFile(logPath, lines.join('\n'), 'utf-8');
      console.error(`📄 Detailed log written to: .hivemind/skipped-files.log`);
    } catch (error) {
      console.error('Failed to write skipped files log:', error);
    }
  }

  /**
   * Recursively find all markdown files in a directory
   */
  private async findMarkdownFiles(dir: string): Promise<string[]> {
    const results: string[] = [];
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        
        // Skip excluded patterns
        if (this.shouldExclude(entry.name)) {
          continue;
        }
        
        if (entry.isDirectory()) {
          // Recursively search subdirectories
          const subFiles = await this.findMarkdownFiles(fullPath);
          results.push(...subFiles);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          results.push(fullPath);
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dir}:`, error);
    }
    
    return results;
  }

  /**
   * Check if a file/directory should be excluded
   */
  private shouldExclude(name: string): boolean {
    const defaultExcludes = [
      '.obsidian',
      '.trash',
      '.git',
      'node_modules',
      '_template.md',
    ];
    
    const excludePatterns = [
      ...defaultExcludes,
      ...(this.config.excludePatterns || []),
    ];
    
    return excludePatterns.some(pattern => {
      if (pattern.includes('*')) {
        // Simple glob matching
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        return regex.test(name);
      }
      return name === pattern || name.startsWith(pattern);
    });
  }

  /**
   * Index a single markdown file with full parsing
   */
  private async indexFile(filePath: string): Promise<void> {
    try {
      // Parse the file with MarkdownParser
      const note = await this.parser.parseFile(filePath);
      
      // Update file stats
      const stats = await fs.stat(filePath);
      note.stats = {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
      };
      
      // Update relative path
      note.filePath = relative(this.config.path, filePath);
      
      // Add to index
      this.index.notes.set(note.id, note);
      
      // Index by type
      if (!this.index.notesByType.has(note.frontmatter.type)) {
        this.index.notesByType.set(note.frontmatter.type, new Set());
      }
      this.index.notesByType.get(note.frontmatter.type)!.add(note.id);
      
      // Index by status
      if (!this.index.notesByStatus.has(note.frontmatter.status)) {
        this.index.notesByStatus.set(note.frontmatter.status, new Set());
      }
      this.index.notesByStatus.get(note.frontmatter.status)!.add(note.id);
    } catch (error) {
      // Silently skip files with parsing errors - they'll be reported in summary
      throw error;
    }
  }

  /**
   * Get a note by ID
   */
  getNote(id: string): VaultNote | undefined {
    return this.index.notes.get(id);
  }

  /**
   * Get all notes
   */
  getAllNotes(): VaultNote[] {
    return Array.from(this.index.notes.values());
  }

  /**
   * Get notes by type
   */
  getNotesByType(type: string): VaultNote[] {
    const ids = this.index.notesByType.get(type);
    if (!ids) return [];
    
    return Array.from(ids)
      .map(id => this.index.notes.get(id))
      .filter((note): note is VaultNote => note !== undefined);
  }

  /**
   * Get notes by status
   */
  getNotesByStatus(status: string): VaultNote[] {
    const ids = this.index.notesByStatus.get(status);
    if (!ids) return [];
    
    return Array.from(ids)
      .map(id => this.index.notes.get(id))
      .filter((note): note is VaultNote => note !== undefined);
  }

  /**
   * Get vault statistics
   */
  getStats() {
    const typeStats: Record<string, number> = {};
    for (const [type, ids] of this.index.notesByType.entries()) {
      typeStats[type] = ids.size;
    }
    
    const statusStats: Record<string, number> = {};
    for (const [status, ids] of this.index.notesByStatus.entries()) {
      statusStats[status] = ids.size;
    }
    
    return {
      totalNotes: this.index.totalNotes,
      byType: typeStats,
      byStatus: statusStats,
      lastUpdated: this.index.lastUpdated,
      ignoredFiles: this.index.ignoredFiles.length,
    };
  }

  /**
   * Get list of ignored files with error details
   */
  getIgnoredFiles(): ParseError[] {
    return this.index.ignoredFiles;
  }

  /**
   * Check if any markdown files have been modified since the given timestamp
   */
  async checkForStaleFiles(sinceTimestamp: number): Promise<boolean> {
    const files = await this.findMarkdownFiles(this.config.path);
    
    for (const filePath of files) {
      try {
        const stats = await fs.stat(filePath);
        if (stats.mtime.getTime() > sinceTimestamp) {
          console.error(`Found modified file: ${filePath} (modified: ${stats.mtime.toISOString()})`);
          return true;
        }
      } catch (error) {
        // Skip files we can't stat
        continue;
      }
    }
    
    return false;
  }
}
