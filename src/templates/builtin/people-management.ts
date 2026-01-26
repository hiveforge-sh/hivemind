/**
 * Built-in people management template.
 *
 * Defines entity types for team and people management:
 * - person: Team members, contacts, and individuals
 * - goal: Objectives, OKRs, and targets
 * - team: Groups, departments, and organizational units
 * - one_on_one: 1:1 meeting notes and follow-ups
 */

import type { TemplateDefinition } from '../types.js';

/**
 * People management template definition.
 *
 * Designed for managers, team leads, and anyone who needs to track
 * people, goals, teams, and 1:1 conversations.
 */
export const peopleManagementTemplate: TemplateDefinition = {
  id: 'people-management',
  name: 'People Management',
  version: '1.0.0',
  description: 'Template for managing people, goals, teams, and 1:1 meetings',

  // Discovery metadata
  category: 'business',
  tags: ['management', 'team', 'hr', 'one-on-one', 'goals', 'okr'],
  author: {
    name: 'HiveForge',
    url: 'https://github.com/hiveforge-sh',
  },
  repository: 'https://github.com/hiveforge-sh/hivemind',
  sampleVault: 'samples/people-management',
  license: 'MIT',

  folderMappings: [
    // Person mappings
    { folder: '**/People/**', types: ['person'] },
    { folder: '**/Team/**', types: ['person'] },
    { folder: '**/Staff/**', types: ['person'] },
    { folder: '**/Contacts/**', types: ['person'] },
    // Goal mappings
    { folder: '**/Goals/**', types: ['goal'] },
    { folder: '**/OKRs/**', types: ['goal'] },
    { folder: '**/Objectives/**', types: ['goal'] },
    // Team mappings
    { folder: '**/Teams/**', types: ['team'] },
    { folder: '**/Departments/**', types: ['team'] },
    { folder: '**/Groups/**', types: ['team'] },
    // One-on-one mappings
    { folder: '**/1-on-1/**', types: ['one_on_one'] },
    { folder: '**/One-on-Ones/**', types: ['one_on_one'] },
    { folder: '**/Meetings/**', types: ['one_on_one'] },
  ],

  // Relationship type definitions for the knowledge graph
  relationshipTypes: [
    // Team membership
    {
      id: 'member_of',
      displayName: 'Member Of',
      description: 'Person is a member of a team',
      sourceTypes: ['person'],
      targetTypes: ['team'],
      bidirectional: true,
      reverseId: 'has_member',
    },
    {
      id: 'has_member',
      displayName: 'Has Member',
      description: 'Team has a member',
      sourceTypes: ['team'],
      targetTypes: ['person'],
      bidirectional: false,
    },
    {
      id: 'leads',
      displayName: 'Leads',
      description: 'Person leads a team',
      sourceTypes: ['person'],
      targetTypes: ['team'],
      bidirectional: true,
      reverseId: 'led_by',
    },
    {
      id: 'led_by',
      displayName: 'Led By',
      description: 'Team is led by a person',
      sourceTypes: ['team'],
      targetTypes: ['person'],
      bidirectional: false,
    },

    // Reporting relationships
    {
      id: 'reports_to',
      displayName: 'Reports To',
      description: 'Person reports to another person',
      sourceTypes: ['person'],
      targetTypes: ['person'],
      bidirectional: true,
      reverseId: 'manages',
    },
    {
      id: 'manages',
      displayName: 'Manages',
      description: 'Person manages another person',
      sourceTypes: ['person'],
      targetTypes: ['person'],
      bidirectional: false,
    },

    // Goal relationships
    {
      id: 'owns_goal',
      displayName: 'Owns Goal',
      description: 'Person owns or is responsible for a goal',
      sourceTypes: ['person'],
      targetTypes: ['goal'],
      bidirectional: true,
      reverseId: 'owned_by',
    },
    {
      id: 'owned_by',
      displayName: 'Owned By',
      description: 'Goal is owned by a person',
      sourceTypes: ['goal'],
      targetTypes: ['person'],
      bidirectional: false,
    },
    {
      id: 'contributes_to',
      displayName: 'Contributes To',
      description: 'Person or team contributes to a goal',
      sourceTypes: ['person', 'team'],
      targetTypes: ['goal'],
      bidirectional: true,
      reverseId: 'has_contributor',
    },
    {
      id: 'has_contributor',
      displayName: 'Has Contributor',
      description: 'Goal has a contributor',
      sourceTypes: ['goal'],
      targetTypes: ['person', 'team'],
      bidirectional: false,
    },
    {
      id: 'supports',
      displayName: 'Supports',
      description: 'Goal supports another goal (parent-child)',
      sourceTypes: ['goal'],
      targetTypes: ['goal'],
      bidirectional: true,
      reverseId: 'supported_by',
    },
    {
      id: 'supported_by',
      displayName: 'Supported By',
      description: 'Goal is supported by child goals',
      sourceTypes: ['goal'],
      targetTypes: ['goal'],
      bidirectional: false,
    },

    // 1:1 relationships
    {
      id: 'attended',
      displayName: 'Attended',
      description: 'Person attended a 1:1 meeting',
      sourceTypes: ['person'],
      targetTypes: ['one_on_one'],
      bidirectional: true,
      reverseId: 'had_attendee',
    },
    {
      id: 'had_attendee',
      displayName: 'Had Attendee',
      description: '1:1 meeting had an attendee',
      sourceTypes: ['one_on_one'],
      targetTypes: ['person'],
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
    // Person entity type
    {
      name: 'person',
      displayName: 'Person',
      pluralName: 'People',
      description: 'Team members, contacts, and individuals',
      icon: 'user',
      fields: [
        {
          name: 'name',
          type: 'string',
          required: true,
          description: 'Full name',
        },
        {
          name: 'email',
          type: 'string',
          description: 'Email address',
        },
        {
          name: 'role',
          type: 'string',
          description: 'Job title or role',
        },
        {
          name: 'department',
          type: 'string',
          description: 'Department or division',
        },
        {
          name: 'startDate',
          type: 'date',
          description: 'Start date with organization',
        },
        {
          name: 'manager',
          type: 'string',
          description: 'ID of direct manager',
        },
        {
          name: 'directReports',
          type: 'array',
          arrayItemType: 'string',
          description: 'IDs of direct reports',
        },
        {
          name: 'teams',
          type: 'array',
          arrayItemType: 'string',
          description: 'IDs of teams this person belongs to',
        },
        {
          name: 'skills',
          type: 'array',
          arrayItemType: 'string',
          description: 'Skills and competencies',
        },
        {
          name: 'location',
          type: 'string',
          description: 'Office location or timezone',
        },
        {
          name: 'phone',
          type: 'string',
          description: 'Phone number',
        },
        {
          name: 'slack',
          type: 'string',
          description: 'Slack handle',
        },
        {
          name: 'github',
          type: 'string',
          description: 'GitHub username',
        },
        {
          name: 'linkedin',
          type: 'string',
          description: 'LinkedIn profile URL',
        },
        {
          name: 'pronouns',
          type: 'string',
          description: 'Preferred pronouns',
        },
        {
          name: 'birthday',
          type: 'string',
          description: 'Birthday (month/day)',
        },
        {
          name: 'notes',
          type: 'string',
          description: 'General notes about this person',
        },
      ],
    },

    // Goal entity type
    {
      name: 'goal',
      displayName: 'Goal',
      pluralName: 'Goals',
      description: 'Objectives, OKRs, and targets',
      icon: 'target',
      fields: [
        {
          name: 'title',
          type: 'string',
          required: true,
          description: 'Goal title',
        },
        {
          name: 'description',
          type: 'string',
          description: 'Detailed description',
        },
        {
          name: 'goalType',
          type: 'enum',
          enumValues: ['objective', 'key_result', 'initiative', 'task', 'milestone'],
          default: 'objective',
          description: 'Type of goal',
        },
        {
          name: 'goalStatus',
          type: 'enum',
          enumValues: ['not_started', 'in_progress', 'at_risk', 'on_track', 'completed', 'cancelled'],
          default: 'not_started',
          description: 'Current status',
        },
        {
          name: 'owner',
          type: 'string',
          description: 'ID of goal owner',
        },
        {
          name: 'contributors',
          type: 'array',
          arrayItemType: 'string',
          description: 'IDs of contributors',
        },
        {
          name: 'parentGoal',
          type: 'string',
          description: 'ID of parent goal (for OKR hierarchies)',
        },
        {
          name: 'childGoals',
          type: 'array',
          arrayItemType: 'string',
          description: 'IDs of child goals',
        },
        {
          name: 'team',
          type: 'string',
          description: 'ID of owning team',
        },
        {
          name: 'startDate',
          type: 'date',
          description: 'Goal start date',
        },
        {
          name: 'dueDate',
          type: 'date',
          description: 'Goal due date',
        },
        {
          name: 'quarter',
          type: 'string',
          description: 'Quarter (e.g., Q1 2024)',
        },
        {
          name: 'targetValue',
          type: 'number',
          description: 'Target metric value',
        },
        {
          name: 'currentValue',
          type: 'number',
          description: 'Current metric value',
        },
        {
          name: 'unit',
          type: 'string',
          description: 'Unit of measurement',
        },
        {
          name: 'progress',
          type: 'number',
          description: 'Progress percentage (0-100)',
        },
        {
          name: 'priority',
          type: 'enum',
          enumValues: ['p0', 'p1', 'p2', 'p3'],
          description: 'Priority level',
        },
      ],
    },

    // Team entity type
    {
      name: 'team',
      displayName: 'Team',
      pluralName: 'Teams',
      description: 'Groups, departments, and organizational units',
      icon: 'users',
      fields: [
        {
          name: 'name',
          type: 'string',
          required: true,
          description: 'Team name',
        },
        {
          name: 'description',
          type: 'string',
          description: 'Team purpose and responsibilities',
        },
        {
          name: 'teamType',
          type: 'enum',
          enumValues: ['department', 'squad', 'project', 'working_group', 'guild', 'other'],
          default: 'squad',
          description: 'Type of team',
        },
        {
          name: 'lead',
          type: 'string',
          description: 'ID of team lead',
        },
        {
          name: 'members',
          type: 'array',
          arrayItemType: 'string',
          description: 'IDs of team members',
        },
        {
          name: 'parentTeam',
          type: 'string',
          description: 'ID of parent team (for hierarchies)',
        },
        {
          name: 'childTeams',
          type: 'array',
          arrayItemType: 'string',
          description: 'IDs of child teams',
        },
        {
          name: 'goals',
          type: 'array',
          arrayItemType: 'string',
          description: 'IDs of team goals',
        },
        {
          name: 'slackChannel',
          type: 'string',
          description: 'Team Slack channel',
        },
        {
          name: 'meetingCadence',
          type: 'string',
          description: 'Regular meeting schedule',
        },
        {
          name: 'formed',
          type: 'date',
          description: 'When the team was formed',
        },
      ],
    },

    // One-on-one entity type
    {
      name: 'one_on_one',
      displayName: '1:1 Meeting',
      pluralName: '1:1 Meetings',
      description: '1:1 meeting notes and follow-ups',
      icon: 'message-square',
      fields: [
        {
          name: 'title',
          type: 'string',
          required: true,
          description: 'Meeting title (usually date + participants)',
        },
        {
          name: 'date',
          type: 'date',
          required: true,
          description: 'Meeting date',
        },
        {
          name: 'manager',
          type: 'string',
          required: true,
          description: 'ID of manager in the 1:1',
        },
        {
          name: 'directReport',
          type: 'string',
          required: true,
          description: 'ID of direct report in the 1:1',
        },
        {
          name: 'mood',
          type: 'enum',
          enumValues: ['great', 'good', 'okay', 'struggling', 'not_discussed'],
          description: 'How the direct report is feeling',
        },
        {
          name: 'topics',
          type: 'array',
          arrayItemType: 'string',
          description: 'Topics discussed',
        },
        {
          name: 'actionItems',
          type: 'array',
          arrayItemType: 'record',
          description: 'Action items with owner and due date',
        },
        {
          name: 'feedback',
          type: 'string',
          description: 'Feedback shared',
        },
        {
          name: 'wins',
          type: 'array',
          arrayItemType: 'string',
          description: 'Wins and accomplishments discussed',
        },
        {
          name: 'challenges',
          type: 'array',
          arrayItemType: 'string',
          description: 'Challenges and blockers discussed',
        },
        {
          name: 'careerDiscussion',
          type: 'string',
          description: 'Career growth discussion notes',
        },
        {
          name: 'followUpItems',
          type: 'array',
          arrayItemType: 'string',
          description: 'Items to follow up on in next 1:1',
        },
        {
          name: 'nextMeeting',
          type: 'date',
          description: 'Date of next scheduled 1:1',
        },
        {
          name: 'duration',
          type: 'number',
          description: 'Meeting duration in minutes',
        },
      ],
    },
  ],
};
