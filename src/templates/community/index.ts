/**
 * Community-contributed templates.
 *
 * This file exports all community templates that have been accepted
 * into the Hivemind project. To add a new community template:
 *
 * 1. Create your template file (e.g., recipe-book.ts)
 * 2. Import it here
 * 3. Add it to the communityTemplates array
 *
 * See README.md in this directory for contribution guidelines.
 */

import type { TemplateDefinition } from '../types.js';

// Import community templates
import { architectureTemplate } from './architecture.js';
import { uxResearchTemplate } from './ux-research.js';

// TTRPG system templates (inheritance chain: worldbuilding -> ttrpg-base -> specific system)
import { ttrpgBaseTemplate } from './ttrpg-base.js';
import { dnd5eTemplate } from './dnd-5e.js';
import { pathfinder2eTemplate } from './pathfinder-2e.js';
import { dnd35eTemplate } from './dnd-35e.js';

/**
 * All community-contributed templates.
 *
 * These templates are available for users to activate via config.json
 * by setting `activeTemplate` to the template's ID.
 *
 * IMPORTANT: Templates that use inheritance (extendsTemplate) must be
 * listed AFTER their parent templates in this array. The loader will
 * sort them topologically, but having parents first is clearer.
 */
export const communityTemplates: TemplateDefinition[] = [
  // Standalone templates
  architectureTemplate,
  uxResearchTemplate,

  // TTRPG templates (ordered by inheritance hierarchy)
  ttrpgBaseTemplate,    // Extends worldbuilding (builtin)
  dnd5eTemplate,        // Extends ttrpg-base
  pathfinder2eTemplate, // Extends ttrpg-base
  dnd35eTemplate,       // Extends ttrpg-base
];

// Re-export individual templates for direct import
export { architectureTemplate, uxResearchTemplate };
export { ttrpgBaseTemplate, dnd5eTemplate, pathfinder2eTemplate, dnd35eTemplate };

/**
 * Get a community template by ID.
 *
 * @param id - Template ID to look up
 * @returns Template definition if found, undefined otherwise
 */
export function getCommunityTemplate(id: string): TemplateDefinition | undefined {
  return communityTemplates.find((t) => t.id === id);
}

/**
 * List all available community template IDs.
 *
 * @returns Array of template IDs
 */
export function listCommunityTemplateIds(): string[] {
  return communityTemplates.map((t) => t.id);
}
