import { z } from 'zod';

// ============================================================================
// Vault Note Types
// ============================================================================

export const NoteStatusSchema = z.enum(['draft', 'pending', 'canon', 'non-canon', 'archived']);
export type NoteStatus = z.infer<typeof NoteStatusSchema>;

/** Base entity types that are always supported */
export const BASE_NOTE_TYPES = ['character', 'location', 'event', 'faction', 'system', 'asset', 'lore'] as const;

/**
 * Factory function for dynamic NoteType support.
 * Allows custom types (e.g., 'reference') beyond the hardcoded base types.
 *
 * @param additionalTypes - Custom entity type names to include
 * @returns Zod schema that validates against base + additional types
 */
export function createNoteTypeSchema(additionalTypes: string[] = []): z.ZodType<string> {
  const allTypes = [...BASE_NOTE_TYPES, ...additionalTypes];
  return z.string().refine(
    (val) => allTypes.includes(val),
    { message: `Invalid entity type. Valid types: ${allTypes.join(', ')}` }
  );
}

// Default for backwards compatibility
export const NoteTypeSchema = z.enum(BASE_NOTE_TYPES);
export type NoteType = z.infer<typeof NoteTypeSchema>;

export const ImportanceSchema = z.enum(['major', 'minor', 'background']);
export type Importance = z.infer<typeof ImportanceSchema>;

/**
 * Factory function for dynamic BaseFrontmatter schema.
 * Uses a custom NoteType schema for template-aware validation.
 *
 * @param noteTypeSchema - Custom NoteType schema (from createNoteTypeSchema)
 * @returns Base frontmatter schema with the custom type validation
 */
export function createBaseFrontmatterSchema(noteTypeSchema: z.ZodType<string>) {
  return z.object({
    id: z.string(),
    type: noteTypeSchema,
    status: NoteStatusSchema.default('draft'),
    title: z.string().optional(),
    world: z.string().optional(),
    importance: ImportanceSchema.optional(),
    tags: z.array(z.string()).optional().default([]),
    aliases: z.array(z.string()).optional().default([]),
    created: z.string().optional(),
    updated: z.string().optional(),
    canon_authority: z.enum(['high', 'medium', 'low']).optional(),
  });
}

// Base frontmatter schema (default for backwards compatibility)
export const BaseFrontmatterSchema = createBaseFrontmatterSchema(NoteTypeSchema);

export type BaseFrontmatter = z.infer<typeof BaseFrontmatterSchema>;

// Character-specific frontmatter
export const CharacterFrontmatterSchema = BaseFrontmatterSchema.extend({
  type: z.literal('character'),
  name: z.string(),
  age: z.number().optional(),
  gender: z.string().optional(),
  race: z.string().optional(),
  appearance: z.record(z.string(), z.unknown()).optional(),
  personality: z.record(z.string(), z.unknown()).optional(),
  relationships: z.array(z.record(z.string(), z.unknown())).optional(),
  assets: z.array(z.string()).optional(),
});

export type CharacterFrontmatter = z.infer<typeof CharacterFrontmatterSchema>;

// Location-specific frontmatter
export const LocationFrontmatterSchema = BaseFrontmatterSchema.extend({
  type: z.literal('location'),
  name: z.string(),
  region: z.string().optional(),
  category: z.string().optional(),
  parent: z.string().optional(),
  hierarchy_level: z.enum(['continent', 'region', 'settlement', 'building', 'room']).optional(),
  children: z.array(z.string()).optional(),
  climate: z.string().optional(),
  terrain: z.array(z.string()).optional(),
  inhabitants: z.array(z.string()).optional(),
  connections: z.array(z.record(z.string(), z.unknown())).optional(),
  assets: z.array(z.string()).optional(),
});

export type LocationFrontmatter = z.infer<typeof LocationFrontmatterSchema>;

// Event-specific frontmatter
export const EventFrontmatterSchema = BaseFrontmatterSchema.extend({
  type: z.literal('event'),
  name: z.string(),
  date: z.string().optional(),
  date_start: z.string().optional(),
  date_end: z.string().optional(),
  date_display: z.string().optional(),
  event_type: z.string().optional(),
  participants: z.array(z.string()).optional(),
  locations: z.array(z.string()).optional(),
  factions: z.array(z.string()).optional(),
  outcome: z.string().optional(),
  consequences: z.array(z.string()).optional(),
  timeline: z.string().optional(),
  previous_event: z.string().optional(),
  next_event: z.string().optional(),
});

export type EventFrontmatter = z.infer<typeof EventFrontmatterSchema>;

// Faction-specific frontmatter
export const FactionFrontmatterSchema = BaseFrontmatterSchema.extend({
  type: z.literal('faction'),
  name: z.string(),
  faction_type: z.enum(['house', 'guild', 'organization', 'government', 'military', 'religion', 'other']).optional(),
  leader: z.string().optional(),
  members: z.array(z.string()).optional(),
  headquarters: z.string().optional(),
  founded: z.string().optional(),
  goals: z.array(z.string()).optional(),
  resources: z.array(z.string()).optional(),
  allies: z.array(z.string()).optional(),
  rivals: z.array(z.string()).optional(),
});

export type FactionFrontmatter = z.infer<typeof FactionFrontmatterSchema>;

// Lore-specific frontmatter
export const LoreFrontmatterSchema = BaseFrontmatterSchema.extend({
  type: z.literal('lore'),
  name: z.string(),
  category: z.enum(['mythology', 'history', 'magic', 'technology', 'culture', 'religion', 'other']).optional(),
  related_entities: z.array(z.string()).optional(),
  source: z.enum(['in-world', 'meta', 'player-knowledge']).optional(),
});

export type LoreFrontmatter = z.infer<typeof LoreFrontmatterSchema>;

// Asset-specific frontmatter
export const AssetFrontmatterSchema = BaseFrontmatterSchema.extend({
  type: z.literal('asset'),
  asset_type: z.enum(['image', 'audio', 'video', 'document']).default('image'),
  file_path: z.string(),
  file_format: z.string().optional(),
  depicts: z.array(z.string()).optional(),
  generation_date: z.string().optional(),
  generator: z.string().optional(),
  workflow_id: z.string().optional(),
  prompt: z.string().optional(),
  negative_prompt: z.string().optional(),
  model: z.string().optional(),
  seed: z.number().optional(),
  parameters: z.record(z.string(), z.unknown()).optional(),
  approved_by: z.string().optional(),
  approval_date: z.string().optional(),
});

export type AssetFrontmatter = z.infer<typeof AssetFrontmatterSchema>;

// ============================================================================
// Vault Note Structure
// ============================================================================

export interface VaultNote {
  id: string;
  filePath: string;
  fileName: string;
  frontmatter: BaseFrontmatter;
  content: string;
  links: string[];  // Wikilinks found in content
  headings: Heading[];
  stats: {
    size: number;
    created: Date;
    modified: Date;
  };
}

export interface Heading {
  level: number;
  text: string;
  position: number;
}

// ============================================================================
// Knowledge Graph Types
// ============================================================================

export interface GraphNode {
  id: string;
  type: NoteType;
  status: NoteStatus;
  title: string;
  content: string;
  properties: Record<string, unknown>;
  filePath: string;
  created: Date;
  updated: Date;
}

export interface GraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  relationType?: string;
  properties?: Record<string, unknown>;
  bidirectional: boolean;
}

export interface KnowledgeGraph {
  nodes: Map<string, GraphNode>;
  edges: Map<string, GraphEdge>;
  adjacencyList: Map<string, Set<string>>;
}

// ============================================================================
// Search Types
// ============================================================================

export interface SearchQuery {
  query: string;
  filters?: {
    type?: NoteType[];
    status?: NoteStatus[];
    importance?: Importance[];
    tags?: string[];
    world?: string;
  };
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  id: string;
  type: NoteType;
  title: string;
  snippet: string;
  score: number;
  metadata: {
    filePath: string;
    status: NoteStatus;
    importance?: Importance;
  };
}

export interface HybridSearchResult {
  results: SearchResult[];
  scores: {
    keyword: number;
    semantic: number;
    graph: number;
    combined: number;
  };
  executionTime: number;
}

// ============================================================================
// MCP Tool Types
// ============================================================================

export const QueryCharacterArgsSchema = z.object({
  id: z.string().describe('Character ID or name to query'),
  includeContent: z.boolean().optional().default(true).describe('Include content body in response'),
  contentLimit: z.number().min(100).max(5000).optional().default(500).describe('Maximum characters of content to return'),
});

export type QueryCharacterArgs = z.infer<typeof QueryCharacterArgsSchema>;

export const QueryLocationArgsSchema = z.object({
  id: z.string().describe('Location ID or name to query'),
  includeContent: z.boolean().optional().default(true).describe('Include content body in response'),
  contentLimit: z.number().min(100).max(5000).optional().default(500).describe('Maximum characters of content to return'),
});

export type QueryLocationArgs = z.infer<typeof QueryLocationArgsSchema>;

export const SearchVaultArgsSchema = z.object({
  query: z.string().describe('Search query text'),
  filters: z.object({
    type: z.array(NoteTypeSchema).optional(),
    status: z.array(NoteStatusSchema).optional(),
    importance: z.array(ImportanceSchema).optional(),
    tags: z.array(z.string()).optional(),
    world: z.string().optional(),
  }).optional(),
  limit: z.number().min(1).max(100).default(10),
  includeContent: z.boolean().optional().default(false).describe('Include content snippets in results'),
  contentLimit: z.number().min(100).max(2000).optional().default(300).describe('Maximum characters of content per result'),
});

export type SearchVaultArgs = z.infer<typeof SearchVaultArgsSchema>;

// ============================================================================
// Configuration Types
// ============================================================================

export interface VaultConfig {
  path: string;
  watchForChanges?: boolean;
  debounceMs?: number;
  excludePatterns?: string[];
}

export interface ServerConfig {
  transport: 'stdio' | 'http' | 'sse';
  port?: number;
  host?: string;
  apiKey?: string;
}

export interface IndexConfig {
  strategy: 'full' | 'incremental';
  batchSize?: number;
  enableVectorSearch?: boolean;
  enableFullTextSearch?: boolean;
}

export interface ComfyUIConfig {
  enabled: boolean;
  endpoint?: string;
  timeout?: number;
  workflowsPath?: string;
  assetsPath?: string;
  assetsNotesPath?: string;
}

export interface HivemindConfig {
  vault: VaultConfig;
  server: ServerConfig;
  indexing?: IndexConfig;
  comfyui?: ComfyUIConfig;
  embedding?: {
    model: string;
    provider: 'openai' | 'local';
    apiKey?: string;
  };
}

// ============================================================================
// ComfyUI Types
// ============================================================================

export interface ComfyUIWorkflow {
  id: string;
  name: string;
  description?: string;
  workflow: Record<string, unknown>;  // ComfyUI workflow JSON
  contextFields?: string[];  // Which fields to inject from vault context
  outputPath?: string;
  created: Date;
  updated: Date;
}

export const StoreWorkflowArgsSchema = z.object({
  id: z.string().describe('Unique workflow identifier'),
  name: z.string().describe('Human-readable workflow name'),
  description: z.string().optional().describe('Workflow description'),
  workflow: z.record(z.string(), z.unknown()).describe('ComfyUI workflow JSON'),
  contextFields: z.array(z.string()).optional().describe('Fields to inject from context (e.g., appearance, personality)'),
  outputPath: z.string().optional().describe('Custom output path for generated images'),
});

export type StoreWorkflowArgs = z.infer<typeof StoreWorkflowArgsSchema>;

export const GenerateImageArgsSchema = z.object({
  workflowId: z.string().describe('ID of workflow to execute'),
  contextId: z.string().describe('ID of character/location to use as context'),
  contextType: z.enum(['character', 'location']).describe('Type of context entity'),
  seed: z.number().optional().describe('Random seed for generation (optional)'),
  overrides: z.record(z.string(), z.unknown()).optional().describe('Additional workflow parameter overrides'),
});

export type GenerateImageArgs = z.infer<typeof GenerateImageArgsSchema>;

export const StoreAssetArgsSchema = z.object({
  assetType: z.enum(['image', 'audio', 'video', 'document']).default('image'),
  filePath: z.string().describe('Path to asset file in vault'),
  depicts: z.array(z.string()).optional().describe('Entity IDs depicted in asset'),
  workflowId: z.string().optional().describe('Workflow used to generate asset'),
  prompt: z.string().optional().describe('Generation prompt'),
  parameters: z.record(z.string(), z.unknown()).optional().describe('Generation parameters (seed, steps, cfg, etc.)'),
});

export type StoreAssetArgs = z.infer<typeof StoreAssetArgsSchema>;

export const QueryAssetArgsSchema = z.object({
  id: z.string().describe('Asset ID to query'),
});

export type QueryAssetArgs = z.infer<typeof QueryAssetArgsSchema>;

export const ListAssetsArgsSchema = z.object({
  depicts: z.string().optional().describe('Filter by entity ID depicted in asset'),
  assetType: z.enum(['image', 'audio', 'video', 'document']).optional().describe('Filter by asset type'),
  status: z.enum(['draft', 'pending', 'canon', 'non-canon', 'archived']).optional().describe('Filter by approval status'),
  workflowId: z.string().optional().describe('Filter by workflow used'),
  limit: z.number().min(1).max(100).default(20).describe('Maximum results to return'),
});

export type ListAssetsArgs = z.infer<typeof ListAssetsArgsSchema>;

// Canon Workflow schemas
export const GetCanonStatusArgsSchema = z.object({
  status: z.enum(['draft', 'pending', 'canon', 'non-canon', 'archived']).optional().describe('Filter to specific status'),
  type: z.enum(['character', 'location', 'event', 'faction', 'lore', 'asset']).optional().describe('Filter by entity type'),
});

export type GetCanonStatusArgs = z.infer<typeof GetCanonStatusArgsSchema>;

export const SubmitForReviewArgsSchema = z.object({
  id: z.string().describe('Entity ID to submit for review'),
  notes: z.string().optional().describe('Optional notes for reviewers'),
});

export type SubmitForReviewArgs = z.infer<typeof SubmitForReviewArgsSchema>;

export const ValidateConsistencyArgsSchema = z.object({
  id: z.string().optional().describe('Specific entity ID to validate, or omit for full vault check'),
  type: z.enum(['character', 'location', 'event', 'faction', 'lore', 'asset']).optional().describe('Filter validation to specific type'),
});

export type ValidateConsistencyArgs = z.infer<typeof ValidateConsistencyArgsSchema>;
