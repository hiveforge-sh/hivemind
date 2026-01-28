import { TemplateDetector } from '../../templates/detector.js';
import { promptConfirm, promptTemplateSelection } from './prompts.js';
import { bold, dim } from '../shared/colors.js';

/**
 * Detect template from vault structure and confirm with user.
 *
 * Flow:
 * 1. Scan vault for folder patterns
 * 2. If match found (2+ matching folders), ask user to confirm
 * 3. If user declines or no match, fall through to manual selection
 *
 * @param vaultPath - Absolute path to vault directory
 * @returns Selected template ID
 */
export async function detectAndConfirmTemplate(vaultPath: string): Promise<string> {
  const detector = new TemplateDetector();
  const detection = await detector.detectTemplate(vaultPath);

  // If detection found (any confidence level - 2+ matching folders is enough to ask)
  if (detection) {
    console.log(`\nDetected: ${bold(detection.templateId)} template`);
    console.log(dim(`Matched folders: ${detection.matchedPatterns.join(', ')}`));
    console.log(dim(`Confidence: ${detection.confidence}`));

    const useDetected = await promptConfirm(
      `Use ${detection.templateId} template?`,
      true
    );

    if (useDetected) {
      return detection.templateId;
    }
  }

  // Fall through to manual selection
  return await promptTemplateSelection();
}

/**
 * Check if vault has recognizable folder structure.
 * Used to determine whether to offer creating recommended folders.
 */
export async function hasRecognizableFolders(vaultPath: string): Promise<boolean> {
  const detector = new TemplateDetector();
  const detection = await detector.detectTemplate(vaultPath);
  return detection !== null;
}
