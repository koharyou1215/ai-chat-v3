/**
 * Integration Layer for Refactored Prompt Generation
 *
 * Purpose: Provide drop-in replacement for generatePrompt() method
 * Strategy: Delegate to PromptBuilder while maintaining exact same interface
 */

import type { Character, Persona } from '@/types';
import type { ConversationManager } from '../conversation-manager';
import { replaceVariablesInCharacter } from '@/utils/variable-replacer';
import { PromptBuilder } from './prompt-builder';

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
  // 🔒 Exact copy of context building from line 341-355
  const context = await (this as any).buildContext(userInput);

  // Get relevant memories and pinned messages for prompt generation
  const relevantMemories = await (this as any).searchRelevantMemories(userInput);
  const pinnedMessages = (this as any).getPinnedMessages();

  // 変数置換コンテキストを作成
  const variableContext = { user: persona, character };

  // キャラクター情報に変数置換を適用
  const processedCharacter = character
    ? replaceVariablesInCharacter(character, variableContext)
    : undefined;

  // Use new PromptBuilder
  const builder = new PromptBuilder();

  const prompt = await builder.build({
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
    trackerManager: (this as any).trackerManager,
  });

  return prompt;
}
