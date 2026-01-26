/**
 * UX Research Template
 *
 * For synthesizing user research: interviews, insights, hypotheses, and personas.
 * Helps AI understand the evidence behind product decisions and user needs.
 *
 * Entity types:
 * - interview: Individual research sessions with participants
 * - insight: Key learnings derived from research
 * - hypothesis: Testable assumptions about user behavior
 * - persona: Archetypal user representations
 * - experiment: Tests to validate or invalidate hypotheses
 *
 * Key relationships:
 * - supports/contradicts: Evidence relationships
 * - derived_from: Traceability to source research
 * - validates/invalidates: Experiment outcomes
 */

import type { TemplateDefinition } from '../types.js';

export const uxResearchTemplate: TemplateDefinition = {
  id: 'ux-research',
  name: 'UX Research',
  version: '1.0.0',
  description: 'Synthesize user research: interviews, insights, hypotheses, and personas. Gives AI grounded context about user needs and product decisions.',

  // Discovery metadata
  category: 'research',
  tags: ['ux', 'user-research', 'interviews', 'personas', 'insights', 'product-management'],
  author: {
    name: 'HiveForge',
    url: 'https://github.com/hiveforge-sh',
  },
  repository: 'https://github.com/hiveforge-sh/hivemind',
  sampleVault: 'samples/ux-research',
  license: 'MIT',

  entityTypes: [
    {
      name: 'interview',
      displayName: 'Interview',
      pluralName: 'Interviews',
      description: 'A research session with a participant',
      fields: [
        {
          name: 'participant',
          type: 'string',
          required: true,
          description: 'Anonymized participant identifier (e.g., P01, "Enterprise User 3")',
        },
        {
          name: 'date',
          type: 'date',
          required: true,
          description: 'Date the interview was conducted',
        },
        {
          name: 'duration',
          type: 'number',
          description: 'Duration in minutes',
        },
        {
          name: 'method',
          type: 'enum',
          enumValues: ['in-person', 'video', 'phone', 'survey', 'contextual-inquiry', 'usability-test'],
          description: 'Research method used',
        },
        {
          name: 'segment',
          type: 'string',
          description: 'User segment (e.g., "Power Users", "New Customers")',
        },
        {
          name: 'researcher',
          type: 'string',
          description: 'Who conducted the interview',
        },
        {
          name: 'recordingUrl',
          type: 'string',
          description: 'Link to recording (if available)',
        },
        {
          name: 'keyQuotes',
          type: 'array',
          arrayItemType: 'string',
          description: 'Notable verbatim quotes from participant',
        },
      ],
    },
    {
      name: 'insight',
      displayName: 'Insight',
      pluralName: 'Insights',
      description: 'A key learning derived from research',
      fields: [
        {
          name: 'confidence',
          type: 'enum',
          enumValues: ['low', 'medium', 'high'],
          description: 'Confidence level based on evidence strength',
        },
        {
          name: 'theme',
          type: 'string',
          description: 'Research theme or category',
        },
        {
          name: 'impact',
          type: 'enum',
          enumValues: ['low', 'medium', 'high', 'critical'],
          description: 'Potential business/product impact',
        },
        {
          name: 'evidenceCount',
          type: 'number',
          description: 'Number of supporting data points',
        },
        {
          name: 'quotes',
          type: 'array',
          arrayItemType: 'string',
          description: 'Supporting quotes from research',
        },
        {
          name: 'actionable',
          type: 'boolean',
          description: 'Whether this insight has clear next steps',
        },
      ],
    },
    {
      name: 'hypothesis',
      displayName: 'Hypothesis',
      pluralName: 'Hypotheses',
      description: 'A testable assumption about user behavior or needs',
      fields: [
        {
          name: 'hypothesisStatus',
          type: 'enum',
          enumValues: ['untested', 'testing', 'validated', 'invalidated', 'partially-validated'],
          required: true,
          description: 'Current validation status',
        },
        {
          name: 'statement',
          type: 'string',
          description: 'Formal hypothesis statement (We believe that... We will know we are right when...)',
        },
        {
          name: 'metric',
          type: 'string',
          description: 'Key metric to measure',
        },
        {
          name: 'target',
          type: 'string',
          description: 'Success threshold for the metric',
        },
        {
          name: 'priority',
          type: 'enum',
          enumValues: ['low', 'medium', 'high', 'critical'],
          description: 'Priority for testing',
        },
        {
          name: 'riskIfWrong',
          type: 'string',
          description: 'What happens if this hypothesis is wrong',
        },
      ],
    },
    {
      name: 'persona',
      displayName: 'Persona',
      pluralName: 'Personas',
      description: 'An archetypal user representation based on research',
      fields: [
        {
          name: 'segment',
          type: 'string',
          required: true,
          description: 'Market or user segment this persona represents',
        },
        {
          name: 'role',
          type: 'string',
          description: 'Job title or role',
        },
        {
          name: 'goals',
          type: 'array',
          arrayItemType: 'string',
          description: 'Primary goals and motivations',
        },
        {
          name: 'frustrations',
          type: 'array',
          arrayItemType: 'string',
          description: 'Pain points and frustrations',
        },
        {
          name: 'behaviors',
          type: 'array',
          arrayItemType: 'string',
          description: 'Typical behaviors and patterns',
        },
        {
          name: 'tools',
          type: 'array',
          arrayItemType: 'string',
          description: 'Tools and technologies they use',
        },
        {
          name: 'quote',
          type: 'string',
          description: 'Representative quote that captures their mindset',
        },
        {
          name: 'interviewCount',
          type: 'number',
          description: 'Number of interviews this persona is based on',
        },
      ],
    },
    {
      name: 'experiment',
      displayName: 'Experiment',
      pluralName: 'Experiments',
      description: 'A test designed to validate or invalidate a hypothesis',
      fields: [
        {
          name: 'experimentStatus',
          type: 'enum',
          enumValues: ['planned', 'running', 'completed', 'cancelled'],
          required: true,
          description: 'Current status of the experiment',
        },
        {
          name: 'experimentType',
          type: 'enum',
          enumValues: ['a-b-test', 'usability-test', 'prototype-test', 'survey', 'analytics', 'fake-door', 'wizard-of-oz'],
          description: 'Type of experiment',
        },
        {
          name: 'startDate',
          type: 'date',
          description: 'When the experiment started',
        },
        {
          name: 'endDate',
          type: 'date',
          description: 'When the experiment ended',
        },
        {
          name: 'sampleSize',
          type: 'number',
          description: 'Number of participants or data points',
        },
        {
          name: 'result',
          type: 'enum',
          enumValues: ['positive', 'negative', 'inconclusive', 'pending'],
          description: 'Outcome of the experiment',
        },
        {
          name: 'learnings',
          type: 'array',
          arrayItemType: 'string',
          description: 'Key learnings from the experiment',
        },
      ],
    },
  ],

  relationshipTypes: [
    {
      id: 'supports',
      displayName: 'Supports',
      description: 'Evidence that supports a hypothesis or insight',
      sourceTypes: ['interview', 'insight', 'experiment'],
      targetTypes: ['hypothesis', 'insight'],
      bidirectional: false,
    },
    {
      id: 'contradicts',
      displayName: 'Contradicts',
      description: 'Evidence that contradicts a hypothesis or insight',
      sourceTypes: ['interview', 'insight', 'experiment'],
      targetTypes: ['hypothesis', 'insight'],
      bidirectional: false,
    },
    {
      id: 'derived_from',
      displayName: 'Derived From',
      description: 'Insight or persona derived from interviews',
      sourceTypes: ['insight', 'persona'],
      targetTypes: ['interview'],
      bidirectional: false,
    },
    {
      id: 'validates',
      displayName: 'Validates',
      description: 'Experiment validates a hypothesis',
      sourceTypes: ['experiment'],
      targetTypes: ['hypothesis'],
      bidirectional: false,
    },
    {
      id: 'invalidates',
      displayName: 'Invalidates',
      description: 'Experiment invalidates a hypothesis',
      sourceTypes: ['experiment'],
      targetTypes: ['hypothesis'],
      bidirectional: false,
    },
    {
      id: 'represents',
      displayName: 'Represents',
      description: 'Persona represents a user segment from interviews',
      sourceTypes: ['persona'],
      targetTypes: ['interview'],
      bidirectional: false,
    },
    {
      id: 'tests',
      displayName: 'Tests',
      description: 'Experiment tests a hypothesis',
      sourceTypes: ['experiment'],
      targetTypes: ['hypothesis'],
      bidirectional: false,
    },
    {
      id: 'informed_by',
      displayName: 'Informed By',
      description: 'Hypothesis informed by an insight',
      sourceTypes: ['hypothesis'],
      targetTypes: ['insight'],
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
