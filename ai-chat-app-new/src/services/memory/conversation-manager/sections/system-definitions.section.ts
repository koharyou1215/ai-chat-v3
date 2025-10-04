/**
 * System Definitions Section
 *
 * 🔒 Exact copy from conversation-manager.ts line 357-358
 * Strategy: Character-by-character preservation
 * Purpose: Define AI and User variables
 */

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface SystemDefinitionsContext {
  // No context needed for this section
}

export class SystemDefinitionsSection {
  /**
   * Build system definitions
   *
   * 🔒 EXACT COPY from conversation-manager.ts line 357-358
   */
  build(_context: SystemDefinitionsContext): string {
    // 🔒 line 358 - exact copy
    return `AI={{char}}, User={{user}}\n\n`;
  }
}
