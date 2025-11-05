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
  private readonly maxTokens = 32000;

  async build(options: PromptBuilderOptions): Promise<string> {
    return this.#optimizeAndBuild(options);
  }

  #estimateTokens(text: string): number {
    // Simple estimation: 1 char ~ 1.5 tokens for Japanese, 4 chars ~ 1 token for English
    // This is a rough approximation.
    return Math.ceil(text.length / 2);
  }

  async #optimizeAndBuild(
    options: PromptBuilderOptions,
    isOptimizing = false
  ): Promise<string> {
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

    // Adjust content based on optimization flag
    const recentMessagesCount = isOptimizing ? 10 : 20; // 5 or 10 turns
    const relevantMemoriesCount = isOptimizing ? 5 : 8;

    // 1. System Instructions (Integrated)
    const systemDefinitions = new SystemDefinitionsSection().build({});
    const systemPrompt = new SystemPromptSection().build({ systemSettings });
    const jailbreakPrompt = new JailbreakPromptSection().build({ systemSettings });
    const systemInstructions = `<system_instructions>\n${systemDefinitions}${systemPrompt}${jailbreakPrompt}\n</system_instructions>\n\n`;

    // 2. Character Core (Integrated/Simplified)
    const characterInfo = new CharacterInfoSection().build({ processedCharacter });
    const characterSystemPrompt = new CharacterSystemPromptSection().build({ processedCharacter });
    const characterCore = `<character_core>\n${characterInfo}${characterSystemPrompt}\n</character_core>\n\n`;

    // 3. Persona Information (Unchanged)
    const personaInfo = new PersonaInfoSection().build({ persona });

    // 4. Relationship State (Tracker)
    const trackerInfo = new TrackerInfoSection().build({
      trackerManager,
      character: processedCharacter,
    });

    // 5. Memory System (Integrated)
    const memorySystem = await new MemorySystemSection().build({
      conversationManager,
      userInput,
      processedCharacter,
      relevantMemories: relevantMemories.slice(0, relevantMemoriesCount),
      pinnedMessages,
    });

    // 6. Recent Conversation
    const recentConversation = new RecentConversationSection().build({
      recent_messages: context.recent_messages.slice(-recentMessagesCount),
      variableContext,
    });

    // 7. Current Input
    const currentInput = new CurrentInputSection().build({ userInput, variableContext });

    const prompt = [
      systemInstructions,
      characterCore,
      personaInfo,
      trackerInfo,
      memorySystem,
      recentConversation,
      currentInput,
    ].join('\n');

    const estimatedTokens = this.#estimateTokens(prompt);

    if (estimatedTokens > this.maxTokens && !isOptimizing) {
      console.warn('Token limit exceeded, optimizing and rebuilding...');
      return this.#optimizeAndBuild(options, true);
    }

    console.log(
      `====================\n[AI Prompt Context (Tokens: ~${estimatedTokens})]\n====================`,
      prompt
    );

    return prompt;
  }
}


