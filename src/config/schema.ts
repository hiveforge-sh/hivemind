import { z } from 'zod';

/**
 * Configuration validation schemas using Zod
 * Provides clear error messages for invalid configurations
 */

export const VaultConfigSchema = z.object({
  path: z.string().min(1, 'Vault path is required'),
  watchForChanges: z.boolean().default(true),
  debounceMs: z.number().min(0).default(100),
  excludePatterns: z.array(z.string()).optional(),
});

export const ServerConfigSchema = z.object({
  transport: z.enum(['stdio', 'http', 'sse']).default('stdio'),
  port: z.number().optional(),
  host: z.string().optional(),
  apiKey: z.string().optional(),
});

export const TemplateConfigSchema = z.object({
  activeTemplate: z.string().default('worldbuilding'),
  templates: z.array(z.any()).optional(), // Validated separately by template validator
});

export const IndexingConfigSchema = z.object({
  strategy: z.enum(['full', 'incremental']).default('incremental'),
  batchSize: z.number().min(1).default(100),
  enableVectorSearch: z.boolean().default(false),
  enableFullTextSearch: z.boolean().default(true),
});

export const ComfyUIConfigSchema = z.object({
  enabled: z.boolean().default(false),
  endpoint: z.string().optional(),
  timeout: z.number().optional(),
  workflowsPath: z.string().optional(),
  assetsPath: z.string().optional(),
  assetsNotesPath: z.string().optional(),
});

export const EmbeddingConfigSchema = z.object({
  model: z.string(),
  provider: z.enum(['openai', 'local']),
  apiKey: z.string().optional(),
});

export const HivemindConfigSchema = z.object({
  vault: VaultConfigSchema,
  server: ServerConfigSchema.optional(),
  template: TemplateConfigSchema.optional(),
  indexing: IndexingConfigSchema.optional(),
  comfyui: ComfyUIConfigSchema.optional(),
  embedding: EmbeddingConfigSchema.optional(),
});

export type ValidatedConfig = z.infer<typeof HivemindConfigSchema>;

/**
 * Result of config validation
 */
export interface ConfigValidationResult {
  success: boolean;
  config?: ValidatedConfig;
  errors?: Array<{
    path: string;
    message: string;
  }>;
}

/**
 * Validate a config object against the schema
 * @param config - Raw config object to validate
 * @returns Validation result with either validated config or errors
 */
export function validateConfig(config: unknown): ConfigValidationResult {
  const result = HivemindConfigSchema.safeParse(config);

  if (result.success) {
    return {
      success: true,
      config: result.data,
    };
  }

  return {
    success: false,
    errors: result.error.issues.map((issue) => ({
      path: issue.path.join('.') || '(root)',
      message: issue.message,
    })),
  };
}

/**
 * Format validation errors for console output
 * @param errors - Array of validation errors
 * @returns Formatted error string
 */
export function formatValidationErrors(
  errors: Array<{ path: string; message: string }>
): string {
  const lines = errors.map((err) => `   • ${err.path}: ${err.message}`);
  return lines.join('\n');
}
