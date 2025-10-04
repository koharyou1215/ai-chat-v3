/**
 * Current Input Section
 *
 * 🔒 Exact copy from conversation-manager.ts line 729-734
 * Strategy: Character-by-character preservation
 * Purpose: Build current user input with AI prompt continuation
 */

import { replaceVariables, type VariableContext } from '@/utils/variable-replacer';

export interface CurrentInputContext {
  userInput: string;
  variableContext: VariableContext;
}

export class CurrentInputSection {
  /**
   * Build current input section
   *
   * 🔒 EXACT COPY from conversation-manager.ts line 729-734
   */
  build(context: CurrentInputContext): string {
    const { userInput, variableContext } = context;
    let prompt = "";

    // 🔒 line 729-734 - exact copy
    // 11. Current Input
    prompt += `User: ${replaceVariables(userInput, variableContext)}\n`;
    prompt += `AI: `;

    // 最後にプロンプト全体に変数置換を適用
    prompt = replaceVariables(prompt, variableContext);

    return prompt;
  }
}
