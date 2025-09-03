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

    // 安全なメッセージ配列に強制変換
    const safeMessages: UnifiedMessage[] = Array.isArray(messages)
      ? messages
      : [];

    let manager = PromptBuilderService.managerCache.get(sessionId);
    const lastProcessed =
      PromptBuilderService.lastProcessedCount.get(sessionId) || 0;

    if (!manager) {
      // 初期化: メッセージ数を制限（最新20件 + 重要なもの）
      console.log(
        `🆕 Creating ConversationManager for session: ${sessionId} (${safeMessages.length} messages)`
      );

      // パフォーマンス最適化: 最新20件を取得し、それ以前は重要なものだけ
      const recentMessages = safeMessages.slice(-20);
      const olderImportantMessages = safeMessages
        .slice(0, -20)
        .filter(
          (msg) => msg.memory?.importance?.score >= 0.7 || msg.memory?.is_pinned
        )
        .slice(-10); // 古い重要メッセージも最大10件に制限

      const messagesToProcess = [...olderImportantMessages, ...recentMessages];

      manager = new ConversationManager(messagesToProcess, trackerManager);
      PromptBuilderService.managerCache.set(sessionId, manager);
      PromptBuilderService.lastProcessedCount.set(
        sessionId,
        safeMessages.length
      );

      const duration = performance.now() - startTime;
      console.log(
        `✅ Manager created in ${duration.toFixed(1)}ms (processed ${
          messagesToProcess.length
        } of ${safeMessages.length} messages)`
      );
      return manager;
    }

    // 増分更新: 新しいメッセージのみ処理
    const newMessages = safeMessages.slice(lastProcessed);
    if (newMessages.length > 0) {
      console.log(`🔄 Processing ${newMessages.length} new messages`);

      // 重要なメッセージのみフィルタリング
      const importantMessages = newMessages.filter(
        (msg) => msg.memory?.importance?.score >= 0.5 || msg.role === "user"
      );

      if (importantMessages.length > 0) {
        // メッセージ数が多すぎる場合は古いものを削除
        const currentMessages = manager.getAllMessages();
        if (currentMessages.length + importantMessages.length > 30) {
          // 古い非重要メッセージを削除
          const trimmedMessages = [
            ...currentMessages
              .filter(
                (msg) =>
                  msg.memory?.importance?.score >= 0.7 || msg.memory?.is_pinned
              )
              .slice(0, 10),
            ...currentMessages.slice(-15),
            ...importantMessages,
          ];
          await manager.importMessages(trimmedMessages);
        } else {
          await manager.importMessages([
            ...currentMessages,
            ...importantMessages,
          ]);
        }
      }

      // 処理済みメッセージ数を更新
      PromptBuilderService.lastProcessedCount.set(
        sessionId,
        safeMessages.length
      );
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
   * プログレッシブプロンプト構築 - UIをブロックしない高速版
   */
  public async buildPromptProgressive(
    session: UnifiedChatSession,
    userInput: string,
    trackerManager?: TrackerManager
  ): Promise<{ basePrompt: string; enhancePrompt: () => Promise<string> }> {
    const startTime = performance.now();

    // 1. 最小限のベースプロンプトを即座に構築 (50-100ms)
    const character = (session as any).participants?.characters?.[0] ?? (session as any).character;
    const user = (session as any).participants?.user ?? (session as any).persona;

    // 🚨 緊急デバッグ：キャラクター情報の確認
    console.log(
      "🚨 [buildPromptProgressive] Debug - Character:",
      character
        ? {
            id: character.id,
            name: character.name,
            personality: character.personality?.substring(0, 50) + "...",
          }
        : "UNDEFINED"
    );
    console.log(
      "🚨 [buildPromptProgressive] Debug - User:",
      user
        ? {
            id: user.id,
            name: user.name,
            description: user.description?.substring(0, 50) + "...",
          }
        : "UNDEFINED"
    );

    if (!character) {
      console.error(
        "🚨 CRITICAL: Character is undefined in buildPromptProgressive!"
      );
    }
    if (!user) {
      console.error(
        "🚨 CRITICAL: User is undefined in buildPromptProgressive!"
      );
    }

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
   * 軽量版: 基本情報のみを生成（重複しない）
   */
  private buildBasicInfo(
    character: Character,
    user: Persona,
    userInput: string
  ): string {
    // 🎯 システム設定を取得（永続化された設定を反映）
    const store = useAppStore.getState();
    const systemSettings = {
      systemPrompts: store.systemPrompts,
      enableSystemPrompt: store.enableSystemPrompt,
      enableJailbreakPrompt: store.enableJailbreakPrompt,
      promptMode: store.promptMode || "both", // Get prompt mode, default to 'both' for backward compatibility
    };

    if (!character) {
      console.error(
        "🚨 CRITICAL: buildBasicInfo received undefined character!"
      );
      return "ERROR: No character information available";
    }

    // 変数置換コンテキストを作成
    const variableContext = { user, character };

    // キャラクター情報に変数置換を適用
    const processedCharacter = replaceVariablesInCharacter(
      character,
      variableContext
    );

    const userName = user?.name || "ユーザー";

    let prompt = `AI={{char}}, User={{user}}

`;

    // 🎯 Jailbreak Prompt (設定で有効な場合)
    if (
      systemSettings.enableJailbreakPrompt &&
      systemSettings.systemPrompts?.jailbreak
    ) {
      prompt += `<jailbreak>
${systemSettings.systemPrompts.jailbreak}
</jailbreak>

`;
    }

    // 🎯 System Instructions - Select based on prompt mode
    let systemInstructions = "";

    // デバッグログ：プロンプトモードの確認
    console.log("🎯 [PromptBuilder] Prompt Mode:", systemSettings.promptMode);
    console.log(
      "🎯 [PromptBuilder] Enable System Prompt:",
      systemSettings.enableSystemPrompt
    );
    console.log(
      "🎯 [PromptBuilder] Custom System Prompt exists:",
      !!systemSettings.systemPrompts?.system
    );

    switch (systemSettings.promptMode) {
      case "default":
        // Use only default system prompt
        systemInstructions = DEFAULT_SYSTEM_PROMPT;
        console.log("📝 [PromptBuilder] Using DEFAULT prompt only");
        break;

      case "custom":
        // Use only custom system prompt if available
        if (
          systemSettings.enableSystemPrompt &&
          systemSettings.systemPrompts?.system &&
          systemSettings.systemPrompts.system.trim() !== ""
        ) {
          systemInstructions = systemSettings.systemPrompts.system;
          console.log("📝 [PromptBuilder] Using CUSTOM prompt only");
        } else {
          // Fallback to default if custom is empty
          systemInstructions = DEFAULT_SYSTEM_PROMPT;
          console.log(
            "📝 [PromptBuilder] Custom prompt empty, falling back to DEFAULT"
          );
        }
        break;

      case "both":
      default:
        // Use both default and custom (backward compatibility)
        systemInstructions = DEFAULT_SYSTEM_PROMPT;
        if (
          systemSettings.enableSystemPrompt &&
          systemSettings.systemPrompts?.system &&
          systemSettings.systemPrompts.system.trim() !== ""
        ) {
          systemInstructions +=
            "\n\n## CUSTOM INSTRUCTIONS\n" +
            systemSettings.systemPrompts.system;
          console.log(
            "📝 [PromptBuilder] Using BOTH default and custom prompts"
          );
        } else {
          console.log(
            "📝 [PromptBuilder] Using DEFAULT prompt only (custom not available)"
          );
        }
        break;
    }

    prompt += `<system_instructions>
${systemInstructions}
</system_instructions>

<character_information>
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
${
  processedCharacter.appearance
    ? `Appearance: ${processedCharacter.appearance}`
    : ""
}
${
  processedCharacter.tags && processedCharacter.tags.length > 0
    ? `Tags: ${processedCharacter.tags.join(", ")}`
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
  processedCharacter.nsfw_profile.kinks &&
  processedCharacter.nsfw_profile.kinks.length > 0
    ? `Kinks/Preferences: ${processedCharacter.nsfw_profile.kinks.join(", ")}`
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
${
  processedCharacter.first_message
    ? `First Message: "${processedCharacter.first_message}"`
    : ""
}
</character_information>`;

    // ペルソナ情報を追加（詳細なフォーマット）
    if (user) {
      prompt += `

<persona_information>
Name: ${user.name || userName}
${user.description ? `Description: ${user.description}` : ""}
${user.role ? `Role: ${user.role}` : ""}
${
  user.traits && user.traits.length > 0
    ? `
Traits: ${user.traits.join(", ")}`
    : ""
}
${
  user.likes && user.likes.length > 0
    ? `
Likes: ${user.likes.join(", ")}`
    : ""
}
${
  user.dislikes && user.dislikes.length > 0
    ? `
Dislikes: ${user.dislikes.join(", ")}`
    : ""
}
${
  user.speaking_style
    ? `
Speaking Style: ${user.speaking_style}`
    : ""
}
${
  user.personality
    ? `
Personality: ${user.personality}`
    : ""
}
${
  user.background
    ? `
Background: ${user.background}`
    : ""
}
${
  user.other_settings
    ? `
Other Settings: ${user.other_settings}`
    : ""
}
</persona_information>`;
    }

    // 軽量トラッカー情報（キャラクター設定強化版）
    const trackerManager =
      character?.id && store.trackerManagers?.get(character.id);
    if (trackerManager) {
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

        if (trackerInfo) {
          prompt += `

<relationship_state>
${trackerInfo}
</relationship_state>`;
        }
      } catch (error) {
        console.warn("Failed to get tracker info:", error);
      }
    }

    prompt += `

## Current Input
{{user}}: ${replaceVariables(userInput, variableContext)}
{{char}}:`;

    // 最後にプロンプト全体に変数置換を適用
    prompt = replaceVariables(prompt, variableContext);

    return prompt;
  }

  /**
   * 軽量モデル用: シンプルなプロンプトを生成（パフォーマンス最適化）
   */
  public async buildSimplePrompt(
    session: UnifiedChatSession,
    userInput: string
  ): Promise<string> {
    const character = (session as any).participants?.characters?.[0] ?? (session as any).character;
    const user = (session as any).participants?.user ?? (session as any).persona;

    // グループチャットと同様のコンパクトなプロンプトを生成
    let prompt = `You are ${character?.name || "AI Assistant"}.
${
  character?.personality
    ? `Personality: ${character.personality.substring(0, 200)}`
    : ""
}
${
  character?.speaking_style
    ? `Speaking style: ${character.speaking_style.substring(0, 150)}`
    : ""
}

User: ${user?.name || "User"}
${user?.description ? `About user: ${user.description.substring(0, 100)}` : ""}

Recent conversation:
`;

    // 最新5件のメッセージのみを含める（軽量化）
    const allMsgs = Array.isArray(session.messages) ? session.messages : [];
    const recentMessages = allMsgs.slice(-5);
    for (const msg of recentMessages) {
      if (msg.role === "user" || msg.role === "assistant") {
        const speaker =
          msg.role === "user"
            ? user?.name || "User"
            : character?.name || "Assistant";
        prompt += `${speaker}: ${String(msg.content).substring(0, 200)}\n`;
      }
    }

    prompt += `\nUser: ${userInput}\n${character?.name || "Assistant"}:`;

    return prompt;
  }

  /**
   * 重量版: 履歴情報のみを生成（基本情報は含まない）
   */
  private async getHistoryInfo(
    session: UnifiedChatSession,
    trackerManager?: TrackerManager
  ): Promise<string> {
    try {
      // ConversationManagerを使って履歴情報のみを取得
      const allMsgs = Array.isArray(session.messages) ? session.messages : [];
      const conversationManager = await this.getOrCreateManager(
        session.id,
        allMsgs,
        trackerManager
      );

      // 履歴情報のみを構築（基本情報は含まない）
      let historyPrompt = "";

      // 会話履歴
      const recentMessages = allMsgs.slice(-5);
      if (recentMessages.length > 0) {
        historyPrompt += `## Recent Conversation\n`;
        recentMessages.forEach((msg) => {
          const role = msg.role === "user" ? "あなた" : "AI";
          historyPrompt += `${role}: ${msg.content}\n`;
        });
        historyPrompt += "\n";
      }

      // セッション要約（あれば）
      if (conversationManager["sessionSummary"]) {
        historyPrompt += `## Session Summary\n${conversationManager["sessionSummary"]}\n\n`;
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
      // 最適化されたConversationManager取得
      const allMsgs = Array.isArray(session.messages) ? session.messages : [];
      const conversationManager = await this.getOrCreateManager(
        session.id,
        allMsgs,
        trackerManager
      );

      // システム設定を取得（キャッシュしたいがリアクティブなため毎回取得）
      const store = useAppStore.getState();
      const systemSettings = {
        systemPrompts: store.systemPrompts,
        enableSystemPrompt: store.enableSystemPrompt,
        enableJailbreakPrompt: store.enableJailbreakPrompt,
      };

      const promptStartTime = performance.now();
      // ConversationManagerを使ってプロンプトを生成
      const userPersona = (session as any).participants?.user ?? (session as any).persona;
      console.log(
        "👤 [PromptBuilder] User persona being passed:",
        userPersona
          ? `${userPersona.name} (${userPersona?.description || ""})`
          : "null/undefined"
      );

      const prompt = await conversationManager.generatePrompt(
        userInput,
        (session as any).participants?.characters?.[0] ?? (session as any).character,
        userPersona as any, // Type compatibility fix
        systemSettings
      );
      const promptDuration = performance.now() - promptStartTime;

      const totalDuration = performance.now() - startTime;

      // パフォーマンスログ（長いプロンプトは省略）
      const logLevel = totalDuration > 500 ? "warn" : "log";
      console[logLevel](
        `📊 Prompt built in ${totalDuration.toFixed(1)}ms ` +
          `(session: ${session.id}, messages: ${allMsgs.length}, ` +
          `prompt: ${(prompt.length / 1000).toFixed(1)}k chars, ` +
          `generation: ${promptDuration.toFixed(1)}ms)`
      );

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
