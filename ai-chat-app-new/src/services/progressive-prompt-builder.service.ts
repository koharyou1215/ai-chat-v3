/**
 * Progressive Prompt Builder Service
 * 3段階のプロンプトを段階的に構築するサービス
 */

import { Character, Persona, UnifiedChatSession } from "@/types";
import {
  ProgressivePrompt,
  ProgressiveStage,
} from "@/types/progressive-message.types";
import { replaceVariables } from "@/utils/variable-replacer";
import { TrackerManager } from "./tracker/tracker-manager";
import { MemoryCard } from "@/types";
import { TRACKER_WARNING } from "@/constants/prompts";
import { ConversationHistoryManager } from "./conversation-history-manager";
import { limitTokens, estimateTokenCount } from "@/utils/token-counter";

export class ProgressivePromptBuilder {
  /**
   * 共通: 基本的なAI/User定義を生成
   */
  private buildBaseDefinition(charName: string, userName: string): string {
    return `AI=${charName}, User=${userName}`;
  }

  /**
   * 共通: メモリーカードセクションを生成
   */
  private buildMemorySection(
    memoryCards: MemoryCard[],
    maxPinned: number = 3,
    maxRelevant: number = 2,
    detailed: boolean = false
  ): string {
    if (!memoryCards || memoryCards.length === 0) return "";

    const pinnedMemories = memoryCards.filter((m) => m.is_pinned).slice(0, maxPinned);
    const relevantMemories = memoryCards.filter((m) => !m.is_pinned).slice(0, maxRelevant);

    if (pinnedMemories.length === 0 && relevantMemories.length === 0) return "";

    if (detailed) {
      // Stage 3用の詳細版
      return `
<memory_system>
${pinnedMemories.length > 0 ? `## Pinned Memories (Most Important)
${pinnedMemories.map((m) => `
[${m.category}] ${m.title}
Summary: ${m.summary}
Keywords: ${m.keywords.join(", ")}
Importance: ${m.importance.score}
`).join("\n")}` : ""}
${relevantMemories.length > 0 ? `
## Relevant Memories
${relevantMemories.map((m) => `
[${m.category}] ${m.title}
Summary: ${m.summary}
Keywords: ${m.keywords.join(", ")}
`).join("\n")}` : ""}
</memory_system>`;
    } else {
      // Stage 1, 2用の簡潔版
      return `
<memory_context>
${pinnedMemories.map((m) => `[Pinned] ${m.title}: ${m.summary}`).join("\n")}
${relevantMemories.map((m) => `[Related] ${m.title}: ${m.summary}`).join("\n")}
</memory_context>`;
    }
  }

  /**
   * 共通: トラッカーセクションを生成
   */
  private buildTrackerSection(
    trackerManager: TrackerManager | undefined,
    characterId: string,
    detailed: boolean = false
  ): string {
    if (!trackerManager || !characterId) return "";

    const trackerInfo = detailed
      ? trackerManager.getDetailedTrackersForPrompt?.(characterId)
      : trackerManager.getTrackersForPrompt?.(characterId);

    if (!trackerInfo) return "";

    const sectionTag = detailed ? "relationship_dynamics" : "relationship_state";

    return `
<${sectionTag}>
${TRACKER_WARNING}
${trackerInfo}
</${sectionTag}>`;
  }
  /**
   * Stage 1: Reflex Prompt (反射的応答)
   * 最小限の情報で即座の感情的反応を生成
   */
  buildReflexPrompt(
    input: string,
    character: Character,
    persona?: Persona,
    memoryCards?: MemoryCard[]
  ): ProgressivePrompt {
    const userName = persona?.name || "User";
    const charName = character.name;

    // 共通メソッドを使用
    const baseDefinition = this.buildBaseDefinition(charName, userName);
    const memorySection = this.buildMemorySection(memoryCards || [], 2, 1, false);

    // 最小限のキャラクター情報
    const minimalCharInfo = `
あなたは${charName}です。
性格: ${
      character.personality
        ? character.personality.slice(0, 100)
        : "親しみやすい"
    }
${character.first_person ? `一人称: ${character.first_person}` : ""}
${character.second_person ? `二人称: ${character.second_person}` : ""}
`;

    const prompt = `
${baseDefinition}

${minimalCharInfo}
${memorySection}

## 重要な指示
- 1-2文で短く感情的に反応してください
- 詳しい説明は不要です
- 自然な会話の初期反応のように応答してください
- 相手の発言に対する第一印象や感情を表現してください
- メモリーカードの情報を参考にしてください

## 現在の入力
${userName}: ${input}
${charName}:`;

    return {
      stage: "reflex",
      prompt: replaceVariables(prompt, {
        character,
        user: persona || {
          id: 'default',
          name: userName,
          role: 'user',
          other_settings: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          version: 1
        } as Persona,
      }),
      tokenLimit: 100,
      temperature: 0.9,
    };
  }

  /**
   * Stage 2: Context Prompt (文脈的応答)
   * メモリーと会話履歴を含む個人化された応答
   */
  async buildContextPrompt(
    input: string,
    session: UnifiedChatSession,
    memoryCards: MemoryCard[],
    trackerManager?: TrackerManager
  ): Promise<ProgressivePrompt> {
    const character = session.participants.characters[0];
    const persona = session.participants.user;
    const charName = character.name;
    const userName = persona?.name || "User";

    // 共通メソッドを使用
    const baseDefinition = this.buildBaseDefinition(charName, userName);
    const memorySection = this.buildMemorySection(memoryCards, 3, 2, false);
    const trackerSection = this.buildTrackerSection(trackerManager, character.id, false);

    // キャラクター情報（中程度の詳細）
    const characterInfo = `
<character_information>
Name: ${character.name}
Personality: ${character.personality || "Not specified"}
Speaking Style: ${character.speaking_style || "Natural"}
First Person: ${character.first_person || "私"}
Second Person: ${character.second_person || "あなた"}
${
  character.likes && character.likes.length > 0
    ? `Likes: ${character.likes.join(", ")}`
    : ""
}
${
  character.dislikes && character.dislikes.length > 0
    ? `Dislikes: ${character.dislikes.join(", ")}`
    : ""
}
</character_information>`;

    // ペルソナ情報
    const personaInfo = persona
      ? `
<persona_information>
Name: ${persona.name}
${persona.role ? `Role: ${persona.role}` : ""}
${
  persona.other_settings ? `Details: ${persona.other_settings.slice(0, 200)}` : ""
}
</persona_information>`
      : "";

    // 統一されたHistoryManagerを使用して会話履歴を取得
    const conversationHistoryArray = ConversationHistoryManager.getHistoryForStage2(session);

    // 🔥 過去のパターンと異なる応答を促す（簡潔版）
    const stage2PatternSection = session.messages.length > 0
      ? `\n【重要】過去の表現と異なる新しい視点・感情の角度で応答してください。`
      : "";

    const conversationHistory =
      conversationHistoryArray.length > 0
        ? `
<recent_conversation>
${conversationHistoryArray
  .map(
    (msg: { role: string; content: string }) =>
      `${msg.role === "user" ? userName : charName}: ${msg.content.slice(
        0,
        150
      )}`
  )
  .join("\n")}
</recent_conversation>`
        : "";

    let prompt = `
${baseDefinition}

${characterInfo}
${personaInfo}
${memorySection}
${trackerSection}
${conversationHistory}
${stage2PatternSection}

## 応答指示
- 会話の文脈と記憶を踏まえて応答してください
- 相手との関係性を考慮してください
- 3-5文程度で自然に応答してください
- 過去の会話内容を適切に参照してください

## 現在の入力
${userName}: ${input}
${charName}:`;

    // 🔧 改善されたトークン制限の適用（Stage 2: 最大10,000トークン）
    const { limitedText, wasLimited } = limitTokens(prompt, {
      maxTokens: 10000,
      reducibleSections: [
        {
          name: "会話履歴",
          content: conversationHistory,
          priority: 3, // 最も削減しやすい
        },
        {
          name: "メモリーカード",
          content: memorySection,
          priority: 2,
        },
        {
          name: "ペルソナ情報",
          content: personaInfo,
          priority: 1,
        },
      ],
    });

    if (wasLimited) {
      prompt = limitedText;
    }

    return {
      stage: "context",
      prompt: replaceVariables(prompt, {
        character,
        user: persona || {
          id: 'default',
          name: userName,
          role: 'user',
          other_settings: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          version: 1
        } as Persona,
      }),
      tokenLimit: 500,
      temperature: 0.7,
      memoryContext: memorySection,
      conversationHistory: conversationHistoryArray,
    };
  }

  /**
   * Stage 3: Intelligence Prompt (知的応答)
   * 完全な情報と深い洞察を含む応答
   */
  async buildIntelligencePrompt(
    input: string,
    session: UnifiedChatSession,
    memoryCards: MemoryCard[],
    trackerManager?: TrackerManager,
    systemInstructions?: string
  ): Promise<ProgressivePrompt> {
    const character = session.participants.characters[0];
    const persona = session.participants.user;
    const charName = character.name;
    const userName = persona?.name || "User";

    // 共通メソッドを使用
    const baseDefinition = this.buildBaseDefinition(charName, userName);
    const fullMemorySection = this.buildMemorySection(memoryCards, 999, 10, true); // 詳細版
    const fullTrackerSection = this.buildTrackerSection(trackerManager, character.id, true);

    // 🔥 過去のパターンと異なる応答を促す（簡潔版）
    const stage3PatternSection = session.messages.length > 0
      ? `\n【重要】過去の言い回し・行動提案と異なる新しいアプローチで応答してください。`
      : "";

    // システム指示（完全版）
    const systemSection =
      systemInstructions ||
      `
<system_instructions>
## Core Behavioral Rules
1. Always maintain character consistency
2. Never break character or mention being an AI
3. Respond naturally as the character would
4. Consider emotional context and relationship dynamics
5. Provide thoughtful, detailed responses when appropriate

## Response Quality Guidelines
- Show deep understanding of the conversation context
- Offer creative insights and suggestions
- Reference relevant past conversations naturally
- Demonstrate emotional intelligence
- Maintain appropriate conversation depth
</system_instructions>`;

    // 完全なキャラクター情報
    const fullCharacterInfo = `
<character_information>
## Basic Information
Name: ${character.name}
Age: ${character.age || "Not specified"}
Personality: ${character.personality || "Not specified"}
Occupation: ${character.occupation || "Not specified"}

## Communication Style
Speaking Style: ${character.speaking_style || "Natural"}
First Person: ${character.first_person || "私"}
Second Person: ${character.second_person || "あなた"}
${character.verbal_tics ? `Verbal Tics: ${character.verbal_tics}` : ""}

## Preferences
${
  character.likes && character.likes.length > 0
    ? `Likes: ${character.likes.join(", ")}`
    : ""
}
${
  character.dislikes && character.dislikes.length > 0
    ? `Dislikes: ${character.dislikes.join(", ")}`
    : ""
}
${
  character.hobbies && character.hobbies.length > 0
    ? `Hobbies: ${character.hobbies.join(", ")}`
    : ""
}

## Background
${character.background || "No specific background provided"}

## Current Scenario
${character.scenario || "No specific scenario"}

## Special Context
${
  character.nsfw_profile
    ? `
NSFW Profile Active
Persona: ${character.nsfw_profile.persona || "Standard"}
Preferences: ${character.nsfw_profile.kinks?.join(", ") || "None specified"}
`
    : ""
}
</character_information>`;

    // 完全なペルソナ情報
    const fullPersonaInfo = persona
      ? `
<persona_information>
## User Profile
Name: ${persona.name}
Role: ${persona.role || "User"}
Settings: ${persona.other_settings || "No additional settings"}

## Characteristics

## Additional Information
${persona.other_settings ? `Other Settings: ${persona.other_settings}` : ""}
</persona_information>`
      : "";

    // 統一されたHistoryManagerを使用して会話履歴を取得
    const historyMessages = ConversationHistoryManager.getHistoryForStage3(session);
    const fullConversationHistory =
      historyMessages.length > 0
        ? `
<conversation_history>
${historyMessages
  .map(
    (msg) => `${msg.role === "user" ? userName : charName}: ${msg.content}`
  )
  .join("\n")}
</conversation_history>`
        : "";

    let prompt = `
${baseDefinition}

${systemSection}
${fullCharacterInfo}
${fullPersonaInfo}
${fullMemorySection}
${fullTrackerSection}
${fullConversationHistory}
${stage3PatternSection}

## Advanced Response Guidelines
- Provide deep insights and thoughtful analysis when appropriate
- Reference specific past conversations and shared experiences
- Show emotional depth and understanding
- Offer creative suggestions or alternative perspectives
- Maintain character authenticity while demonstrating intelligence
- Consider long-term relationship dynamics
- Balance detail with natural conversation flow

## Current Context Analysis
Consider the user's emotional state, the conversation trajectory, and any implicit needs or desires that haven't been directly expressed.

## Current Input
${userName}: ${input}
${charName}:`;

    // 🔧 改善されたトークン制限の適用（Stage 3: 最大15,000トークン）
    const { limitedText, wasLimited } = limitTokens(prompt, {
      maxTokens: 15000,
      reducibleSections: [
        {
          name: "会話履歴",
          content: fullConversationHistory,
          priority: 4, // 最も削減しやすい
        },
        {
          name: "メモリーシステム",
          content: fullMemorySection,
          priority: 3,
        },
        {
          name: "トラッカー情報",
          content: fullTrackerSection,
          priority: 2,
        },
        {
          name: "ペルソナ情報",
          content: fullPersonaInfo,
          priority: 1, // 最も削減しにくい
        },
      ],
    });

    if (wasLimited) {
      prompt = limitedText;
    }

    return {
      stage: "intelligence",
      prompt: replaceVariables(prompt, {
        character,
        user: persona || {
          id: 'default',
          name: userName,
          role: 'user',
          other_settings: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          version: 1
        } as Persona,
      }),
      tokenLimit: 2000,
      temperature: 0.7,
      systemInstructions: systemSection,
      characterContext: fullCharacterInfo,
      memoryContext: fullMemorySection,
      conversationHistory: historyMessages,
    };
  }

  /**
   * 段階に応じた適切なプロンプトビルダーを選択
   */
  async buildPromptForStage(
    stage: ProgressiveStage,
    input: string,
    session: UnifiedChatSession,
    memoryCards: MemoryCard[] = [],
    trackerManager?: TrackerManager,
    systemInstructions?: string
  ): Promise<ProgressivePrompt> {
    const character = session.participants.characters[0];
    const persona = session.participants.user;

    switch (stage) {
      case "reflex":
        return this.buildReflexPrompt(input, character, persona, memoryCards);

      case "context":
        return await this.buildContextPrompt(
          input,
          session,
          memoryCards,
          trackerManager
        );

      case "intelligence":
        return await this.buildIntelligencePrompt(
          input,
          session,
          memoryCards,
          trackerManager,
          systemInstructions
        );

      default:
        // フォールバック
        return this.buildReflexPrompt(input, character, persona);
    }
  }
}

// シングルトンインスタンス
export const progressivePromptBuilder = new ProgressivePromptBuilder();
