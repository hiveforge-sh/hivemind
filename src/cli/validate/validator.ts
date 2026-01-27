/**
 * Frontmatter validator for individual markdown files.
 *
 * Validates files against template schemas using SchemaFactory.
 */

import { promises as fs } from 'fs';
import { relative } from 'path';
import matter from 'gray-matter';
import { templateRegistry } from '../../templates/registry.js';
import { FolderMapper } from '../../templates/folder-mapper.js';
import { schemaFactory } from '../../templates/schema-factory.js';
import type { ValidationResult, ValidationIssue, ValidateOptions } from './types.js';

// Import builtin templates for registration
import { worldbuildingTemplate } from '../../templates/builtin/worldbuilding.js';
import { researchTemplate } from '../../templates/builtin/research.js';
import { peopleManagementTemplate } from '../../templates/builtin/people-management.js';

/**
 * Initialize template registry with builtin templates.
 *
 * Same pattern as CLI fix command - ensures registry is ready for validation.
 *
 * @param activeTemplate - Template ID to activate
 */
export async function initializeTemplateRegistry(activeTemplate: string): Promise<void> {
  // Register builtin templates if not already registered
  if (!templateRegistry.has('worldbuilding')) {
    templateRegistry.register(worldbuildingTemplate, 'builtin');
  }
  if (!templateRegistry.has('research')) {
    templateRegistry.register(researchTemplate, 'builtin');
  }
  if (!templateRegistry.has('people-management')) {
    templateRegistry.register(peopleManagementTemplate, 'builtin');
  }

  // Activate the specified template
  if (!templateRegistry.has(activeTemplate)) {
    throw new Error(
      `Template "${activeTemplate}" not found. Available: ${templateRegistry.listTemplates().join(', ')}`
    );
  }
  templateRegistry.activate(activeTemplate);
}

/**
 * Validate a single markdown file against template schemas.
 *
 * @param filePath - Absolute path to file
 * @param vaultPath - Absolute path to vault root
 * @param options - Validation options
 * @returns Validation result with issues
 */
export async function validateFile(
  filePath: string,
  vaultPath: string,
  options: Pick<ValidateOptions, 'skipMissing'>
): Promise<ValidationResult> {
  const issues: ValidationIssue[] = [];
  const path = relative(vaultPath, filePath);

  // 1. Read file content
  const content = await fs.readFile(filePath, 'utf-8');

  // 2. Parse frontmatter with gray-matter
  const { data: frontmatter } = matter(content);

  // 3. Check for missing frontmatter
  if (!frontmatter || Object.keys(frontmatter).length === 0) {
    if (options.skipMissing) {
      return { path, valid: true, issues: [] }; // Skip this file
    }
    return {
      path,
      valid: false,
      issues: [{ type: 'missing_frontmatter' }],
    };
  }

  // 4. Check for missing required base fields
  const requiredFields = ['id', 'type', 'status'];
  for (const field of requiredFields) {
    if (!(field in frontmatter)) {
      issues.push({ type: 'missing_field', field });
    }
  }

  // 5. Validate type against template entity types
  if (frontmatter.type) {
    const template = templateRegistry.getActive();
    const entityConfig = template?.entityTypes.find((e) => e.name === frontmatter.type);

    if (!entityConfig) {
      const validTypes = template?.entityTypes.map((e) => e.name) || [];
      issues.push({
        type: 'invalid_type',
        actual: String(frontmatter.type),
        validTypes,
      });
    } else {
      // 6. Validate against entity schema (only if type is valid)
      const schema = schemaFactory.getSchema(entityConfig);
      const result = schema.safeParse(frontmatter);

      if (!result.success) {
        for (const zodIssue of result.error.issues) {
          issues.push({
            type: 'schema_error',
            field: zodIssue.path.join('.'),
            message: zodIssue.message,
          });
        }
      }
    }
  }

  // 7. Check folder mismatch (optional warning)
  // Only check if we have folder mappings configured and type is valid
  if (frontmatter.type && issues.length === 0) {
    try {
      const template = templateRegistry.getActive();
      const folderMappings = template?.folderMappings;

      if (folderMappings && folderMappings.length > 0) {
        const folderMapper = await FolderMapper.createFromTemplate(folderMappings);
        const resolved = await folderMapper.resolveType(path);

        // Only warn if folder mapping is exact and differs from declared type
        if (
          resolved.confidence === 'exact' &&
          resolved.types[0] !== frontmatter.type
        ) {
          issues.push({
            type: 'folder_mismatch',
            expected: resolved.types[0],
            actual: String(frontmatter.type),
            matchedPattern: resolved.matchedPattern || '',
          });
        }
      }
    } catch (error) {
      // Folder mapping is optional - don't fail validation if it errors
      console.error('Warning: Folder mapping check failed:', error);
    }
  }

  return {
    path,
    valid: issues.length === 0,
    issues,
    frontmatter,
  };
}
