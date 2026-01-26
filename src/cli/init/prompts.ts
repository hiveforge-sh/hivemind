import { input, select, confirm, Separator } from '@inquirer/prompts';
import { resolve } from 'path';
import { validateVaultPath } from './validators.js';
import { dim } from '../shared/colors.js';

/**
 * Template choices grouped by category with descriptions.
 * Descriptions appear below the list as user navigates.
 */
export const TEMPLATE_CHOICES = [
  new Separator(dim('--- Creative ---')),
  {
    name: 'Worldbuilding',
    value: 'worldbuilding',
    description: 'Fiction, games, RPGs - characters, locations, events, factions, lore, assets',
  },
  new Separator(dim('--- Professional ---')),
  {
    name: 'People Management',
    value: 'people-management',
    description: 'Teams, HR - people, goals, teams, 1:1 meetings',
  },
  new Separator(dim('--- Technical ---')),
  {
    name: 'Software Architecture',
    value: 'software-architecture',
    description: 'Engineers - systems, ADRs, components, integrations',
  },
  {
    name: 'UX Research',
    value: 'ux-research',
    description: 'UX, product - interviews, insights, personas, journeys',
  },
  new Separator(dim('--- Research ---')),
  {
    name: 'Research',
    value: 'research',
    description: 'Academic, knowledge - papers, citations, concepts, notes',
  },
  new Separator(dim('--- Custom ---')),
  {
    name: 'Create custom template...',
    value: 'custom',
    description: 'Define your own entity types and relationships',
  },
];

/**
 * Prompt for vault path with validation.
 * Validates on Enter, re-prompts if invalid.
 */
export async function promptVaultPath(defaultPath?: string): Promise<string> {
  const vaultPath = await input({
    message: 'Enter your Obsidian vault path:',
    default: defaultPath || process.cwd(),
    validate: validateVaultPath,
  });

  return resolve(vaultPath.trim());
}

/**
 * Prompt for template selection with grouped categories.
 */
export async function promptTemplateSelection(): Promise<string> {
  return await select({
    message: 'Select a template for your vault:',
    choices: TEMPLATE_CHOICES,
  });
}

/**
 * Prompt for yes/no confirmation.
 */
export async function promptConfirm(message: string, defaultValue = true): Promise<boolean> {
  return await confirm({
    message,
    default: defaultValue,
  });
}

/**
 * Prompt for overwriting existing config.
 */
export async function promptOverwriteConfig(): Promise<boolean> {
  return await confirm({
    message: 'config.json already exists. Overwrite?',
    default: false,
  });
}
