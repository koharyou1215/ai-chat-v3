import { StateCreator } from 'zustand';
import { UnifiedChatSession, UnifiedMessage, UUID, Character, Persona } from '@/types';
import { 
  ProgressiveMessage, 
  ProgressiveSettings, 
  DEFAULT_PROGRESSIVE_SETTINGS 
} from '@/types/progressive-message.types';
// Removed unused imports
import { apiRequestQueue } from '@/services/api-request-queue';
import { simpleAPIManagerV2 } from '@/services/simple-api-manager-v2';
import { promptValidator } from '@/utils/prompt-validator';
import { promptBuilderService } from '@/services/prompt-builder.service';
import { progressivePromptBuilder } from '@/services/progressive-prompt-builder.service';
import { messageTransitionService } from '@/services/message-transition.service';
import { TrackerManager } from '@/services/tracker/tracker-manager';
import { autoMemoryManager } from '@/services/memory/auto-memory-manager';
import { SoloEmotionAnalyzer } from '@/services/emotion/SoloEmotionAnalyzer';
import { AppStore } from '..';
import { 
  generateSessionId, 
  generateWelcomeMessageId, 
  generateUserMessageId, 
  generateAIMessageId 
} from '@/utils/uuid';

// 🧠 感情から絵文字への変換ヘルパー
const getEmotionEmoji = (emotion: string): string => {
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

export interface ChatSlice {
  sessions: Map<UUID, UnifiedChatSession>;
  trackerManagers: Map<UUID, TrackerManager>;
  active_session_id: UUID | null;
  active_character_id: UUID | null;
  is_generating: boolean;
  showSettingsModal: boolean;
  currentInputText: string;
  lastError?: {
    type: 'regeneration' | 'continue' | 'send' | 'memory' | 'general';
    message: string;
    timestamp: string;
    details?: string;
  };
  
  createSession: (character: Character, persona: Persona) => Promise<UUID>;
  sendMessage: (content: string, imageUrl?: string) => Promise<void>;
  sendProgressiveMessage: (content: string, imageUrl?: string) => Promise<void>; // 🆕 プログレッシブ応答
  regenerateLastMessage: () => Promise<void>;
  continueLastMessage: () => Promise<void>; // 🆕 ソロチャット続きを生成機能を追加
  deleteMessage: (message_id: UUID) => void;
  clearActiveConversation: () => void;
  exportActiveConversation: () => void;
  rollbackSession: (message_id: UUID) => void; // 新しいアクションを追加
  setShowSettingsModal: (show: boolean) => void;
  setCurrentInputText: (text: string) => void;
  
  // 🚨 緊急修復機能
  resetGeneratingState: () => void; // 生成状態を強制リセット
  
  // For Sidebar
  setActiveSessionId: (sessionId: UUID | null) => void;
  deleteSession: (sessionId: UUID) => void;
  clearAllSessions: () => void;
  updateSession: (session: Partial<UnifiedChatSession> & { id: UUID }) => void;

  getActiveSession: () => UnifiedChatSession | null;
  getSessionMessages: (session_id: UUID) => UnifiedMessage[];
  
  // 履歴管理
  saveSessionToHistory: (session_id: UUID) => Promise<void>;
  loadSessionFromHistory: (session_id: UUID) => Promise<void>;
  pinSession: (session_id: UUID, isPinned: boolean) => void;
  
  // ヘルパー関数
  ensureTrackerManagerExists: (character: Character) => void;
}

export const createChatSlice: StateCreator<AppStore, [], [], ChatSlice> = (set, get) => {
  // Helper function to safely get session from Map or Object
  const getSessionSafely = (sessions: any, sessionId: string): UnifiedChatSession | undefined => {
    if (!sessions || !sessionId) return undefined;
    if (sessions instanceof Map) {
      return sessions.get(sessionId);
    } else if (typeof sessions === 'object') {
      return sessions[sessionId];
    }
    return undefined;
  };

  // Helper function to safely get tracker manager from Map or Object
  const getTrackerManagerSafely = (trackerManagers: any, key: string): TrackerManager | undefined => {
    if (!trackerManagers || !key) return undefined;
    if (trackerManagers instanceof Map) {
      return trackerManagers.get(key);
    } else if (typeof trackerManagers === 'object') {
      return trackerManagers[key];
    }
    return undefined;
  };

  // Helper function to create a new Map from either Map or Object
  const createMapSafely = (data: any): Map<string, any> => {
    if (!data) return new Map();
    if (data instanceof Map) {
      return new Map(data);
    } else if (typeof data === 'object') {
      return new Map(Object.entries(data));
    }
    return new Map();
  };

  return {
  sessions: new Map(),
  trackerManagers: new Map(),
  active_session_id: null,
  active_character_id: null,
  is_generating: false,
  showSettingsModal: false,
  currentInputText: '',
  
  createSession: async (character, persona) => {
    const sessionId = generateSessionId();
    const newSession: UnifiedChatSession = {
      id: sessionId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
      participants: {
        user: persona,
        characters: [character],
        active_character_ids: new Set([character.id])
      },
      messages: [
        {
          id: generateWelcomeMessageId(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          version: 1,
          session_id: sessionId,
          role: 'assistant',
          content: character.first_message || `こんにちは！${character.name}です。何かお手伝いできることはありますか？`,
          character_id: character.id,
          character_name: character.name,
          memory: {
            importance: { score: 0.5, factors: { emotional_weight: 0.3, repetition_count: 0, user_emphasis: 0, ai_judgment: 0.5 } },
            is_pinned: false,
            is_bookmarked: false,
            keywords: ['greeting', 'introduction'],
            summary: '挨拶メッセージ'
          },
          expression: {
            emotion: { primary: 'happy', intensity: 0.8, emoji: '😊' },
            style: { font_weight: 'normal', text_color: '#ffffff' },
            effects: []
          },
          edit_history: [],
          regeneration_count: 0,
          metadata: {},
          is_deleted: false
        }
      ],
      message_count: 1,
      memory_system: {
        immediate_memory: { messages: [], max_size: 3, retention_policy: 'fifo', last_accessed: '', access_count: 0 },
        working_memory: { messages: [], max_size: 10, retention_policy: 'importance', last_accessed: '', access_count: 0 },
        episodic_memory: { messages: [], max_size: 50, retention_policy: 'relevance', last_accessed: '', access_count: 0 },
        semantic_memory: { messages: [], max_size: 200, retention_policy: 'importance', last_accessed: '', access_count: 0 },
        permanent_memory: { pinned_messages: [], memory_cards: [], summaries: [] }
      },
      state_management: {
        trackers: new Map(),
        mood_state: { current: 'neutral', intensity: 0.5 }
      },
      context: {
        current_topic: 'greeting',
        // ... other context properties
      },
      session_info: {
        title: `${character.name}との会話`,
        description: '新しい会話セッション',
        tags: ['new-conversation', character.name.toLowerCase()]
      },
      statistics: {
        user_engagement: 0.8,
        conversation_quality: 0.9
      }
    };

    // Create and initialize TrackerManager for this character (not session)
    const existingTrackerManager = getTrackerManagerSafely(get().trackerManagers, character.id);
    let trackerManager = existingTrackerManager;
    
    if (!trackerManager) {
      // 新しいキャラクターの場合のみTrackerManagerを作成
      trackerManager = new TrackerManager();
      trackerManager.initializeTrackerSet(character.id, character.trackers);
    } else {
    }

    set(state => {
      const newSessions = createMapSafely(state.sessions).set(newSession.id, newSession);
      const newTrackerManagers = createMapSafely(state.trackerManagers).set(character.id, trackerManager);
      
      return {
        sessions: newSessions,
        trackerManagers: newTrackerManagers,
        active_session_id: newSession.id,
      };
    });

    return newSession.id;
  },

  sendMessage: async (content, imageUrl) => {
    // 🔄 グループモード判定: グループチャットの場合は専用処理を呼び出し
    const state = get();
    if (state.is_group_mode && state.active_group_session_id) {
      return await state.sendGroupMessage(content, imageUrl);
    }
    
    const activeSessionId = state.active_session_id;
    if (!activeSessionId) return;
    const activeSession = getSessionSafely(state.sessions, activeSessionId);
    if (!activeSession) return;

    if (state.is_generating) {
      return;
    }
    set({ is_generating: true });
    
    // 1. ユーザーメッセージを作成
    const userMessage: UnifiedMessage = {
      id: generateUserMessageId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
      session_id: activeSessionId,
      is_deleted: false,
      role: 'user',
      content,
      image_url: imageUrl,
      memory: {
        importance: { score: 0.7, factors: { emotional_weight: 0.5, repetition_count: 0, user_emphasis: 0.8, ai_judgment: 0.6 } },
        is_pinned: false,
        is_bookmarked: false,
        keywords: [],
        summary: undefined
      },
      expression: {
        emotion: { primary: 'neutral', intensity: 0.5, emoji: '😐' },
        style: { font_weight: 'normal', text_color: '#ffffff' },
        effects: []
      },
      edit_history: [],
      regeneration_count: 0,
      metadata: {}
    };
    
    // 2. ユーザーメッセージを即座にUIに反映
    const sessionWithUserMessage = {
        ...activeSession,
        messages: [...activeSession.messages, userMessage],
        message_count: activeSession.message_count + 1,
        updated_at: new Date().toISOString(),
    };
    set(state => ({
        sessions: createMapSafely(state.sessions).set(activeSessionId, sessionWithUserMessage)
    }));

    // 🧠 感情分析: ユーザーメッセージ (バックグラウンド処理)
    const emotionalIntelligenceFlags = get().emotionalIntelligenceFlags;
    if (emotionalIntelligenceFlags?.emotion_analysis_enabled) {
      setTimeout(async () => {
        try {
          const soloAnalyzer = new SoloEmotionAnalyzer();
          const conversationalContext = {
            recentMessages: sessionWithUserMessage.messages.slice(-5),
            messageCount: sessionWithUserMessage.message_count,
            activeCharacters: activeSession.participants.characters,
            sessionType: 'solo' as const,
            sessionId: activeSessionId,
            sessionDuration: Math.floor((new Date().getTime() - new Date(activeSession.created_at).getTime()) / 60000),
            conversationPhase: 'development' as const
          };
          
          const emotionResult = await soloAnalyzer.analyzeSoloEmotion(
            userMessage,
            conversationalContext,
            activeSession.participants.characters[0]?.id || '',
            'default_user'
          );
          
          // 感情分析結果をメッセージに反映
          const updatedUserMessage = {
            ...userMessage,
            expression: {
              emotion: {
                primary: emotionResult.emotion.primaryEmotion,
                intensity: emotionResult.emotion.intensity,
                emoji: getEmotionEmoji(emotionResult.emotion.primaryEmotion)
              },
              style: { font_weight: 'normal' as const, text_color: '#ffffff' },
              effects: []
            }
          };
          
          // セッションを更新（非同期）
          set(state => {
            const currentSession = getSessionSafely(state.sessions, activeSessionId);
            if (currentSession) {
              const messageIndex = currentSession.messages.findIndex(m => m.id === userMessage.id);
              if (messageIndex !== -1) {
                const updatedMessages = [...currentSession.messages];
                updatedMessages[messageIndex] = updatedUserMessage;
                const updatedSession = { ...currentSession, messages: updatedMessages };
                return {
                  sessions: createMapSafely(state.sessions).set(activeSessionId, updatedSession)
                };
              }
            }
            return state;
          });
          
        } catch (error) {
          // User emotion analysis failed, continuing without emotion data
        }
      }, 0);
    }

    // 3. AI応答生成などの重い処理を非同期で実行
    (async () => {
      try {
        const characterId = activeSession.participants.characters[0]?.id;
        const trackerManager = characterId ? getTrackerManagerSafely(get().trackerManagers, characterId) : null;
        

        // ⚡ プログレッシブプロンプト構築でUIフリーズを防止 (50-100ms)
        const { basePrompt, enhancePrompt } = await promptBuilderService.buildPromptProgressive(
            sessionWithUserMessage,
            content, 
            trackerManager || undefined
        );
        

        const apiConfig = get().apiConfig;
        // ⚡ 高優先度チャットリクエストをキューに追加（競合を防止）
        const requestId = `${activeSessionId}-${Date.now()}`;
        const modelName = apiConfig.model || 'gemini-2.5-flash';
        const response = await apiRequestQueue.enqueueChatRequest(async () => {
          
          // 🔍 デバッグ: プロンプト品質検証 (無効化)
          // if (process.env.NODE_ENV === 'development') {
          //   const character = activeSession.participants.characters[0];
          //   const validation = promptValidator.validatePrompt(basePrompt, character?.name || 'Character');
          //   console.log('🔍 Prompt Validation:', validation);
          //   
          //   if (validation.recommendation === 'critical') {
          //     console.error('🚨 Critical prompt issues detected:', validation.issues);
          //   } else if (validation.recommendation === 'warning') {
          //     console.warn('⚠️ Prompt warnings:', validation.issues);
          //   }
          // }
          
          // 軽量版で最初のAPIリクエストを開始
          const initialResponse = await fetch('/api/chat/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              systemPrompt: basePrompt, // 最初はベースプロンプトで開始
              userMessage: content,
              conversationHistory: (() => {
                // 重複除去と履歴クリーンアップ
                const recentMessages = activeSession.messages.slice(-10); // 多めに取得して重複除去後に5件に絞る
                const deduplicatedHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
                
                for (const msg of recentMessages) {
                  if (msg.role === 'user' || msg.role === 'assistant') {
                    const historyEntry = { role: msg.role as 'user' | 'assistant', content: msg.content };
                    
                    // 同一内容の重複チェック（連続する場合と全体での重複両方をチェック）
                    const isDuplicate = deduplicatedHistory.some(existing => 
                      existing.role === historyEntry.role && 
                      existing.content === historyEntry.content
                    );
                    
                    if (!isDuplicate && historyEntry.content.trim()) {
                      deduplicatedHistory.push(historyEntry);
                    }
                  }
                }
                
                // 最終的に最新5件のみ返す
                return deduplicatedHistory.slice(-5);
              })(),
              textFormatting: state.effectSettings.textFormatting,
              apiConfig: {
                ...apiConfig,
                openRouterApiKey: get().openRouterApiKey,
                geminiApiKey: get().geminiApiKey
              },
              useEnhancedPrompt: false // フラグで制御
            }),
          });

          // 重量版が準備できたら、完全版で再度APIリクエスト
          try {
            const fullPrompt = await enhancePrompt();
            
            // 完全版でAPIリクエスト
            return fetch('/api/chat/generate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                systemPrompt: fullPrompt, // 完全版を使用
                userMessage: content,
                conversationHistory: (() => {
                  // 重複除去と履歴クリーンアップ
                  const recentMessages = activeSession.messages.slice(-10);
                  const deduplicatedHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
                  
                  for (const msg of recentMessages) {
                    if (msg.role === 'user' || msg.role === 'assistant') {
                      const historyEntry = { role: msg.role as 'user' | 'assistant', content: msg.content };
                      
                      const isDuplicate = deduplicatedHistory.some(existing => 
                        existing.role === historyEntry.role && 
                        existing.content === historyEntry.content
                      );
                      
                      if (!isDuplicate && historyEntry.content.trim()) {
                        deduplicatedHistory.push(historyEntry);
                      }
                    }
                  }
                  
                  return deduplicatedHistory.slice(-5);
                })(),
                textFormatting: state.effectSettings.textFormatting,
                apiConfig: {
                  ...apiConfig,
                  openRouterApiKey: get().openRouterApiKey,
                  geminiApiKey: get().geminiApiKey
                },
                useEnhancedPrompt: true // 完全版フラグ
              }),
            });
          } catch (error) {
            // Enhanced prompt failed, using base prompt
            return initialResponse; // フォールバック
          }
        }, requestId, modelName);
        
        // バックグラウンドで拡張プロンプトを処理（将来の最適化用）
        enhancePrompt().then(enhancedPrompt => {
          // 将来のリクエストで使用するためにキャッシュ可能
        }).catch(err => {
          // Enhanced prompt failed, not critical
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'API request failed');
        }

        const data = await response.json();
        const aiResponseContent = data.response;
        
        // 🔍 デバッグ: 応答品質検証（メタ発言チェック）
        // TEMPORARILY DISABLED: promptValidator may cause infinite loading
        // if (process.env.NODE_ENV === 'development') {
        //   const character = activeSession.participants.characters[0];
        //   const responseCheck = promptValidator.checkResponseForMeta(aiResponseContent, character?.name || 'Character');
        //   
        //   if (responseCheck.hasMeta) {
        //     console.warn('⚠️ Meta conversation detected:', responseCheck);
        //     console.warn('🔍 Response content:', aiResponseContent.substring(0, 200) + '...');
        //   } else {
        //     console.log('✅ Response looks good - no meta conversation detected');
        //   }
        // }
        
        // 🧠 感情分析: AI応答 (同期処理 - UI表示前)
        let aiEmotionExpression = {
          emotion: { primary: 'neutral', intensity: 0.6, emoji: '🤔' },
          style: { font_weight: 'normal' as const, text_color: '#ffffff' },
          effects: []
        };
        
        if (emotionalIntelligenceFlags?.emotion_analysis_enabled) {
          try {
            const soloAnalyzer = new SoloEmotionAnalyzer();
            const currentSession = getSessionSafely(get().sessions, activeSessionId);
            if (currentSession) {
              const conversationalContext = {
                recentMessages: currentSession.messages.slice(-5),
                messageCount: currentSession.message_count + 1,
                activeCharacters: activeSession.participants.characters,
                sessionType: 'solo' as const,
                sessionId: activeSessionId,
                sessionDuration: Math.floor((new Date().getTime() - new Date(activeSession.created_at).getTime()) / 60000),
                conversationPhase: 'development' as const
              };
              
              // 一時的なAI応答メッセージを作成して分析
              const tempAiMessage: UnifiedMessage = {
                id: generateAIMessageId(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                version: 1,
                session_id: activeSessionId,
                is_deleted: false,
                role: 'assistant',
                content: aiResponseContent,
                character_id: activeSession.participants.characters[0]?.id,
                memory: { importance: { score: 0.6, factors: { emotional_weight: 0.4, repetition_count: 0, user_emphasis: 0.3, ai_judgment: 0.7 } }, is_pinned: false, is_bookmarked: false, keywords: [], summary: undefined },
                expression: { emotion: { primary: 'neutral', intensity: 0.6, emoji: '🤔' }, style: { font_weight: 'normal', text_color: '#ffffff' }, effects: [] },
                edit_history: [],
                regeneration_count: 0,
                metadata: {}
              };
              
              const aiEmotionResult = await soloAnalyzer.analyzeSoloEmotion(
                tempAiMessage,
                conversationalContext,
                activeSession.participants.characters[0]?.id || '',
                'default_user'
              );
              
              aiEmotionExpression = {
                emotion: {
                  primary: aiEmotionResult.emotion.primaryEmotion,
                  intensity: aiEmotionResult.emotion.intensity,
                  emoji: getEmotionEmoji(aiEmotionResult.emotion.primaryEmotion)
                },
                style: { font_weight: 'normal' as const, text_color: '#ffffff' },
                effects: []
              };
              
            }
          } catch (error) {
            // AI emotion analysis failed, continuing without emotion data
          }
        }

        const aiResponse: UnifiedMessage = {
            id: generateAIMessageId(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            version: 1,
            session_id: activeSessionId,
            is_deleted: false,
            role: 'assistant',
            content: aiResponseContent,
            character_id: activeSession.participants.characters[0]?.id,
            character_name: activeSession.participants.characters[0]?.name,
            memory: {
                importance: { score: 0.6, factors: { emotional_weight: 0.4, repetition_count: 0, user_emphasis: 0.3, ai_judgment: 0.7 } },
                is_pinned: false,
                is_bookmarked: false,
                keywords: ['response'],
                summary: 'ユーザーの質問への回答'
            },
            expression: aiEmotionExpression,
            edit_history: [],
            regeneration_count: 0,
            metadata: {}
        };
        
        const finalSession = getSessionSafely(get().sessions, activeSessionId)!;
        const sessionWithAiResponse = {
            ...finalSession,
            messages: [...finalSession.messages, aiResponse],
            message_count: finalSession.message_count + 1,
            updated_at: new Date().toISOString(),
        };
        set(state => ({
            sessions: createMapSafely(state.sessions).set(activeSessionId, sessionWithAiResponse),
        }));

        // パフォーマンス最適化: 後処理作業を完全にバックグラウンド化
        // ⚡ パフォーマンス最適化: 後処理をバックグラウンドキューで処理しUIを完全非ブロッキング化
        setTimeout(() => {
          Promise.allSettled([
            // 🧠 emotional_memory_enabled設定チェックを追加
            get().emotionalIntelligenceFlags.emotional_memory_enabled ? autoMemoryManager.processNewMessage(
              aiResponse,
              activeSessionId,
              activeSession.participants.characters[0]?.id,
              get().createMemoryCard
            ) : Promise.resolve(null),
            // 🎯 autoTrackerUpdate設定チェックを追加
            trackerManager && characterId && get().effectSettings.autoTrackerUpdate ? Promise.all([
              trackerManager.analyzeMessageForTrackerUpdates(userMessage, characterId),
              trackerManager.analyzeMessageForTrackerUpdates(aiResponse, characterId)
            ]) : Promise.resolve([])
          ]).then(results => {
            const memoryResult = results[0];
            const trackerResult = results[1];
            
            if (memoryResult.status === 'rejected') {
              console.error('🧠 Auto-memory processing failed:', memoryResult.reason);
            } else {
            }
            
            if (trackerResult.status === 'rejected') {
              console.error('🎯 Tracker analysis failed:', trackerResult.reason);
            } else if (trackerResult.status === 'fulfilled' && trackerResult.value) {
              const allUpdates = trackerResult.value.flat();
            }
            
          }).catch(error => {
            console.error('⚠️ Background processing error:', error);
          });
        }, 0); // 次のEvent Loopで実行しUIをブロックしない

      } catch (error) {
        console.error('AI応答生成エラー:', error);
        // TODO: UIにエラーメッセージを表示
      } finally {
        set({ is_generating: false });
      }
    })();
  },

  sendProgressiveMessage: async (content: string, imageUrl?: string) => {
    // グループモードの場合は通常送信にフォールバック
    const state = get();
    if (state.is_group_mode && state.active_group_session_id) {
      return await state.sendGroupMessage(content, imageUrl);
    }
    
    const activeSessionId = state.active_session_id;
    if (!activeSessionId) return;
    const activeSession = getSessionSafely(state.sessions, activeSessionId);
    if (!activeSession) return;

    if (state.is_generating) {
      return;
    }
    set({ is_generating: true });
    
    // 1. ユーザーメッセージを作成
    const userMessage: UnifiedMessage = {
      id: generateUserMessageId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
      session_id: activeSessionId,
      is_deleted: false,
      role: 'user',
      content,
      image_url: imageUrl,
      memory: {
        importance: { score: 0.7, factors: { emotional_weight: 0.5, repetition_count: 0, user_emphasis: 0.8, ai_judgment: 0.6 } },
        is_pinned: false,
        is_bookmarked: false,
        keywords: [],
        summary: undefined
      },
      expression: {
        emotion: { primary: 'neutral', intensity: 0.5, emoji: '😐' },
        style: { font_weight: 'normal', text_color: '#ffffff' },
        effects: []
      },
      edit_history: [],
      regeneration_count: 0,
      metadata: {}
    };
    
    // 2. ユーザーメッセージを即座にUIに反映
    const sessionWithUserMessage = {
      ...activeSession,
      messages: [...activeSession.messages, userMessage],
      message_count: activeSession.message_count + 1,
      updated_at: new Date().toISOString(),
      last_message_at: new Date().toISOString()
    };
    
    set(state => ({
      sessions: createMapSafely(state.sessions).set(activeSessionId, sessionWithUserMessage)
    }));
    
    // 3. プログレッシブメッセージの初期化
    const messageId = generateAIMessageId();
    const startTime = Date.now();
    
    // 🔧 FIX: ProgressiveMessage型に合わせてmetadataを修正
    const progressiveMessage: ProgressiveMessage = {
      id: messageId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
      session_id: activeSessionId,
      is_deleted: false,
      role: 'assistant',
      content: '',
      character_id: activeSession.participants.characters[0]?.id,
      character_name: activeSession.participants.characters[0]?.name,
      memory: {
        importance: { score: 0.6, factors: { emotional_weight: 0.4, repetition_count: 0, user_emphasis: 0.3, ai_judgment: 0.7 } },
        is_pinned: false,
        is_bookmarked: false,
        keywords: [],
        summary: undefined
      },
      expression: {
        emotion: { primary: 'neutral', intensity: 0.6, emoji: '🤔' },
        style: { font_weight: 'normal', text_color: '#ffffff' },
        effects: []
      },
      edit_history: [],
      regeneration_count: 0,
      // 🔧 FIX: ProgressiveMessage専用のmetadata
      metadata: {
        progressive: true,  // MessageBubbleが検出するためのフラグ
        progressiveData: {  // ProgressiveMessageBubbleが必要とするデータ
          stages: {},
          currentStage: 'reflex',
          transitions: {},
          ui: {
            isUpdating: true,
            showIndicator: true,
            glowIntensity: 'soft',
            highlightChanges: true
          },
          metadata: {
            totalTokens: 0,
            totalTime: 0,
            stageTimings: {}
          }
        },
        totalTokens: 0,
        totalTime: 0,
        stageTimings: {}
      },
      // Progressive specific fields
      stages: {},
      currentStage: 'reflex',
      transitions: {},
      ui: {
        isUpdating: true,
        showIndicator: true,
        glowIntensity: 'soft',
        highlightChanges: true
      }
    };
    
    // メッセージを即座に表示（空の状態で）
    const sessionWithProgressiveMessage = {
      ...sessionWithUserMessage,
      messages: [...sessionWithUserMessage.messages, progressiveMessage],
      message_count: sessionWithUserMessage.message_count + 1
    };
    
    set(state => ({
      sessions: createMapSafely(state.sessions).set(activeSessionId, sessionWithProgressiveMessage)
    }));
    
    // 4. 並列実行の準備
    const characterId = activeSession.participants.characters[0]?.id;
    const trackerManager = characterId ? getTrackerManagerSafely(get().trackerManagers, characterId) : null;
    
    console.log('🧠 Starting memory retrieval...');
    let memoryCards = [];
    try {
      memoryCards = await autoMemoryManager.getRelevantMemoriesForContext(
        sessionWithUserMessage.messages,
        content
      );
      console.log(`✅ Memory retrieval complete: ${memoryCards.length} cards found`);
    } catch (error) {
      console.error('❌ Memory retrieval failed:', error);
      memoryCards = []; // フォールバック
    }
    
    // 5. Stage 1: Reflex (即座に開始)
    console.log('🚀 Starting Progressive Message Generation - Stage 1: Reflex');
    (async () => {
      try {
        const reflexPrompt = progressivePromptBuilder.buildReflexPrompt(
          content,
          activeSession.participants.characters[0],
          activeSession.participants.user
        );
        
        console.log('📝 Stage 1 Prompt built, calling API...');
        const reflexResponse = await simpleAPIManagerV2.generateMessage(
          reflexPrompt.prompt,
          content,
          [],
          { 
            ...get().apiConfig,
            max_tokens: reflexPrompt.tokenLimit,
            temperature: reflexPrompt.temperature,
            openRouterApiKey: get().openRouterApiKey,
            geminiApiKey: get().geminiApiKey,
            useDirectGeminiAPI: get().useDirectGeminiAPI
          }
        );
        
        console.log('✨ Stage 1 Response received:', reflexResponse.substring(0, 50) + '...');
        
        // Progressive messageを更新
        progressiveMessage.stages.reflex = {
          content: reflexResponse,
          timestamp: Date.now() - startTime,
          tokens: reflexPrompt.tokenLimit
        };
        progressiveMessage.content = reflexResponse;
        progressiveMessage.currentStage = 'reflex';
        
        // metadata.progressiveDataも更新（MessageBubbleが使用）
        progressiveMessage.metadata = {
          ...progressiveMessage.metadata,
          progressiveData: {
            ...progressiveMessage.metadata.progressiveData,
            stages: progressiveMessage.stages,
            currentStage: 'reflex',
            metadata: {
              totalTokens: reflexPrompt.tokenLimit,
              totalTime: Date.now() - startTime,
              stageTimings: { reflex: Date.now() - startTime }
            }
          },
          totalTokens: reflexPrompt.tokenLimit,
          totalTime: Date.now() - startTime,
          stageTimings: { reflex: Date.now() - startTime }
        };
        
        // UIを更新（ディープコピーでReactの再レンダリングを確実にトリガー）
        set(state => {
          const session = getSessionSafely(state.sessions, activeSessionId);
          if (session) {
            const messageIndex = session.messages.findIndex(m => m.id === messageId);
            if (messageIndex !== -1) {
              const updatedMessages = [...session.messages];
              // ディープコピーを作成してReactが変更を検知できるようにする
              updatedMessages[messageIndex] = {
                ...progressiveMessage,
                stages: { ...progressiveMessage.stages },
                metadata: {
                  ...progressiveMessage.metadata,
                  progressiveData: progressiveMessage.metadata.progressiveData ? {
                    ...progressiveMessage.metadata.progressiveData,
                    stages: { ...progressiveMessage.stages },
                    currentStage: progressiveMessage.currentStage
                  } : undefined
                }
              };
              const updatedSession = { ...session, messages: updatedMessages };
              return {
                sessions: createMapSafely(state.sessions).set(activeSessionId, updatedSession)
              };
            }
          }
          return state;
        });
        
        console.log('✅ Stage 1 (Reflex) complete:', reflexResponse.substring(0, 50) + '...');
      } catch (error) {
        console.error('❌ Stage 1 (Reflex) failed:', error);
      }
    })();
    
    // 6. Stage 2: Context (設定に基づく遅延後に開始)
    const chatSettings = get().chat;
    const stage2Delay = chatSettings?.progressiveMode?.stageDelays?.context || 1000;
    console.log(`⏱️ Stage 2 will start after ${stage2Delay}ms delay`);
    setTimeout(async () => {
      console.log('🚀 Starting Progressive Message Generation - Stage 2: Context');
      try {
        const contextPrompt = await progressivePromptBuilder.buildContextPrompt(
          content,
          sessionWithUserMessage,
          memoryCards,
          trackerManager || undefined
        );
        
        console.log('📝 Stage 2 Prompt built, calling API...');
        
        // 💭 心の声プロンプト強化: 文脈ステージでは内面的な思考や感情を重視
        const heartVoicePrompt = contextPrompt.prompt + `\n\n【特別指示 - 心の声モード】
このレスポンスでは、キャラクターの内面的な声、心の奥底にある本音、感情の動きを重視してください。
- 表面的な返答ではなく、心の中で感じていることを表現
- 感情の微細な変化や内的な葛藤を含める  
- より親密で個人的な語りかけを心がける
- 「心の中では...」「本当は...」「実は...」などの内面表現を自然に含める`;
        
        const contextResponse = await simpleAPIManagerV2.generateMessage(
          heartVoicePrompt,
          content,
          contextPrompt.conversationHistory || [],
          { 
            ...get().apiConfig,
            max_tokens: contextPrompt.tokenLimit,
            temperature: contextPrompt.temperature,
            openRouterApiKey: get().openRouterApiKey,
            geminiApiKey: get().geminiApiKey,
            useDirectGeminiAPI: get().useDirectGeminiAPI
          }
        );
        
        console.log('✨ Stage 2 Response received:', contextResponse.substring(0, 50) + '...');
        
        // Progressive messageを更新
        progressiveMessage.stages.context = {
          content: contextResponse,
          timestamp: Date.now() - startTime,
          tokens: contextPrompt.tokenLimit,
          diff: messageTransitionService.detectChanges(
            progressiveMessage.stages.reflex?.content || '',
            contextResponse
          )
        };
        progressiveMessage.content = contextResponse;
        progressiveMessage.currentStage = 'context';
        
        // metadata.progressiveDataも更新（MessageBubbleが使用）
        progressiveMessage.metadata = {
          ...progressiveMessage.metadata,
          progressiveData: {
            ...progressiveMessage.metadata.progressiveData,
            stages: progressiveMessage.stages,
            currentStage: 'context',
            metadata: {
              totalTokens: (progressiveMessage.metadata.totalTokens || 0) + contextPrompt.tokenLimit,
              totalTime: Date.now() - startTime,
              stageTimings: {
                ...progressiveMessage.metadata.stageTimings,
                context: Date.now() - startTime
              }
            }
          },
          totalTokens: (progressiveMessage.metadata.totalTokens || 0) + contextPrompt.tokenLimit,
          stageTimings: {
            ...progressiveMessage.metadata.stageTimings,
            context: Date.now() - startTime
          }
        };
        
        // UIを更新（ディープコピーでReactの再レンダリングを確実にトリガー）
        set(state => {
          const session = getSessionSafely(state.sessions, activeSessionId);
          if (session) {
            const messageIndex = session.messages.findIndex(m => m.id === messageId);
            if (messageIndex !== -1) {
              const updatedMessages = [...session.messages];
              // ディープコピーを作成してReactが変更を検知できるようにする
              updatedMessages[messageIndex] = {
                ...progressiveMessage,
                stages: { ...progressiveMessage.stages },
                metadata: {
                  ...progressiveMessage.metadata,
                  progressiveData: progressiveMessage.metadata.progressiveData ? {
                    ...progressiveMessage.metadata.progressiveData,
                    stages: { ...progressiveMessage.stages },
                    currentStage: progressiveMessage.currentStage
                  } : undefined
                }
              };
              const updatedSession = { ...session, messages: updatedMessages };
              return {
                sessions: createMapSafely(state.sessions).set(activeSessionId, updatedSession)
              };
            }
          }
          return state;
        });
        
        console.log('✅ Stage 2 (Context) complete:', contextResponse.substring(0, 50) + '...');
      } catch (error) {
        console.error('❌ Stage 2 (Context) failed:', error);
        // Stage 2が失敗してもStage 3は実行する
      }
    }, stage2Delay);
    
    // 7. Stage 3: Intelligence (設定に基づく遅延後に開始)
    const stage3Delay = chatSettings?.progressiveMode?.stageDelays?.intelligence || 2000;
    console.log(`⏱️ Stage 3 will start after ${stage3Delay}ms delay`);
    setTimeout(async () => {
      console.log('🚀 Starting Progressive Message Generation - Stage 3: Intelligence');
      try {
        const systemInstructions = get().systemPrompts.system;
        const intelligencePrompt = await progressivePromptBuilder.buildIntelligencePrompt(
          content,
          sessionWithUserMessage,
          memoryCards,
          trackerManager || undefined,
          systemInstructions
        );
        
        console.log('📝 Stage 3 Prompt built, calling API...');
        
        const intelligenceResponse = await simpleAPIManagerV2.generateMessage(
          intelligencePrompt.prompt,
          content,
          intelligencePrompt.conversationHistory || [],
          { 
            ...get().apiConfig,
            max_tokens: intelligencePrompt.tokenLimit,
            temperature: intelligencePrompt.temperature,
            openRouterApiKey: get().openRouterApiKey,
            geminiApiKey: get().geminiApiKey,
            useDirectGeminiAPI: get().useDirectGeminiAPI
          }
        );
        
        console.log('✨ Stage 3 Response received:', intelligenceResponse.substring(0, 50) + '...');
        
        // Progressive messageを更新
        progressiveMessage.stages.intelligence = {
          content: intelligenceResponse,
          timestamp: Date.now() - startTime,
          tokens: intelligencePrompt.tokenLimit,
          diff: messageTransitionService.detectChanges(
            progressiveMessage.stages.context?.content || '',
            intelligenceResponse
          )
        };
        progressiveMessage.content = intelligenceResponse;
        progressiveMessage.currentStage = 'intelligence';
        progressiveMessage.ui.isUpdating = false;
        progressiveMessage.ui.glowIntensity = 'none';
        
        // metadata.progressiveDataも更新（MessageBubbleが使用）
        progressiveMessage.metadata = {
          ...progressiveMessage.metadata,
          progressiveData: {
            ...progressiveMessage.metadata.progressiveData,
            stages: progressiveMessage.stages,
            currentStage: 'intelligence',
            ui: progressiveMessage.ui,
            metadata: {
              totalTokens: (progressiveMessage.metadata.totalTokens || 0) + intelligencePrompt.tokenLimit,
              totalTime: Date.now() - startTime,
              stageTimings: {
                ...progressiveMessage.metadata.stageTimings,
                intelligence: Date.now() - startTime
              }
            }
          },
          totalTokens: (progressiveMessage.metadata.totalTokens || 0) + intelligencePrompt.tokenLimit,
          totalTime: Date.now() - startTime,
          stageTimings: {
            ...progressiveMessage.metadata.stageTimings,
            intelligence: Date.now() - startTime
          }
        };
        
        // UIを最終更新（ディープコピーでReactの再レンダリングを確実にトリガー）
        set(state => {
          const session = getSessionSafely(state.sessions, activeSessionId);
          if (session) {
            const messageIndex = session.messages.findIndex(m => m.id === messageId);
            if (messageIndex !== -1) {
              const updatedMessages = [...session.messages];
              // ディープコピーを作成してReactが変更を検知できるようにする
              updatedMessages[messageIndex] = {
                ...progressiveMessage,
                stages: { ...progressiveMessage.stages },
                metadata: {
                  ...progressiveMessage.metadata,
                  progressiveData: progressiveMessage.metadata.progressiveData ? {
                    ...progressiveMessage.metadata.progressiveData,
                    stages: { ...progressiveMessage.stages },
                    currentStage: progressiveMessage.currentStage
                  } : undefined
                }
              };
              const updatedSession = { ...session, messages: updatedMessages };
              return {
                sessions: createMapSafely(state.sessions).set(activeSessionId, updatedSession)
              };
            }
          }
          return state;
        });
        
        console.log(`✅ Progressive message complete: ${progressiveMessage.metadata.totalTokens} tokens in ${progressiveMessage.metadata.totalTime}ms`);
        
        // トラッカー更新（バックグラウンド）
        if (trackerManager && characterId) {
          // 🔧 FIX: updateFromMessage method doesn't exist, use alternative
          // trackerManager.updateFromMessage(characterId, intelligenceResponse, 'assistant');
        }
        
        // メモリー処理（バックグラウンド）
        setTimeout(() => {
          // 🔧 FIX: processMessage method doesn't exist, use processNewMessage
          autoMemoryManager.processNewMessage(progressiveMessage, activeSessionId, characterId, get().createMemoryCard);
        }, 100);
        
      } catch (error) {
        console.error('❌ Stage 3 (Intelligence) failed:', error);
        console.error('Stage 3 Error Details:', error);
      } finally {
        console.log('🏁 Progressive Generation Complete - Setting is_generating to false');
        set({ is_generating: false });
      }
    }, stage3Delay);
  },

  regenerateLastMessage: async () => {
    set({ is_generating: true });
    try {
      const activeSessionId = get().active_session_id;
      if (!activeSessionId) {
        return;
      }
      
      const session = getSessionSafely(get().sessions, activeSessionId);
      // C案：より堅牢なチェック
      if (!session || session.messages.length < 2) {
        return;
      }

      // 最後のAIメッセージとその直前のユーザーメッセージを見つける
      const lastAiMessageIndex = session.messages.findLastIndex(m => m.role === 'assistant' && !m.is_deleted);
      if (lastAiMessageIndex <= 0) { // Should be at least the second message
        return;
      }

      const lastUserMessage = session.messages[lastAiMessageIndex - 1];
      if (!lastUserMessage || lastUserMessage.role !== 'user' || lastUserMessage.is_deleted) {
        return;
      }

      const messagesForPrompt = session.messages.slice(0, lastAiMessageIndex);

      const characterId = session.participants.characters[0]?.id;
      const trackerManager = characterId ? getTrackerManagerSafely(get().trackerManagers, characterId) : null;
      
      // 再生成時は新鮮なプロンプトを作成（繰り返しを避ける）
      const regeneratePrompt = `以下のメッセージに対して、キャラクターとして応答してください。前回とは異なる角度や表現で、新鮮で創造的な応答を生成してください。

ユーザーメッセージ: "${lastUserMessage.content}"`;

      let systemPrompt = await promptBuilderService.buildPrompt(
        { ...session, messages: messagesForPrompt },
        regeneratePrompt,
        trackerManager || undefined
      );
      
      // 再生成専用の指示を追加
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
      systemPrompt += regenerateInstruction;

      const conversationHistory = messagesForPrompt
        .filter(msg => msg.role === 'user' || msg.role === 'assistant')
        .slice(-10)
        .map(msg => ({ role: msg.role as 'user' | 'assistant', content: msg.content }));

      const apiConfig = get().apiConfig;
      // C案：temperatureをより大きく上げ、seedを追加して多様性を確保
      const regenerationApiConfig = {
        ...apiConfig,
        temperature: Math.min(1.8, (apiConfig.temperature || 0.7) + 0.3), // 上昇幅を0.3に増加
        seed: Math.floor(Math.random() * 1000000), // B案：ランダムなseedを追加
        openRouterApiKey: get().openRouterApiKey,
        geminiApiKey: get().geminiApiKey,
        useDirectGeminiAPI: get().useDirectGeminiAPI
      };

      const response = await fetch('/api/chat/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              systemPrompt,
              userMessage: lastUserMessage.content,
              conversationHistory,
              textFormatting: get().effectSettings.textFormatting,
              apiConfig: regenerationApiConfig
          }),
      });

      if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'API request failed during regeneration');
      }

      const data = await response.json();
      const aiResponseContent = data.response;
      
      const newAiMessage: UnifiedMessage = {
        ...session.messages[lastAiMessageIndex],
        id: generateAIMessageId(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        content: aiResponseContent,
        regeneration_count: (session.messages[lastAiMessageIndex].regeneration_count || 0) + 1,
      };

      const newMessages = [...session.messages];
      newMessages[lastAiMessageIndex] = newAiMessage;

      set(_state => {
        const updatedSession = {
          ...session,
          messages: newMessages,
          updated_at: new Date().toISOString(),
        };
        return {
          sessions: createMapSafely(_state.sessions).set(session.id, updatedSession)
        };
      });
    } catch (error) {
        console.error("🚨 Regeneration failed:", error);
        
        // 詳細なエラーハンドリングとユーザーフィードバック
        let errorMessage = 'メッセージの再生成に失敗しました。';
        
        if (error instanceof Error) {
          if (error.message.includes('API request failed')) {
            errorMessage = 'API接続エラー: サーバーとの通信に失敗しました。しばらく待ってから再試行してください。';
          } else if (error.message.includes('memory')) {
            errorMessage = 'メモリ処理エラー: 一時的な問題が発生しました。ページをリロードして再試行してください。';
          } else if (error.message.includes('timeout')) {
            errorMessage = 'タイムアウト: 処理時間が長すぎます。しばらく待ってから再試行してください。';
          } else if (error.message.includes('rate limit')) {
            errorMessage = 'レート制限: APIの使用制限に達しました。しばらく待ってから再試行してください。';
          }
        }
        
        // エラー状態をストアに保存（UI表示用）
        set({ 
          lastError: {
            type: 'regeneration',
            message: errorMessage,
            timestamp: new Date().toISOString(),
            details: error instanceof Error ? error.message : String(error)
          }
        });
        
        // エラートースト表示（実装されている場合）
        if (typeof window !== 'undefined' && (window as any).showToast) {
          (window as any).showToast(errorMessage, 'error');
        }
    } finally {
        set({ is_generating: false });
    }
  },

  // 🆕 ソロチャット続きを生成機能
  continueLastMessage: async () => {
    set({ is_generating: true });
    try {
      const activeSessionId = get().active_session_id;
      if (!activeSessionId) {
        return;
      }
      
      const session = getSessionSafely(get().sessions, activeSessionId);
      if (!session || session.messages.length === 0) {
        return;
      }

      // 最後のAIメッセージを見つける
      const lastAiMessageIndex = session.messages.findLastIndex(m => m.role === 'assistant' && !m.is_deleted);
      if (lastAiMessageIndex === -1) {
        return;
      }

      const lastAiMessage = session.messages[lastAiMessageIndex];
      const characterId = session.participants.characters[0]?.id;
      const trackerManager = characterId ? getTrackerManagerSafely(get().trackerManagers, characterId) : null;
      
      // 続きを生成するため、前のメッセージの内容を基にプロンプトを構築
      const continuePrompt = `前のメッセージの続きを書いてください。前のメッセージ内容:\n「${lastAiMessage.content}」\n\nこの続きとして自然に繋がる内容を生成してください。\n\n重要: あなたは指定されたキャラクターとして応答してください。ユーザーの行動や発言を勝手に出力してはいけません。キャラクターの視点から、キャラクターのセリフや行動のみを出力してください。`;
      
      let systemPrompt = await promptBuilderService.buildPrompt(
        session,
        continuePrompt,
        trackerManager || undefined
      );

      // 続き生成専用の指示を追加
      const continueInstruction = `
<continue_instruction>
**重要**: これは続き生成リクエストです。
- あなたは指定されたキャラクターとしてのみ応答してください
- ユーザーの行動、発言、思考を勝手に描写してはいけません  
- キャラクターの視点から、キャラクターのセリフと行動のみを出力してください
- ユーザーとの境界を明確に保ち、キャラクターの役割に専念してください
</continue_instruction>
`;
      systemPrompt += continueInstruction;

      const { simpleAPIManagerV2: apiManager } = await import('@/services/simple-api-manager-v2');
      
      const conversationHistory = session.messages
        .filter(m => !m.is_deleted)
        .slice(-10) // 最新10件の履歴を使用
        .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

      const apiConfig = get().apiConfig || {};
      const aiResponse = await simpleAPIManagerV2.generateMessage(
        systemPrompt,
        continuePrompt,
        conversationHistory,
        apiConfig
      );

      // 新しい続きメッセージを作成
      const newContinuationMessage: UnifiedMessage = {
        id: generateAIMessageId(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1,
        session_id: activeSessionId,
        role: 'assistant',
        content: aiResponse,
        character_id: session.participants.characters[0]?.id,
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
        metadata: { 
          is_continuation: true,
          continuation_of: lastAiMessage.id,
          continuation_count: (typeof (lastAiMessage.metadata as any)?.continuation_count === 'number' ? (lastAiMessage.metadata as any).continuation_count : 0) + 1
        }
      };

      // セッションにメッセージを追加
      set(state => {
        const currentSession = getSessionSafely(state.sessions, activeSessionId);
        if (!currentSession) return state;

        const updatedMessages = [...currentSession.messages, newContinuationMessage];
        const updatedSession = {
          ...currentSession,
          messages: updatedMessages,
          message_count: updatedMessages.length,
          updated_at: new Date().toISOString(),
        };
        
        return {
          sessions: createMapSafely(state.sessions).set(activeSessionId, updatedSession)
        };
      });

    } catch (error) {
        console.error("🚨 Continue generation failed:", error);
        
        // 詳細なエラーハンドリングとユーザーフィードバック
        let errorMessage = 'メッセージの続き生成に失敗しました。';
        
        if (error instanceof Error) {
          if (error.message.includes('API request failed') || error.message.includes('generateMessage')) {
            errorMessage = 'API接続エラー: サーバーとの通信に失敗しました。しばらく待ってから再試行してください。';
          } else if (error.message.includes('memory') || error.message.includes('embedding')) {
            errorMessage = 'メモリ処理エラー: 一時的な問題が発生しました。ページをリロードして再試行してください。';
          } else if (error.message.includes('timeout')) {
            errorMessage = 'タイムアウト: 処理時間が長すぎます。しばらく待ってから再試行してください。';
          } else if (error.message.includes('rate limit') || error.message.includes('quota')) {
            errorMessage = 'レート制限: APIの使用制限に達しました。しばらく待ってから再試行してください。';
          } else if (error.message.includes('invalid model') || error.message.includes('model')) {
            errorMessage = 'モデル設定エラー: AI設定を確認してください。';
          }
        }
        
        // エラー状態をストアに保存（UI表示用）
        set({ 
          lastError: {
            type: 'continue',
            message: errorMessage,
            timestamp: new Date().toISOString(),
            details: error instanceof Error ? error.message : String(error)
          }
        });
        
        // エラートースト表示（実装されている場合）
        if (typeof window !== 'undefined' && (window as any).showToast) {
          (window as any).showToast(errorMessage, 'error');
        }
    } finally {
        set({ is_generating: false });
    }
  },

  rollbackSession: (message_id) => {
    const activeSessionId = get().active_session_id;
    if (!activeSessionId) return;

    const session = getSessionSafely(get().sessions, activeSessionId);
    if (!session) return;

    const messageIndex = session.messages.findIndex(m => m.id === message_id);
    if (messageIndex === -1) {
      console.error('Rollback failed: message not found');
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

    set(state => ({
      sessions: createMapSafely(state.sessions).set(activeSessionId, updatedSession)
    }));

    // 2. ConversationManagerのキャッシュをクリア
    promptBuilderService.clearManagerCache(activeSessionId);

    // 3. トラッカーをリセット
    const characterId = session.participants.characters[0]?.id;
    if (characterId) {
      const trackerManager = getTrackerManagerSafely(get().trackerManagers, characterId);
      if (trackerManager) {
        // 全てのトラッカーを初期値にリセット
        trackerManager.initializeTrackerSet(characterId, session.participants.characters[0]?.trackers || []);
      }
    }
    
  },

  deleteMessage: (message_id) => {
    const activeSessionId = get().active_session_id;
    if (!activeSessionId) return;
    
    const activeSession = getSessionSafely(get().sessions, activeSessionId);
    if(activeSession) {
        const updatedMessages = activeSession.messages.filter(msg => msg.id !== message_id);
        const updatedSession = { 
            ...activeSession, 
            messages: updatedMessages,
            message_count: updatedMessages.length,
            updated_at: new Date().toISOString()
        };
        set(_state => ({
            sessions: createMapSafely(_state.sessions).set(activeSessionId, updatedSession)
        }));
    }
  },

  getActiveSession: () => {
    const activeSessionId = get().active_session_id;
    if (!activeSessionId) return null;
    return getSessionSafely(get().sessions, activeSessionId) || null;
  },

  getSessionMessages: (session_id) => {
    const session = getSessionSafely(get().sessions, session_id);
    return session?.messages || [];
  },

  clearActiveConversation: () => {
    const activeSessionId = get().active_session_id;
    if (!activeSessionId) return;
    
    const activeSession = getSessionSafely(get().sessions, activeSessionId);
    if (activeSession) {
      // 挨拶メッセージのみ残して他のメッセージをクリア
      const greetingMessage = activeSession.messages[0];
      const clearedSession = {
        ...activeSession,
        messages: [greetingMessage],
        message_count: 1,
        updated_at: new Date().toISOString(),
      };
      
      set(_state => ({
        sessions: createMapSafely(_state.sessions).set(activeSessionId, clearedSession)
      }));
    }
  },

  exportActiveConversation: () => {
    const activeSession = get().getActiveSession();
    if (!activeSession) return;
    
    const exportData = {
      session_id: activeSession.id,
      title: activeSession.session_info.title,
      created_at: activeSession.created_at,
      character: activeSession.participants.characters[0]?.name,
      messages: activeSession.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.created_at,
        character: msg.character_name
      }))
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation-${activeSession.session_info.title}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  setShowSettingsModal: (show) => {
    set({ showSettingsModal: show });
  },

  setCurrentInputText: (text) => {
    set({ currentInputText: text });
  },

  // 🚨 緊急修復機能: 生成状態を強制リセット
  resetGeneratingState: () => {
    set({ is_generating: false });
  },

  // For Sidebar
  setActiveSessionId: (sessionId) => {
    if (sessionId) {
      const session = getSessionSafely(get().sessions, sessionId);
      if (session) {
        // セッションのキャラクターのトラッカーマネージャーが存在しない場合は初期化
        const trackerManagers = get().trackerManagers;
        // 一つのセッションには一つのトラッカーマネージャー（複数キャラクター対応）
        const hasTrackerManager = trackerManagers instanceof Map 
          ? trackerManagers.has(sessionId) 
          : (trackerManagers && typeof trackerManagers === 'object' && sessionId in trackerManagers);
        
        if (!hasTrackerManager) {
          const trackerManager = new TrackerManager();
          // 各キャラクターのトラッカーを初期化
          session.participants.characters.forEach(character => {
            trackerManager.initializeTrackerSet(character.id, character.trackers);
          });
          trackerManagers.set(sessionId, trackerManager);
        }
        
        // TrackerManagersを更新
        set(_state => ({
          trackerManagers: new Map(trackerManagers),
          active_session_id: sessionId
        }));
      } else {
        set({ active_session_id: sessionId });
      }
    } else {
      set({ active_session_id: sessionId });
    }
  },
  deleteSession: (sessionId) => {
    set(state => {
      const newSessions = createMapSafely(state.sessions);
      newSessions.delete(sessionId);
      
      let newActiveSessionId = state.active_session_id;
      // If the deleted session was the active one, switch to another session
      if (state.active_session_id === sessionId) {
        newActiveSessionId = newSessions.keys().next().value || null;
      }

      return { 
        sessions: newSessions,
        active_session_id: newActiveSessionId
      };
    });
  },
  
  clearAllSessions: () => {
    set(() => ({
      sessions: new Map(),
      active_session_id: null,
      trackerManagers: new Map()
    }));
  },
  updateSession: (session) => {
    set(_state => {
      const targetSession = getSessionSafely(_state.sessions, session.id);
      if (targetSession) {
        const updatedSession = { ...targetSession, ...session };
        const newSessions = createMapSafely(_state.sessions).set(session.id, updatedSession);
        return { sessions: newSessions };
      }
      return _state;
    });
  },

  // 履歴管理: セッションを履歴として保存
  saveSessionToHistory: async (session_id) => {
    const session = getSessionSafely(get().sessions, session_id);
    if (!session) return;
    
    try {
      const response = await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(session)
      });
      
      if (!response.ok) throw new Error('Failed to save history');
    } catch (error) {
      console.error('Error saving session to history:', error);
    }
  },
  
  // 履歴管理: 履歴からセッションを読み込み
  loadSessionFromHistory: async (session_id) => {
    try {
      const response = await fetch(`/data/history/${session_id}.json`);
      if (!response.ok) throw new Error('History not found');
      
      const sessionData = await response.json();
      
      set(state => ({
        sessions: createMapSafely(state.sessions).set(session_id, sessionData),
        active_session_id: session_id
      }));
      
    } catch (error) {
      console.error('Error loading session from history:', error);
    }
  },
  
  // 履歴管理: セッションのピン留め
  pinSession: (session_id, isPinned) => {
    set(state => {
      const session = getSessionSafely(state.sessions, session_id);
      if (!session) return state;
      
      const updatedSession = { ...session, isPinned };
      const newSessions = createMapSafely(state.sessions).set(session_id, updatedSession);
      
      // APIに更新を送信
      fetch('/api/history', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: session_id, updates: { isPinned } })
      }).catch(error => {
        // Storage initialization failed, not critical
      });
      
      return { sessions: newSessions };
    });
  },

  // ヘルパー関数: トラッカーマネージャーの存在を確保
  ensureTrackerManagerExists: (character) => {
    const activeSessionId = get().active_session_id;
    if (!activeSessionId) return;
    
    const trackerManagers = get().trackerManagers;
    const hasTrackerManager = trackerManagers instanceof Map 
      ? trackerManagers.has(activeSessionId) 
      : (trackerManagers && typeof trackerManagers === 'object' && activeSessionId in trackerManagers);
    
    if (!hasTrackerManager) {
      const trackerManager = new TrackerManager();
      trackerManager.initializeTrackerSet(character.id, character.trackers);
      trackerManagers.set(activeSessionId, trackerManager);
      
      set(_state => ({
        trackerManagers: new Map(trackerManagers)
      }));
      
    }
  },
};
};