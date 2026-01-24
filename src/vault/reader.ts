import { promises as fs } from 'fs';
import { join, relative } from 'path';
import type { VaultConfig, VaultNote } from '../types/index.js';
import { MarkdownParser } from '../parser/markdown.js';

export interface VaultIndex {
  notes: Map<string, VaultNote>;
  notesByType: Map<string, Set<string>>;
  notesByStatus: Map<string, Set<string>>;
  totalNotes: number;
  lastUpdated: Date;
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
    };
  }

  /**
   * Scan the vault directory and build an index of all markdown files
   */
  async scanVault(): Promise<VaultIndex> {
    console.error(`Scanning vault at: ${this.config.path}`);
    
    const startTime = Date.now();
    const files = await this.findMarkdownFiles(this.config.path);
    
    console.error(`Found ${files.length} markdown files`);
    
    // Clear existing index
    this.index.notes.clear();
    this.index.notesByType.clear();
    this.index.notesByStatus.clear();
    
    // Process each file
    for (const filePath of files) {
      try {
        await this.indexFile(filePath);
      } catch (error) {
        console.error(`Error indexing ${filePath}:`, error);
      }
    }
    
    this.index.totalNotes = this.index.notes.size;
    this.index.lastUpdated = new Date();
    
    const elapsed = Date.now() - startTime;
    console.error(`Vault scan complete: ${this.index.totalNotes} notes indexed in ${elapsed}ms`);
    
    return this.index;
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
      console.error(`Failed to parse ${filePath}:`, error);
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
    };
  }
}
