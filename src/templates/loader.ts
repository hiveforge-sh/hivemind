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
import type { TemplateConfig } from './types.js';
import { validateTemplateConfig } from './validator.js';
import { templateRegistry } from './registry.js';
import { schemaFactory } from './schema-factory.js';
import { worldbuildingTemplate } from './builtin/worldbuilding.js';

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
 * Load template configuration from config.json.
 *
 * Searches for config.json in multiple locations and extracts the template
 * section. Returns defaults if config file not found or template section missing.
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
  let configContent: any;
  try {
    const fileContent = readFileSync(configFilePath, 'utf-8');
    configContent = JSON.parse(fileContent);
  } catch (err) {
    throw new Error(
      `Failed to read or parse config file at ${configFilePath}: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  // Extract template section (use defaults if missing)
  const templateConfig = configContent.template || {
    activeTemplate: 'worldbuilding',
    templates: [],
  };

  // Validate the template config
  return validateTemplateConfig(templateConfig);
}

/**
 * Register all built-in templates.
 *
 * Currently includes:
 * - worldbuilding: Characters, locations, events, factions, lore, assets
 *
 * This function should be called before loading user templates to ensure
 * built-in templates can be referenced by ID.
 */
export function registerBuiltinTemplates(): void {
  templateRegistry.register(worldbuildingTemplate, 'builtin');
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
 * 2. Load config from file
 * 3. Register user-defined templates
 * 4. Activate selected template
 * 5. Pre-generate schemas
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
 * console.log(`Loaded template: ${config.activeTemplate}`);
 * ```
 */
export function initializeTemplates(configPath?: string): TemplateConfig {
  // 1. Register built-in templates
  registerBuiltinTemplates();

  // 2. Load config
  const config = loadTemplateConfig(configPath);

  // 3. Register user templates
  registerUserTemplates(config);

  // 4. Activate selected template
  activateTemplate(config);

  // 5. Pre-generate schemas
  pregenerateSchemas();

  return config;
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
