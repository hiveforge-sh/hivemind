/**
 * Software Architecture Template
 *
 * For tracking systems, components, and Architectural Decision Records (ADRs).
 * Helps AI understand why a system looks the way it does and prevents
 * hallucinated intent when discussing design decisions.
 *
 * Entity types:
 * - system: High-level systems or services
 * - component: Individual components within systems
 * - decision: Architectural Decision Records (ADRs)
 * - constraint: Technical, business, or regulatory constraints
 * - interface: APIs, contracts, and integration points
 *
 * Based on ADR practices: https://adr.github.io/
 */

import type { TemplateDefinition } from '../types.js';

export const architectureTemplate: TemplateDefinition = {
  id: 'software-architecture',
  name: 'Software Architecture',
  version: '1.0.0',
  description: 'Track systems, components, and architectural decisions (ADRs). Gives AI grounded context about why your system looks the way it does.',

  // Discovery metadata
  category: 'engineering',
  tags: ['adr', 'architecture', 'systems', 'components', 'decisions', 'technical-documentation'],
  author: {
    name: 'HiveForge',
    url: 'https://github.com/hiveforge-sh',
  },
  repository: 'https://github.com/hiveforge-sh/hivemind',
  sampleVault: 'samples/architecture',
  license: 'MIT',

  entityTypes: [
    {
      name: 'system',
      displayName: 'System',
      pluralName: 'Systems',
      description: 'A high-level system, service, or application boundary',
      fields: [
        {
          name: 'status',
          type: 'enum',
          enumValues: ['active', 'deprecated', 'planned', 'decommissioned'],
          description: 'Current lifecycle status of the system',
        },
        {
          name: 'owner',
          type: 'string',
          description: 'Team or individual responsible for this system',
        },
        {
          name: 'repository',
          type: 'string',
          description: 'Primary code repository URL',
        },
        {
          name: 'documentation',
          type: 'string',
          description: 'Link to external documentation',
        },
        {
          name: 'tier',
          type: 'enum',
          enumValues: ['critical', 'standard', 'experimental'],
          description: 'Criticality tier for incident response',
        },
      ],
    },
    {
      name: 'component',
      displayName: 'Component',
      pluralName: 'Components',
      description: 'A distinct component, module, or service within a system',
      fields: [
        {
          name: 'componentType',
          type: 'enum',
          enumValues: ['service', 'library', 'database', 'queue', 'cache', 'gateway', 'worker', 'frontend', 'cli'],
          description: 'The type of component',
        },
        {
          name: 'language',
          type: 'string',
          description: 'Primary programming language',
        },
        {
          name: 'framework',
          type: 'string',
          description: 'Primary framework (e.g., Express, React, Django)',
        },
        {
          name: 'criticalPath',
          type: 'boolean',
          description: 'Whether this component is on the critical path',
        },
        {
          name: 'port',
          type: 'number',
          description: 'Default port number if applicable',
        },
        {
          name: 'healthCheck',
          type: 'string',
          description: 'Health check endpoint or command',
        },
      ],
    },
    {
      name: 'decision',
      displayName: 'Decision',
      pluralName: 'Decisions',
      description: 'An Architectural Decision Record (ADR) documenting a significant choice',
      fields: [
        {
          name: 'decisionStatus',
          type: 'enum',
          enumValues: ['proposed', 'accepted', 'deprecated', 'superseded'],
          required: true,
          description: 'Current status of the decision',
        },
        {
          name: 'date',
          type: 'date',
          required: true,
          description: 'Date the decision was made or proposed',
        },
        {
          name: 'deciders',
          type: 'array',
          arrayItemType: 'string',
          description: 'People involved in making this decision',
        },
        {
          name: 'context',
          type: 'string',
          description: 'Brief summary of the context and problem',
        },
        {
          name: 'alternatives',
          type: 'array',
          arrayItemType: 'string',
          description: 'Alternatives that were considered',
        },
        {
          name: 'consequences',
          type: 'array',
          arrayItemType: 'string',
          description: 'Known consequences of this decision',
        },
      ],
    },
    {
      name: 'constraint',
      displayName: 'Constraint',
      pluralName: 'Constraints',
      description: 'A constraint that limits design choices',
      fields: [
        {
          name: 'constraintType',
          type: 'enum',
          enumValues: ['technical', 'business', 'regulatory', 'resource', 'security', 'organizational'],
          required: true,
          description: 'Category of constraint',
        },
        {
          name: 'severity',
          type: 'enum',
          enumValues: ['hard', 'soft'],
          description: 'Hard constraints cannot be violated; soft constraints are preferences',
        },
        {
          name: 'source',
          type: 'string',
          description: 'Where this constraint comes from (e.g., legal, CTO, SLA)',
        },
        {
          name: 'expiresAt',
          type: 'date',
          description: 'When this constraint expires, if temporary',
        },
      ],
    },
    {
      name: 'interface',
      displayName: 'Interface',
      pluralName: 'Interfaces',
      description: 'An API, contract, or integration point between components',
      fields: [
        {
          name: 'interfaceType',
          type: 'enum',
          enumValues: ['rest', 'graphql', 'grpc', 'event', 'file', 'database', 'sdk'],
          description: 'Type of interface',
        },
        {
          name: 'version',
          type: 'string',
          description: 'API version (e.g., v1, v2)',
        },
        {
          name: 'stability',
          type: 'enum',
          enumValues: ['stable', 'beta', 'alpha', 'deprecated'],
          description: 'Stability level of this interface',
        },
        {
          name: 'documentation',
          type: 'string',
          description: 'Link to API documentation (OpenAPI, etc.)',
        },
        {
          name: 'authentication',
          type: 'enum',
          enumValues: ['none', 'api_key', 'oauth2', 'jwt', 'mtls', 'basic'],
          description: 'Authentication method required',
        },
      ],
    },
  ],

  relationshipTypes: [
    {
      id: 'depends_on',
      displayName: 'Depends On',
      description: 'Component A depends on Component B at runtime',
      sourceTypes: ['component'],
      targetTypes: ['component'],
      bidirectional: false,
    },
    {
      id: 'part_of',
      displayName: 'Part Of',
      description: 'Component belongs to a System',
      sourceTypes: ['component'],
      targetTypes: ['system'],
      bidirectional: true,
      reverseId: 'contains',
    },
    {
      id: 'exposes',
      displayName: 'Exposes',
      description: 'Component exposes an Interface',
      sourceTypes: ['component'],
      targetTypes: ['interface'],
      bidirectional: false,
    },
    {
      id: 'consumes',
      displayName: 'Consumes',
      description: 'Component consumes an Interface',
      sourceTypes: ['component'],
      targetTypes: ['interface'],
      bidirectional: false,
    },
    {
      id: 'supersedes',
      displayName: 'Supersedes',
      description: 'This decision replaces an earlier decision',
      sourceTypes: ['decision'],
      targetTypes: ['decision'],
      bidirectional: false,
    },
    {
      id: 'motivated_by',
      displayName: 'Motivated By',
      description: 'Decision was motivated by a Constraint',
      sourceTypes: ['decision'],
      targetTypes: ['constraint'],
      bidirectional: false,
    },
    {
      id: 'affects',
      displayName: 'Affects',
      description: 'Decision affects a Component or System',
      sourceTypes: ['decision'],
      targetTypes: ['component', 'system'],
      bidirectional: false,
    },
    {
      id: 'violates',
      displayName: 'Violates',
      description: 'Entity violates a Constraint (technical debt marker)',
      sourceTypes: ['component', 'decision'],
      targetTypes: ['constraint'],
      bidirectional: false,
    },
    {
      id: 'related',
      displayName: 'Related To',
      description: 'General relationship between any entities',
      sourceTypes: 'any',
      targetTypes: 'any',
      bidirectional: true,
      reverseId: 'related',
    },
  ],
};
