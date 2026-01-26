import { describe, it, expect } from 'vitest';
import {
  VaultConfigSchema,
  ServerConfigSchema,
  HivemindConfigSchema,
  validateConfig,
  formatValidationErrors,
} from '../../src/config/schema.js';

describe('VaultConfigSchema', () => {
  it('should require path', () => {
    const result = VaultConfigSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should reject empty path', () => {
    const result = VaultConfigSchema.safeParse({ path: '' });
    expect(result.success).toBe(false);
  });

  it('should accept valid config', () => {
    const result = VaultConfigSchema.safeParse({ path: '/my/vault' });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      path: '/my/vault',
      watchForChanges: true,
      debounceMs: 100,
    });
  });

  it('should use custom values when provided', () => {
    const result = VaultConfigSchema.safeParse({
      path: '/my/vault',
      watchForChanges: false,
      debounceMs: 500,
    });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      path: '/my/vault',
      watchForChanges: false,
      debounceMs: 500,
    });
  });
});

describe('ServerConfigSchema', () => {
  it('should default transport to stdio', () => {
    const result = ServerConfigSchema.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data?.transport).toBe('stdio');
  });

  it('should accept valid transports', () => {
    expect(ServerConfigSchema.safeParse({ transport: 'stdio' }).success).toBe(true);
    expect(ServerConfigSchema.safeParse({ transport: 'http' }).success).toBe(true);
    expect(ServerConfigSchema.safeParse({ transport: 'sse' }).success).toBe(true);
  });

  it('should reject invalid transports', () => {
    const result = ServerConfigSchema.safeParse({ transport: 'websocket' });
    expect(result.success).toBe(false);
  });
});

describe('HivemindConfigSchema', () => {
  it('should validate minimal config', () => {
    const result = HivemindConfigSchema.safeParse({
      vault: { path: '/my/vault' },
    });
    expect(result.success).toBe(true);
  });

  it('should validate full config', () => {
    const config = {
      vault: {
        path: '/my/vault',
        watchForChanges: true,
        debounceMs: 100,
      },
      server: {
        transport: 'stdio',
        port: 3000,
      },
      template: {
        activeTemplate: 'worldbuilding',
      },
      indexing: {
        strategy: 'incremental',
        batchSize: 100,
        enableVectorSearch: false,
        enableFullTextSearch: true,
      },
    };

    const result = HivemindConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('should reject config without vault', () => {
    const result = HivemindConfigSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('should reject config with empty vault path', () => {
    const result = HivemindConfigSchema.safeParse({
      vault: { path: '' },
    });
    expect(result.success).toBe(false);
  });
});

describe('validateConfig', () => {
  it('should return success for valid config', () => {
    const result = validateConfig({
      vault: { path: '/my/vault' },
    });
    expect(result.success).toBe(true);
    expect(result.config).toBeDefined();
    expect(result.errors).toBeUndefined();
  });

  it('should return errors for invalid config', () => {
    const result = validateConfig({
      vault: {},
    });
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.length).toBeGreaterThan(0);
  });

  it('should return meaningful error paths', () => {
    const result = validateConfig({
      vault: { path: '' },
    });
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.some(e => e.path === 'vault.path')).toBe(true);
  });
});

describe('formatValidationErrors', () => {
  it('should format errors with bullet points', () => {
    const errors = [
      { path: 'vault.path', message: 'Vault path is required' },
      { path: 'server.transport', message: 'Invalid transport' },
    ];
    const formatted = formatValidationErrors(errors);
    expect(formatted).toContain('•');
    expect(formatted).toContain('vault.path');
    expect(formatted).toContain('Vault path is required');
  });

  it('should handle empty error array', () => {
    const formatted = formatValidationErrors([]);
    expect(formatted).toBe('');
  });
});
