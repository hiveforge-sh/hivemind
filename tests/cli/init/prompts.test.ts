import { describe, it, expect, vi } from 'vitest';
import { TEMPLATE_CHOICES } from '../../../src/cli/init/prompts.js';

describe('cli/init/prompts', () => {
  describe('TEMPLATE_CHOICES', () => {
    it('should have worldbuilding template', () => {
      const worldbuilding = TEMPLATE_CHOICES.find(
        (choice) => typeof choice === 'object' && 'value' in choice && choice.value === 'worldbuilding'
      );

      expect(worldbuilding).toBeDefined();
      expect(worldbuilding).toHaveProperty('name', 'Worldbuilding');
      expect(worldbuilding).toHaveProperty('description');
    });

    it('should have people-management template', () => {
      const peopleManagement = TEMPLATE_CHOICES.find(
        (choice) => typeof choice === 'object' && 'value' in choice && choice.value === 'people-management'
      );

      expect(peopleManagement).toBeDefined();
      expect(peopleManagement).toHaveProperty('name', 'People Management');
    });

    it('should have software-architecture template', () => {
      const softwareArch = TEMPLATE_CHOICES.find(
        (choice) => typeof choice === 'object' && 'value' in choice && choice.value === 'software-architecture'
      );

      expect(softwareArch).toBeDefined();
      expect(softwareArch).toHaveProperty('name', 'Software Architecture');
    });

    it('should have ux-research template', () => {
      const uxResearch = TEMPLATE_CHOICES.find(
        (choice) => typeof choice === 'object' && 'value' in choice && choice.value === 'ux-research'
      );

      expect(uxResearch).toBeDefined();
      expect(uxResearch).toHaveProperty('name', 'UX Research');
    });

    it('should have research template', () => {
      const research = TEMPLATE_CHOICES.find(
        (choice) => typeof choice === 'object' && 'value' in choice && choice.value === 'research'
      );

      expect(research).toBeDefined();
      expect(research).toHaveProperty('name', 'Research');
    });

    it('should have custom template option', () => {
      const custom = TEMPLATE_CHOICES.find(
        (choice) => typeof choice === 'object' && 'value' in choice && choice.value === 'custom'
      );

      expect(custom).toBeDefined();
      expect(custom).toHaveProperty('name', 'Create custom template...');
    });

    it('should have category separators', () => {
      const separators = TEMPLATE_CHOICES.filter((choice) => {
        return choice && typeof choice === 'object' && 'separator' in choice;
      });

      // Should have separators for Creative, Professional, Technical, Research, Custom
      expect(separators.length).toBeGreaterThanOrEqual(4);
    });

    it('should have descriptions for all template choices', () => {
      const templates = TEMPLATE_CHOICES.filter(
        (choice) => typeof choice === 'object' && 'value' in choice
      );

      templates.forEach((template: any) => {
        expect(template).toHaveProperty('description');
        expect(template.description).toBeTruthy();
      });
    });
  });

  // Note: promptVaultPath, promptTemplateSelection, promptConfirm, and promptOverwriteConfig
  // are thin wrappers (4-6 lines each) around @inquirer/prompts library functions.
  // They're tested indirectly through:
  // - wizard.test.ts (which mocks all prompt functions and tests wizard flow)
  // - output.test.ts (which mocks promptConfirm for interactive flows)
  // - detection.test.ts (which mocks promptConfirm and promptTemplateSelection)
  // Direct unit testing would require mocking @inquirer/prompts, which is complex with ESM
  // and wouldn't provide additional value beyond testing our mocks.
  // The substantive code (TEMPLATE_CHOICES constant) is tested above.
});
