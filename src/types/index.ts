import { z } from 'zod';

// ============================================================================
// Vault Note Types
// ============================================================================

export const NoteStatusSchema = z.enum(['draft', 'pending', 'canon', 'non-canon', 'archived']);
export type NoteStatus = z.infer<typeof NoteStatusSchema>;

export const NoteTypeSchema = z.enum(['character', 'location', 'event', 'faction', 'system', 'asset', 'lore']);
export type NoteType = z.infer<typeof NoteTypeSchema>;

export const ImportanceSchema = z.enum(['major', 'minor', 'background']);
export type Importance = z.infer<typeof ImportanceSchema>;

// Base frontmatter schema
export const BaseFrontmatterSchema = z.object({
  id: z.string(),
  type: NoteTypeSchema,
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

export type BaseFrontmatter = z.infer<typeof BaseFrontmatterSchema>;

// Character-specific frontmatter
export const CharacterFrontmatterSchema = BaseFrontmatterSchema.extend({
  type: z.literal('character'),
  name: z.string(),
  age: z.number().optional(),
  gender: z.string().optional(),
  race: z.string().optional(),
  appearance: z.record(z.any()).optional(),
  personality: z.record(z.any()).optional(),
  relationships: z.array(z.record(z.any())).optional(),
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
  connections: z.array(z.record(z.any())).optional(),
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
  parameters: z.record(z.any()).optional(),
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
  properties: Record<string, any>;
  filePath: string;
  created: Date;
  updated: Date;
}

export interface GraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  relationType?: string;
  properties?: Record<string, any>;
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

export interface HivemindConfig {
  vault: VaultConfig;
  server: ServerConfig;
  indexing?: IndexConfig;
  embedding?: {
    model: string;
    provider: 'openai' | 'local';
    apiKey?: string;
  };
}
