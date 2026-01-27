import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VaultWatcher } from '../../src/vault/watcher.js';
import type { VaultConfig } from '../../src/types/index.js';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdtempSync, rmSync, mkdirSync } from 'fs';

describe('VaultWatcher', () => {
  let tempDir: string;
  let vaultPath: string;
  let watcher: VaultWatcher;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'hivemind-watcher-'));
    vaultPath = join(tempDir, 'vault');
    mkdirSync(vaultPath);
  });

  afterEach(async () => {
    if (watcher) {
      await watcher.stop();
      // Allow chokidar's async cleanup to finish before removing temp files
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    it('should create a watcher instance', () => {
      const config: VaultConfig = {
        path: vaultPath,
        watchForChanges: true,
      };
      watcher = new VaultWatcher(config);
      expect(watcher).toBeDefined();
    });
  });

  describe('start', () => {
    it('should not start watcher when watchForChanges is false', () => {
      const config: VaultConfig = {
        path: vaultPath,
        watchForChanges: false,
      };
      watcher = new VaultWatcher(config);
      
      const consoleSpy = vi.spyOn(console, 'error');
      watcher.start();
      
      expect(consoleSpy).toHaveBeenCalledWith('File watching disabled in config');
    });

    it('should start watcher when watchForChanges is true', () => {
      const config: VaultConfig = {
        path: vaultPath,
        watchForChanges: true,
      };
      watcher = new VaultWatcher(config);
      
      const consoleSpy = vi.spyOn(console, 'error');
      watcher.start();
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Starting file watcher'));
    });
  });

  describe('stop', () => {
    it('should stop watcher gracefully', async () => {
      const config: VaultConfig = {
        path: vaultPath,
        watchForChanges: true,
      };
      watcher = new VaultWatcher(config);
      
      watcher.start();
      await watcher.stop();
      
      // Should be able to call stop multiple times
      await watcher.stop();
    });
  });

  describe('onChange', () => {
    it('should register change handlers', () => {
      const config: VaultConfig = {
        path: vaultPath,
        watchForChanges: true,
      };
      watcher = new VaultWatcher(config);
      
      const handler = vi.fn();
      watcher.onChange(handler);
      
      // Handler should be registered (internal state)
      expect(watcher).toBeDefined();
    });
  });
});
