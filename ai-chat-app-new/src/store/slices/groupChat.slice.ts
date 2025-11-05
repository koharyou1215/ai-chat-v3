import { StateCreator } from "zustand";
import { UnifiedMessage, UUID, Character, Persona } from "@/types";
import {
  GroupChatSession,
  GroupChatMode,
  GroupChatScenario,
} from "@/types/core/group-chat.types";
import { simpleAPIManagerV2 } from "@/services/simple-api-manager-v2";
import { TrackerManager } from "@/services/tracker/tracker-manager";
import { generateCompactGroupPrompt } from "@/utils/character-summarizer";
import { GroupEmotionAnalyzer } from "@/services/emotion/GroupEmotionAnalyzer";
import { AppStore } from "..";
import { generateStableId } from "@/utils/uuid";

// 🎭 グループ感情から絵文字への変換ヘルパー
const getGroupEmotionEmoji = (emotion: string): string => {
  const emotionEmojiMap: Record<string, string> = {
    joy: "😊",
    sadness: "😢",
    anger: "😠",
    fear: "😨",
    surprise: "😲",
    disgust: "😖",
    neutral: "😐",
    love: "💕",
    excitement: "🤩",
    anxiety: "😰",
  };
  return emotionEmojiMap[emotion] || "😐";
};

export interface GroupChatSlice {
  groupSessions: Map<UUID, GroupChatSession>;
  active_group_session_id: UUID | null;
  is_group_mode: boolean;
  group_generating: boolean;

  // Character reselection state
  showCharacterReselectionModal: boolean;

  createGroupSession: (
    characters: Character[],
    persona: Persona,
    mode?: GroupChatMode,
    groupName?: string,
    scenario?: GroupChatScenario
  ) => Promise<UUID>;
  sendGroupMessage: (content: string, imageUrl?: string) => Promise<void>;
  regenerateLastGroupMessage: () => Promise<void>; // 🆕 グループチャット再生成機能
  continueLastGroupMessage: () => Promise<void>; // 🆕 グループチャット続きを生成機能
  setGroupMode: (isGroupMode: boolean) => void;
  setActiveGroupSessionId: (sessionId: UUID | null) => void;
  setActiveGroupSession: (sessionId: UUID | null) => void; // エイリアス
  getActiveGroupSession: () => GroupChatSession | null;
  toggleGroupCharacter: (sessionId: UUID, characterId: string) => void;
  setGroupChatMode: (sessionId: UUID, mode: GroupChatMode) => void;

  // 🆕 Character reselection functionality
  setShowCharacterReselectionModal: (show: boolean) => void;
  updateGroupMembers: (sessionId: UUID, newCharacters: Character[]) => void; // updateSessionCharacters からリネーム
  addSystemMessage: (sessionId: UUID, content: string) => void;
  rollbackGroupSession: (message_id: UUID) => void; // 新しいアクションを追加

  // 🚨 緊急修復機能
  resetGroupGeneratingState: () => void; // グループ生成状態を強制リセット

  // ヘルパー関数
  generateCharacterResponse: (
    groupSession: GroupChatSession,
    character: Character,
    userMessage: string,
    previousResponses: UnifiedMessage[]
  ) => Promise<UnifiedMessage>;
}

export const createGroupChatSlice: StateCreator<
  AppStore,
  [],
  [],
  GroupChatSlice
> = (set, get) => ({
  groupSessions: new Map(),
  active_group_session_id: null,
  is_group_mode: false,
  group_generating: false,
  showCharacterReselectionModal: false,

  createGroupSession: async (
    characters,
    persona,
    mode = "sequential",
    groupName,
    scenario
  ) => {
    const groupSessionId = generateStableId('group');

    // シナリオ有りの場合の初期メッセージ
    const initialContent = scenario
      ? scenario.initial_prompt ||
        `${scenario.title}が始まります。${scenario.situation}`
      : `${characters
          .map((c) => c.name)
          .join("、")}がグループチャットに参加しました！`;

    const groupSession: GroupChatSession = {
      id: groupSessionId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
      is_deleted: false,
      metadata: {},

      name:
        groupName ||
        `${characters.map((c) => c.name).join("、")}とのグループチャット`,
      character_ids: characters.map((c) => c.id),
      characters,
      active_character_ids: new Set(characters.map((c) => c.id)),
      persona,
      scenario, // シナリオ情報を追加
      messages: [
        {
          id: generateStableId('welcome'),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          version: 1,
          session_id: groupSessionId,
          is_deleted: false,
          role: "assistant",
          content: initialContent,
          memory: {
            importance: {
              score: 0.3,
              factors: {
                emotional_weight: 0.2,
                repetition_count: 0,
                user_emphasis: 0,
                ai_judgment: 0.3,
              },
            },
            is_pinned: false,
            is_bookmarked: false,
            keywords: ["グループチャット", "開始"],
            summary: "グループチャット開始メッセージ",
          },
          expression: {
            emotion: { primary: "happy", intensity: 0.7, emoji: "👥" },
            style: { font_weight: "normal", text_color: "#ffffff" },
            effects: [],
          },
          edit_history: [],
          regeneration_count: 0,
          metadata: { is_group_response: true },
        },
      ],

      chat_mode: mode,
      max_active_characters: 99,
      speaking_order: characters.map((c) => c.id),
      voice_settings: new Map(),
      response_delay: 500,
      simultaneous_responses: mode === "simultaneous",

      message_count: 1,
      last_message_at: new Date().toISOString(),
    };

    // 各キャラクターのトラッカーマネージャーを初期化
    const trackerManagers = get().trackerManagers;
    characters.forEach((character) => {
      if (!trackerManagers.has(character.id)) {
        const trackerManager = new TrackerManager();
        trackerManager.initializeTrackerSet(character.id, character.trackers);
        trackerManagers.set(character.id, trackerManager);
      }
    });

    set((state) => ({
      groupSessions: new Map(state.groupSessions).set(
        groupSessionId,
        groupSession
      ),
      trackerManagers: new Map(trackerManagers),
      active_group_session_id: groupSessionId,
      is_group_mode: true,
    }));

    return groupSessionId;
  },

  sendGroupMessage: async (content, imageUrl) => {
    const activeGroupSessionId = get().active_group_session_id;
    if (!activeGroupSessionId) {
      return;
    }

    if (get().group_generating) return;
    set({ group_generating: true });

    const groupSession = get().groupSessions.get(activeGroupSessionId);
    if (!groupSession) {
      set({ group_generating: false });
      return;
    }

    try {
      // ユーザーメッセージを追加
      const userMessage: UnifiedMessage = {
        id: generateStableId('user'),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1,
        session_id: activeGroupSessionId,
        role: "user",
        content,
        image_url: imageUrl,
        memory: {
          importance: {
            score: 0.7,
            factors: {
              emotional_weight: 0.5,
              repetition_count: 0,
              user_emphasis: 0.8,
              ai_judgment: 0.6,
            },
          },
          is_pinned: false,
          is_bookmarked: false,
          keywords: [],
        },
        expression: {
          emotion: { primary: "neutral", intensity: 0.5, emoji: "😊" },
          style: { font_weight: "normal", text_color: "#ffffff" },
          effects: [],
        },
        edit_history: [],
        regeneration_count: 0,
        is_deleted: false,
        metadata: {},
      };

      groupSession.messages.push(userMessage);

      // 🧠 感情分析: ユーザーメッセージ (バックグラウンド処理)
      const emotionalIntelligence = get().unifiedSettings.emotionalIntelligence;
      if (emotionalIntelligence?.enabled && emotionalIntelligence?.analysis.basic) {
        setTimeout(async () => {
          try {
            const groupAnalyzer = new GroupEmotionAnalyzer();
            const conversationalContext = {
              recentMessages: groupSession.messages.slice(-10),
              messageCount: groupSession.message_count + 1,
              activeCharacters: groupSession.characters,
              sessionType: "group" as const,
              sessionId: activeGroupSessionId,
              sessionDuration: Math.floor(
                (new Date().getTime() -
                  new Date(groupSession.created_at).getTime()) /
                  60000
              ),
              conversationPhase: "development" as const,
            };

            const emotionResult = await groupAnalyzer.analyzeGroupEmotion(
              userMessage,
              conversationalContext,
              groupSession.characters
            );

            // 感情分析結果をメッセージに反映
            const updatedUserMessage = {
              ...userMessage,
              expression: {
                emotion: {
                  primary: emotionResult.emotion.primaryEmotion,
                  intensity: emotionResult.emotion.intensity,
                  emoji: getGroupEmotionEmoji(
                    emotionResult.emotion.primaryEmotion
                  ),
                },
                style: {
                  font_weight: "normal" as const,
                  text_color: "#ffffff",
                },
                effects: [],
              },
            };

            // セッションを更新（非同期）
            set((state) => {
              const currentSession =
                state.groupSessions.get(activeGroupSessionId);
              if (currentSession) {
                const messageIndex = currentSession.messages.findIndex(
                  (m) => m.id === userMessage.id
                );
                if (messageIndex !== -1) {
                  const updatedMessages = [...currentSession.messages];
                  updatedMessages[messageIndex] = updatedUserMessage;
                  const updatedSession = {
                    ...currentSession,
                    messages: updatedMessages,
                  };
                  return {
                    groupSessions: new Map(state.groupSessions).set(
                      activeGroupSessionId,
                      updatedSession
                    ),
                  };
                }
              }
              return state;
            });
          } catch (error) {
            // Group user emotion analysis failed, continuing without emotion data
          }
        }, 0);
      }

      // アクティブキャラクターからの応答を生成
      const activeCharacters = Array.from(groupSession.active_character_ids)
        .map((id) => groupSession.characters.find((c) => c.id === id))
        .filter((char): char is Character => char !== undefined);

      const responses: UnifiedMessage[] = [];

      if (groupSession.chat_mode === "simultaneous") {
        // ⚡ スケジューリング改善: 2キャラクターずつバッチ処理でレート制限回避
        const BATCH_SIZE = 2;
        const STAGGER_DELAY = 300; // 300ms間隔

        for (let i = 0; i < activeCharacters.length; i += BATCH_SIZE) {
          const batch = activeCharacters.slice(i, i + BATCH_SIZE);

          const batchPromises = batch.map(async (character, batchIndex) => {
            const globalIndex = i + batchIndex;
            const response = await get().generateCharacterResponse(
              groupSession,
              character,
              content,
              []
            );
            return {
              ...response,
              metadata: { ...response.metadata, response_order: globalIndex },
            };
          });

          const batchResponses = await Promise.all(batchPromises);
          responses.push(...batchResponses);

          // 最後のバッチでない場合は遅延
          if (i + BATCH_SIZE < activeCharacters.length) {
            await new Promise((resolve) => setTimeout(resolve, STAGGER_DELAY));
          }
        }
      } else if (groupSession.chat_mode === "random") {
        // ランダム応答 - アクティブキャラクターからランダムに1人選択
        // Use deterministic character selection to avoid hydration issues
        const characterIndex =
          (get().groupSessions.get(groupSession.id)?.messages.length || 0) %
          activeCharacters.length;
        const randomCharacter = activeCharacters[characterIndex];
        if (randomCharacter) {
          // null安全性チェック
          const response = await get().generateCharacterResponse(
            groupSession,
            randomCharacter,
            content,
            []
          );
          responses.push({
            ...response,
            metadata: { ...response.metadata, response_order: 0 },
          });
        }
      } else if (groupSession.chat_mode === "smart") {
        // スマート応答 - AIが最適なキャラクターを選択
        // とりあえず最初のキャラクターを選択（後で改善可能）
        const smartCharacter = activeCharacters[0];
        if (smartCharacter) {
          // null安全性チェック
          const response = await get().generateCharacterResponse(
            groupSession,
            smartCharacter,
            content,
            []
          );
          responses.push({
            ...response,
            metadata: { ...response.metadata, response_order: 0 },
          });
        }
      } else {
        // 順次応答 (sequential) - キャラクターが順番に応答
        for (let i = 0; i < activeCharacters.length; i++) {
          const character = activeCharacters[i];
          const response = await get().generateCharacterResponse(
            groupSession,
            character,
            content,
            responses
          );
          response.metadata = { ...response.metadata, response_order: i };
          responses.push(response);

          // 即座にメッセージを追加して画面に表示
          groupSession.messages.push(response);

          // 状態を更新してUIをリフレッシュ
          set((state) => ({
            groupSessions: new Map(state.groupSessions).set(groupSession.id, {
              ...groupSession,
              messages: [...groupSession.messages],
            }),
          }));

          // 少し遅延
          if (
            i < activeCharacters.length - 1 &&
            groupSession.response_delay > 0
          ) {
            await new Promise((resolve) =>
              setTimeout(resolve, groupSession.response_delay)
            );
          }
        }
      }

      // sequentialモード以外の場合のみ、最後にまとめて追加
      if (groupSession.chat_mode !== "sequential") {
        groupSession.messages.push(...responses);
      }
      groupSession.message_count += responses.length + 1; // ユーザーメッセージも含む
      groupSession.last_message_at = new Date().toISOString();
      groupSession.updated_at = new Date().toISOString();

      set((state) => ({
        groupSessions: new Map(state.groupSessions).set(
          activeGroupSessionId,
          groupSession
        ),
      }));

      // 🎭 感情分析: AI応答群 (バックグラウンド処理)
      if (
        emotionalIntelligence?.enabled && emotionalIntelligence?.analysis.basic &&
        responses.length > 0
      ) {
        setTimeout(async () => {
          try {
            const groupAnalyzer = new GroupEmotionAnalyzer();
            const conversationalContext = {
              recentMessages: groupSession.messages.slice(-15),
              messageCount: groupSession.message_count,
              activeCharacters: groupSession.characters,
              sessionType: "group" as const,
              sessionId: activeGroupSessionId,
              sessionDuration: Math.floor(
                (new Date().getTime() -
                  new Date(groupSession.created_at).getTime()) /
                  60000
              ),
              conversationPhase: "development" as const,
            };

            // 各AI応答に感情分析を実行
            const emotionUpdatedResponses = await Promise.all(
              responses.map(async (response) => {
                try {
                  const emotionResult = await groupAnalyzer.analyzeGroupEmotion(
                    response,
                    conversationalContext,
                    groupSession.characters,
                    response.character_id
                  );

                  return {
                    ...response,
                    expression: {
                      emotion: {
                        primary: emotionResult.emotion.primaryEmotion,
                        intensity: emotionResult.emotion.intensity,
                        emoji: getGroupEmotionEmoji(
                          emotionResult.emotion.primaryEmotion
                        ),
                      },
                      style: {
                        font_weight: "normal" as const,
                        text_color: "#ffffff",
                      },
                      effects: [],
                    },
                  };
                } catch (error) {
                  // Individual response emotion analysis failed, continuing without emotion data
                  return response; // Return original on failure
                }
              })
            );

            // セッションを更新（感情分析結果を反映）
            set((state) => {
              const currentSession =
                state.groupSessions.get(activeGroupSessionId);
              if (currentSession) {
                const updatedMessages = [...currentSession.messages];

                // 各応答メッセージを感情分析結果で更新
                emotionUpdatedResponses.forEach((updatedResponse) => {
                  const messageIndex = updatedMessages.findIndex(
                    (m) => m.id === updatedResponse.id
                  );
                  if (messageIndex !== -1) {
                    updatedMessages[messageIndex] = updatedResponse;
                  }
                });

                const updatedSession = {
                  ...currentSession,
                  messages: updatedMessages,
                };
                return {
                  groupSessions: new Map(state.groupSessions).set(
                    activeGroupSessionId,
                    updatedSession
                  ),
                };
              }
              return state;
            });
          } catch (error) {
            // Group AI emotion analysis failed, continuing without emotion data
          }
        }, 100); // Slight delay to ensure UI updates first
      }

      // 🆕 グループチャット用のトラッカー・メモリー連携処理を追加（ソロチャットと同様）
      setTimeout(() => {
        const trackerManagers = get().trackerManagers;
        Promise.allSettled([
          // 🧠 各キャラクターのメモリー処理（emotional_memory_enabled設定チェック追加）
          (async () => {
            if (!get().unifiedSettings.emotionalIntelligence.memoryEnabled) {
              return Promise.resolve([]);
            }
            try {
              const { autoMemoryManager } = await import(
                "@/services/memory/auto-memory-manager"
              );
              return await Promise.all(
                responses.map((response) =>
                  (async () => {
                    const { FEATURE_FLAGS } = await import('@/config/feature-flags');
                    const { memoryDebugLog } = await import('@/utils/memory-debug');
                    const { Mem0 } = await import('@/services/mem0/core');
                    const state = get();
                    const userMessage = state.messages[state.messages.length - 2];

                    if (FEATURE_FLAGS.USE_MEM0_MEMORY_GENERATION) {
                      const messages = [userMessage, response];
                      const result = await Mem0.shouldPromoteToMemoryCard(messages);
                      memoryDebugLog.mem0('shouldPromote', result);
                      if (result.shouldPromote) {
                        await Mem0.promoteToMemoryCard(
                          `Conversation: ${messages.map(m => m.content.slice(0, 30)).join(' → ')}`,
                          {
                            importance: { score: result.importance, factors: {} },
                            session_id: activeGroupSessionId,
                            character_id: response.character_id,
                          }
                        );
                      }
                    } else {
                      await autoMemoryManager.processNewMessage(
                        response,
                        activeGroupSessionId,
                        response.character_id,
                        undefined,
                        get().createMemoryCard
                      );
                    }
                  })()
                )
              );
            } catch (error) {
              console.error("Failed to load memory manager:", error);
              return Promise.resolve();
            }
          })(),
          // 🎯 各キャラクターのトラッカー更新処理（autoTrackerUpdate設定チェック追加）
          get().effectSettings.autoTrackerUpdate
            ? Promise.all(
                activeCharacters.map((character) => {
                  const trackerManager = trackerManagers.get(character.id);
                  if (!trackerManager) return Promise.resolve();

                  return Promise.all([
                    // ユーザーメッセージに対するトラッカー更新
                    trackerManager.analyzeMessageForTrackerUpdates(
                      userMessage,
                      character.id
                    ),
                    // 該当キャラクターのレスポンスに対するトラッカー更新
                    ...responses
                      .filter(
                        (response) => response.character_id === character.id
                      )
                      .map((response) =>
                        trackerManager.analyzeMessageForTrackerUpdates(
                          response,
                          character.id
                        )
                      ),
                  ]);
                })
              )
            : Promise.resolve([]),
        ])
          .then((results) => {
            const memoryResults = results[0];
            const trackerResults = results[1];

            if (memoryResults.status === "rejected") {
              console.error(
                "🧠 Group chat auto-memory processing failed:",
                memoryResults.reason
              );
            } else {
            }

            if (trackerResults.status === "rejected") {
              console.error(
                "🎯 Group chat tracker analysis failed:",
                trackerResults.reason
              );
            } else if (
              trackerResults.status === "fulfilled" &&
              trackerResults.value
            ) {
              const allUpdates = trackerResults.value.flat().flat();
            }
          })
          .catch((error) => {
            console.error("⚠️ Group chat background processing error:", error);
          });
      }, 0); // 次のEvent Loopで実行しUIをブロックしない
    } catch (error) {
      console.error("Group message generation failed:", error);
    } finally {
      set({ group_generating: false });
    }
  },

  generateCharacterResponse: async (
    groupSession,
    character,
    userMessage,
    previousResponses
  ) => {
    // API設定を取得（ソロモードと同じ方法で）
    const apiConfig = get().apiConfig || {};
    const openRouterApiKey = get().openRouterApiKey;
    const geminiApiKey = get().geminiApiKey;

    // グループチャット用にトークンを均等配分
    const activeCharCount = groupSession.active_character_ids.size;
    const baseMaxTokens = apiConfig.max_tokens || 500;
    const perCharacterMaxTokens = Math.floor(
      baseMaxTokens / Math.max(activeCharCount, 1)
    );

    // 2.【改善案】最小保証トークン数を引き上げ、シナリオの長さに応じて動的に調整
    const baseTokens = Math.max(perCharacterMaxTokens, 250); // 最小保証を250に引き上げ
    const scenarioBonus =
      groupSession.scenario?.situation?.length || 0 > 100 ? 150 : 0; // シナリオが長い場合はボーナス
    const finalMaxTokens = Math.min(baseTokens + scenarioBonus, 1024); // 上限を1024に設定

    // グループチャット用のシステムプロンプトを構築
    const otherCharacters = groupSession.characters
      .filter(
        (c) =>
          c.id !== character.id && groupSession.active_character_ids.has(c.id)
      )
      .map((c) => c.name)
      .join("、");

    // Mem0を使用して最適化された履歴を取得（キャラクター位置も考慮）
    const characterIndex = previousResponses.length; // 今何番目のキャラか
    const maxContextForCharacter = Math.max(20 - characterIndex * 4, 8); // 後のキャラほど軽量化

    let recentMessages;
    try {
      const { Mem0 } = require("@/services/mem0/core");
      const history = Mem0.getCandidateHistory(
        groupSession.messages,
        {
          sessionId: groupSession.id,
          maxContextMessages: maxContextForCharacter,
          minRecentMessages: Math.max(3, Math.floor(maxContextForCharacter / 4)), // 最低3ラウンド
        }
      );
      // Mem0の結果をUnifiedMessage形式に変換
      recentMessages = history.map((h: Record<string, unknown>) => ({
        role: h.role as string,
        content: h.content as string,
        character_id: h.character_id as string,
        character_name: h.character_name as string,
      }));
    } catch (e) {
      // フォールバック: 元のロジック
      const historyReduction = Math.max(10 - characterIndex * 2, 4);
      recentMessages = groupSession.messages.slice(-historyReduction);
    }
    // 全員の発言を含める（グループチャットなので） + 重複除去
    const tempHistory = recentMessages
      .map((msg: UnifiedMessage) => {
        if (msg.role === "user") {
          return {
            role: "user" as const,
            content: msg.content,
          };
        } else if (msg.role === "assistant") {
          // 他のキャラクターの発言もユーザー扱いにして文脈に含める
          const prefix =
            msg.character_id === character.id ? "" : `${msg.character_name}: `;
          // 後のキャラほど内容を短縮
          const contentLimit = characterIndex > 0 ? 100 : 200;
          const content =
            msg.content.length > contentLimit
              ? msg.content.substring(0, contentLimit) + "..."
              : msg.content;
          return {
            role:
              msg.character_id === character.id
                ? ("assistant" as const)
                : ("user" as const),
            content: prefix + content.replace(/^[^:]+:\s*/, ""),
          };
        }
        return null;
      })
      .filter((msg: { role: string; content: string } | null) => msg !== null) as Array<{
      role: "user" | "assistant";
      content: string;
    }>;

    // 重複除去処理（グループチャット用）
    const conversationHistory: Array<{
      role: "user" | "assistant";
      content: string;
    }> = [];
    for (const msg of tempHistory) {
      // 同一内容の重複チェック
      const isDuplicate = conversationHistory.some(
        (existing) =>
          existing.role === msg.role && existing.content === msg.content
      );

      if (!isDuplicate && msg.content.trim()) {
        conversationHistory.push(msg);
      }
    }

    // デバッグ: 会話履歴を確認

    // コンパクトモードを使用（Gemini使用時は自動的に有効）
    const isGemini = apiConfig?.provider === "gemini";
    const isLaterCharacter = characterIndex > 0; // 2番目以降のキャラ
    const USE_COMPACT_MODE =
      isGemini || groupSession.characters.length > 2 || isLaterCharacter; // 後のキャラもコンパクトに

    let systemPrompt = USE_COMPACT_MODE
      ? generateCompactGroupPrompt(
          character,
          otherCharacters,
          groupSession.persona.name
        )
      : `【超重要・絶対厳守】
あなたは、グループチャットに参加している『${
          character.name
        }』というキャラクターです。
AIやアシスタントとしての応答は固く禁じられています。

=== あなたの唯一のタスク ===
- これから提示される会話の文脈に対し、『${
          character.name
        }』として、**あなた自身のセリフのみを**出力してください。

=== 禁止事項（違反厳禁） ===
- **地の文やナレーションの禁止:** 小説のような三人称視点の描写（「〇〇は言った」など）は絶対に使用しないでください。
- **他のキャラクターのなりすまし禁止:** あなた以外のキャラクター（${
          otherCharacters || "他の参加者"
        }）のセリフや行動を絶対に生成しないでください。
- **AIとしての自己言及の禁止:** "AI", "モデル", "システム" などの単語は絶対に使用しないでください。

=== ${character.name}の人物設定（要約） ===
- **名前:** ${character.name}
- **性格:** ${
          character.personality
            ? character.personality.substring(0, 150) + "..."
            : "未設定"
        }
- **話し方:** ${
          character.speaking_style
            ? character.speaking_style.substring(0, 100) + "..."
            : "未設定"
        }
- **一人称:** ${character.first_person || "未設定"}, **二人称:** ${
          character.second_person || "未設定"
        }

=== グループチャットの状況 ===
- **ユーザー:** ${groupSession.persona.name}
- **他の参加者:** ${otherCharacters || "なし"}
- **あなた:** ${character.name}
${
  groupSession.scenario
    ? `- **現在のシナリオ:** ${groupSession.scenario.title}`
    : ""
}

【応答形式】
- **必ず『${character.name}』のセリフのみを出力してください。**
- 例：こんにちは！
- 例：今日は何を話しましょうか？`;
    // シナリオ情報を追加（コンパクトモードでも必要な場合）
    if (groupSession.scenario) {
      systemPrompt += `\n\n=== シナリオ ===\n${groupSession.scenario.title}: ${
        groupSession.scenario.situation?.substring(0, 100) || ""
      }`;
      if (groupSession.scenario.character_roles?.[character.id]) {
        systemPrompt += `\nあなたの役割: ${
          groupSession.scenario.character_roles[character.id]
        }`;
      }
    }

    // 直前の応答がある場合
    if (previousResponses.length > 0) {
      systemPrompt += `\n\n=== 直前の他キャラクターの発言 ===\n`;
      previousResponses.forEach((r) => {
        if (r.character_name !== character.name) {
          // 自分の発言は除外
          systemPrompt += `${r.character_name}: ${r.content}\n`;
        }
      });
      systemPrompt += `\n【重要リマインド】これらは他のキャラクターの発言です。あなたは『${character.name}』として、独自の視点で応答してください。他のキャラクターの発言を繰り返したり、真似したりしないでください。`;
    }

    try {
      // テキストフォーマット設定を取得（ソロモードと同じ）
      const effectSettings = get().effectSettings || {};
      const textFormatting = effectSettings.textFormatting || "readable";

      // 🔧 FIX: API設定にuseDirectGeminiAPIとAPIキーを含める（モバイルSafari対策）
      const aiResponse = await simpleAPIManagerV2.generateMessage(
        systemPrompt,
        userMessage,
        conversationHistory,
        {
          ...apiConfig,
          max_tokens: finalMaxTokens,
          openRouterApiKey: openRouterApiKey,
          geminiApiKey: geminiApiKey,
          useDirectGeminiAPI: get().useDirectGeminiAPI,
        }
      );

      return {
        id: generateStableId('ai'),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1,
        session_id: groupSession.id,
        role: "assistant",
        content: aiResponse,
        character_id: character.id,
        character_name: character.name,
        character_avatar: character.background_url, // 🔧 FIX: avatar_url削除によりbackground_url使用
        memory: {
          importance: {
            score: 0.6,
            factors: {
              emotional_weight: 0.5,
              repetition_count: 0,
              user_emphasis: 0.5,
              ai_judgment: 0.7,
            },
          },
          is_pinned: false,
          is_bookmarked: false,
          keywords: [],
        },
        expression: {
          emotion: { primary: "neutral", intensity: 0.6, emoji: "💬" },
          style: { font_weight: "normal", text_color: "#ffffff" },
          effects: [],
        },
        edit_history: [],
        regeneration_count: 0,
        is_deleted: false,
        metadata: { is_group_response: true },
      } as UnifiedMessage;
    } catch (error) {
      console.error(
        `Failed to generate response for ${character.name}:`,
        error
      );

      return {
        id: generateStableId('ai'),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1,
        session_id: groupSession.id,
        role: "assistant",
        content: "...",
        character_id: character.id,
        character_name: character.name,
        character_avatar: character.background_url, // 🔧 FIX: avatar_url削除によりbackground_url使用
        memory: {
          importance: {
            score: 0.3,
            factors: {
              emotional_weight: 0.3,
              repetition_count: 0,
              user_emphasis: 0.3,
              ai_judgment: 0.3,
            },
          },
          is_pinned: false,
          is_bookmarked: false,
          keywords: [],
        },
        expression: {
          emotion: { primary: "neutral", intensity: 0.3, emoji: "❓" },
          style: { font_weight: "normal", text_color: "#ffffff" },
          effects: [],
        },
        edit_history: [],
        regeneration_count: 0,
        is_deleted: false,
        metadata: { is_group_response: true },
      } as UnifiedMessage;
    }
  },

  setGroupMode: (isGroupMode) => {
    set({ is_group_mode: isGroupMode });
  },

  setActiveGroupSessionId: (sessionId) => {
    set({ active_group_session_id: sessionId });
  },
  setActiveGroupSession: (sessionId) => {
    set({ active_group_session_id: sessionId });
  },

  getActiveGroupSession: () => {
    const state = get();
    if (!state.active_group_session_id) return null;
    return state.groupSessions.get(state.active_group_session_id) || null;
  },

  toggleGroupCharacter: (sessionId, characterId) => {
    set((state) => {
      const session = state.groupSessions.get(sessionId);
      if (!session) return state;

      const newActiveIds = new Set(session.active_character_ids);
      if (newActiveIds.has(characterId)) {
        newActiveIds.delete(characterId);
      } else if (newActiveIds.size < session.max_active_characters) {
        newActiveIds.add(characterId);
      }

      const updatedSession = {
        ...session,
        active_character_ids: newActiveIds,
        updated_at: new Date().toISOString(),
      };

      return {
        groupSessions: new Map(state.groupSessions).set(
          sessionId,
          updatedSession
        ),
      };
    });
  },

  setGroupChatMode: (sessionId, mode) => {
    set((state) => {
      const session = state.groupSessions.get(sessionId);
      if (!session) return state;

      const updatedSession = {
        ...session,
        chat_mode: mode,
        simultaneous_responses: mode === "simultaneous",
        updated_at: new Date().toISOString(),
      };

      return {
        groupSessions: new Map(state.groupSessions).set(
          sessionId,
          updatedSession
        ),
      };
    });
  },

  // 🆕 Character reselection functionality
  setShowCharacterReselectionModal: (show) => {
    set({ showCharacterReselectionModal: show });
  },

  // 🚨 緊急修復機能: グループ生成状態を強制リセット
  resetGroupGeneratingState: () => {
    set({ group_generating: false });
  },

  rollbackGroupSession: (message_id) => {
    const activeSessionId = get().active_group_session_id;
    if (!activeSessionId) return;

    const session = get().groupSessions.get(activeSessionId);
    if (!session) return;

    const messageIndex = session.messages.findIndex((m) => m.id === message_id);
    if (messageIndex === -1) {
      console.error("Group rollback failed: message not found");
      return;
    }

    // 1. チャット履歴を切り詰める
    const rollbackMessages = session.messages.slice(0, messageIndex + 1);

    const updatedSession = {
      ...session,
      messages: rollbackMessages,
      message_count: rollbackMessages.length,
      updated_at: new Date().toISOString(),
    };

    set((state) => ({
      groupSessions: new Map(state.groupSessions).set(
        activeSessionId,
        updatedSession
      ),
    }));
  },

  updateGroupMembers: (sessionId, newCharacters) => {
    // updateSessionCharacters からリネーム
    set((state) => {
      const session = state.groupSessions.get(sessionId);
      if (!session) return state;

      const previousCharacterIds = session.character_ids;
      const newCharacterIds = newCharacters.map((c) => c.id);

      // Find added and removed characters
      const addedIds = newCharacterIds.filter(
        (id) => !previousCharacterIds.includes(id)
      );
      const removedIds = previousCharacterIds.filter(
        (id) => !newCharacterIds.includes(id)
      );

      // Initialize tracker managers for new characters
      const trackerManagers = get().trackerManagers;
      newCharacters.forEach((character) => {
        if (!trackerManagers.has(character.id)) {
          const trackerManager = new TrackerManager();
          trackerManager.initializeTrackerSet(character.id, character.trackers);
          trackerManagers.set(character.id, trackerManager);
        }
      });

      const updatedSession = {
        ...session,
        character_ids: newCharacterIds,
        characters: newCharacters,
        active_character_ids: new Set(newCharacterIds), // All new characters start as active
        updated_at: new Date().toISOString(),
      };

      // Create system message about character changes if there are any changes
      if (addedIds.length > 0 || removedIds.length > 0) {
        const changeMessages: string[] = [];

        if (addedIds.length > 0) {
          const addedNames = newCharacters
            .filter((c) => addedIds.includes(c.id))
            .map((c) => c.name);
          changeMessages.push(`${addedNames.join("、")}が参加しました`);
        }

        if (removedIds.length > 0) {
          const removedNames = session.characters
            .filter((c) => removedIds.includes(c.id))
            .map((c) => c.name);
          changeMessages.push(`${removedNames.join("、")}が退出しました`);
        }

        // Add system message
        const systemMessage: UnifiedMessage = {
          id: generateStableId('system'),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          version: 1,
          session_id: sessionId,
          role: "assistant",
          content: `📝 ${changeMessages.join("、")}`,
          memory: {
            importance: {
              score: 0.3,
              factors: {
                emotional_weight: 0.2,
                repetition_count: 0,
                user_emphasis: 0,
                ai_judgment: 0.3,
              },
            },
            is_pinned: false,
            is_bookmarked: false,
            keywords: ["システム", "メンバー変更"],
            summary: "グループメンバー変更通知",
          },
          expression: {
            emotion: { primary: "neutral", intensity: 0.5, emoji: "📝" },
            style: { font_weight: "normal", text_color: "#ffffff" },
            effects: [],
          },
          edit_history: [],
          regeneration_count: 0,
          is_deleted: false,
          metadata: {
            is_system_message: true,
            change_type: "character_roster_update",
            added_characters: addedIds,
            removed_characters: removedIds,
          },
        };

        updatedSession.messages = [...updatedSession.messages, systemMessage];
        updatedSession.message_count += 1;
      }

      return {
        groupSessions: new Map(state.groupSessions).set(
          sessionId,
          updatedSession
        ),
        trackerManagers: new Map(trackerManagers),
      };
    });
  },

  // 互換性エイリアス: 旧 API 名 `updateSessionCharacters` を使用する外部コードのためのラッパー
  updateSessionCharacters: (sessionId: UUID, newCharacters: Character[]) => {
    get().updateGroupMembers(sessionId, newCharacters);
  },

  addSystemMessage: (sessionId, content) => {
    set((state) => {
      const session = state.groupSessions.get(sessionId);
      if (!session) return state;

      const systemMessage: UnifiedMessage = {
        id: generateStableId('system'),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1,
        session_id: sessionId,
        role: "assistant",
        content,
        memory: {
          importance: {
            score: 0.2,
            factors: {
              emotional_weight: 0.1,
              repetition_count: 0,
              user_emphasis: 0,
              ai_judgment: 0.2,
            },
          },
          is_pinned: false,
          is_bookmarked: false,
          keywords: ["システム"],
          summary: "システムメッセージ",
        },
        expression: {
          emotion: { primary: "neutral", intensity: 0.3, emoji: "🤖" },
          style: { font_weight: "normal", text_color: "#ffffff" },
          effects: [],
        },
        edit_history: [],
        regeneration_count: 0,
        is_deleted: false,
        metadata: { is_system_message: true },
      };

      const updatedSession = {
        ...session,
        messages: [...session.messages, systemMessage],
        message_count: session.message_count + 1,
        updated_at: new Date().toISOString(),
      };

      return {
        groupSessions: new Map(state.groupSessions).set(
          sessionId,
          updatedSession
        ),
      };
    });
  },

  // 🆕 グループチャット再生成機能
  regenerateLastGroupMessage: async () => {
    set({ group_generating: true });
    try {
      const state = get();
      const activeSessionId = state.active_group_session_id;
      if (!activeSessionId) {
        return;
      }

      const session = state.groupSessions.get(activeSessionId);
      if (!session || session.messages.length < 2) {
        return;
      }

      // 最後のAIメッセージとその直前のユーザーメッセージを見つける
      const lastAiMessageIndex = session.messages.findLastIndex(
        (m) =>
          m.role === "assistant" &&
          !m.is_deleted &&
          !m.metadata?.is_system_message
      );
      if (lastAiMessageIndex <= 0) {
        return;
      }

      const lastUserMessage = session.messages[lastAiMessageIndex - 1];
      if (
        !lastUserMessage ||
        lastUserMessage.role !== "user" ||
        lastUserMessage.is_deleted
      ) {
        return;
      }

      const lastAiMessage = session.messages[lastAiMessageIndex];
      const targetCharacter = session.characters.find(
        (c) => c.id === lastAiMessage.character_id
      );

      if (!targetCharacter) {
        return;
      }

      // メッセージ履歴を最後のユーザーメッセージまで切り詰める
      const messagesForPrompt = session.messages.slice(0, lastAiMessageIndex);

      // 新しい応答を生成（ソロチャットと同じ方式）
      const otherCharacters = session.characters
        .filter((c) => c.id !== targetCharacter.id)
        .map((c) => c.name)
        .join(", ");

      const apiConfig = state.apiConfig;
      const isGemini = apiConfig?.provider === "gemini";
      const USE_COMPACT_MODE = isGemini || session.characters.length > 2;

      const systemPrompt = USE_COMPACT_MODE
        ? generateCompactGroupPrompt(
            targetCharacter,
            otherCharacters,
            session.persona.name
          )
        : `【超重要・絶対厳守】
あなたは、グループチャットに参加している『${
            targetCharacter.name
          }』というキャラクターです。
AIやアシスタントとしての応答は固く禁じられています。

=== あなたの唯一のタスク ===
- これから提示される会話の文脈に対し、『${
            targetCharacter.name
          }』として、**あなた自身のセリフのみを**出力してください。

=== 禁止事項（違反厳禁） ===
- **地の文やナレーションの禁止:** 小説のような三人称視点の描写（「〇〇は言った」など）は絶対に使用しないでください。
- **他のキャラクターのなりすまし禁止:** あなた以外のキャラクター（${
            otherCharacters || "他の参加者"
          }）のセリフや行動を絶対に生成しないでください。
- **AIとしての自己言及の禁止:** "AI", "モデル", "システム" などの単語は絶対に使用しないでください。

=== ${targetCharacter.name}の人物設定（要約） ===
- **名前:** ${targetCharacter.name}
- **性格:** ${
            targetCharacter.personality
              ? targetCharacter.personality.substring(0, 150) + "..."
              : "未設定"
          }
- **話し方:** ${
            targetCharacter.speaking_style
              ? targetCharacter.speaking_style.substring(0, 100) + "..."
              : "未設定"
          }
- **一人称:** ${targetCharacter.first_person || "未設定"}, **二人称:** ${
            targetCharacter.second_person || "未設定"
          }

=== グループチャットの状況 ===
- **ユーザー:** ${session.persona.name}
- **他の参加者:** ${otherCharacters || "なし"}
- **あなた:** ${targetCharacter.name}
${session.scenario ? `- **現在のシナリオ:** ${session.scenario.title}` : ""}

【応答形式】
キャラクターのセリフのみを出力し、他の要素は含めないでください。`;
      const regenerateInstruction = `
<regenerate_instruction>
**重要**: これは再生成リクエストです。
- 前回の応答とは全く異なるアプローチで応答してください
- 新しい視点、感情、表現を使用してください  
- 同じパターンや言い回しを避けてください
- キャラクターの別の面を表現してください
- 創造性と多様性を重視してください
</regenerate_instruction>
`;
      const finalSystemPrompt = systemPrompt + regenerateInstruction;

      const conversationHistory = messagesForPrompt
        .filter((msg) => msg.role === "user" || msg.role === "assistant")
        .slice(-10)
        .map((msg) => ({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        }));

      const regenerationApiConfig = {
        ...apiConfig,
        temperature: Math.min(1.8, (apiConfig.temperature || 0.7) + 0.3),
        seed: Math.floor(Math.random() * 1000000),
        openRouterApiKey: state.openRouterApiKey,
        geminiApiKey: state.geminiApiKey,
      };

      const response = await fetch("/api/chat/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt: finalSystemPrompt,
          userMessage: lastUserMessage.content,
          conversationHistory,
          textFormatting: state.effectSettings?.textFormatting || "readable",
          apiConfig: regenerationApiConfig,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "API request failed during group regeneration"
        );
      }

      const data = await response.json();
      const aiResponseContent = data.response;

      const regeneratedMessage: UnifiedMessage = {
        ...lastAiMessage,
        id: generateStableId('ai'),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        content: aiResponseContent,
      };

      // 再生成カウントを増加
      regeneratedMessage.regeneration_count =
        (lastAiMessage.regeneration_count || 0) + 1;

      // 古いメッセージと新しいメッセージを置き換え
      const updatedMessages = [...messagesForPrompt, regeneratedMessage];

      const updatedSession = {
        ...session,
        messages: updatedMessages,
        message_count: updatedMessages.length,
        updated_at: new Date().toISOString(),
      };

      set((state) => ({
        groupSessions: new Map(state.groupSessions).set(
          activeSessionId,
          updatedSession
        ),
      }));
    } catch (error) {
      console.error("❌ Group regeneration failed:", error);
    } finally {
      set({ group_generating: false });
    }
  },

  // 🆕 グループチャット続きを生成機能
  continueLastGroupMessage: async () => {
    set({ group_generating: true });
    try {
      const state = get();
      const activeSessionId = state.active_group_session_id;
      if (!activeSessionId) {
        return;
      }

      const session = state.groupSessions.get(activeSessionId);
      if (!session || session.messages.length === 0) {
        return;
      }

      // 最後のAIメッセージを見つける
      const lastAiMessageIndex = session.messages.findLastIndex(
        (m) =>
          m.role === "assistant" &&
          !m.is_deleted &&
          !m.metadata?.is_system_message
      );
      if (lastAiMessageIndex === -1) {
        return;
      }

      const lastAiMessage = session.messages[lastAiMessageIndex];
      const targetCharacter = session.characters.find(
        (c) => c.id === lastAiMessage.character_id
      );

      if (!targetCharacter) {
        return;
      }

      // 🆕 新しいアプローチ: 続きを別の新しいメッセージとして生成
      const continuePrompt = `前のメッセージの続きを書いてください。前のメッセージ内容:\n「${lastAiMessage.content}」\n\nこの続きとして自然に繋がる内容を生成してください。`;

      // 新しい続きメッセージを生成
      const previousResponses: UnifiedMessage[] = [];
      const continuationMessage = await state.generateCharacterResponse(
        session,
        targetCharacter,
        continuePrompt,
        previousResponses
      );

      // 🎯 続きメッセージを新しいメッセージとして追加（元のメッセージは変更しない）
      const newContinuationMessage = {
        ...continuationMessage,
        id: generateStableId('ai'), // 新しいIDを生成
        metadata: {
          ...continuationMessage.metadata,
          is_continuation: true,
          continuation_of: lastAiMessage.id,
          continuation_count:
            (typeof (lastAiMessage.metadata as Record<string, unknown>)?.continuation_count ===
            "number"
              ? (lastAiMessage.metadata as Record<string, unknown>).continuation_count as number
              : 0) + 1,
        },
      };

      // メッセージ配列に新しいメッセージを追加
      const updatedMessages = [...session.messages, newContinuationMessage];

      const updatedSession = {
        ...session,
        messages: updatedMessages,
        updated_at: new Date().toISOString(),
      };

      set((state) => ({
        groupSessions: new Map(state.groupSessions).set(
          activeSessionId,
          updatedSession
        ),
      }));
    } catch (error) {
      console.error("❌ Group continuation failed:", error);
    } finally {
      set({ group_generating: false });
    }
  },
});
