// Test fixtures and utilities
import { VaultNote } from '../src/types/index.js';

export const mockCharacterNote: VaultNote = {
  id: 'character-alice',
  type: 'character',
  title: 'Alice',
  path: 'Characters/Alice.md',
  content: `# Alice

## Overview
A brave adventurer from the northern lands.

## Appearance
Alice has long blonde hair and piercing blue eyes.

## Personality
She is courageous and quick-witted.`,
  frontmatter: {
    id: 'character-alice',
    type: 'character',
    status: 'canon',
    name: 'Alice',
    age: 25,
    gender: 'female',
    race: 'human',
    appearance: {
      height: '5\'8"',
      build: 'athletic',
      hair: 'blonde',
      eyes: 'blue',
      distinctive_features: 'scar on left cheek'
    },
    personality: {
      traits: ['brave', 'quick-witted', 'stubborn'],
      motivations: ['seek revenge', 'protect innocents'],
      flaws: ['impulsive', 'trust issues']
    },
    background: {
      birthplace: '[[Northern Kingdom]]',
      occupation: 'adventurer',
      affiliations: ['Adventurers Guild']
    }
  },
  links: ['Northern Kingdom', 'Adventurers Guild'],
  tags: ['character', 'protagonist'],
  status: 'canon',
  modifiedTime: Date.now(),
};

export const mockLocationNote: VaultNote = {
  id: 'location-tavern',
  type: 'location',
  title: 'The Rusty Sword Tavern',
  path: 'Locations/Tavern.md',
  content: `# The Rusty Sword Tavern

A popular gathering place in the city center.`,
  frontmatter: {
    id: 'location-tavern',
    type: 'location',
    status: 'canon',
    location_type: 'tavern',
    parent_location: '[[City Center]]'
  },
  links: ['City Center'],
  tags: ['location'],
  status: 'canon',
  modifiedTime: Date.now(),
};

export const mockNoteWithoutFrontmatter: VaultNote = {
  id: 'note-simple',
  type: 'character',
  title: 'Simple Note',
  path: 'Notes/Simple.md',
  content: '# Simple Note\n\nJust some content.',
  frontmatter: {},
  links: [],
  tags: [],
  status: 'draft',
  modifiedTime: Date.now(),
};

export const mockNoteWithWikilinks = `# Character Page

Visit [[Location A]] and meet [[Character B|Bob]].

Also see [[Location C]] for more information.`;

export const mockFrontmatterYAML = `---
id: test-char
type: character
name: Test Character
age: 30
appearance:
  hair: brown
  eyes: green
  build: average
tags:
  - hero
  - mage
---

# Content starts here`;

export const mockInvalidYAML = `---
id: test
type character (missing colon)
age: 30
---

# Content`;
