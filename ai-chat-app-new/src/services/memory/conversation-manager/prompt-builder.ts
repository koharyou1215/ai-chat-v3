/**
 * Consolidated Prompt Builder
 *
 * Strategy: Exact section orchestration without any logic changes
 * Purpose: Assemble prompt from extracted sections in exact same order
 */

import type { Character, Persona } from '@/types';
import type { ConversationManager } from '../conversation-manager';
import type { TrackerManager } from '@/services/tracker/tracker-manager';
import {
  SystemDefinitionsSection,
  SystemPromptSection,
  CharacterInfoSection,
  PersonaInfoSection,
  TrackerInfoSection,
  MemorySystemSection,
  RecentConversationSection,
  CharacterSystemPromptSection,
  JailbreakPromptSection,
  CurrentInputSection,
  type SearchResult,
} from './sections';

export interface PromptBuilderOptions {
  userInput: string;
  character?: Character;
  persona?: Persona;
  systemSettings?: {
    systemPrompts: {
      system?: string;
      jailbreak?: string;
    };
    enableSystemPrompt: boolean;
    enableJailbreakPrompt: boolean;
  };
  conversationManager: ConversationManager;
  processedCharacter?: Character;
  variableContext: import('@/utils/variable-replacer').VariableContext;
  context: {
    recent_messages: Array<{ role: string; content: string }>;
  };
  relevantMemories: SearchResult[];
  pinnedMessages: Array<{ role: string; content: string }>;
  trackerManager?: TrackerManager;
}

export class PromptBuilder {
  private systemDefinitions = new SystemDefinitionsSection();
  private systemPrompt = new SystemPromptSection();
  private characterInfo = new CharacterInfoSection();
  private personaInfo = new PersonaInfoSection();
  private trackerInfo = new TrackerInfoSection();
  private memorySystem = new MemorySystemSection();
  private recentConversation = new RecentConversationSection();
  private characterSystemPrompt = new CharacterSystemPromptSection();
  private jailbreakPrompt = new JailbreakPromptSection();
  private currentInput = new CurrentInputSection();

  /**
   * Build complete prompt by orchestrating all sections
   *
   * 🔒 Section order exactly matches conversation-manager.ts line 357-734
   */
  async build(options: PromptBuilderOptions): Promise<string> {
    const {
      systemSettings,
      processedCharacter,
      persona,
      conversationManager,
      variableContext,
      context,
      relevantMemories,
      pinnedMessages,
      trackerManager,
      userInput,
    } = options;

    let prompt = "";

    // 1. System Definitions (line 357-358)
    prompt += this.systemDefinitions.build({});

    // 2. System Prompt (line 360-373)
    prompt += this.systemPrompt.build({ systemSettings });

    // 3. Character Information (line 375-547)
    prompt += this.characterInfo.build({ processedCharacter });

    // 4. Persona Information (line 549-571)
    prompt += this.personaInfo.build({ persona });

    // 5. Tracker Information (line 573-603)
    prompt += this.trackerInfo.build({
      trackerManager,
      character: processedCharacter,
    });

    // 6. Memory System (line 605-684)
    prompt += await this.memorySystem.build({
      conversationManager,
      userInput,
      processedCharacter,
      relevantMemories,
      pinnedMessages,
    });

    // 7. Recent Conversation (line 704-710)
    prompt += this.recentConversation.build({
      recent_messages: context.recent_messages,
      variableContext,
    });

    // 8. Character System Prompt (line 712-715)
    prompt += this.characterSystemPrompt.build({ processedCharacter });

    // 9. Jailbreak Prompt (line 717-727)
    prompt += this.jailbreakPrompt.build({ systemSettings });

    // 10. Current Input (line 729-734)
    prompt += this.currentInput.build({ userInput, variableContext });

    // 🔒 line 736-739 - exact copy
    console.log(
      "====================\n[AI Prompt Context]\n====================",
      prompt
    );

    return prompt;
  }
}
