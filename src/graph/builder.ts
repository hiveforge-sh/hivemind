import type { VaultNote, KnowledgeGraph, GraphEdge } from '../types/index.js';
import { HivemindDatabase } from './database.js';

export class GraphBuilder {
  private db: HivemindDatabase;

  constructor(db: HivemindDatabase) {
    this.db = db;
  }

  /**
   * Build knowledge graph from vault notes
   */
  buildGraph(notes: VaultNote[]): void {
    console.error(`Building knowledge graph from ${notes.length} notes...`);
    
    const startTime = Date.now();

    // First pass: Insert all nodes
    for (const note of notes) {
      this.db.upsertNode(note);
    }

    // Second pass: Build relationships from wikilinks
    for (const note of notes) {
      this.buildRelationships(note, notes);
    }

    const elapsed = Date.now() - startTime;
    const stats = this.db.getStats();
    
    console.error(`Knowledge graph built in ${elapsed}ms:`);
    console.error(`  Nodes: ${stats.nodes}`);
    console.error(`  Relationships: ${stats.relationships}`);
    console.error(`  By type:`, stats.byType);
  }

  /**
   * Build relationships from wikilinks in a note
   */
  private buildRelationships(note: VaultNote, allNotes: VaultNote[]): void {
    // Extract relationships from wikilinks
    for (const link of note.links) {
      // Find the target note
      const targetNote = this.findNoteByNameOrId(link, allNotes);
      
      if (targetNote) {
        // Infer relationship type based on note types
        const relType = this.inferRelationType(note, targetNote);
        
        // Insert relationship
        this.db.insertRelationship(note.id, targetNote.id, relType);
        
        // For certain relationships, create bidirectional link
        if (this.isBidirectional(relType)) {
          const reverseType = this.getReverseRelationType(relType);
          this.db.insertRelationship(targetNote.id, note.id, reverseType);
        }
      }
    }

    // Extract explicit relationships from frontmatter
    const frontmatter = note.frontmatter as any;
    if (frontmatter.relationships) {
      for (const rel of frontmatter.relationships as any[]) {
        if (rel.target) {
          const targetId = this.extractIdFromWikilink(rel.target);
          this.db.insertRelationship(
            note.id,
            targetId,
            rel.type || 'related',
            { status: rel.status }
          );
        }
      }
    }
  }

  /**
   * Infer relationship type from note types
   */
  private inferRelationType(source: VaultNote, target: VaultNote): string {
    const sourceType = source.frontmatter.type;
    const targetType = target.frontmatter.type;

    // Character → Character
    if (sourceType === 'character' && targetType === 'character') {
      return 'knows';
    }

    // Character → Location
    if (sourceType === 'character' && targetType === 'location') {
      return 'located_in';
    }

    // Location → Character
    if (sourceType === 'location' && targetType === 'character') {
      return 'has_inhabitant';
    }

    // Location → Location
    if (sourceType === 'location' && targetType === 'location') {
      return 'connected_to';
    }

    // Default
    return 'related';
  }

  /**
   * Check if a relationship type should be bidirectional
   */
  private isBidirectional(relType: string): boolean {
    const bidirectionalTypes = ['knows', 'connected_to', 'related'];
    return bidirectionalTypes.includes(relType);
  }

  /**
   * Get reverse relationship type
   */
  private getReverseRelationType(relType: string): string {
    const reverseMap: Record<string, string> = {
      'knows': 'knows',
      'connected_to': 'connected_to',
      'related': 'related',
      'located_in': 'has_inhabitant',
      'has_inhabitant': 'located_in',
    };

    return reverseMap[relType] || 'related';
  }

  /**
   * Find note by name or ID
   */
  private findNoteByNameOrId(nameOrId: string, notes: VaultNote[]): VaultNote | undefined {
    const normalized = nameOrId.toLowerCase().trim();

    // Try exact ID match
    let note = notes.find(n => n.id === normalized);
    if (note) return note;

    // Try by title/name
    note = notes.find(n => {
      const fm = n.frontmatter as any;
      const title = (fm.title || fm.name || '').toLowerCase();
      return title === normalized;
    });
    if (note) return note;

    // Try by filename
    note = notes.find(n => {
      const fileName = n.fileName.replace(/\.md$/, '').toLowerCase();
      return fileName === normalized;
    });

    return note;
  }

  /**
   * Extract ID from wikilink format [[id]] or [[id|alias]]
   */
  private extractIdFromWikilink(link: string): string {
    // Remove [[ and ]]
    const cleaned = link.replace(/^\[\[/, '').replace(/\]\]$/, '');
    
    // Split on | to handle aliases
    const parts = cleaned.split('|');
    
    // Return first part (the actual link target)
    return parts[0].trim().toLowerCase().replace(/\s+/g, '-');
  }

  /**
   * Get in-memory graph representation
   */
  getGraph(): KnowledgeGraph {
    const nodes = this.db.getAllNodes();
    const edges: GraphEdge[] = [];
    const adjacencyList = new Map<string, Set<string>>();

    // Build adjacency list
    for (const node of nodes) {
      const rels = this.db.getRelationships(node.id);
      const neighbors = new Set<string>();

      for (const rel of rels) {
        edges.push(rel);
        
        // Add both directions to adjacency list
        neighbors.add(rel.targetId);
        if (rel.sourceId !== node.id) {
          neighbors.add(rel.sourceId);
        }
      }

      adjacencyList.set(node.id, neighbors);
    }

    return {
      nodes: new Map(nodes.map(n => [n.id, n])),
      edges: new Map(edges.map(e => [e.id, e])),
      adjacencyList,
    };
  }

  /**
   * Incremental update: add or update a single note
   */
  updateNote(note: VaultNote, allNotes: VaultNote[]): void {
    // Update node
    this.db.upsertNode(note);

    // Rebuild relationships for this note
    // TODO: Delete old relationships first (needs relationship cleanup)
    this.buildRelationships(note, allNotes);
  }

  /**
   * Incremental update: remove a note
   */
  removeNote(noteId: string): void {
    this.db.deleteNode(noteId);
  }
}
