/**
 * Template configuration loader.
 *
 * Provides functions to:
 * 1. Load template configuration from config.json
 * 2. Register built-in templates
 * 3. Validate and register user-defined templates
 * 4. Activate the selected template
 * 5. Pre-generate schemas for performance
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { TemplateConfig, TemplateDefinition } from './types.js';
import { validateTemplateConfig, TemplateDefinitionSchema, TemplateValidationError } from './validator.js';
import { templateRegistry } from './registry.js';
import { schemaFactory } from './schema-factory.js';
import { worldbuildingTemplate } from './builtin/worldbuilding.js';
import { researchTemplate } from './builtin/research.js';
import { peopleManagementTemplate } from './builtin/people-management.js';
import { communityTemplates } from './community/index.js';

/**
 * Find the config.json file.
 *
 * Searches in:
 * 1. Provided path (if given)
 * 2. Current working directory
 * 3. Module directory (for development)
 *
 * @param configPath - Optional explicit path to config file
 * @returns Path to config.json if found, null otherwise
 */
export function findConfigFile(configPath?: string): string | null {
  // If explicit path provided, use it
  if (configPath) {
    return existsSync(configPath) ? resolve(configPath) : null;
  }

  // Try current working directory
  const cwdConfig = resolve(process.cwd(), 'config.json');
  if (existsSync(cwdConfig)) {
    return cwdConfig;
  }

  // Try module directory (for development/testing)
  const moduleDir = dirname(fileURLToPath(import.meta.url));
  const moduleConfig = resolve(moduleDir, '../../config.json');
  if (existsSync(moduleConfig)) {
    return moduleConfig;
  }

  return null;
}

/**
 * Load template configuration from config.json and/or standalone template.json.
 *
 * Searches for config.json in multiple locations and extracts the template
 * section. Also checks for standalone template.json in the same directory,
 * which takes precedence over inline template definitions.
 *
 * @param configPath - Optional explicit path to config file
 * @returns Template configuration object
 * @throws {Error} If config file is found but contains invalid template config
 */
export function loadTemplateConfig(configPath?: string): TemplateConfig {
  const configFilePath = findConfigFile(configPath);

  // If no config file found, return defaults
  if (!configFilePath) {
    return {
      activeTemplate: 'worldbuilding',
      templates: [],
    };
  }

  // Read and parse config file
  let configContent: unknown;
  try {
    const fileContent = readFileSync(configFilePath, 'utf-8');
    configContent = JSON.parse(fileContent);
  } catch (err) {
    throw new Error(
      `Failed to read or parse config file at ${configFilePath}: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  // Validate that config is an object
  if (typeof configContent !== 'object' || configContent === null) {
    throw new Error(`Config file at ${configFilePath} must contain a JSON object`);
  }

  // Extract template section (use defaults if missing)
  const configObj = configContent as Record<string, unknown>;
  // Template config will be validated by validateTemplateConfig before being returned
  const templateConfig = (configObj.template || {
    activeTemplate: 'worldbuilding',
    templates: [],
  }) as { activeTemplate?: string; templates?: TemplateDefinition[] };

  // Check for standalone template.json alongside config.json
  const configDir = dirname(configFilePath);
  const standaloneTemplatePath = resolve(configDir, 'template.json');

  if (existsSync(standaloneTemplatePath)) {
    try {
      const standaloneTemplate = loadTemplateFile(standaloneTemplatePath);

      // Ensure templates array exists
      if (!templateConfig.templates) {
        templateConfig.templates = [];
      }

      // Check if template with same ID already exists in config
      const existingIndex = templateConfig.templates.findIndex(
        (t: TemplateDefinition) => t.id === standaloneTemplate.id
      );

      if (existingIndex >= 0) {
        // Standalone template takes precedence - replace existing
        templateConfig.templates[existingIndex] = standaloneTemplate;
      } else {
        // Add standalone template to the list
        templateConfig.templates.push(standaloneTemplate);
      }

      // If no activeTemplate specified, use the standalone template
      if (!templateConfig.activeTemplate || templateConfig.activeTemplate === 'worldbuilding') {
        templateConfig.activeTemplate = standaloneTemplate.id;
      }
    } catch (err) {
      // If it's a validation error, rethrow with context
      if (err instanceof TemplateValidationError) {
        throw err;
      }
      throw new Error(
        `Failed to load standalone template.json: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  // Validate the template config
  return validateTemplateConfig(templateConfig);
}

/**
 * Register all built-in templates.
 *
 * Includes:
 * - worldbuilding: Characters, locations, events, factions, lore, assets
 * - research: Papers, citations, concepts, notes
 * - people-management: People, goals, teams, 1:1 meetings
 *
 * This function should be called before loading user templates to ensure
 * built-in templates can be referenced by ID.
 */
export function registerBuiltinTemplates(): void {
  templateRegistry.register(worldbuildingTemplate, 'builtin');
  templateRegistry.register(researchTemplate, 'builtin');
  templateRegistry.register(peopleManagementTemplate, 'builtin');
}

/**
 * Register all community-contributed templates.
 *
 * Community templates are registered as 'config' source (not 'builtin')
 * to distinguish them from core templates while still making them available
 * for activation.
 *
 * This function should be called after built-in templates and before user
 * templates so that user templates can override community templates if needed.
 */
export function registerCommunityTemplates(): void {
  for (const template of communityTemplates) {
    // Skip if template with same ID is already registered
    if (!templateRegistry.has(template.id)) {
      templateRegistry.register(template, 'config');
    }
  }
}

/**
 * Register user-defined templates from config.
 *
 * Validates each template and registers it in the registry.
 *
 * @param config - Template configuration from config.json
 * @throws {Error} If any user template fails validation or has duplicate ID
 */
export function registerUserTemplates(config: TemplateConfig): void {
  if (!config.templates || config.templates.length === 0) {
    return;
  }

  for (const template of config.templates) {
    // Template already validated by loadTemplateConfig
    templateRegistry.register(template, 'config');
  }
}

/**
 * Activate the selected template.
 *
 * Sets the active template in the registry based on the activeTemplate field
 * in the config.
 *
 * @param config - Template configuration from config.json
 * @throws {Error} If the specified template is not registered
 */
export function activateTemplate(config: TemplateConfig): void {
  templateRegistry.activate(config.activeTemplate);
}

/**
 * Pre-generate schemas for all entity types in the active template.
 *
 * Caches schemas in the schema factory for fast runtime access.
 * This improves performance for note parsing and validation.
 *
 * @throws {Error} If no template is active
 */
export function pregenerateSchemas(): void {
  const activeTemplate = templateRegistry.getActive();
  if (!activeTemplate) {
    throw new Error('Cannot pregenerate schemas: no active template');
  }

  // Generate schemas for all entity types
  schemaFactory.generateSchemas(activeTemplate.entityTypes);
}

/**
 * Full initialization sequence for template system.
 *
 * Performs complete setup:
 * 1. Register built-in templates
 * 2. Register community templates
 * 3. Load config from file
 * 4. Register user-defined templates
 * 5. Activate selected template
 * 6. Pre-generate schemas
 *
 * This is the main entry point for template system initialization.
 * Call this at application startup before using any template features.
 *
 * @param configPath - Optional explicit path to config file
 * @returns The loaded template configuration
 * @throws {Error} If initialization fails at any step
 *
 * @example
 * ```ts
 * // At application startup
 * const config = initializeTemplates();
 * console.debug(`Loaded template: ${config.activeTemplate}`);
 * ```
 */
export function initializeTemplates(configPath?: string): TemplateConfig {
  // 1. Register built-in templates
  registerBuiltinTemplates();

  // 2. Register community templates
  registerCommunityTemplates();

  // 3. Load config
  const config = loadTemplateConfig(configPath);

  // 4. Register user templates
  registerUserTemplates(config);

  // 5. Activate selected template
  activateTemplate(config);

  // 6. Pre-generate schemas
  pregenerateSchemas();

  return config;
}

/**
 * Load a standalone template file from disk.
 *
 * Reads a JSON file containing a template definition and validates it
 * against the TemplateDefinitionSchema.
 *
 * @param filePath - Path to the template JSON file
 * @returns Validated template definition
 * @throws {Error} If file cannot be read or parsed
 * @throws {TemplateValidationError} If template fails validation
 *
 * @example
 * ```ts
 * const template = loadTemplateFile('./template.json');
 * console.debug(`Loaded template: ${template.name}`);
 * ```
 */
export function loadTemplateFile(filePath: string): TemplateDefinition {
  const resolvedPath = resolve(filePath);

  let fileContent: string;
  try {
    fileContent = readFileSync(resolvedPath, 'utf-8');
  } catch (err) {
    throw new Error(
      `Failed to read template file at ${resolvedPath}: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  let templateData: unknown;
  try {
    templateData = JSON.parse(fileContent);
  } catch (err) {
    throw new Error(
      `Failed to parse template file as JSON: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  const result = TemplateDefinitionSchema.safeParse(templateData);
  if (!result.success) {
    throw new TemplateValidationError('Invalid template definition', result.error.issues);
  }

  return result.data;
}

/**
 * Validate a template file without loading it into the registry.
 *
 * Useful for CLI tools and pre-flight validation. Returns the validated
 * template if successful, throws TemplateValidationError with details if not.
 *
 * @param filePath - Path to the template JSON file
 * @returns Validated template definition
 * @throws {Error} If file cannot be read or parsed
 * @throws {TemplateValidationError} If template fails validation
 *
 * @example
 * ```ts
 * try {
 *   const template = validateTemplateFile('./template.json');
 *   console.debug(`Template "${template.name}" is valid!`);
 * } catch (err) {
 *   if (err instanceof TemplateValidationError) {
 *     console.error(err.toUserMessage());
 *   }
 * }
 * ```
 */
export function validateTemplateFile(filePath: string): TemplateDefinition {
  return loadTemplateFile(filePath);
}

/**
 * Convenience function to get an entity schema by name.
 *
 * Retrieves the entity type config from the active template and returns
 * the corresponding Zod schema.
 *
 * @param entityTypeName - Name of the entity type (e.g., "character", "location")
 * @returns Zod schema for the entity type
 * @throws {Error} If no template is active or entity type not found
 *
 * @example
 * ```ts
 * const characterSchema = getEntitySchema('character');
 * const validated = characterSchema.parse(frontmatter);
 * ```
 */
export function getEntitySchema(entityTypeName: string) {
  const entityType = templateRegistry.getEntityType(entityTypeName);
  if (!entityType) {
    const activeTemplate = templateRegistry.getActive();
    const availableTypes = activeTemplate?.entityTypes.map((t) => t.name).join(', ') || 'none';
    throw new Error(
      `Entity type "${entityTypeName}" not found in active template. Available types: ${availableTypes}`
    );
  }

  return schemaFactory.getSchema(entityType);
}
