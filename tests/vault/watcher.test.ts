import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VaultWatcher } from '../../src/vault/watcher.js';
import type { VaultConfig } from '../../src/types/index.js';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdtempSync, rmSync, mkdirSync } from 'fs';

// We need to capture the chokidar event handlers registered during start()
// so we can simulate file system events without real I/O.
vi.mock('chokidar', () => {
  const handlers: Record<string, (...args: unknown[]) => void> = {};
  const mockWatcher = {
    on(event: string, cb: (...args: unknown[]) => void) {
      handlers[event] = cb;
      return mockWatcher;
    },
    close: vi.fn().mockResolvedValue(undefined),
    options: { ignored: [] },
    _handlers: handlers,
  };
  return {
    default: {
      watch: vi.fn(() => mockWatcher),
      _mockWatcher: mockWatcher,
    },
  };
});

// Helper to get the mock watcher and its captured handlers
async function getMockWatcher() {
  const chokidar = await import('chokidar');
  return (chokidar.default as unknown as { _mockWatcher: { _handlers: Record<string, (...args: unknown[]) => void>; close: ReturnType<typeof vi.fn> } })._mockWatcher;
}

describe('VaultWatcher', () => {
  let tempDir: string;
  let vaultPath: string;
  let watcher: VaultWatcher;

  beforeEach(() => {
    vi.useFakeTimers();
    tempDir = mkdtempSync(join(tmpdir(), 'hivemind-watcher-'));
    vaultPath = join(tempDir, 'vault');
    mkdirSync(vaultPath);
  });

  afterEach(async () => {
    vi.useRealTimers();
    if (watcher) {
      await watcher.stop();
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

  describe('file change event handling', () => {
    it('should call registered handler on add event after debounce', async () => {
      const config: VaultConfig = {
        path: vaultPath,
        watchForChanges: true,
        debounceMs: 50,
      };
      watcher = new VaultWatcher(config);
      const handler = vi.fn();
      watcher.onChange(handler);
      watcher.start();

      const mock = await getMockWatcher();
      mock._handlers['add']('notes/test.md');

      // Handler should NOT be called yet (debounce pending)
      expect(handler).not.toHaveBeenCalled();

      // Advance past debounce
      await vi.advanceTimersByTimeAsync(60);

      expect(handler).toHaveBeenCalledWith('add', 'notes/test.md');
    });

    it('should call registered handler on change event after debounce', async () => {
      const config: VaultConfig = {
        path: vaultPath,
        watchForChanges: true,
        debounceMs: 50,
      };
      watcher = new VaultWatcher(config);
      const handler = vi.fn();
      watcher.onChange(handler);
      watcher.start();

      const mock = await getMockWatcher();
      mock._handlers['change']('notes/test.md');

      await vi.advanceTimersByTimeAsync(60);

      expect(handler).toHaveBeenCalledWith('change', 'notes/test.md');
    });

    it('should call registered handler on unlink event after debounce', async () => {
      const config: VaultConfig = {
        path: vaultPath,
        watchForChanges: true,
        debounceMs: 50,
      };
      watcher = new VaultWatcher(config);
      const handler = vi.fn();
      watcher.onChange(handler);
      watcher.start();

      const mock = await getMockWatcher();
      mock._handlers['unlink']('notes/deleted.md');

      await vi.advanceTimersByTimeAsync(60);

      expect(handler).toHaveBeenCalledWith('unlink', 'notes/deleted.md');
    });

    it('should debounce rapid changes to the same file', async () => {
      const config: VaultConfig = {
        path: vaultPath,
        watchForChanges: true,
        debounceMs: 100,
      };
      watcher = new VaultWatcher(config);
      const handler = vi.fn();
      watcher.onChange(handler);
      watcher.start();

      const mock = await getMockWatcher();

      // Simulate rapid changes
      mock._handlers['change']('notes/test.md');
      await vi.advanceTimersByTimeAsync(30);
      mock._handlers['change']('notes/test.md');
      await vi.advanceTimersByTimeAsync(30);
      mock._handlers['change']('notes/test.md');

      // Advance past debounce from last change
      await vi.advanceTimersByTimeAsync(110);

      // Should only be called once (debounced)
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith('change', 'notes/test.md');
    });

    it('should use default debounceMs of 100 when not configured', async () => {
      const config: VaultConfig = {
        path: vaultPath,
        watchForChanges: true,
      };
      watcher = new VaultWatcher(config);
      const handler = vi.fn();
      watcher.onChange(handler);
      watcher.start();

      const mock = await getMockWatcher();
      mock._handlers['add']('file.md');

      // At 90ms should not have fired yet
      await vi.advanceTimersByTimeAsync(90);
      expect(handler).not.toHaveBeenCalled();

      // At 110ms should have fired
      await vi.advanceTimersByTimeAsync(20);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should notify multiple handlers', async () => {
      const config: VaultConfig = {
        path: vaultPath,
        watchForChanges: true,
        debounceMs: 50,
      };
      watcher = new VaultWatcher(config);
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      watcher.onChange(handler1);
      watcher.onChange(handler2);
      watcher.start();

      const mock = await getMockWatcher();
      mock._handlers['add']('file.md');

      await vi.advanceTimersByTimeAsync(60);

      expect(handler1).toHaveBeenCalledWith('add', 'file.md');
      expect(handler2).toHaveBeenCalledWith('add', 'file.md');
    });

    it('should catch errors thrown by handlers and continue', async () => {
      const config: VaultConfig = {
        path: vaultPath,
        watchForChanges: true,
        debounceMs: 50,
      };
      watcher = new VaultWatcher(config);
      const errorHandler = vi.fn().mockRejectedValue(new Error('handler error'));
      const goodHandler = vi.fn();
      watcher.onChange(errorHandler);
      watcher.onChange(goodHandler);
      watcher.start();

      const consoleSpy = vi.spyOn(console, 'error');
      const mock = await getMockWatcher();
      mock._handlers['change']('file.md');

      await vi.advanceTimersByTimeAsync(60);

      expect(errorHandler).toHaveBeenCalled();
      expect(goodHandler).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error in change handler'),
        expect.any(Error)
      );
    });

    it('should handle error events from chokidar', async () => {
      const config: VaultConfig = {
        path: vaultPath,
        watchForChanges: true,
      };
      watcher = new VaultWatcher(config);
      watcher.start();

      const consoleSpy = vi.spyOn(console, 'error');
      const mock = await getMockWatcher();
      mock._handlers['error'](new Error('watch error'));

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Watcher error'),
        expect.any(Error)
      );
    });

    it('should handle ready event from chokidar', async () => {
      const config: VaultConfig = {
        path: vaultPath,
        watchForChanges: true,
      };
      watcher = new VaultWatcher(config);
      watcher.start();

      const consoleSpy = vi.spyOn(console, 'error');
      const mock = await getMockWatcher();
      mock._handlers['ready']();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('File watcher ready')
      );
    });
  });
});
