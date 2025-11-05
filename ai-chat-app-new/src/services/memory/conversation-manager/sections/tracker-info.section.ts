/**
 * Tracker Information Section
 *
 * 🔒 Exact copy from conversation-manager.ts line 573-603
 * Strategy: Character-by-character preservation
 * Purpose: Build relationship tracker context
 */

import type { Character } from '@/types';
import type { TrackerManager } from '@/services/tracker/tracker-manager';
import { TRACKER_WARNING } from '@/constants/prompts';

export interface TrackerInfoContext {
  character?: Character;
  trackerManager?: TrackerManager;
}

export class TrackerInfoSection {
  /**
   * Build tracker information section
   *
   * 🔒 EXACT COPY from conversation-manager.ts line 573-603
   */
  build(context: TrackerInfoContext): string {
    const { trackerManager, character } = context;
    let prompt = "";

    // 🔒 line 574-603 - exact copy
    // 6. Tracker Information (関係性トラッカー)
    if (trackerManager && character) {
      try {
        console.log(
          "🔍 [ConversationManager] Getting tracker info for character:",
          character.id
        );
        const trackerInfo = trackerManager.getDetailedTrackersForPrompt?.(
          character.id
        );
        if (trackerInfo) {
          console.log(
            "✅ [ConversationManager] Tracker info found:",
            trackerInfo.length,
            "characters"
          );
          prompt += `<relationship_state>
${TRACKER_WARNING}
${trackerInfo}
</relationship_state>\n\n`;
        } else {
          console.log("❌ [ConversationManager] No tracker info available");
        }
      } catch (error) {
        console.warn(
          "Failed to get tracker info in ConversationManager:",
          error
        );
      }
    } else {
      console.log(
        "❌ [ConversationManager] No tracker manager or character available"
      );
    }

    return prompt;
  }
}
