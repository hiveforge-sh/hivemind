import { ExitPromptError } from '@inquirer/core';
import { promptVaultPath, promptOverwriteConfig } from './prompts.js';
import { detectAndConfirmTemplate } from './detection.js';
import { configExists } from './validators.js';
import { success, error, dim, bold } from '../shared/colors.js';

/**
 * Breadcrumb steps for progress display.
 */
const STEPS = ['Vault', 'Template', 'Config', 'Done'];

/**
 * Render breadcrumb progress indicator.
 */
function renderBreadcrumb(current: number): string {
  return STEPS.map((step, i) => {
    if (i < current) return dim(step);
    if (i === current) return bold(step);
    return dim(step);
  }).join(dim(' > '));
}

/**
 * Result of interactive wizard.
 */
export interface WizardResult {
  vaultPath: string;
  templateId: string;
  cancelled: boolean;
}

/**
 * Run the interactive setup wizard.
 *
 * Flow:
 * 1. Check for TTY (bail if non-interactive)
 * 2. Check for existing config.json (prompt to overwrite)
 * 3. Prompt for vault path
 * 4. Auto-detect template or manual selection
 * 5. Return result for config generation
 *
 * @returns Wizard result with vault path and template ID
 */
export async function runInteractiveWizard(): Promise<WizardResult> {
  // Check for TTY before prompts
  if (!process.stdin.isTTY) {
    console.error(error('Interactive mode requires a terminal.'));
    console.error('Use --config <preset.json> or flags for non-interactive mode.');
    process.exit(1);
  }

  try {
    console.log('\n' + bold('Hivemind Setup Wizard'));
    console.log('='.repeat(40) + '\n');

    // Step 1: Check for existing config
    const cwd = process.cwd();
    if (configExists(cwd)) {
      const overwrite = await promptOverwriteConfig();
      if (!overwrite) {
        console.log('\nSetup cancelled.');
        return { vaultPath: '', templateId: '', cancelled: true };
      }
    }

    // Step 2: Vault path
    console.log('\n' + renderBreadcrumb(0));
    const vaultPath = await promptVaultPath();
    console.log(success(`Using vault: ${vaultPath}`));

    // Step 3: Template selection (with auto-detection)
    console.log('\n' + renderBreadcrumb(1));
    let templateId = await detectAndConfirmTemplate(vaultPath);

    // Handle custom template selection
    if (templateId === 'custom') {
      console.log('\n' + dim('Custom template creation will be available after initial setup.'));
      console.log(dim('For now, starting with worldbuilding template. Run create-template later.'));
      templateId = 'worldbuilding';
    }

    console.log(success(`Using template: ${templateId}`));

    // Step 4: Complete
    console.log('\n' + renderBreadcrumb(3));

    return {
      vaultPath,
      templateId,
      cancelled: false,
    };

  } catch (err) {
    // Handle Ctrl+C gracefully
    if (err instanceof ExitPromptError) {
      console.log('\n\nSetup cancelled.');
      return { vaultPath: '', templateId: '', cancelled: true };
    }
    throw err;
  }
}
