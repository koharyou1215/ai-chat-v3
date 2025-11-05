import {
  UnifiedChatSession,
  UnifiedMessage,
  Character,
  Persona,
} from "@/types";
import { ConversationManager } from "./memory/conversation-manager";
import { TrackerManager } from "./tracker/tracker-manager";
import { useAppStore } from "@/store";
import {
  replaceVariables,
  replaceVariablesInCharacter,
  getVariableContext,
} from "@/utils/variable-replacer";
import { DEFAULT_SYSTEM_PROMPT } from "@/constants/prompts";
import { logger } from "@/utils/logger";
import { ConversationHistoryManager } from "./conversation-history-manager";

export class PromptBuilderService {
  // ConversationManager キャッシュ
  private static managerCache = new Map<string, ConversationManager>();
  private static lastProcessedCount = new Map<string, number>();

  /**
   * 特定のセッションIDのキャッシュをクリア
   */
  public clearManagerCache(sessionId: string) {
    if (PromptBuilderService.managerCache.has(sessionId)) {
      PromptBuilderService.managerCache.delete(sessionId);
      PromptBuilderService.lastProcessedCount.delete(sessionId);
      logger.debug(
        `🧹 Cleared ConversationManager cache for session: ${sessionId}`
      );
    }
  }

  /**
   * セッション単位でConversationManagerを管理
   * パフォーマンス最適化：真の増分更新とバッチ処理
   */
  private async getOrCreateManager(
    sessionId: string,
    messages: UnifiedMessage[],
    trackerManager?: TrackerManager
  ): Promise<ConversationManager> {
    const startTime = performance.now();

    let manager = PromptBuilderService.managerCache.get(sessionId);
    const lastProcessed =
      PromptBuilderService.lastProcessedCount.get(sessionId) || 0;

    if (!manager) {
      // 初期化: 全メッセージをバッチで処理
      logger.debug(
        `🆕 Creating ConversationManager for session: ${sessionId} (${messages.length} messages)`
      );

      const importantMessages = messages.filter(
        (msg) => msg.memory.importance.score >= 0.3 || msg.role === "user"
      );

      manager = new ConversationManager(importantMessages, trackerManager);

      // Apply memory limits from settings
      const store = useAppStore.getState();
      if (store.chat?.memory_limits) {
        manager.updateMemoryLimits(store.chat.memory_limits);
      }

      PromptBuilderService.managerCache.set(sessionId, manager);
      PromptBuilderService.lastProcessedCount.set(sessionId, messages.length);

      const duration = performance.now() - startTime;
      logger.debug(`✅ Manager created in ${duration.toFixed(1)}ms`);
      return manager;
    }

    // Update memory limits when manager exists
    const store = useAppStore.getState();
    if (store.chat?.memory_limits) {
      manager.updateMemoryLimits(store.chat.memory_limits);
    }

    // 増分更新: 新しいメッセージのみ処理
    const newMessages = messages.slice(lastProcessed);
    if (newMessages.length > 0) {
      logger.debug(`🔄 Processing ${newMessages.length} new messages`);

      // 重要なメッセージのみフィルタリング
      const importantMessages = newMessages.filter(
        (msg) => msg.memory.importance.score >= 0.3 || msg.role === "user"
      );

      if (importantMessages.length > 0) {
        // 🔧 FIX: 新規メッセージのみを処理（重複スキップはvectorStore内で実施）
        // ConversationManager.importMessagesは全メッセージを受け取るが、
        // 内部のvectorStore.addMessagesBatchで既存メッセージはスキップされる
        // 注：全メッセージを渡すのは非効率だが、既存の設計に従う
        await manager.importMessages([
          ...manager.getAllMessages(),
          ...importantMessages,
        ]);
        logger.debug(`✅ Processed ${importantMessages.length} new messages (duplicates skipped internally)`);
      }

      // 処理済みメッセージ数を更新
      PromptBuilderService.lastProcessedCount.set(sessionId, messages.length);
    }

    const duration = performance.now() - startTime;
    if (duration > 100) {
      logger.warn(`⚠️ Slow manager operation: ${duration.toFixed(1)}ms`);
    }

    return manager;
  }

  /**
   * キャッシュクリーンアップ
   * メモリリーク防止：古いセッションを定期的にクリア + パフォーマンス統計
   */
  public static cleanupCache(activeSessionIds: string[]) {
    const activeSet = new Set(activeSessionIds);
    const beforeSize = PromptBuilderService.managerCache.size;

    for (const sessionId of PromptBuilderService.managerCache.keys()) {
      if (!activeSet.has(sessionId)) {
        logger.debug(
          `🧹 Cleaning up ConversationManager cache for session: ${sessionId}`
        );
        PromptBuilderService.managerCache.delete(sessionId);
        PromptBuilderService.lastProcessedCount.delete(sessionId);
      }
    }

    const cleanedCount = beforeSize - PromptBuilderService.managerCache.size;
    if (cleanedCount > 0) {
      logger.debug(
        `📊 Cache cleanup: Removed ${cleanedCount} inactive sessions (${PromptBuilderService.managerCache.size} remaining)`
      );
    }
  }

  /**
   * キャッシュ統計情報を取得
   */
  public static getCacheStatistics() {
    return {
      cached_sessions: PromptBuilderService.managerCache.size,
      processed_counts: Object.fromEntries(
        PromptBuilderService.lastProcessedCount
      ),
      memory_usage_mb: (
        JSON.stringify(Array.from(PromptBuilderService.managerCache.entries()))
          .length /
        1024 /
        1024
      ).toFixed(2),
    };
  }

  /**
   * セッションデータの厳密な型チェック
   */
  private validateSessionData(session: UnifiedChatSession): void {
    if (!session.participants?.characters?.[0]) {
      throw new Error("Session must have at least one character");
    }
    if (!session.participants?.user) {
      throw new Error("Session must have user information");
    }
  }

  /**
   * システム設定を一箇所で取得してキャッシュ
   */
  private getSystemSettings() {
    const store = useAppStore.getState();
    return {
      systemPrompts: store.systemPrompts,
      enableSystemPrompt: store.enableSystemPrompt,
      enableJailbreakPrompt: store.enableJailbreakPrompt,
      trackerManagers: store.trackerManagers,
    };
  }

  /**
   * 🚨 テンプレート構築 - 順序変更厳禁
   * PROMPT_VERIFICATION_GUIDE.md 117-130行目の8段階構成準拠
   *
   * 必須順序（絶対変更禁止）:
   * 1. system_instructions
   * 2. jailbreak (有効時)
   * 3. character_information
   * 4. persona_information
   * 5. relationship_state
   * 6. input
   */
  private buildPromptTemplate(sections: Record<string, string>): string {
    const template = [
      sections.system &&
        `<system_instructions>\n${sections.system}\n</system_instructions>`,
      sections.jailbreak && `<jailbreak>\n${sections.jailbreak}\n</jailbreak>`,
      sections.character &&
        `<character_information>\n${sections.character}\n</character_information>`,
      sections.persona &&
        `<persona_information>\n${sections.persona}\n</persona_information>`,
      sections.relationship &&
        `<relationship_state>\n${sections.relationship}\n</relationship_state>`,
      sections.memory &&
        `<memory_context>\n${sections.memory}\n</memory_context>`,
      sections.conversation &&
        `<conversation_history>\n${sections.conversation}\n</conversation_history>`,
      sections.input && `## Current Input\n${sections.input}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    return template;
  }

  /**
   * プログレッシブプロンプト構築 - UIをブロックしない高速版
   */
  public async buildPromptProgressive(
    session: UnifiedChatSession,
    userInput: string,
    trackerManager?: TrackerManager,
    memoryCards?: Array<{
      id: string;
      title: string;
      summary: string;
      category?: string;
      keywords?: string[];
      is_pinned?: boolean;
      character_id?: string;
    }>
  ): Promise<{ basePrompt: string; enhancePrompt: () => Promise<string> }> {
    const startTime = performance.now();

    // 強制的にログを出力（ターミナルで確認可能）
    logger.debug("🚀🚀🚀 [PromptBuilder] buildPromptProgressive called 🚀🚀🚀");
    logger.debug("Session ID:", session.id);
    logger.debug("User Input:", userInput.substring(0, 50) + "...");
    logger.debug("Character:", session.participants.characters[0]?.name);
    logger.debug("User:", session.participants.user?.name);
    logger.debug("Has Tracker Manager:", !!trackerManager);

    // セッションデータの厳密な型チェック
    this.validateSessionData(session);

    // 1. 最小限のベースプロンプトを即座に構築 (50-100ms)
    const character = session.participants.characters[0];
    const user = session.participants.user;

    // バリデーション済みなので、安全にアクセス可能

    // 軽量版: 基本情報のみ（重複しない内容）
    logger.debug("🔧 [PromptBuilder] Calling buildBasicInfo...");
    const basePrompt = await this.buildBasicInfo(
      character,
      user,
      userInput,
      trackerManager,
      memoryCards
    );
    logger.debug(
      "✅ [PromptBuilder] buildBasicInfo completed, prompt length:",
      basePrompt.length
    );

    // 2. 拡張プロンプト関数（バックグラウンド実行用）
    const enhancePrompt = async (): Promise<string> => {
      try {
        // 重量版: 履歴情報のみ（基本情報は含まない）
        const historyInfo = await this.getHistoryInfo(session, trackerManager);
        // 基本情報 + 履歴情報を結合（重複なし）
        return basePrompt + "\n\n" + historyInfo;
      } catch (error) {
        logger.warn("Enhanced prompt build failed, using base prompt:", error);
        // 拡張プロンプト構築に失敗した場合でも、ベースプロンプトで継続
        return basePrompt;
      }
    };

    const duration = performance.now() - startTime;
    logger.debug(`⚡ Progressive base prompt built in ${duration.toFixed(1)}ms`);

    return { basePrompt, enhancePrompt };
  }

  /**
   * 🚨 重要: プロンプト構築 - 絶対に簡略化・順序変更禁止
   * PROMPT_VERIFICATION_GUIDE.mdの仕様を厳守すること
   *
   * 必須8段階構成（順序変更厳禁）:
   * 1. AI/User Definition
   * 2. System Instructions (絶対削除禁止)
   * 3. Character Information (完全版必須)
   * 4. Persona Information (全フィールド必須)
   * 5. Memory System
   * 6. Tracker Information
   * 7. Context & History
   * 8. Current Interaction
   */
  private async buildBasicInfo(
    character: Character,
    user: Persona,
    userInput: string,
    trackerManager?: TrackerManager,
    memoryCards?: Array<{
      id: string;
      title: string;
      summary: string;
      category?: string;
      keywords?: string[];
      is_pinned?: boolean;
      character_id?: string;
    }>
  ): Promise<string> {
    // 強制的にログを出力（ターミナルで確認可能）
    logger.debug("💎💎💎 [PromptBuilder] buildBasicInfo called 💎💎💎");
    logger.debug("Character:", character?.name);
    logger.debug("User:", user?.name);
    logger.debug("User Input:", userInput.substring(0, 50) + "...");

    // 🎯 システム設定を取得（永続化された設定を反映）
    const systemSettings = this.getSystemSettings();

    if (!character) {
      logger.error(
        "🚨 CRITICAL: buildBasicInfo received undefined character!"
      );
      return "ERROR: No character information available";
    }

    // 変数置換コンテキストを作成
    const variableContext = { user, character };

    logger.debug("👤 [PromptBuilder] User persona info:", {
      userName: user?.name,
      userRole: user?.role,
      userOtherSettings: user?.other_settings,
      userAvatarPath: user?.avatar_path,
    });

    // キャラクター情報に変数置換を適用
    const processedCharacter = replaceVariablesInCharacter(
      character,
      variableContext
    );

    const userName = user?.name || "ユーザー";

    // 🚨 セクション構築 - 削除・簡略化・順序変更厳禁
    // PROMPT_VERIFICATION_GUIDE.mdの仕様準拠必須
    const sections: Record<string, string> = {};

    // 🚨 System Instructions - カスタム > デフォルト + キャラクター固有
    const basePrompt =
      systemSettings.enableSystemPrompt && systemSettings.systemPrompts?.system?.trim()
        ? systemSettings.systemPrompts.system
        : DEFAULT_SYSTEM_PROMPT;

    const characterPrompt = processedCharacter.system_prompt?.trim()
      ? `\n\n## キャラクター固有の指示\n${processedCharacter.system_prompt}`
      : "";

    sections.system = basePrompt + characterPrompt;

    // 🎯 Jailbreak Prompt (設定で有効な場合)
    if (
      systemSettings.enableJailbreakPrompt &&
      systemSettings.systemPrompts?.jailbreak
    ) {
      sections.jailbreak = systemSettings.systemPrompts.jailbreak;
    }

    // 🧠 Mem0Character統合: CharacterCoreとダイナミック記憶を構築
    // Note: Mem0Character is experimental and may not always be available
    let usesMem0Character = false;
    try {
      const { Mem0Character } = await import("@/services/mem0/character-service");

      if (Mem0Character && typeof Mem0Character.buildCharacterContext === 'function') {
        const characterContext = await Mem0Character.buildCharacterContext(
          character.id,
          userInput,
          {
            character_id: character.id,
            query: user?.id || "default-user",
            include_relationship: true,
            include_memories: true,
            include_cards: true,
            max_tokens: 2000,
          }
        );

        // CharacterCoreから基本情報を構築
        const core = characterContext.core;
        sections.character = `## Basic Information
Name: ${core.identity.name}
${core.identity.age ? `Age: ${core.identity.age}` : ""}
${core.identity.occupation ? `Occupation: ${core.identity.occupation}` : ""}
${core.identity.role ? `Role: ${core.identity.role}` : ""}

## Personality & Traits
External: ${core.personality.external}
Internal: ${core.personality.internal}
Traits: ${core.personality.traits.join(", ")}

## Communication Style
Speaking Style: ${core.communication.speaking_style}
First Person: ${core.communication.first_person}
Second Person: ${core.communication.second_person}
${core.communication.verbal_tics.length > 0 ? `Verbal Tics: ${core.communication.verbal_tics.join(", ")}` : ""}

## Behavioral Principles
${core.principles.map((p: string) => `- ${p}`).join("\n")}

## Relationship State
Stage: ${characterContext.relationship.stage}
Trust Level: ${characterContext.relationship.metrics.trust_level}/100
Familiarity: ${characterContext.relationship.metrics.familiarity}/100
Emotional Bond: ${characterContext.relationship.metrics.emotional_bond}/100
Interaction Count: ${characterContext.relationship.metrics.interaction_count}

## Character Memory
${characterContext.memories.learned_preferences.likes.length > 0 ? `Likes: ${characterContext.memories.learned_preferences.likes.join(", ")}` : ""}
${characterContext.memories.learned_preferences.dislikes.length > 0 ? `Dislikes: ${characterContext.memories.learned_preferences.dislikes.join(", ")}` : ""}
${characterContext.memories.context_knowledge.special_topics.length > 0 ? `Special Topics: ${characterContext.memories.context_knowledge.special_topics.join(", ")}` : ""}
`;

        usesMem0Character = true;
        logger.debug(
          `✅ [PromptBuilder] Mem0Character context built - tokens: ${characterContext.token_usage.total}`
        );
      }
    } catch (error) {
      // Silently fallback to standard character info (expected behavior when Mem0Character is unavailable)
      logger.debug("⚠️ [PromptBuilder] Mem0Character not available, using standard character info");
    }

    // フォールバック: 標準のキャラクター情報構築
    if (!usesMem0Character) {
      sections.character = `## Basic Information
Name: ${processedCharacter.name}
${processedCharacter.age ? `Age: ${processedCharacter.age}` : ""}
${
  processedCharacter.occupation
    ? `Occupation: ${processedCharacter.occupation}`
    : ""
}
${
  processedCharacter.catchphrase
    ? `Catchphrase: "${processedCharacter.catchphrase}"`
    : ""
}

## Personality & Traits
${
  processedCharacter.personality
    ? `Personality: ${processedCharacter.personality}`
    : ""
}
${
  processedCharacter.external_personality
    ? `External: ${processedCharacter.external_personality}`
    : ""
}
${
  processedCharacter.internal_personality
    ? `Internal: ${processedCharacter.internal_personality}`
    : ""
}
${
  processedCharacter.strengths &&
  Array.isArray(processedCharacter.strengths) &&
  processedCharacter.strengths.length > 0
    ? `Strengths: ${processedCharacter.strengths.join(", ")}`
    : ""
}
${
  processedCharacter.weaknesses &&
  Array.isArray(processedCharacter.weaknesses) &&
  processedCharacter.weaknesses.length > 0
    ? `Weaknesses: ${processedCharacter.weaknesses.join(", ")}`
    : ""
}

## Preferences & Style
${
  processedCharacter.likes && processedCharacter.likes.length > 0
    ? `Likes: ${processedCharacter.likes.join(", ")}`
    : ""
}
${
  processedCharacter.dislikes && processedCharacter.dislikes.length > 0
    ? `Dislikes: ${processedCharacter.dislikes.join(", ")}`
    : ""
}
${
  processedCharacter.hobbies && processedCharacter.hobbies.length > 0
    ? `Hobbies: ${processedCharacter.hobbies.join(", ")}`
    : ""
}

## Appearance
${
  processedCharacter.appearance
    ? `Appearance: ${processedCharacter.appearance}`
    : ""
}

## Communication Style
${
  processedCharacter.speaking_style
    ? `Speaking Style: ${processedCharacter.speaking_style}`
    : ""
}
${
  processedCharacter.first_person
    ? `First Person: ${processedCharacter.first_person}`
    : ""
}
${
  processedCharacter.second_person
    ? `Second Person: ${processedCharacter.second_person}`
    : ""
}
${
  processedCharacter.verbal_tics && processedCharacter.verbal_tics.length > 0
    ? `Verbal Tics: ${processedCharacter.verbal_tics.join(", ")}`
    : ""
}

${
  processedCharacter.nsfw_profile
    ? `## NSFW Profile
${
  processedCharacter.nsfw_profile.persona
    ? `Persona: ${processedCharacter.nsfw_profile.persona}`
    : ""
}
${
  processedCharacter.nsfw_profile.libido_level
    ? `Libido Level: ${processedCharacter.nsfw_profile.libido_level}`
    : ""
}
${
  processedCharacter.nsfw_profile.situation
    ? `Situation: ${processedCharacter.nsfw_profile.situation}`
    : ""
}
${
  processedCharacter.nsfw_profile.mental_state
    ? `Mental State: ${processedCharacter.nsfw_profile.mental_state}`
    : ""
}
${
  processedCharacter.nsfw_profile.kinks &&
  processedCharacter.nsfw_profile.kinks.length > 0
    ? `Kinks: ${processedCharacter.nsfw_profile.kinks.join(", ")}`
    : ""
}`
    : ""
}

## Context
${
  processedCharacter.background
    ? `Background: ${processedCharacter.background}`
    : ""
}
${
  processedCharacter.scenario
    ? `Current Scenario: ${processedCharacter.scenario}`
    : ""
}`;
    }

    // 🚨 ペルソナ情報セクション - 簡略化厳禁、全フィールド必須
    // PROMPT_VERIFICATION_GUIDE.md 223-234行目準拠
    if (user) {
      sections.persona = `Name: ${user.name || userName}
${user.role ? `Role: ${user.role}` : ""}
${user.other_settings ? `Other Settings: ${user.other_settings}` : ""}`;
    }

    // 軽量トラッカー情報セクションを構築（キャラクター設定強化版）
    // 引数として渡されたtrackerManagerを優先的に使用
    const effectiveTrackerManager =
      trackerManager ||
      (character?.id && systemSettings.trackerManagers?.get(character.id));

    logger.debug("🔍 [PromptBuilder] Checking tracker managers:", {
      characterId: character?.id,
      hasPassedTrackerManager: !!trackerManager,
      hasStoreTrackerManager:
        character?.id && systemSettings.trackerManagers?.has(character.id),
      usingTrackerManager: !!effectiveTrackerManager,
    });

    if (effectiveTrackerManager) {
      logger.debug(
        "✅ [PromptBuilder] Found tracker manager for character:",
        character.id,
        "Manager type:",
        effectiveTrackerManager.constructor.name
      );
      try {
        // まず詳細版を試行、失敗したら軽量版にフォールバック
        let trackerInfo = character?.id
          ? effectiveTrackerManager.getDetailedTrackersForPrompt?.(character.id)
          : null;

        logger.debug("🔍 [PromptBuilder] getDetailedTrackersForPrompt result:", {
          hasMethod: !!effectiveTrackerManager.getDetailedTrackersForPrompt,
          result: trackerInfo ? trackerInfo.substring(0, 100) + "..." : "null",
        });

        if (!trackerInfo) {
          trackerInfo = character?.id
            ? this.getEssentialTrackerInfo(
                effectiveTrackerManager,
                character.id
              )
            : null;
          logger.debug("🔍 [PromptBuilder] getEssentialTrackerInfo result:", {
            result: trackerInfo
              ? trackerInfo.substring(0, 100) + "..."
              : "null",
          });
        }

        logger.debug("📊 [PromptBuilder] Final tracker info:", {
          hasTrackerInfo: !!trackerInfo,
          trackerInfoLength: trackerInfo?.length || 0,
        });

        if (trackerInfo) {
          sections.relationship = trackerInfo;
        }
      } catch (error) {
        logger.warn("Failed to get tracker info:", error);
      }
    } else {
      logger.warn(
        "❌ [PromptBuilder] No tracker manager found for character:",
        character?.id
      );
    }

    // 🚨 メモリーカード情報を基本プロンプトに即座に追加
    // Memory cards are now passed from the caller to avoid duplication
    if (memoryCards && memoryCards.length > 0) {
      const store = useAppStore.getState();
      const maxRelevantMemories =
        store.chat?.memory_limits?.max_relevant_memories || 5;

      logger.debug("📌 [PromptBuilder] Using provided memory cards:", {
        count: memoryCards.length,
        cards: memoryCards.slice(0, 3).map((card) => ({
          id: card.id,
          title: card.title,
          is_pinned: card.is_pinned,
        })),
      });

      let memoryContent = "";
      memoryCards.slice(0, maxRelevantMemories).forEach((card) => {
        memoryContent += `[${card.category || "general"}] ${card.title}: ${
          card.summary
        }\n`;
        if (card.keywords && card.keywords.length > 0) {
          memoryContent += `Keywords: ${card.keywords.join(", ")}\n`;
        }
      });
      sections.memory = memoryContent.trim() || "";
    } else {
      sections.memory = "";
      logger.debug("📌 [PromptBuilder] No memory cards provided");
    }

    // 入力セクションを構築
    sections.input = `{{user}}: ${replaceVariables(userInput, variableContext)}
{{char}}:`;

    // テンプレートを使用してプロンプトを構築
    let prompt =
      `AI={{char}}, User={{user}}

` + this.buildPromptTemplate(sections);

    // 最後にプロンプト全体に変数置換を適用
    prompt = replaceVariables(prompt, variableContext);

    // 🔍 デバッグ: 各セクションの内容を確認
    logger.debug("📝 [buildBasicInfo] Section contents:", {
      systemLength: sections.system?.length || 0,
      jailbreakLength: sections.jailbreak?.length || 0,
      characterLength: sections.character?.length || 0,
      personaLength: sections.persona?.length || 0,
      relationshipLength: sections.relationship?.length || 0,
      memoryLength: sections.memory?.length || 0,
      inputLength: sections.input?.length || 0,
    });

    // プロンプト構築結果の詳細ログ
    logger.debug("📝 [PromptBuilder] Final prompt sections:", {
      hasSystemInstructions: !!sections.system,
      hasJailbreak: !!sections.jailbreak,
      hasCharacterInfo: !!sections.character,
      hasPersonaInfo: !!sections.persona,
      hasRelationship: !!sections.relationship,
      hasMemory: !!sections.memory,
      hasInput: !!sections.input,
      totalSections: Object.keys(sections).length,
      promptLength: prompt.length,
    });

    // 開発環境でプロンプト全文をログ出力
    if (
      typeof process !== "undefined" &&
      process.env?.NODE_ENV === "development"
    ) {
      logger.debug("📝 === Full Prompt (Basic) ===");
      logger.debug(prompt);
      logger.debug("📝 === End of Prompt ===");
    }

    return prompt;
  }

  /**
   * 重量版: 履歴情報のみを生成（基本情報は含まない）
   */
  private async getHistoryInfo(
    session: UnifiedChatSession,
    trackerManager?: TrackerManager
  ): Promise<string> {
    logger.debug(
      "🔍 [getHistoryInfo] Called with session:",
      session.id,
      "trackerManager:",
      !!trackerManager
    );
    try {
      // ConversationManagerを使って履歴情報のみを取得
      const conversationManager = await this.getOrCreateManager(
        session.id,
        session.messages,
        trackerManager
      );

      // 履歴情報のみを構築（基本情報は含まない）
      let historyPrompt = "";

      // 会話履歴 - 統一されたHistoryManagerを使用
      const store = useAppStore.getState();
      const maxContextMessages =
        store.chat?.memory_limits?.max_context_messages || 40;
      const recentMessages = ConversationHistoryManager.getHistoryForNormalMode(
        session,
        maxContextMessages
      );
      if (recentMessages.length > 0) {
        historyPrompt += `## Recent Conversation\n`;
        recentMessages.forEach((msg) => {
          const role = msg.role === "user" ? "{{user}}" : "{{char}}";
          historyPrompt += `${role}: ${msg.content}\n`;
        });
        historyPrompt += "\n";
      }

      // セッション要約（あれば）
      if (conversationManager["sessionSummary"]) {
        historyPrompt += `## Session Summary\n${conversationManager["sessionSummary"]}\n\n`;
      }

      // 🚨 メモリーカード情報を追加 - 欠落していた重要な情報
      try {
        logger.debug("🔍 [getHistoryInfo] Getting memory cards...");
        // メモリーカード情報は基本プロンプトで処理済みのため、ここではスキップ
        // プライベートメソッドの呼び出しを一時的に無効化
      } catch (error) {
        logger.warn("Failed to get memory cards:", error);
      }

      return historyPrompt;
    } catch (error) {
      logger.warn("Failed to get history info:", error);
      return "";
    }
  }

  /**
   * 軽量トラッカー情報取得 - 重要な関係値のみ抽出
   */
  private getEssentialTrackerInfo(
    trackerManager: TrackerManager,
    characterId: string
  ): string | null {
    try {
      const trackers = trackerManager.getTrackersForPrompt(characterId);
      if (!trackers) return null;

      // 重要な関係性トラッカーのみ抽出（パフォーマンス優先）
      const essentialPatterns = [
        /好感度|affection|liking/i,
        /信頼度|trust/i,
        /親密度|intimacy/i,
        /恋愛度|romance/i,
        /友情|friendship/i,
        /mood|気分|機嫌/i,
      ];

      const lines = trackers.split("\n");
      const essentialLines = lines.filter((line) =>
        essentialPatterns.some((pattern) => pattern.test(line))
      );

      return essentialLines.length > 0 ? essentialLines.join("\n") : null;
    } catch (error) {
      logger.warn("Error getting essential tracker info:", error);
      return null;
    }
  }

  public async buildPrompt(
    session: UnifiedChatSession,
    userInput: string,
    trackerManager?: TrackerManager
  ): Promise<string> {
    const startTime = performance.now();

    // 強制的にログを出力（ターミナルで確認可能）
    logger.debug("🔥🔥🔥 [PromptBuilder] buildPrompt called 🔥🔥🔥");
    logger.debug("Session ID:", session.id);
    logger.debug("User Input:", userInput.substring(0, 50) + "...");
    logger.debug("Character:", session.participants.characters[0]?.name);
    logger.debug("User:", session.participants.user?.name);
    logger.debug("Has Tracker Manager:", !!trackerManager);

    try {
      // セッションデータの厳密な型チェック
      this.validateSessionData(session);

      // 最適化されたConversationManager取得
      const conversationManager = await this.getOrCreateManager(
        session.id,
        session.messages,
        trackerManager
      );

      // システム設定を取得（キャッシュしたいがリアクティブなため毎回取得）
      const systemSettings = this.getSystemSettings();

      const promptStartTime = performance.now();
      // ConversationManagerを使ってプロンプトを生成
      const userPersona = session.participants.user;
      logger.debug(
        "👤 [PromptBuilder] User persona being passed:",
        userPersona
          ? `${userPersona.name} (${userPersona.role})`
          : "null/undefined"
      );

      // 🚨 修正: buildPromptProgressiveを使用（ConversationManager.generatePromptは廃止）
      const { basePrompt, enhancePrompt } = await this.buildPromptProgressive(
        session,
        userInput,
        trackerManager
      );

      // 拡張プロンプトを取得
      const prompt = await enhancePrompt();
      const promptDuration = performance.now() - promptStartTime;

      const totalDuration = performance.now() - startTime;

      // パフォーマンスログ（長いプロンプトは省略）
      const logLevel = totalDuration > 500 ? "warn" : "debug";
      logger[logLevel](
        `📊 Prompt built in ${totalDuration.toFixed(1)}ms ` +
          `(session: ${session.id}, messages: ${session.messages.length}, ` +
          `prompt: ${(prompt.length / 1000).toFixed(1)}k chars, ` +
          `generation: ${promptDuration.toFixed(1)}ms)`
      );

      // 開発環境でプロンプト全文をログ出力
      if (
        typeof process !== "undefined" &&
        process.env?.NODE_ENV === "development"
      ) {
        logger.debug("📝 === Full System Prompt ===");
        logger.debug(prompt);
        logger.debug("📝 === End of Prompt ===");
      }

      return prompt;
    } catch (error) {
      const totalDuration = performance.now() - startTime;
      logger.error(
        `⚠️ Prompt building failed after ${totalDuration.toFixed(1)}ms:`,
        error
      );
      throw error;
    }
  }
}

export const promptBuilderService = new PromptBuilderService();

// バックグラウンドタスクキュー
class BackgroundTaskQueue {
  private tasks: Array<() => Promise<unknown>> = [];
  private processing = false;

  enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.tasks.push(async () => {
        try {
          const result = await task();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      if (!this.processing) {
        this.process();
      }
    });
  }

  private async process() {
    this.processing = true;

    while (this.tasks.length > 0) {
      const task = this.tasks.shift()!;
      try {
        await task();
      } catch (error) {
        logger.error("Background task failed:", error);
      }
    }

    this.processing = false;
  }
}

export const backgroundTaskQueue = new BackgroundTaskQueue();
