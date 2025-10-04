/**
 * Persona Information Section
 *
 * 🔒 Exact copy from conversation-manager.ts line 549-571
 * Strategy: Character-by-character preservation
 * Purpose: Build persona context
 */

import type { Persona } from '@/types';

export interface PersonaInfoContext {
  persona?: Persona;
}

export class PersonaInfoSection {
  /**
   * Build persona information section
   *
   * 🔒 EXACT COPY from conversation-manager.ts line 549-571
   */
  build(context: PersonaInfoContext): string {
    const { persona } = context;
    let prompt = "";

    // 🔒 line 550-571 - exact copy
    // 5. Persona Information (if available)
    if (persona) {
      console.log(
        "🎭 [ConversationManager] Persona found:",
        persona.name,
        persona.other_settings
      );
      prompt += "<persona_information>\n";
      prompt += `Name: ${persona.name}\n`;
      prompt += `Role: ${persona.role}\n`;
      prompt += `Other Settings: ${persona.other_settings}\n`;

      // Additional persona settings (if available)
      if (persona.other_settings && persona.other_settings.trim()) {
        prompt += `Additional Settings: ${persona.other_settings}\n`;
      }

      prompt += "</persona_information>\n\n";
    } else {
      console.warn(
        "⚠️ [ConversationManager] No persona provided to generatePrompt"
      );
    }

    return prompt;
  }
}
