/**
 * Integration Layer for Refactored Prompt Generation
 *
 * Purpose: Provide drop-in replacement for generatePrompt() method
 * Strategy: Delegate to PromptBuilder while maintaining exact same interface
 */

import type { Character, Persona } from '@/types';
import type { ConversationManager } from '../conversation-manager';
import type { SearchResult } from '@/types/core/memory.types';
import type { TrackerManager } from '@/services/tracker/tracker-manager';
import { replaceVariablesInCharacter, replaceVariables } from '@/utils/variable-replacer';
import { PromptBuilder } from './prompt-builder';

// Internal type extension for accessing private/internal methods
type ConversationManagerInternal = {
  buildContext: (input: string) => Promise<{ recent_messages: { role: string; content: string; }[]; }>;
  searchRelevantMemories: (input: string) => Promise<SearchResult[]>;
  getPinnedMessages: () => { role: string; content: string; }[];
  trackerManager: TrackerManager | undefined;
};

export interface SystemSettings {
  systemPrompts: {
    system?: string;
    jailbreak?: string;
  };
  enableSystemPrompt: boolean;
  enableJailbreakPrompt: boolean;
}

/**
 * Generate prompt using refactored section-based builder
 *
 * 🔒 Exact same interface as conversation-manager.ts generatePrompt()
 * Strategy: Delegate to PromptBuilder with exact same context
 */
export async function generatePromptRefactored(
  this: ConversationManager,
  userInput: string,
  character?: Character,
  persona?: Persona,
  systemSettings?: SystemSettings
): Promise<string> {
  const self = this as unknown as ConversationManagerInternal;

  // 🔒 Exact copy of context building from line 341-355
  const context = await self.buildContext(userInput);

  // Get relevant memories and pinned messages for prompt generation
  const relevantMemories = await self.searchRelevantMemories(userInput);
  const pinnedMessages = self.getPinnedMessages();

  // 変数置換コンテキストを作成
  const variableContext = { user: persona, character };

  // キャラクター情報に変数置換を適用
  const processedCharacter = character
    ? replaceVariablesInCharacter(character, variableContext)
    : undefined;

  // Use new PromptBuilder
  const builder = new PromptBuilder();

  let prompt = await builder.build({
    userInput,
    character,
    persona,
    systemSettings,
    conversationManager: this,
    processedCharacter,
    variableContext,
    context,
    relevantMemories,
    pinnedMessages,
    trackerManager: self.trackerManager,
  });

  // 🔒 line 735 - Apply variable replacement to entire prompt (EXACT COPY)
  prompt = replaceVariables(prompt, variableContext);

  return prompt;
}
