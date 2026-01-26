/**
 * Built-in research template.
 *
 * Defines entity types for academic research and knowledge management:
 * - paper: Academic papers, articles, and publications
 * - citation: References and citation relationships between papers
 * - concept: Key ideas, theories, and definitions
 * - note: General research notes and observations
 */

import type { TemplateDefinition } from '../types.js';

/**
 * Research template definition.
 *
 * Designed for academic research, literature reviews, and knowledge management.
 * Supports citation tracking, concept mapping, and research notes.
 */
export const researchTemplate: TemplateDefinition = {
  id: 'research',
  name: 'Research',
  version: '1.0.0',
  description: 'Template for academic research with papers, citations, concepts, and notes',

  // Relationship type definitions for the knowledge graph
  relationshipTypes: [
    // Citation relationships
    {
      id: 'cites',
      displayName: 'Cites',
      description: 'Paper cites another paper',
      sourceTypes: ['paper'],
      targetTypes: ['paper'],
      bidirectional: true,
      reverseId: 'cited_by',
    },
    {
      id: 'cited_by',
      displayName: 'Cited By',
      description: 'Paper is cited by another paper',
      sourceTypes: ['paper'],
      targetTypes: ['paper'],
      bidirectional: false,
    },

    // Concept relationships
    {
      id: 'defines',
      displayName: 'Defines',
      description: 'Paper defines or introduces a concept',
      sourceTypes: ['paper'],
      targetTypes: ['concept'],
      bidirectional: true,
      reverseId: 'defined_in',
    },
    {
      id: 'defined_in',
      displayName: 'Defined In',
      description: 'Concept is defined in a paper',
      sourceTypes: ['concept'],
      targetTypes: ['paper'],
      bidirectional: false,
    },
    {
      id: 'related_concept',
      displayName: 'Related Concept',
      description: 'Concepts that are related or connected',
      sourceTypes: ['concept'],
      targetTypes: ['concept'],
      bidirectional: true,
      reverseId: 'related_concept',
    },
    {
      id: 'extends',
      displayName: 'Extends',
      description: 'Concept extends or builds upon another concept',
      sourceTypes: ['concept'],
      targetTypes: ['concept'],
      bidirectional: true,
      reverseId: 'extended_by',
    },
    {
      id: 'extended_by',
      displayName: 'Extended By',
      description: 'Concept is extended by another concept',
      sourceTypes: ['concept'],
      targetTypes: ['concept'],
      bidirectional: false,
    },

    // Note relationships
    {
      id: 'about',
      displayName: 'About',
      description: 'Note is about a paper or concept',
      sourceTypes: ['note'],
      targetTypes: ['paper', 'concept'],
      bidirectional: true,
      reverseId: 'has_note',
    },
    {
      id: 'has_note',
      displayName: 'Has Note',
      description: 'Paper or concept has associated notes',
      sourceTypes: ['paper', 'concept'],
      targetTypes: ['note'],
      bidirectional: false,
    },

    // Generic fallback
    {
      id: 'related',
      displayName: 'Related',
      description: 'Generic relationship between any entities',
      sourceTypes: 'any',
      targetTypes: 'any',
      bidirectional: true,
      reverseId: 'related',
    },
  ],

  entityTypes: [
    // Paper entity type
    {
      name: 'paper',
      displayName: 'Paper',
      pluralName: 'Papers',
      description: 'Academic papers, articles, and publications',
      icon: 'file-text',
      fields: [
        {
          name: 'title',
          type: 'string',
          required: true,
          description: 'Paper title',
        },
        {
          name: 'authors',
          type: 'array',
          arrayItemType: 'string',
          required: true,
          description: 'List of authors',
        },
        {
          name: 'year',
          type: 'number',
          description: 'Publication year',
        },
        {
          name: 'venue',
          type: 'string',
          description: 'Publication venue (journal, conference, etc.)',
        },
        {
          name: 'doi',
          type: 'string',
          description: 'Digital Object Identifier',
        },
        {
          name: 'url',
          type: 'string',
          description: 'URL to paper',
        },
        {
          name: 'abstract',
          type: 'string',
          description: 'Paper abstract',
        },
        {
          name: 'keywords',
          type: 'array',
          arrayItemType: 'string',
          description: 'Keywords or topics',
        },
        {
          name: 'paperType',
          type: 'enum',
          enumValues: ['journal', 'conference', 'preprint', 'thesis', 'book', 'chapter', 'report', 'other'],
          description: 'Type of publication',
        },
        {
          name: 'readStatus',
          type: 'enum',
          enumValues: ['unread', 'skimmed', 'read', 'studied'],
          default: 'unread',
          description: 'Reading status',
        },
        {
          name: 'rating',
          type: 'number',
          description: 'Personal rating (1-5)',
        },
        {
          name: 'citedPapers',
          type: 'array',
          arrayItemType: 'string',
          description: 'IDs of papers this paper cites',
        },
        {
          name: 'concepts',
          type: 'array',
          arrayItemType: 'string',
          description: 'IDs of concepts discussed in this paper',
        },
        {
          name: 'pdfPath',
          type: 'string',
          description: 'Path to PDF file in vault',
        },
      ],
    },

    // Citation entity type (for explicit citation tracking)
    {
      name: 'citation',
      displayName: 'Citation',
      pluralName: 'Citations',
      description: 'Citation relationships between papers with context',
      icon: 'quote',
      fields: [
        {
          name: 'sourcePaper',
          type: 'string',
          required: true,
          description: 'ID of the citing paper',
        },
        {
          name: 'targetPaper',
          type: 'string',
          required: true,
          description: 'ID of the cited paper',
        },
        {
          name: 'context',
          type: 'string',
          description: 'Context or reason for the citation',
        },
        {
          name: 'citationType',
          type: 'enum',
          enumValues: ['background', 'method', 'comparison', 'extension', 'critique', 'support', 'other'],
          description: 'Type of citation relationship',
        },
        {
          name: 'page',
          type: 'string',
          description: 'Page number where citation appears',
        },
        {
          name: 'quote',
          type: 'string',
          description: 'Direct quote from the citation context',
        },
      ],
    },

    // Concept entity type
    {
      name: 'concept',
      displayName: 'Concept',
      pluralName: 'Concepts',
      description: 'Key ideas, theories, and definitions',
      icon: 'lightbulb',
      fields: [
        {
          name: 'name',
          type: 'string',
          required: true,
          description: 'Concept name',
        },
        {
          name: 'definition',
          type: 'string',
          description: 'Brief definition',
        },
        {
          name: 'domain',
          type: 'string',
          description: 'Research domain or field',
        },
        {
          name: 'aliases',
          type: 'array',
          arrayItemType: 'string',
          description: 'Alternative names or synonyms',
        },
        {
          name: 'relatedConcepts',
          type: 'array',
          arrayItemType: 'string',
          description: 'IDs of related concepts',
        },
        {
          name: 'keyPapers',
          type: 'array',
          arrayItemType: 'string',
          description: 'IDs of papers that define or explain this concept',
        },
        {
          name: 'parentConcept',
          type: 'string',
          description: 'ID of parent concept (for hierarchies)',
        },
        {
          name: 'childConcepts',
          type: 'array',
          arrayItemType: 'string',
          description: 'IDs of child concepts',
        },
      ],
    },

    // Note entity type
    {
      name: 'note',
      displayName: 'Note',
      pluralName: 'Notes',
      description: 'General research notes and observations',
      icon: 'sticky-note',
      fields: [
        {
          name: 'title',
          type: 'string',
          required: true,
          description: 'Note title',
        },
        {
          name: 'noteType',
          type: 'enum',
          enumValues: ['literature', 'idea', 'question', 'summary', 'critique', 'method', 'other'],
          default: 'other',
          description: 'Type of note',
        },
        {
          name: 'relatedPapers',
          type: 'array',
          arrayItemType: 'string',
          description: 'IDs of related papers',
        },
        {
          name: 'relatedConcepts',
          type: 'array',
          arrayItemType: 'string',
          description: 'IDs of related concepts',
        },
        {
          name: 'project',
          type: 'string',
          description: 'Research project this note belongs to',
        },
        {
          name: 'dateCreated',
          type: 'date',
          description: 'When the note was created',
        },
      ],
    },
  ],
};
