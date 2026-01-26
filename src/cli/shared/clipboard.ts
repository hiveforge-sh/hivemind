import clipboard from 'clipboardy';

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await clipboard.write(text);
    return true;
  } catch {
    // Clipboard may not be available in all environments (CI, SSH, etc.)
    return false;
  }
}
