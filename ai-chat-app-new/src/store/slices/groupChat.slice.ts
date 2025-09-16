import { StateCreator } from 'zustand';
import { UnifiedMessage, UUID, Character, Persona } from '@/types';
import { GroupChatSession, GroupChatMode, GroupChatScenario } from '@/types/core/group-chat.types';
import { simpleAPIManagerV2 } from '@/services/simple-api-manager-v2';
import { TrackerManager } from '@/services/tracker/tracker-manager';
import { generateCompactGroupPrompt } from '@/utils/character-summarizer';
import { GroupEmotionAnalyzer } from '@/services/emotion/GroupEmotionAnalyzer';
import { soundService } from '@/services/SoundService';
import { AppStore } from '..';
import {
  generateGroupSessionId,
  generateWelcomeMessageId,
  generateUserMessageId,
  generateAIMessageId,
  generateSystemMessageId
} from '@/utils/uuid';
import {
  generateGroupContinuationPrompt,
  prepareRegenerationHistory
} from '@/utils/prompt/continuation-prompts';
import { cleanConversationHistory } from '@/utils/conversation-cleaner';

// 🎭 グループ感情から絵文字への変換ヘルパー
const getGroupEmotionEmoji = (emotion: string): string => {
  const emotionEmojiMap: Record<string, string> = {
    'joy': '😊',
    'sadness': '😢',
    'anger': '😠',
    'fear': '😨',
    'surprise': '😲',
    'disgust': '😖',
    'neutral': '😐',
    'love': '💕',
    'excitement': '🤩',
    'anxiety': '😰'
  };
  return emotionEmojiMap[emotion] || '😐';
};

export interface GroupChatSlice {
  groupSessions: Map<UUID, GroupChatSession>;
  active_group_session_id: UUID | null;
  is_group_mode: boolean;
  group_generating: boolean;
  
  // Character reselection state
  showCharacterReselectionModal: boolean;
  
  createGroupSession: (characters: Character[], persona: Persona, mode?: GroupChatMode, groupName?: string, scenario?: GroupChatScenario) => Promise<UUID>;
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
  deleteGroupSession: (sessionId: UUID) => void; // セッション削除
  deleteGroupMessage: (sessionId: UUID, messageId: UUID) => void; // メッセージ削除
  clearGroupSession: (sessionId: UUID) => void; // セッションクリア
  getAllGroupSessions: () => GroupChatSession[]; // 全セッション取得

  // 🚨 緊急修復機能
  resetGroupGeneratingState: () => void; // グループ生成状態を強制リセット
  
  // ヘルパー関数
  generateCharacterResponse: (groupSession: GroupChatSession, character: Character, userMessage: string, previousResponses: UnifiedMessage[]) => Promise<UnifiedMessage>;
}

export const createGroupChatSlice: StateCreator<AppStore, [], [], GroupChatSlice> = (set, get) => ({
  groupSessions: new Map(),
  active_group_session_id: null,
  is_group_mode: false,
  group_generating: false,
  showCharacterReselectionModal: false,
  
  createGroupSession: async (characters, persona, mode = 'sequential', groupName, scenario) => {
    const groupSessionId = generateGroupSessionId();
    
    // シナリオ有りの場合の初期メッセージ
    const initialContent = scenario 
      ? scenario.initial_prompt || `${scenario.title}が始まります。${scenario.situation}`
      : `${characters.map(c => c.name).join('、')}がグループチャットに参加しました！`;
    
    const groupSession: GroupChatSession = {
      id: groupSessionId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
      is_deleted: false,
      metadata: {},
      
      name: groupName || `${characters.map(c => c.name).join('、')}とのグループチャット`,
      character_ids: characters.map(c => c.id),
      characters,
      active_character_ids: new Set(characters.map(c => c.id)),
      persona,
      scenario, // シナリオ情報を追加
      messages: [
        {
          id: generateWelcomeMessageId(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          version: 1,
          session_id: groupSessionId,
          is_deleted: false,
          role: 'assistant',
          content: initialContent,
          memory: {
            importance: { score: 0.3, factors: { emotional_weight: 0.2, repetition_count: 0, user_emphasis: 0, ai_judgment: 0.3 } },
            is_pinned: false,
            is_bookmarked: false,
            keywords: ['グループチャット', '開始'],
            summary: 'グループチャット開始メッセージ'
          },
          expression: {
            emotion: { primary: 'happy', intensity: 0.7, emoji: '👥' },
            style: { font_weight: 'normal', text_color: '#ffffff' },
            effects: []
          },
          edit_history: [],
          regeneration_count: 0,
          metadata: { is_group_response: true }
        }
      ],
      
      chat_mode: mode,
      max_active_characters: 99,
      speaking_order: characters.map(c => c.id),
      voice_settings: new Map(),
      response_delay: 1500, // 1.5秒に増やして自然な間を作る
      simultaneous_responses: mode === 'simultaneous',
      
      message_count: 1,
      last_message_at: new Date().toISOString()
    };

    // 各キャラクターのトラッカーマネージャーを初期化
    const trackerManagers = get().trackerManagers;
    characters.forEach(character => {
      if (!trackerManagers.has(character.id)) {
        const trackerManager = new TrackerManager();
        trackerManager.initializeTrackerSet(character.id, character.trackers);
        trackerManagers.set(character.id, trackerManager);
      }
    });

    set(state => ({
      groupSessions: new Map(state.groupSessions).set(groupSessionId, groupSession),
      trackerManagers: new Map(trackerManagers),
      active_group_session_id: groupSessionId,
      is_group_mode: true
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
        id: generateUserMessageId(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1,
        session_id: activeGroupSessionId,
        role: 'user',
        content,
        image_url: imageUrl,
        memory: {
          importance: { score: 0.7, factors: { emotional_weight: 0.5, repetition_count: 0, user_emphasis: 0.8, ai_judgment: 0.6 } },
          is_pinned: false,
          is_bookmarked: false,
          keywords: [],
        },
        expression: {
          emotion: { primary: 'neutral', intensity: 0.5, emoji: '😊' },
          style: { font_weight: 'normal', text_color: '#ffffff' },
          effects: []
        },
        edit_history: [],
        regeneration_count: 0,
        is_deleted: false,
        metadata: {}
      };

      groupSession.messages.push(userMessage);

      // 🧠 感情分析: ユーザーメッセージ (バックグラウンド処理)
      const emotionalIntelligenceFlags = get().emotionalIntelligenceFlags;
      if (emotionalIntelligenceFlags?.emotion_analysis_enabled) {
        setTimeout(async () => {
          try {
            const groupAnalyzer = new GroupEmotionAnalyzer();
            const conversationalContext = {
              recentMessages: groupSession.messages.slice(-30), // 感情分析用の履歴も増やす
              messageCount: groupSession.message_count + 1,
              activeCharacters: groupSession.characters,
              sessionType: 'group' as const,
              sessionId: activeGroupSessionId,
              sessionDuration: Math.floor((new Date().getTime() - new Date(groupSession.created_at).getTime()) / 60000),
              conversationPhase: 'development' as const
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
                  emoji: getGroupEmotionEmoji(emotionResult.emotion.primaryEmotion)
                },
                style: { font_weight: 'normal' as const, text_color: '#ffffff' },
                effects: []
              }
            };
            
            // セッションを更新（非同期）
            set(state => {
              const currentSession = state.groupSessions.get(activeGroupSessionId);
              if (currentSession) {
                const messageIndex = currentSession.messages.findIndex(m => m.id === userMessage.id);
                if (messageIndex !== -1) {
                  const updatedMessages = [...currentSession.messages];
                  updatedMessages[messageIndex] = updatedUserMessage;
                  const updatedSession = { ...currentSession, messages: updatedMessages };
                  return {
                    groupSessions: new Map(state.groupSessions).set(activeGroupSessionId, updatedSession)
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
        .map(id => groupSession.characters.find(c => c.id === id))
        .filter((char): char is Character => char !== undefined);


      const responses: UnifiedMessage[] = [];

      if (groupSession.chat_mode === 'simultaneous') {
        // ⚡ スケジューリング改善: 2キャラクターずつバッチ処理でレート制限回避
        const BATCH_SIZE = 2;
        const STAGGER_DELAY = 300; // 300ms間隔
        
        for (let i = 0; i < activeCharacters.length; i += BATCH_SIZE) {
          const batch = activeCharacters.slice(i, i + BATCH_SIZE);
          
          const batchPromises = batch.map(async (character, batchIndex) => {
            const globalIndex = i + batchIndex;
            const response = await get().generateCharacterResponse(groupSession, character, content, []);
            return { ...response, metadata: { ...response.metadata, response_order: globalIndex } };
          });
          
          const batchResponses = await Promise.all(batchPromises);
          responses.push(...batchResponses);
          
          // 最後のバッチでない場合は遅延
          if (i + BATCH_SIZE < activeCharacters.length) {
            await new Promise(resolve => setTimeout(resolve, STAGGER_DELAY));
          }
        }
        
      } else if (groupSession.chat_mode === 'random') {
        // ランダム応答 - アクティブキャラクターからランダムに1人選択
        // Use deterministic character selection to avoid hydration issues
        const characterIndex = (get().groupSessions.get(groupSession.id)?.messages.length || 0) % activeCharacters.length;
        const randomCharacter = activeCharacters[characterIndex];
        if (randomCharacter) { // null安全性チェック
          const response = await get().generateCharacterResponse(groupSession, randomCharacter, content, []);
          responses.push({ ...response, metadata: { ...response.metadata, response_order: 0 } });
        }
        
      } else if (groupSession.chat_mode === 'smart') {
        // スマート応答 - AIが最適なキャラクターを選択
        // とりあえず最初のキャラクターを選択（後で改善可能）
        const smartCharacter = activeCharacters[0];
        if (smartCharacter) { // null安全性チェック
          const response = await get().generateCharacterResponse(groupSession, smartCharacter, content, []);
          responses.push({ ...response, metadata: { ...response.metadata, response_order: 0 } });
        }
        
      } else {
        // 順次応答 (sequential) - キャラクターが順番に応答
        for (let i = 0; i < activeCharacters.length; i++) {
          const character = activeCharacters[i];
          const response = await get().generateCharacterResponse(groupSession, character, content, responses);
          response.metadata = { ...response.metadata, response_order: i };
          responses.push(response);
          
          // 即座にメッセージを追加して画面に表示
          groupSession.messages.push(response);
          
          // 状態を更新してUIをリフレッシュ
          set(state => ({
            groupSessions: new Map(state.groupSessions).set(groupSession.id, {
              ...groupSession,
              messages: [...groupSession.messages]
            })
          }));
          
          // 少し遅延
          if (i < activeCharacters.length - 1 && groupSession.response_delay > 0) {
            await new Promise(resolve => setTimeout(resolve, groupSession.response_delay));
          }
        }
      }

      // sequentialモード以外の場合のみ、最後にまとめて追加
      if (groupSession.chat_mode !== 'sequential') {
        groupSession.messages.push(...responses);
      }
      groupSession.message_count += responses.length + 1; // ユーザーメッセージも含む
      groupSession.last_message_at = new Date().toISOString();
      groupSession.updated_at = new Date().toISOString();

      set(state => ({
        groupSessions: new Map(state.groupSessions).set(activeGroupSessionId, groupSession)
      }));

      // 🎭 感情分析: AI応答群 (バックグラウンド処理)
      if (emotionalIntelligenceFlags?.emotion_analysis_enabled && responses.length > 0) {
        setTimeout(async () => {
          try {
            const groupAnalyzer = new GroupEmotionAnalyzer();
            const conversationalContext = {
              recentMessages: groupSession.messages.slice(-30), // 感情分析用の履歴も増やす
              messageCount: groupSession.message_count,
              activeCharacters: groupSession.characters,
              sessionType: 'group' as const,
              sessionId: activeGroupSessionId,
              sessionDuration: Math.floor((new Date().getTime() - new Date(groupSession.created_at).getTime()) / 60000),
              conversationPhase: 'development' as const
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
                        emoji: getGroupEmotionEmoji(emotionResult.emotion.primaryEmotion)
                      },
                      style: { font_weight: 'normal' as const, text_color: '#ffffff' },
                      effects: []
                    }
                  };
                } catch (error) {
                  // Individual response emotion analysis failed, continuing without emotion data
                  return response; // Return original on failure
                }
              })
            );
            
            // セッションを更新（感情分析結果を反映）
            set(state => {
              const currentSession = state.groupSessions.get(activeGroupSessionId);
              if (currentSession) {
                const updatedMessages = [...currentSession.messages];
                
                // 各応答メッセージを感情分析結果で更新
                emotionUpdatedResponses.forEach(updatedResponse => {
                  const messageIndex = updatedMessages.findIndex(m => m.id === updatedResponse.id);
                  if (messageIndex !== -1) {
                    updatedMessages[messageIndex] = updatedResponse;
                  }
                });
                
                const updatedSession = { ...currentSession, messages: updatedMessages };
                return {
                  groupSessions: new Map(state.groupSessions).set(activeGroupSessionId, updatedSession)
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
            if (!get().emotionalIntelligenceFlags.emotional_memory_enabled) {
              return Promise.resolve([]);
            }
            try {
              const { autoMemoryManager } = await import('@/services/memory/auto-memory-manager');
              return await Promise.all(responses.map(response => 
                autoMemoryManager.processNewMessage(
                  response,
                  activeGroupSessionId,
                  response.character_id,
                  get().createMemoryCard
                )
              ));
            } catch (error) {
              console.error('Failed to load memory manager:', error);
              return Promise.resolve();
            }
          })(),
          // 🎯 各キャラクターのトラッカー更新処理（autoTrackerUpdate設定チェック追加）
          get().effectSettings.autoTrackerUpdate ? Promise.all(activeCharacters.map(character => {
            const trackerManager = trackerManagers.get(character.id);
            if (!trackerManager) return Promise.resolve();
            
            return Promise.all([
              // ユーザーメッセージに対するトラッカー更新
              trackerManager.analyzeMessageForTrackerUpdates(userMessage, character.id),
              // 該当キャラクターのレスポンスに対するトラッカー更新
              ...responses
                .filter(response => response.character_id === character.id)
                .map(response => trackerManager.analyzeMessageForTrackerUpdates(response, character.id))
            ]);
          })) : Promise.resolve([])
        ]).then(results => {
          const memoryResults = results[0];
          const trackerResults = results[1];
          
          if (memoryResults.status === 'rejected') {
            console.error('🧠 Group chat auto-memory processing failed:', memoryResults.reason);
          } else {
          }
          
          if (trackerResults.status === 'rejected') {
            console.error('🎯 Group chat tracker analysis failed:', trackerResults.reason);
          } else if (trackerResults.status === 'fulfilled' && trackerResults.value) {
            const allUpdates = trackerResults.value.flat().flat();
          }
          
        }).catch(error => {
          console.error('⚠️ Group chat background processing error:', error);
        });
      }, 0); // 次のEvent Loopで実行しUIをブロックしない

    } catch (error) {
      console.error('Group message generation failed:', error);
    } finally {
      // Play notification sound when group messages are received
      soundService.playMessageReceived();
      set({ group_generating: false });
    }
  },

  generateCharacterResponse: async (groupSession, character, userMessage, previousResponses) => {
    // API設定を取得（ソロモードと同じ方法で）
    const apiConfig = get().apiConfig || {};
    const openRouterApiKey = get().openRouterApiKey;
    const geminiApiKey = get().geminiApiKey;
    
    
    // グループチャット用のトークン設定（均等配分しない - 各キャラが十分な長さで話せるように）
    const activeCharCount = groupSession.active_character_ids.size;
    const configMaxTokens = apiConfig.max_tokens || 800;

    // 最小保証トークン数を大幅に引き上げ（均等配分は使わない）
    const baseTokens = Math.max(configMaxTokens, 800); // 最小800トークン保証

    // シナリオボーナス（条件式を修正）
    const hasLongScenario = (groupSession.scenario?.situation?.length || 0) > 100;
    const scenarioBonus = hasLongScenario ? 200 : 100;

    // 会話の複雑さに応じたボーナス
    const complexityBonus = previousResponses.length > 2 ? 200 : previousResponses.length > 0 ? 100 : 0;

    // 最終トークン数（十分な長さを確保）
    const finalMaxTokens = Math.min(baseTokens + scenarioBonus + complexityBonus, 2000); // 上限を2000に拡大

    console.log(`🎯 Group chat tokens for ${character.name}: base=${baseTokens}, scenario=${scenarioBonus}, complexity=${complexityBonus}, final=${finalMaxTokens}`);

    
    // グループチャット用のシステムプロンプトを構築
    const otherCharacters = groupSession.characters
      .filter(c => c.id !== character.id && groupSession.active_character_ids.has(c.id))
      .map(c => c.name)
      .join('、');

    // グループチャットでは履歴を共有するため、より多くの履歴を保持
    const characterIndex = previousResponses.length; // 今何番目のキャラか

    // 履歴は全キャラで共有されるため、多めに保持（最小20、最大50メッセージ）
    const baseHistory = 30; // 基本履歴数
    const characterBonus = characterIndex === 0 ? 20 : characterIndex === 1 ? 10 : 0; // 最初のキャラほど多く
    const historyCount = Math.min(baseHistory + characterBonus, 50); // 最大50メッセージ

    const recentMessages = groupSession.messages.slice(-historyCount);
    console.log(`📚 ${character.name} is using ${recentMessages.length} messages from history`);
    // グループチャット用の会話履歴構築（全メンバーの発言を適切にフォーマット）
    const tempHistory = recentMessages
      .map(msg => {
        if (msg.role === 'user') {
          // ユーザーの発言
          return {
            role: 'user' as const,
            content: `${groupSession.persona.name}: ${msg.content}`
          };
        } else if (msg.role === 'assistant') {
          // キャラクターの発言
          if (msg.character_id === character.id) {
            // 自分の過去の発言はassistant扱い
            return {
              role: 'assistant' as const,
              content: msg.content
            };
          } else {
            // 他のキャラクターの発言はグループ文脈として含める（制限を緩和）
            const contentLimit = 500; // 全キャラ一律500文字まで保持
            const content = msg.content.length > contentLimit
              ? msg.content.substring(0, contentLimit) + '...'
              : msg.content;
            return {
              role: 'user' as const,
              content: `[${msg.character_name}]: ${content}`
            };
          }
        }
        return null;
      })
      .filter(msg => msg !== null) as Array<{role: 'user' | 'assistant', content: string}>;

    // 重複除去処理（グループチャット用）
    const conversationHistory: Array<{role: 'user' | 'assistant', content: string}> = [];
    for (const msg of tempHistory) {
      // 同一内容の重複チェック
      const isDuplicate = conversationHistory.some(existing => 
        existing.role === msg.role && 
        existing.content === msg.content
      );
      
      if (!isDuplicate && msg.content.trim()) {
        conversationHistory.push(msg);
      }
    }

    // デバッグ: 会話履歴を確認

    // コンパクトモードを使用（Gemini使用時は自動的に有効）
    const isGemini = apiConfig?.provider === 'gemini';
    const isLaterCharacter = characterIndex > 0; // 2番目以降のキャラ
    // バランスを考慮：Geminiと後のキャラはコンパクト、最初の2キャラまでは中間モード
    const USE_COMPACT_MODE = isGemini || characterIndex > 1; // 3人目以降はコンパクト
    const USE_BALANCED_MODE = !USE_COMPACT_MODE && (groupSession.characters.length > 2 || isLaterCharacter);
    
    // バランスの取れた中間モードを追加
    let systemPrompt = USE_COMPACT_MODE
      ? generateCompactGroupPrompt(character, otherCharacters, groupSession.persona.name)
      : USE_BALANCED_MODE
      ? `【グループチャット参加者】
あなたは『${character.name}』です。
グループチャットに${otherCharacters}、${groupSession.persona.name}と参加中。

【キャラクター設定】
- 一人称: ${character.first_person || '私'}、二人称: ${character.second_person || 'あなた'}
- 性格: ${character.personality || character.external_personality || '個性的な性格'}
- 話し方: ${character.speaking_style || '独自の話し方'}
${character.verbal_tics && character.verbal_tics.length > 0 ? `- 口癖: ${character.verbal_tics.slice(0, 3).join('、')}` : ''}
${character.likes && character.likes.length > 0 ? `- 好き: ${character.likes.slice(0, 3).join('、')}` : ''}
${character.background ? `- 背景: ${character.background.substring(0, 200)}` : ''}

【会話ルール】
1. ${character.name}として振る舞い、AIであることを隠す
2. 他キャラクターの発言は禁止
3. 会話の流れに合う場合は具体的な理由を含める
4. 感情を込めた自然な会話
5. 単調な相槌や繰り返しを避ける
6. 最低300-500文字程度の実質的な内容を含める

【出力】${character.name}のセリフのみ（十分な長さで）`
      : `【超重要・絶対厳守】
あなたは『${character.name}』というキャラクターです。
グループチャットに参加しており、他のメンバー（${otherCharacters}）と${groupSession.persona.name}と一緒に会話しています。

=== 段階1: キャラクター基本設定 ===
【重要】あなたは「${character.name}」であり、AIアシスタントではありません。
- 一人称: ${character.first_person || '私'}
- 二人称: ${character.second_person || 'あなた'}
- 話し方: ${character.speaking_style || '独自の話し方'}
- 性格: ${character.personality || character.external_personality || '個性的な性格'}

=== 段階2: 詳細な人物設定 ===
【基本情報】
- 名前: ${character.name}
- 年齢: ${character.age || '不明'}、職業: ${character.occupation || '不明'}
- 性格: ${character.personality || character.external_personality || '個性的で魅力的な性格'}
- 話し方: ${character.speaking_style || '独自の話し方'}
- 一人称: ${character.first_person || '私'}、二人称: ${character.second_person || 'あなた'}
- 口癖: ${character.verbal_tics?.join('、') || 'なし'}

【感情・価値観】
- 好きなもの: ${character.likes?.join('、') || '様々なこと'}
- 嫌いなもの: ${character.dislikes?.join('、') || '特定のこと'}
- 価値観: ${character.values?.join('、') || character.core_values || '独自の価値観'}

【背景・経歴】
${character.background || character.history || '興味深い背景を持つ'}

【特殊能力・特技】
${character.abilities?.join('、') || character.special_abilities || '独特の才能'}

=== 段階3: グループチャット環境設定 ===
- ユーザー: ${groupSession.persona.name}
- 他の参加者: ${otherCharacters || 'なし'}
- あなたの立場: ${character.name}として、個性的な視点で参加
${groupSession.scenario ? `- シナリオ: ${groupSession.scenario.title}` : ''}

=== 段階4: 会話の質と深度に関する指示 ===
1. **個性の発揮**: あなたの性格、価値観、感情を積極的に表現してください
2. **多様な反応パターン**:
   - 【質問型】深掘りする質問や確認の質問を投げかける
   - 【経験共有型】自分の似た経験や異なる経験を語る
   - 【感情表現型】驚き、喜び、心配、興奮などを素直に表現
   - 【分析型】状況を分析し、パターンや原因を指摘する
   - 【提案型】解決策やアイデア、新しい話題を提案する
   - 【反論型】異なる意見や視点を丁寧に提示する
3. **自然な会話の流れ**:
   - 前の発言者の名前を時々呼びかける（「${otherCharacters.split('、')[0] || 'みんな'}の言う通り...」など）
   - 短い相槌から長めの意見まで、状況に応じて変化させる
   - 会話の流れに応じて、時にはユーモアや皮肉も交える
   - 感情の起伏を表現（テンションの高低）
4. **深みのある応答**:
   - 「なぜそう思うのか」を含める
   - 会話の流れに自然に合う場合のみ、個人的なエピソードを話す
   - 他者の発言の特定部分を引用して反応する
   - 時には反対意見も恐れずに表明する
   - 無理に自分の背景や生い立ちを話さない
5. **禁止事項**:
   - 「そうだね」「なるほど」だけの単調な相槌
   - 前の発言の単純な繰り返し
   - 毎回同じパターンの返答
   - 表面的な共感だけの発言
   - AIであることを示唆する発言
   - 他のキャラクターになりすます
   - ナレーション・地の文を書く

=== 【会話を豊かにする要素】===
1. **感情の詳細な描写**: 「嬉しい」ではなく「胸が踊るような喜び」など具体的に
2. **会話の流れを重視**:
   - 他者の話題に沿った返答をする
   - 関連する場合のみ自分の体験を話す
   - 突然自分の生い立ちを語らない
3. **独自の視点**: そのキャラクターならではの解釈や意見
4. **感覚的描写**: 適度に色、音、匂い、感触などを含める
5. **内面の葛藤**: 自然な流れで迷いや不安を表現

=== 段階5: 禁止事項と制約 ===
- 他のキャラクターになりすまさない
- ${character.name}の視点と声でのみ発言する
- 単調な繰り返しを避け、毎回異なる角度から応答する
- 会話に深みと面白さを加える

=== 段階6: 感情表現と内面描写 ===
- 感情の変化を詳細に表現する
- 内面の葛藤や迷いも含める
- 五感を使った描写を加える
- キャラクターの価値観に基づく反応

=== 段階7: メモリーとトラッカー情報 ===
${previousResponses.length > 0 ? `- これまでの会話で${previousResponses.length}人が発言済み` : ''}
${groupSession.scenario ? `- シナリオ「${groupSession.scenario.title}」進行中` : ''}
- 会話の継続性と一貫性を保つ
- 過去の発言との矛盾を避ける

=== 段階8: 出力形式 ===
${character.name}としての自然な発言（セリフ）のみを出力してください。

=== 最終チェックリスト ===
☑ 感情の深さと複雑さが表現されているか？
☑ 具体的なエピソードや体験が含まれているか？
☑ キャラクターの個性が強く出ているか？
☑ 他のキャラクターの発言に具体的に反応しているか？
☑ 読者が想像できる描写があるか？`;
    // シナリオ情報を詳細に追加（重要度を上げる）
    if (groupSession.scenario) {
      systemPrompt += `\n\n=== 【重要】現在のシナリオ設定 ===\n`;
      systemPrompt += `タイトル: ${groupSession.scenario.title}\n`;
      systemPrompt += `状況: ${groupSession.scenario.situation || 'なし'}\n`; // 全文を含める

      if (groupSession.scenario.character_roles?.[character.id]) {
        systemPrompt += `\n【${character.name}の役割】: ${groupSession.scenario.character_roles[character.id]}\n`;
        systemPrompt += `この役割に基づいて、より深い感情表現と具体的な行動を取ってください。\n`;
      }

      // シナリオベースの追加指示
      systemPrompt += `\n【シナリオ内での振る舞い】\n`;
      systemPrompt += `- シナリオの状況に深く没入し、その世界観に即した発言をする\n`;
      systemPrompt += `- 役割に応じた専門知識や経験を活かした発言をする\n`;
      systemPrompt += `- 状況の緊張感や雰囲気を大切にし、それに応じた感情を表現する\n`;
      systemPrompt += `- 他のキャラクターとの関係性を意識し、対立や協調を演じる\n`;
    }

    // 直前の応答がある場合（グループチャット文脈の強化）
    if (previousResponses.length > 0) {
      systemPrompt += `\n\n=== このターンの他キャラクターの発言（順序通り） ===\n`;
      previousResponses.forEach((r, idx) => {
        if (r.character_name !== character.name) { // 自分の発言は除外
          systemPrompt += `${idx + 1}. ${r.character_name}: ${r.content}\n`;
        }
      });
      systemPrompt += `\n【グループチャットの流れと応答パターン】`;
      systemPrompt += `\n- これは${groupSession.persona.name}の発言に対する、グループメンバーたちの連続的な応答です。`;
      systemPrompt += `\n- 上記の発言を踏まえて、あなた（${character.name}）も自然にグループ会話に参加してください。`;

      // 相互作用パターンをランダムに選択（より詳細な指示）
      const interactionPatterns = [
        `\n- ${previousResponses[0]?.character_name || '他のキャラクター'}の意見に対して、賛同・反対・部分的同意など、ニュアンスのある立場を明確にし、その理由を詳しく述べる`,
        `\n- 誰かが言及した話題の背景や原因を探り、より深いレベルでの議論に発展させる。具体例を挙げながら説明する`,
        `\n- ${groupSession.persona.name}の発言の核心部分に触れる質問を投げかけ、その答えから更に深い洞察を引き出す`,
        `\n- 他のキャラクターの感情の背景を理解しようと努め、自分の類似体験を詳細に語り、共感を深める`,
        `\n- 現在の話題から連想される、より大きなテーマや問題を提起し、それがなぜ重要かを説明する`
      ];
      const selectedPattern = interactionPatterns[Math.floor(Math.random() * interactionPatterns.length)];
      systemPrompt += selectedPattern;

      systemPrompt += `\n- 他のキャラクターの発言に具体的に言及して反応する`;
      systemPrompt += `\n- 単調な同意や相槌だけでなく、実質的な内容を含める`;
      systemPrompt += `\n- ただし、あなたは『${character.name}』としてのみ発言してください。`;
    }

    try {
      // テキストフォーマット設定を取得（ソロモードと同じ）
      const effectSettings = get().effectSettings || {};
      const textFormatting = effectSettings.textFormatting || 'readable';
      
      // Base64画像データをクリーニング
      const cleanedHistory = cleanConversationHistory(conversationHistory);

      const aiResponse = await simpleAPIManagerV2.generateMessage(
        systemPrompt,
        userMessage,
        cleanedHistory,
        {
          ...apiConfig,
          max_tokens: finalMaxTokens
        }
      );

      return {
        id: generateAIMessageId(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1,
        session_id: groupSession.id,
        role: 'assistant',
        content: aiResponse,
        character_id: character.id,
        character_name: character.name,
        character_avatar: character.avatar_url || character.background_url, // Use avatar first, fallback to background
        memory: {
          importance: { score: 0.6, factors: { emotional_weight: 0.5, repetition_count: 0, user_emphasis: 0.5, ai_judgment: 0.7 } },
          is_pinned: false,
          is_bookmarked: false,
          keywords: [],
        },
        expression: {
          emotion: { primary: 'neutral', intensity: 0.6, emoji: '💬' },
          style: { font_weight: 'normal', text_color: '#ffffff' },
          effects: []
        },
        edit_history: [],
        regeneration_count: 0,
        is_deleted: false,
        metadata: { is_group_response: true }
      } as UnifiedMessage;

    } catch (error) {
      console.error(`Failed to generate response for ${character.name}:`, error);
      
      return {
        id: generateAIMessageId(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1,
        session_id: groupSession.id,
        role: 'assistant',
        content: '...',
        character_id: character.id,
        character_name: character.name,
        character_avatar: character.avatar_url || character.background_url, // Use avatar first, fallback to background
        memory: {
          importance: { score: 0.3, factors: { emotional_weight: 0.3, repetition_count: 0, user_emphasis: 0.3, ai_judgment: 0.3 } },
          is_pinned: false,
          is_bookmarked: false,
          keywords: [],
        },
        expression: {
          emotion: { primary: 'neutral', intensity: 0.3, emoji: '❓' },
          style: { font_weight: 'normal', text_color: '#ffffff' },
          effects: []
        },
        edit_history: [],
        regeneration_count: 0,
        is_deleted: false,
        metadata: { is_group_response: true }
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
    set(state => {
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
        updated_at: new Date().toISOString()
      };

      return {
        groupSessions: new Map(state.groupSessions).set(sessionId, updatedSession)
      };
    });
  },

  setGroupChatMode: (sessionId, mode) => {
    set(state => {
      const session = state.groupSessions.get(sessionId);
      if (!session) return state;

      const updatedSession = {
        ...session,
        chat_mode: mode,
        simultaneous_responses: mode === 'simultaneous',
        updated_at: new Date().toISOString()
      };

      return {
        groupSessions: new Map(state.groupSessions).set(sessionId, updatedSession)
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

    const messageIndex = session.messages.findIndex(m => m.id === message_id);
    if (messageIndex === -1) {
      console.error('Group rollback failed: message not found');
      return;
    }

    // メッセージインデックス以降のメッセージを削除（クリックしたメッセージは残さない）
    const rollbackMessages = session.messages.slice(0, messageIndex);
    
    const updatedSession = {
      ...session,
      messages: rollbackMessages,
      message_count: rollbackMessages.length,
      updated_at: new Date().toISOString(),
    };

    set(state => ({
      groupSessions: new Map(state.groupSessions).set(activeSessionId, updatedSession)
    }));
    
  },

  updateGroupMembers: (sessionId, newCharacters) => { // updateSessionCharacters からリネーム
    set(state => {
      const session = state.groupSessions.get(sessionId);
      if (!session) return state;

      const previousCharacterIds = session.character_ids;
      const newCharacterIds = newCharacters.map(c => c.id);
      
      // Find added and removed characters
      const addedIds = newCharacterIds.filter(id => !previousCharacterIds.includes(id));
      const removedIds = previousCharacterIds.filter(id => !newCharacterIds.includes(id));
      
      // Initialize tracker managers for new characters
      const trackerManagers = get().trackerManagers;
      newCharacters.forEach(character => {
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
        updated_at: new Date().toISOString()
      };

      // Create system message about character changes if there are any changes
      if (addedIds.length > 0 || removedIds.length > 0) {
        const changeMessages: string[] = [];
        
        if (addedIds.length > 0) {
          const addedNames = newCharacters
            .filter(c => addedIds.includes(c.id))
            .map(c => c.name);
          changeMessages.push(`${addedNames.join('、')}が参加しました`);
        }
        
        if (removedIds.length > 0) {
          const removedNames = session.characters
            .filter(c => removedIds.includes(c.id))
            .map(c => c.name);
          changeMessages.push(`${removedNames.join('、')}が退出しました`);
        }

        // Add system message
        const systemMessage: UnifiedMessage = {
          id: generateSystemMessageId(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          version: 1,
          session_id: sessionId,
          role: 'assistant',
          content: `📝 ${changeMessages.join('、')}`,
          memory: {
            importance: { score: 0.3, factors: { emotional_weight: 0.2, repetition_count: 0, user_emphasis: 0, ai_judgment: 0.3 } },
            is_pinned: false,
            is_bookmarked: false,
            keywords: ['システム', 'メンバー変更'],
            summary: 'グループメンバー変更通知'
          },
          expression: {
            emotion: { primary: 'neutral', intensity: 0.5, emoji: '📝' },
            style: { font_weight: 'normal', text_color: '#ffffff' },
            effects: []
          },
          edit_history: [],
          regeneration_count: 0,
          is_deleted: false,
          metadata: { 
            is_system_message: true,
            change_type: 'character_roster_update',
            added_characters: addedIds,
            removed_characters: removedIds
          }
        };

        updatedSession.messages = [...updatedSession.messages, systemMessage];
        updatedSession.message_count += 1;
      }

      return {
        groupSessions: new Map(state.groupSessions).set(sessionId, updatedSession),
        trackerManagers: new Map(trackerManagers)
      };
    });
  },

  addSystemMessage: (sessionId, content) => {
    set(state => {
      const session = state.groupSessions.get(sessionId);
      if (!session) return state;

      const systemMessage: UnifiedMessage = {
        id: generateSystemMessageId(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1,
        session_id: sessionId,
        role: 'assistant',
        content,
        memory: {
          importance: { score: 0.2, factors: { emotional_weight: 0.1, repetition_count: 0, user_emphasis: 0, ai_judgment: 0.2 } },
          is_pinned: false,
          is_bookmarked: false,
          keywords: ['システム'],
          summary: 'システムメッセージ'
        },
        expression: {
          emotion: { primary: 'neutral', intensity: 0.3, emoji: '🤖' },
          style: { font_weight: 'normal', text_color: '#ffffff' },
          effects: []
        },
        edit_history: [],
        regeneration_count: 0,
        is_deleted: false,
        metadata: { is_system_message: true }
      };

      const updatedSession = {
        ...session,
        messages: [...session.messages, systemMessage],
        message_count: session.message_count + 1,
        updated_at: new Date().toISOString()
      };

      return {
        groupSessions: new Map(state.groupSessions).set(sessionId, updatedSession)
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
      const lastAiMessageIndex = session.messages.findLastIndex(m => m.role === 'assistant' && !m.is_deleted && !m.metadata?.is_system_message);
      if (lastAiMessageIndex <= 0) {
        return;
      }

      const lastUserMessage = session.messages[lastAiMessageIndex - 1];
      if (!lastUserMessage || lastUserMessage.role !== 'user' || lastUserMessage.is_deleted) {
        return;
      }

      const lastAiMessage = session.messages[lastAiMessageIndex];
      const targetCharacter = session.characters.find(c => c.id === lastAiMessage.character_id);
      
      if (!targetCharacter) {
        return;
      }

      // メッセージ履歴を最後のユーザーメッセージまで切り詰める
      const messagesForPrompt = session.messages.slice(0, lastAiMessageIndex);

      // 新しい応答を生成（ソロチャットと同じ方式）
      const otherCharacters = session.characters
        .filter(c => c.id !== targetCharacter.id)
        .map(c => c.name)
        .join(', ');
      
      const apiConfig = state.apiConfig;
      const isGemini = apiConfig?.provider === 'gemini';
      const USE_COMPACT_MODE = isGemini || session.characters.length > 2;
      
      const systemPrompt = USE_COMPACT_MODE 
        ? generateCompactGroupPrompt(targetCharacter, otherCharacters, session.persona.name)
        : `【超重要・絶対厳守】
あなたは、グループチャットに参加している『${targetCharacter.name}』というキャラクターです。
AIやアシスタントとしての応答は固く禁じられています。

=== あなたの唯一のタスク ===
- これから提示される会話の文脈に対し、『${targetCharacter.name}』として、**あなた自身のセリフのみを**出力してください。

=== 禁止事項（違反厳禁） ===
- **地の文やナレーションの禁止:** 小説のような三人称視点の描写（「〇〇は言った」など）は絶対に使用しないでください。
- **他のキャラクターのなりすまし禁止:** あなた以外のキャラクター（${otherCharacters || '他の参加者'}）のセリフや行動を絶対に生成しないでください。
- **AIとしての自己言及の禁止:** "AI", "モデル", "システム" などの単語は絶対に使用しないでください。

=== ${targetCharacter.name}の人物設定（要約） ===
- **名前:** ${targetCharacter.name}
- **性格:** ${targetCharacter.personality ? targetCharacter.personality.substring(0, 150) + '...' : '未設定'}
- **話し方:** ${targetCharacter.speaking_style ? targetCharacter.speaking_style.substring(0, 100) + '...' : '未設定'}
- **一人称:** ${targetCharacter.first_person || '未設定'}, **二人称:** ${targetCharacter.second_person || '未設定'}

=== グループチャットの状況 ===
- **ユーザー:** ${session.persona.name}
- **他の参加者:** ${otherCharacters || 'なし'}
- **あなた:** ${targetCharacter.name}
${session.scenario ? `- **現在のシナリオ:** ${session.scenario.title}` : ''}

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

      const rawHistory = messagesForPrompt
        .filter(msg => msg.role === 'user' || msg.role === 'assistant')
        .slice(-30) // グループチャットでは履歴を多めに保持
        .map(msg => ({ role: msg.role as 'user' | 'assistant', content: msg.content }));
      // Base64画像データをクリーニング
      const conversationHistory = cleanConversationHistory(rawHistory);

      const regenerationApiConfig = {
        ...apiConfig,
        temperature: Math.min(1.8, (apiConfig.temperature || 0.7) + 0.3),
        seed: Math.floor(Math.random() * 1000000),
        openRouterApiKey: state.openRouterApiKey,
        geminiApiKey: state.geminiApiKey
      };

      const response = await fetch('/api/chat/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: finalSystemPrompt,
          userMessage: lastUserMessage.content,
          conversationHistory,
          textFormatting: state.effectSettings?.textFormatting || 'readable',
          apiConfig: regenerationApiConfig
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'API request failed during group regeneration');
      }

      const data = await response.json();
      const aiResponseContent = data.response;
      
      const regeneratedMessage: UnifiedMessage = {
        ...lastAiMessage,
        id: generateAIMessageId(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        content: aiResponseContent
      };

      // 再生成カウントを増加
      regeneratedMessage.regeneration_count = (lastAiMessage.regeneration_count || 0) + 1;

      // 古いメッセージと新しいメッセージを置き換え
      const updatedMessages = [...messagesForPrompt, regeneratedMessage];

      const updatedSession = {
        ...session,
        messages: updatedMessages,
        message_count: updatedMessages.length,
        updated_at: new Date().toISOString()
      };

      set(state => ({
        groupSessions: new Map(state.groupSessions).set(activeSessionId, updatedSession)
      }));

    } catch (error) {
      console.error('❌ Group regeneration failed:', error);
    } finally {
      // Play notification sound when regenerated message is received
      soundService.playMessageReceived();
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
      const lastAiMessageIndex = session.messages.findLastIndex(m => m.role === 'assistant' && !m.is_deleted && !m.metadata?.is_system_message);
      if (lastAiMessageIndex === -1) {
        return;
      }

      const lastAiMessage = session.messages[lastAiMessageIndex];
      const targetCharacter = session.characters.find(c => c.id === lastAiMessage.character_id);
      
      if (!targetCharacter) {
        return;
      }

      // 🆕 新しいアプローチ: 続きを別の新しいメッセージとして生成
      // 共通プロンプト生成関数を使用してユーザー代弁を防ぐ
      const otherCharacters = session.characters
        .filter(c => c.id !== targetCharacter.id)
        .map(c => c.name);
      const continuePrompt = generateGroupContinuationPrompt(
        lastAiMessage.content,
        targetCharacter.name,
        otherCharacters,
        session.persona.name || 'ユーザー'
      );

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
        id: generateAIMessageId(), // 新しいIDを生成
        metadata: {
          ...continuationMessage.metadata,
          is_continuation: true,
          continuation_of: lastAiMessage.id,
          continuation_count: (typeof (lastAiMessage.metadata as any)?.continuation_count === 'number' ? (lastAiMessage.metadata as any).continuation_count : 0) + 1
        }
      };

      // メッセージ配列に新しいメッセージを追加
      const updatedMessages = [...session.messages, newContinuationMessage];

      const updatedSession = {
        ...session,
        messages: updatedMessages,
        updated_at: new Date().toISOString()
      };

      set(state => ({
        groupSessions: new Map(state.groupSessions).set(activeSessionId, updatedSession)
      }));

    } catch (error) {
      console.error('❌ Group continuation failed:', error);
    } finally {
      // Play notification sound when continuation is received
      soundService.playMessageReceived();
      set({ group_generating: false });
    }
  },

  // セッション削除
  deleteGroupSession: (sessionId: UUID) => {
    set(state => {
      const newSessions = new Map(state.groupSessions);
      newSessions.delete(sessionId);

      // アクティブセッションが削除された場合はクリア
      const newActiveId = state.active_group_session_id === sessionId
        ? null
        : state.active_group_session_id;

      return {
        groupSessions: newSessions,
        active_group_session_id: newActiveId,
        is_group_mode: newActiveId !== null
      };
    });
  },

  // メッセージ削除
  deleteGroupMessage: (sessionId: UUID, messageId: UUID) => {
    set(state => {
      const session = state.groupSessions.get(sessionId);
      if (!session) return state;

      const updatedMessages = session.messages.filter(m => m.id !== messageId);
      const updatedSession = {
        ...session,
        messages: updatedMessages,
        message_count: updatedMessages.length,
        updated_at: new Date().toISOString()
      };

      return {
        groupSessions: new Map(state.groupSessions).set(sessionId, updatedSession)
      };
    });
  },

  // セッションクリア
  clearGroupSession: (sessionId: UUID) => {
    set(state => {
      const session = state.groupSessions.get(sessionId);
      if (!session) return state;

      // 初期メッセージのみ残す
      const initialMessage = session.messages[0];
      const updatedSession = {
        ...session,
        messages: initialMessage ? [initialMessage] : [],
        message_count: initialMessage ? 1 : 0,
        updated_at: new Date().toISOString()
      };

      return {
        groupSessions: new Map(state.groupSessions).set(sessionId, updatedSession)
      };
    });
  },

  // 全セッション取得
  getAllGroupSessions: () => {
    return Array.from(get().groupSessions.values());
  },
});
