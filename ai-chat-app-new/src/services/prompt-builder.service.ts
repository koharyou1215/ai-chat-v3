import {
  UnifiedChatSession,
  UnifiedMessage,
  Character,
  Persona,
} from "@/types";
import { StructuredPrompt } from "@/types/api/prompt.types";
import { ConversationManager } from "./memory/conversation-manager";
import { TrackerManager } from "./tracker/tracker-manager";
import { useAppStore } from "@/store";
import {
  replaceVariables,
  replaceVariablesInCharacter,
  getVariableContext,
} from "@/utils/variable-replacer";
import {
  DEFAULT_ANCHOR_PROMPT,
  DEFAULT_SYSTEM_PROMPT,
  MINIMAL_CHAT_SYSTEM_PROMPT,
} from "@/constants/prompts";
import { logger } from "@/utils/logger";
import { CharacterInfoBuilder } from "./character-info-builder";
import { memorySectionBuilder } from "./prompt-sections";

// セクション順序を定数として定義（PROMPT_VERIFICATION_GUIDE.md準拠）
const PROMPT_SECTION_ORDER = {
  SYSTEM: 'system',
  JAILBREAK: 'jailbreak',
  CHARACTER: 'character',
  PERSONA: 'persona',
  RELATIONSHIP: 'relationship',
  MEMORY: 'memory',
  CONVERSATION: 'conversation',
  ANCHOR: 'anchor',
  INPUT: 'input',
} as const;

type PromptSectionKey = typeof PROMPT_SECTION_ORDER[keyof typeof PROMPT_SECTION_ORDER];

// セクションマッピング（タグ名を統一）
const SECTION_TAGS: Record<PromptSectionKey, { tag: string; label: string }> = {
  system: { tag: 'system_instructions', label: 'System Instructions' },
  jailbreak: { tag: 'jailbreak_prompt', label: 'Jailbreak Prompt' },
  character: { tag: 'character_information', label: 'Character Information' },
  persona: { tag: 'persona_information', label: 'Persona Information' },
  relationship: { tag: 'relationship_state', label: 'Relationship State' },
  memory: { tag: 'memory_context', label: 'Memory Context' },
  conversation: { tag: 'conversation_history', label: 'Conversation History' },
  anchor: { tag: 'anchor_prompt', label: 'Anchor Prompt' },
  input: { tag: 'current_input', label: 'Current Input' },
};

export class PromptBuilderService {
  // ConversationManager キャッシュ
  private static managerCache = new Map<string, ConversationManager>();
  private static lastProcessedCount = new Map<string, number>();

  // ✅ P1-1: システムプロンプトキャッシュ
  private systemPromptCache = new Map<string, string>();
  private readonly MAX_SYSTEM_PROMPT_CACHE_SIZE = 100; // キャラクター数に応じて調整

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
   * ✅ P1-1: システムプロンプトを取得（メモ化版）
   *
   * キャッシュキー生成ロジック:
   * - キャラクターID
   * - カスタムプロンプトの有効状態
   * - カスタムプロンプトの先頭50文字（ハッシュの代わり）
   *
   * @param character - キャラクター情報
   * @param systemSettings - システム設定
   * @returns システムプロンプト文字列
   */
  private getSystemPromptCached(
    character: Character,
    systemSettings: ReturnType<typeof PromptBuilderService.prototype.getSystemSettings>
  ): string {
    // キャッシュキー生成
    const customPromptHash = systemSettings.systemPrompts?.system
      ?.substring(0, 50)
      .replace(/\s+/g, '') // 空白を除去してハッシュの一貫性を保つ
      || 'default';

    const cacheKey = `${character.id}-${systemSettings.enableSystemPrompt ? '1' : '0'}-${systemSettings.chatSystemPromptMode}-${customPromptHash}`;

    // キャッシュヒット確認
    if (this.systemPromptCache.has(cacheKey)) {
      logger.debug(`💾 [PromptBuilder] System prompt cache HIT: ${cacheKey.substring(0, 30)}...`);
      return this.systemPromptCache.get(cacheKey)!;
    }

    logger.debug(`🔨 [PromptBuilder] System prompt cache MISS: ${cacheKey.substring(0, 30)}...`);

    // キャッシュミス: システムプロンプトを構築
    let systemInstructions = "";

    if (
      systemSettings.enableSystemPrompt &&
      systemSettings.systemPrompts?.system &&
      systemSettings.systemPrompts.system.trim() !== ""
    ) {
      // カスタムシステムプロンプトを使用
      systemInstructions = systemSettings.systemPrompts.system;
    } else if (systemSettings.chatSystemPromptMode === "minimal") {
      systemInstructions = MINIMAL_CHAT_SYSTEM_PROMPT;
    } else {
      // デフォルトシステムプロンプトを使用
      systemInstructions = DEFAULT_SYSTEM_PROMPT;
    }

    if (character.message_triggers?.some(t => t.emotion_tag)) {
      const uniqueTags = new Map<string, string>();
      character.message_triggers
        .filter(t => t.emotion_tag)
        .forEach(t => {
          if (t.emotion_tag && !uniqueTags.has(t.emotion_tag)) {
            uniqueTags.set(t.emotion_tag, t.description || 'Display this emotion');
          }
        });

      if (uniqueTags.size > 0) {
        const tagsList = Array.from(uniqueTags.entries())
          .map(([tag, desc]) => `- ${tag} : ${desc}`)
          .join('\n');

        systemInstructions += `\n\n[EMOTION DISPLAY SYSTEM]
You are equipped with an emotion display system.
If your internal state matches one of the following emotions, you MUST append the corresponding tag at the very end of your response.
Only one tag per response. Do NOT output the tag if the emotion does not match.

Available Tags:
${tagsList}

Example output:
"I am so happy to see you! [HAPPY]"
"Don't look at me... [SHY]"`;
      }
    }

    // キャラクター固有のシステムプロンプトを追加
    if (
      character.system_prompt &&
      character.system_prompt.trim() !== ""
    ) {
      systemInstructions += `\n\n## キャラクター固有の指示\n${character.system_prompt}`;
    }

    // キャッシュに保存（LRU方式: 最大サイズを超えたら最古のエントリを削除）
    if (this.systemPromptCache.size >= this.MAX_SYSTEM_PROMPT_CACHE_SIZE) {
      const firstKey = (this.systemPromptCache.keys().next().value ?? "") as string;
      if (typeof firstKey === "string") {
        this.systemPromptCache.delete(firstKey);
      }
      logger.debug(`🗑️ [PromptBuilder] Evicted oldest cache entry: ${firstKey.substring(0, 30)}...`);
    }

    this.systemPromptCache.set(cacheKey, systemInstructions);
    logger.debug(`✅ [PromptBuilder] System prompt cached: ${cacheKey.substring(0, 30)}... (${systemInstructions.length} chars)`);

    return systemInstructions;
  }

  /**
   * ✅ P1-1: キャッシュをクリア（キャラクター更新時などに使用）
   *
   * @param characterId - クリア対象のキャラクターID（省略時は全キャッシュをクリア）
   */
  public clearSystemPromptCache(characterId?: string): void {
    if (characterId) {
      // 特定のキャラクターに関するキャッシュのみクリア
      for (const [key] of this.systemPromptCache) {
        if (key.startsWith(`${characterId}-`)) {
          this.systemPromptCache.delete(key);
        }
      }
      logger.debug(`🧹 [PromptBuilder] Cleared system prompt cache for character: ${characterId}`);
    } else {
      // 全キャッシュをクリア
      this.systemPromptCache.clear();
      logger.debug(`🧹 [PromptBuilder] Cleared all system prompt cache`);
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
        // ✅ 真の増分更新: 新規メッセージのみを追加
        await manager.addNewMessages(importantMessages);
        logger.debug(`✅ Added ${importantMessages.length} new messages (true incremental update)`);
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
      chatSystemPromptMode: store.chatSystemPromptMode,
      enableAnchorPrompt: store.enableAnchorPrompt,
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
   * 6. memory_context
   * 7. conversation_history
   * 8. input
   */
  private buildPromptTemplate(sections: Partial<Record<PromptSectionKey, string>>): string {
    const orderedSections = Object.values(PROMPT_SECTION_ORDER)
      .filter(key => sections[key])  // 存在するセクションのみ
      .map(key => this.formatSection(key, sections[key]!))
      .filter(Boolean);

    return orderedSections.join('\n\n');
  }

  /**
   * セクションをフォーマット
   */
  private formatSection(key: PromptSectionKey, content: string): string {
    const { tag } = SECTION_TAGS[key];

    if (key === 'input') {
      return `## Current Input\n${content}`;
    }

    return `<${tag}>\n${content}\n</${tag}>`;
  }

  /**
   * プログレッシブプロンプト構築 - UIをブロックしない高速版
   */
  public async buildPromptProgressive(
    session: UnifiedChatSession,
    userInput: string,
    trackerManager?: TrackerManager
  ): Promise<{ basePrompt: string; enhancePrompt: () => Promise<StructuredPrompt> }> {
    const startTime = performance.now();

    // 強制的にログを出力（ターミナルで確認可能）
    logger.debug("🚀🚀🚀 [PromptBuilder] buildPromptProgressive called 🚀🚀🚀");

    // セッションデータの厳密な型チェック
    this.validateSessionData(session);

    // 1. 最小限のベースプロンプトを即座に構築 (50-100ms)
    const character = session.participants.characters[0];
    const user = session.participants.user;

    // 軽量版: 基本情報のみ（重複しない内容）
    logger.debug("🔧 [PromptBuilder] Calling buildBasicInfo...");
    const basePrompt = await this.buildBasicInfo(
      session,
      character,
      user,
      userInput,
      trackerManager
    );
    
    // 2. 拡張プロンプト関数（バックグラウンド実行用）
    const systemSettings = this.getSystemSettings();
    const enhancePrompt = async (): Promise<StructuredPrompt> => {
      try {
        // 静的なベースプロンプトを構築（指示系統）
        const staticInstruction = basePrompt;

        // 会話履歴を取得（履歴情報を指示から分離）
        const store = useAppStore.getState();
        const maxContextMessages = store.chat?.memory_limits?.max_context_messages || 50;
        
        // 最後のユーザーメッセージを除外（Current Inputセクションとして別途渡すため）
        const allMessages = session.messages;
        const lastMessageIndex = allMessages.length - 1;
        const shouldExcludeLastMessage =
          lastMessageIndex >= 0 && allMessages[lastMessageIndex]?.role === "user";

        const recentMessages = shouldExcludeLastMessage
          ? allMessages.slice(Math.max(0, allMessages.length - maxContextMessages - 1), -1)
          : allMessages.slice(-maxContextMessages);

        const conversationHistory = recentMessages.map(msg => ({
          role: (msg.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
          content: msg.content
        }));

        // 動的なアンカー情報（これは静的な指示に含める）
        let anchorInfo = "";
        if (systemSettings.enableAnchorPrompt) {
          const anchorContent = this.buildStateAnchor(
            session,
            character,
            systemSettings.systemPrompts?.anchor
          );
          anchorInfo = this.formatSection("anchor", anchorContent);
        }

        // 構造化された指示系統を結合（履歴と入力を含まない）
        const systemInstruction = [
          staticInstruction,
          anchorInfo
        ]
          .filter(Boolean)
          .join("\n\n");

        return {
          systemInstruction: replaceVariables(systemInstruction, { user, character }),
          conversationHistory,
          currentInput: userInput
        };
      } catch (error) {
        logger.warn("Enhanced prompt build failed, using simple fallback:", error);
        return {
          systemInstruction: replaceVariables(basePrompt, { user, character }),
          conversationHistory: [],
          currentInput: userInput
        };
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
    session: UnifiedChatSession,
    character: Character,
    user: Persona,
    userInput: string,
    trackerManager?: TrackerManager
  ): Promise<string> {
    // 🎯 システム設定を取得
    const systemSettings = this.getSystemSettings();

    if (!character) {
      logger.error("🚨 CRITICAL: buildBasicInfo received undefined character!");
      return "ERROR: No character information available";
    }

    const sections: Partial<Record<PromptSectionKey, string>> = {};

    sections.system = this.getSystemPromptCached(character, systemSettings);

    // 🎯 Anchor Prompt は buildPromptProgressive で動的に追加されるため、ここではスキップ

    if (
      systemSettings.enableJailbreakPrompt &&
      systemSettings.systemPrompts?.jailbreak
    ) {
      sections.jailbreak = systemSettings.systemPrompts.jailbreak;
    }

    sections.character = await this.buildCharacterSection(character, userInput);
    sections.persona = this.buildPersonaSection(user);

    sections.relationship = this.buildRelationshipSection(
      trackerManager,
      character?.id
    );

    try {
      const store = useAppStore.getState();
      const memoryCards = store.memory_cards || new Map();
      let mem0SearchResults: any[] = [];

      try {
        const { Mem0 } = await import("@/services/mem0/core");
        const maxMemoryCards = store.chat?.memory_limits?.max_memory_cards || 50;
        mem0SearchResults = await Mem0.search(userInput, maxMemoryCards);
      } catch (err) { }

      const allCards = [
        ...Array.from(memoryCards.values()),
        ...mem0SearchResults,
      ];

      const seenIds = new Set<string>();
      const relevantCards: any[] = [];

      for (const card of allCards) {
        if (seenIds.has(card.id)) continue;
        seenIds.add(card.id);
        if (card.is_pinned || card.character_id === character?.id) {
          relevantCards.push(card);
        }
      }

      if (relevantCards.length > 0) {
        const maxRelevantMemories = store.chat?.memory_limits?.max_relevant_memories || 5;
        sections.memory = memorySectionBuilder.build({
          memoryCards: relevantCards,
          character,
          maxCards: maxRelevantMemories,
          format: 'compact',
        });
      }
    } catch (error) {
      logger.warn("Failed memory info collection:", error);
    }

    // 入力セクションは buildPromptProgressive で動的に追加されるため、ここではスキップ

    // テンプレートを使用してプロンプトを構築（静的な指示と設定のみ）
    const prompt =
      `AI={{char}}, User={{user}}

` + this.buildPromptTemplate(sections);

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
      const conversationManager = await this.getOrCreateManager(
        session.id,
        session.messages,
        trackerManager
      );

      let historyPrompt = "";
      const store = useAppStore.getState();
      const maxContextMessages = store.chat?.memory_limits?.max_context_messages || 50;

      // 最後のユーザーメッセージを除外（Current Inputセクションで追加されるため）
      const allMessages = session.messages;
      const lastMessageIndex = allMessages.length - 1;
      const shouldExcludeLastMessage =
        lastMessageIndex >= 0 && allMessages[lastMessageIndex]?.role === "user";

      const recentMessages = shouldExcludeLastMessage
        ? allMessages.slice(Math.max(0, allMessages.length - maxContextMessages - 1), -1)
        : allMessages.slice(-maxContextMessages);

      if (recentMessages.length > 0) {
        historyPrompt += `## Recent Conversation\n`;
        recentMessages.forEach((msg) => {
          const role = msg.role === "user" ? "{{user}}" : "{{char}}";
          historyPrompt += `${role}: ${msg.content}\n`;
        });
        historyPrompt += "\n";
      }

      if (conversationManager["sessionSummary"]) {
        historyPrompt += `## Session Summary\n${conversationManager["sessionSummary"]}\n\n`;
      }

      const MAX_HISTORY_CHARS = 12000;
      if (historyPrompt.length > MAX_HISTORY_CHARS) {
        const historyLines = historyPrompt.split('\n');
        let truncatedHistory = '';
        let currentLength = 0;
        for (let i = historyLines.length - 1; i >= 0; i--) {
          const line = historyLines[i];
          if (currentLength + line.length < MAX_HISTORY_CHARS) {
            truncatedHistory = line + '\n' + truncatedHistory;
            currentLength += line.length + 1;
          } else { break; }
        }
        historyPrompt = '... [履歴短縮] ...\n' + truncatedHistory;
      }

      return historyPrompt;
    } catch (error) {
      logger.warn("Failed to get history info:", error);
      return "";
    }
  }

  private getEssentialTrackerInfo(
    trackerManager: TrackerManager,
    characterId: string
  ): string | null {
    try {
      const trackers = trackerManager.getTrackersForPrompt(characterId);
      if (!trackers) return null;

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
      return null;
    }
  }

  private buildRelationshipSection(
    trackerManager: TrackerManager | undefined,
    characterId: string | undefined
  ): string {
    if (!trackerManager || !characterId) return '';
    try {
      return trackerManager.getDetailedTrackersForPrompt?.(characterId)
        || trackerManager.getTrackersForPrompt(characterId)
        || '';
    } catch (error) {
      return '';
    }
  }

  private buildPersonaSection(user?: Persona): string {
    if (!user) return "";
    const lines: string[] = [];
    if (user.name?.trim()) lines.push(`Name: ${user.name}`);
    if (user.role?.trim()) lines.push(`Role: ${user.role}`);
    if (user.other_settings?.trim()) lines.push(`Other Settings: ${user.other_settings}`);
    return lines.join("\n");
  }

  private buildStateAnchor(
    session: UnifiedChatSession,
    character: Character,
    anchorTemplate?: string
  ): string {
    const template = anchorTemplate?.trim() ? anchorTemplate : DEFAULT_ANCHOR_PROMPT;
    const currentEmotion = session.context?.current_emotion;
    const currentMood = session.context?.current_mood;

    const replacements: Record<string, string> = {
      "{{char}}": character.name,
      "{{session_mode}}": session.metadata?.mode || "single",
      "{{current_emotion_primary}}": currentEmotion?.primary || "neutral",
      "{{current_emotion_intensity}}": this.formatAnchorNumber(currentEmotion?.intensity),
      "{{current_mood_type}}": currentMood?.type || "neutral",
      "{{current_mood_intensity}}": this.formatAnchorNumber(currentMood?.intensity),
      "{{current_mood_stability}}": this.formatAnchorNumber(currentMood?.stability),
    };

    return Object.entries(replacements).reduce(
      (result, [token, value]) => result.replaceAll(token, value),
      template
    );
  }

  private formatAnchorNumber(value: unknown): string {
    if (typeof value !== "number" || Number.isNaN(value)) return "0.00";
    return Math.max(0, Math.min(1, value)).toFixed(2);
  }

  private async buildCharacterSection(
    character: Character,
    userInput: string
  ): Promise<string> {
    if (character.plist_profile && character.ali_chat_examples) {
      return CharacterInfoBuilder.build(character);
    }
    try {
      const { Mem0Character } = await import("@/services/mem0/character-service");
      const characterContext = await Mem0Character.buildCharacterContext(character.id, userInput);
      let characterInfo = CharacterInfoBuilder.build(characterContext.core);

      const memoryInfo: string[] = [];
      if (characterContext.memories.learned_preferences.likes.length > 0) {
        memoryInfo.push(`Likes: ${characterContext.memories.learned_preferences.likes.join(', ')}`);
      }
      if (characterContext.memories.learned_preferences.dislikes.length > 0) {
        memoryInfo.push(`Dislikes: ${characterContext.memories.learned_preferences.dislikes.join(', ')}`);
      }
      if (characterContext.memories.context_knowledge.special_topics.length > 0) {
        memoryInfo.push(`Special Topics: ${characterContext.memories.context_knowledge.special_topics.join(', ')}`);
      }

      if (memoryInfo.length > 0) {
        characterInfo += `\n\n## Character Memory\n${memoryInfo.join('\n')}`;
      }
      return characterInfo;
    } catch (error) {
      return CharacterInfoBuilder.build(character);
    }
  }

  public async buildPrompt(
    session: UnifiedChatSession,
    userInput: string,
    trackerManager?: TrackerManager
  ): Promise<StructuredPrompt> {
    const startTime = performance.now();
    try {
      this.validateSessionData(session);
      const { enhancePrompt } = await this.buildPromptProgressive(session, userInput, trackerManager);
      const structuredPrompt = await enhancePrompt();
      
      console.log('[PROMPT_CAPTURE] === STRUCTURED PROMPT START ===');
      console.log('[PROMPT_CAPTURE] Instruction length:', structuredPrompt.systemInstruction.length);
      console.log('[PROMPT_CAPTURE] History turns:', structuredPrompt.conversationHistory.length);
      console.log('[PROMPT_CAPTURE] Input:', structuredPrompt.currentInput);
      console.log('[PROMPT_CAPTURE] Structured Prompt:', JSON.stringify(structuredPrompt, null, 2));
      console.log('[PROMPT_CAPTURE] === STRUCTURED PROMPT END ===');
      
      return structuredPrompt;
    } catch (error) {
      logger.error(`⚠️ Prompt building failed:`, error);
      throw error;
    }
  }
}

export const promptBuilderService = new PromptBuilderService();

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
      if (!this.processing) this.process();
    });
  }

  private async process() {
    this.processing = true;
    while (this.tasks.length > 0) {
      const task = this.tasks.shift()!;
      try { await task(); } catch (error) { }
    }
    this.processing = false;
  }
}

export const backgroundTaskQueue = new BackgroundTaskQueue();
