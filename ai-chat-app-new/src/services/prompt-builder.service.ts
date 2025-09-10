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
      console.log(
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
      console.log(
        `🆕 Creating ConversationManager for session: ${sessionId} (${messages.length} messages)`
      );

      const importantMessages = messages.filter(
        (msg) => msg.memory.importance.score >= 0.3 || msg.role === "user"
      );

      manager = new ConversationManager(importantMessages, trackerManager);
      PromptBuilderService.managerCache.set(sessionId, manager);
      PromptBuilderService.lastProcessedCount.set(sessionId, messages.length);

      const duration = performance.now() - startTime;
      console.log(`✅ Manager created in ${duration.toFixed(1)}ms`);
      return manager;
    }

    // 増分更新: 新しいメッセージのみ処理
    const newMessages = messages.slice(lastProcessed);
    if (newMessages.length > 0) {
      console.log(`🔄 Processing ${newMessages.length} new messages`);

      // 重要なメッセージのみフィルタリング
      const importantMessages = newMessages.filter(
        (msg) => msg.memory.importance.score >= 0.3 || msg.role === "user"
      );

      if (importantMessages.length > 0) {
        // バッチで新メッセージを追加（大幅なパフォーマンス向上）
        await manager.importMessages([
          ...manager.getAllMessages(),
          ...importantMessages,
        ]);
      }

      // 処理済みメッセージ数を更新
      PromptBuilderService.lastProcessedCount.set(sessionId, messages.length);
    }

    const duration = performance.now() - startTime;
    if (duration > 100) {
      console.warn(`⚠️ Slow manager operation: ${duration.toFixed(1)}ms`);
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
        console.log(
          `🧹 Cleaning up ConversationManager cache for session: ${sessionId}`
        );
        PromptBuilderService.managerCache.delete(sessionId);
        PromptBuilderService.lastProcessedCount.delete(sessionId);
      }
    }

    const cleanedCount = beforeSize - PromptBuilderService.managerCache.size;
    if (cleanedCount > 0) {
      console.log(
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
    trackerManager?: TrackerManager
  ): Promise<{ basePrompt: string; enhancePrompt: () => Promise<string> }> {
    const startTime = performance.now();

    // セッションデータの厳密な型チェック
    this.validateSessionData(session);

    // 1. 最小限のベースプロンプトを即座に構築 (50-100ms)
    const character = session.participants.characters[0];
    const user = session.participants.user;

    // バリデーション済みなので、安全にアクセス可能

    // 軽量版: 基本情報のみ（重複しない内容）
    const basePrompt = this.buildBasicInfo(character, user, userInput);

    // 2. 拡張プロンプト関数（バックグラウンド実行用）
    const enhancePrompt = async (): Promise<string> => {
      try {
        // 重量版: 履歴情報のみ（基本情報は含まない）
        const historyInfo = await this.getHistoryInfo(session, trackerManager);
        // 基本情報 + 履歴情報を結合（重複なし）
        return basePrompt + "\n\n" + historyInfo;
      } catch (error) {
        console.warn("Enhanced prompt build failed, using base prompt:", error);
        // 拡張プロンプト構築に失敗した場合でも、ベースプロンプトで継続
        return basePrompt;
      }
    };

    const duration = performance.now() - startTime;
    console.log(`⚡ Progressive base prompt built in ${duration.toFixed(1)}ms`);

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
  private buildBasicInfo(
    character: Character,
    user: Persona,
    userInput: string
  ): string {
    // 🎯 システム設定を取得（永続化された設定を反映）
    const systemSettings = this.getSystemSettings();

    if (!character) {
      console.error(
        "🚨 CRITICAL: buildBasicInfo received undefined character!"
      );
      return "ERROR: No character information available";
    }

    // 変数置換コンテキストを作成
    const variableContext = { user, character };

    console.log("👤 [PromptBuilder] User persona info:", {
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

    // 🚨 System Instructions - 絶対にコメントアウト・削除禁止
    // DEFAULT_SYSTEM_PROMPTを基本として使用（重複排除）
    let systemInstructions = DEFAULT_SYSTEM_PROMPT;

    // キャラクター固有のシステムプロンプトを追加
    if (
      processedCharacter.system_prompt &&
      processedCharacter.system_prompt.trim() !== ""
    ) {
      systemInstructions += `\n\n## キャラクター固有の指示\n${processedCharacter.system_prompt}`;
    }

    // カスタムシステムプロンプトが有効で内容がある場合は追加
    if (
      systemSettings.enableSystemPrompt &&
      systemSettings.systemPrompts?.system &&
      systemSettings.systemPrompts.system.trim() !== ""
    ) {
      systemInstructions += `\n\n## 追加指示\n${systemSettings.systemPrompts.system}`;
    }

    sections.system = systemInstructions;

    // 🎯 Jailbreak Prompt (設定で有効な場合)
    if (
      systemSettings.enableJailbreakPrompt &&
      systemSettings.systemPrompts?.jailbreak
    ) {
      sections.jailbreak = systemSettings.systemPrompts.jailbreak;
    }

    // キャラクター情報セクションを構築
    sections.character = `
## Basic Information
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
}
</character_information>`;

    // 🚨 ペルソナ情報セクション - 簡略化厳禁、全フィールド必須
    // PROMPT_VERIFICATION_GUIDE.md 223-234行目準拠
    if (user) {
      sections.persona = `Name: ${user.name || userName}
${user.role ? `Role: ${user.role}` : ""}
${user.other_settings ? `Other Settings: ${user.other_settings}` : ""}`;
    }

    // 軽量トラッカー情報セクションを構築（キャラクター設定強化版）
    console.log("🔍 [PromptBuilder] Checking tracker managers:", {
      characterId: character?.id,
      trackerManagers: systemSettings.trackerManagers,
      trackerManagersSize: systemSettings.trackerManagers?.size || 0,
      hasTrackerManager:
        character?.id && systemSettings.trackerManagers?.has(character.id),
    });

    const trackerManager =
      character?.id && systemSettings.trackerManagers?.get(character.id);
    if (trackerManager) {
      console.log(
        "✅ [PromptBuilder] Found tracker manager for character:",
        character.id
      );
      try {
        // まず詳細版を試行、失敗したら軽量版にフォールバック
        let trackerInfo = character?.id
          ? trackerManager.getDetailedTrackersForPrompt?.(character.id)
          : null;
        if (!trackerInfo) {
          trackerInfo = character?.id
            ? this.getEssentialTrackerInfo(trackerManager, character.id)
            : null;
        }

        console.log("📊 [PromptBuilder] Tracker info:", {
          hasTrackerInfo: !!trackerInfo,
          trackerInfoLength: trackerInfo?.length || 0,
        });

        if (trackerInfo) {
          sections.relationship = `<relationship_state>
${trackerInfo}
</relationship_state>`;
        }
      } catch (error) {
        console.warn("Failed to get tracker info:", error);
      }
    } else {
      console.warn(
        "❌ [PromptBuilder] No tracker manager found for character:",
        character?.id
      );
    }

    // 🚨 メモリーカード情報を基本プロンプトに即座に追加
    // 🔧 修正: プレースホルダーではなく実際のメモリーカードを取得
    try {
      const store = useAppStore.getState();
      const memoryCards = store.memory_cards || new Map();
      const relevantCards: any[] = [];

      console.log("🧠 [PromptBuilder] Checking memory cards:", {
        memoryCardsSize: memoryCards.size,
        characterId: character?.id,
        memoryCards: Array.from(memoryCards.values()).map((card) => ({
          id: card.id,
          is_pinned: card.is_pinned,
          character_id: card.character_id,
          title: card.title,
        })),
      });

      // ピン留めされたメモリーカードを取得
      for (const card of memoryCards.values()) {
        if (card.is_pinned || card.character_id === character?.id) {
          relevantCards.push(card);
        }
      }

      console.log("📌 [PromptBuilder] Relevant memory cards:", {
        count: relevantCards.length,
        cards: relevantCards.map((card) => ({
          id: card.id,
          title: card.title,
          is_pinned: card.is_pinned,
        })),
      });

      if (relevantCards.length > 0) {
        let memoryContent = "";
        relevantCards.slice(0, 5).forEach((card) => {
          // 最大5件まで
          memoryContent += `[${card.category || "general"}] ${card.title}: ${
            card.summary
          }\n`;
          if (card.keywords && card.keywords.length > 0) {
            memoryContent += `Keywords: ${card.keywords.join(", ")}\n`;
          }
        });
        sections.memory = memoryContent.trim()
          ? `<memory_context>\n${memoryContent}</memory_context>`
          : "";
      } else {
        sections.memory = "";
      }
    } catch (error) {
      console.warn("Failed to get memory info in basic prompt:", error);
      sections.memory = "";
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

    // プロンプト構築結果の詳細ログ
    console.log("📝 [PromptBuilder] Final prompt sections:", {
      hasSystemInstructions: !!sections.system_instructions,
      hasCharacterInfo: !!sections.character_info,
      hasPersonaInfo: !!sections.persona_info,
      hasMemorySystem: !!sections.memory_system,
      hasRelationship: !!sections.relationship,
      hasMemoryCards: !!sections.memory_cards,
      hasContext: !!sections.context,
      hasCurrentInteraction: !!sections.current_interaction,
      totalSections: Object.keys(sections).length,
      promptLength: prompt.length,
    });

    // 開発環境でプロンプト全文をログ出力
    if (
      typeof process !== "undefined" &&
      process.env?.NODE_ENV === "development"
    ) {
      console.log("📝 === Full Prompt (Basic) ===");
      console.log(prompt);
      console.log("📝 === End of Prompt ===");
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
    console.log(
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

      // 会話履歴 - 設定値を使用
      const store = useAppStore.getState();
      const maxContextMessages =
        store.chat?.memory_limits?.max_context_messages || 20;
      const recentMessages = session.messages.slice(-maxContextMessages);
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
        console.log("🔍 [getHistoryInfo] Getting memory cards...");
        // メモリーカード情報は基本プロンプトで処理済みのため、ここではスキップ
        // プライベートメソッドの呼び出しを一時的に無効化
      } catch (error) {
        console.warn("Failed to get memory cards:", error);
      }

      return historyPrompt;
    } catch (error) {
      console.warn("Failed to get history info:", error);
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
      console.warn("Error getting essential tracker info:", error);
      return null;
    }
  }

  public async buildPrompt(
    session: UnifiedChatSession,
    userInput: string,
    trackerManager?: TrackerManager
  ): Promise<string> {
    const startTime = performance.now();

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
      console.log(
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
      const logLevel = totalDuration > 500 ? "warn" : "log";
      console[logLevel](
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
        console.log("📝 === Full System Prompt ===");
        console.log(prompt);
        console.log("📝 === End of Prompt ===");
      }

      return prompt;
    } catch (error) {
      const totalDuration = performance.now() - startTime;
      console.error(
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
        console.error("Background task failed:", error);
      }
    }

    this.processing = false;
  }
}

export const backgroundTaskQueue = new BackgroundTaskQueue();
