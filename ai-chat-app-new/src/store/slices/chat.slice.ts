import { StateCreator } from 'zustand';
import { UnifiedChatSession, UnifiedMessage, UUID, Character, Persona } from '@/types';
// Removed unused imports
import { apiRequestQueue } from '@/services/api-request-queue';
import { promptValidator } from '@/utils/prompt-validator';
import { promptBuilderService } from '@/services/prompt-builder.service';
import { TrackerManager } from '@/services/tracker/tracker-manager';
import { autoMemoryManager } from '@/services/memory/auto-memory-manager';
import { AppStore } from '..';
import { 
  generateSessionId, 
  generateWelcomeMessageId, 
  generateUserMessageId, 
  generateAIMessageId 
} from '@/utils/uuid';

export interface ChatSlice {
  sessions: Map<UUID, UnifiedChatSession>;
  trackerManagers: Map<UUID, TrackerManager>;
  active_session_id: UUID | null;
  active_character_id: UUID | null;
  is_generating: boolean;
  showSettingsModal: boolean;
  currentInputText: string;
  
  createSession: (character: Character, persona: Persona) => Promise<UUID>;
  sendMessage: (content: string, imageUrl?: string) => Promise<void>;
  regenerateLastMessage: () => Promise<void>;
  continueLastMessage: () => Promise<void>; // 🆕 ソロチャット続きを生成機能を追加
  deleteMessage: (message_id: UUID) => void;
  clearActiveConversation: () => void;
  exportActiveConversation: () => void;
  rollbackSession: (message_id: UUID) => void; // 新しいアクションを追加
  setShowSettingsModal: (show: boolean) => void;
  setCurrentInputText: (text: string) => void;
  
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

export const createChatSlice: StateCreator<AppStore, [], [], ChatSlice> = (set, get) => ({
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
          character_avatar: character.avatar_url,
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
    const existingTrackerManager = get().trackerManagers.get(character.id);
    let trackerManager = existingTrackerManager;
    
    if (!trackerManager) {
      // 新しいキャラクターの場合のみTrackerManagerを作成
      trackerManager = new TrackerManager();
      trackerManager.initializeTrackerSet(character.id, character.trackers);
      console.log(`🎯 Created new TrackerManager for character: ${character.name} (${character.id})`);
    } else {
      console.log(`🎯 Reusing existing TrackerManager for character: ${character.name} (${character.id})`);
    }

    set(state => ({
      sessions: new Map(state.sessions).set(newSession.id, newSession),
      trackerManagers: new Map(state.trackerManagers).set(character.id, trackerManager), // characterIdをキーに変更
      active_session_id: newSession.id,
    }));

    return newSession.id;
  },

  sendMessage: async (content, imageUrl) => {
    // 🔄 グループモード判定: グループチャットの場合は専用処理を呼び出し
    const state = get();
    if (state.is_group_mode && state.active_group_session_id) {
      console.log('📞 Redirecting to group chat sendMessage');
      return await state.sendGroupMessage(content, imageUrl);
    }
    
    const activeSessionId = state.active_session_id;
    if (!activeSessionId) return;
    const activeSession = state.sessions.get(activeSessionId);
    if (!activeSession) return;

    if (state.is_generating) {
      console.log('⚠️ Already generating, ignoring duplicate request');
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
        sessions: new Map(state.sessions).set(activeSessionId, sessionWithUserMessage)
    }));

    // 3. AI応答生成などの重い処理を非同期で実行
    (async () => {
      try {
        const characterId = activeSession.participants.characters[0]?.id;
        const trackerManager = characterId ? get().trackerManagers.get(activeSessionId) : null;
        
        // ⚡ プログレッシブプロンプト構築でUIフリーズを防止 (50-100ms)
        const { basePrompt, enhancePrompt } = await promptBuilderService.buildPromptProgressive(
            sessionWithUserMessage,
            content, 
            trackerManager
        );
        
        console.log('⚡ Base prompt ready, starting API call...');

        const apiConfig = get().apiConfig;
        // ⚡ 高優先度チャットリクエストをキューに追加（競合を防止）
        const requestId = `${activeSessionId}-${Date.now()}`;
        const response = await apiRequestQueue.enqueueChatRequest(async () => {
          console.log('🚀 Chat request started via queue');
          
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
          
          return fetch('/api/chat/generate', {
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
                  const historyEntry = { role: msg.role, content: msg.content };
                  
                  // 同一内容の重複チェック（連続する場合と全体での重複両方をチェック）
                  const isDuplicate = deduplicatedHistory.some(existing => 
                    existing.role === historyEntry.role && 
                    existing.content === historyEntry.content
                  );
                  
                  if (!isDuplicate && historyEntry.content.trim()) {
                    deduplicatedHistory.push(historyEntry);
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
        }, requestId);
        
        // バックグラウンドで拡張プロンプトを処理（将来の最適化用）
        enhancePrompt().then(enhancedPrompt => {
          console.log('✨ Enhanced prompt ready for future use:', enhancedPrompt.length + ' chars');
          // 将来のリクエストで使用するためにキャッシュ可能
        }).catch(err => console.warn('⚠️ Enhanced prompt failed:', err));

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'API request failed');
        }

        const data = await response.json();
        const aiResponseContent = data.response;
        
        // 🔍 デバッグ: 応答品質検証（メタ発言チェック）
        if (process.env.NODE_ENV === 'development') {
          const character = activeSession.participants.characters[0];
          const responseCheck = promptValidator.checkResponseForMeta(aiResponseContent, character?.name || 'Character');
          
          if (responseCheck.hasMeta) {
            console.warn('⚠️ Meta conversation detected:', responseCheck);
            console.warn('🔍 Response content:', aiResponseContent.substring(0, 200) + '...');
          } else {
            console.log('✅ Response looks good - no meta conversation detected');
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
            character_avatar: activeSession.participants.characters[0]?.avatar_url,
            memory: {
                importance: { score: 0.6, factors: { emotional_weight: 0.4, repetition_count: 0, user_emphasis: 0.3, ai_judgment: 0.7 } },
                is_pinned: false,
                is_bookmarked: false,
                keywords: ['response'],
                summary: 'ユーザーの質問への回答'
            },
            expression: {
                emotion: { primary: 'neutral', intensity: 0.6, emoji: '🤔' },
                style: { font_weight: 'normal', text_color: '#ffffff' },
                effects: []
            },
            edit_history: [],
            regeneration_count: 0,
            metadata: {}
        };
        
        const finalSession = get().sessions.get(activeSessionId)!;
        const sessionWithAiResponse = {
            ...finalSession,
            messages: [...finalSession.messages, aiResponse],
            message_count: finalSession.message_count + 1,
            updated_at: new Date().toISOString(),
        };
        set(state => ({
            sessions: new Map(state.sessions).set(activeSessionId, sessionWithAiResponse),
        }));

        // パフォーマンス最適化: 後処理作業を完全にバックグラウンド化
        // ⚡ パフォーマンス最適化: 後処理をバックグラウンドキューで処理しUIを完全非ブロッキング化
        setTimeout(() => {
          Promise.allSettled([
            autoMemoryManager.processNewMessage(
              aiResponse,
              activeSessionId,
              activeSession.participants.characters[0]?.id,
              get().createMemoryCard
            ),
            trackerManager && characterId ? Promise.all([
              trackerManager.analyzeMessageForTrackerUpdates(userMessage, characterId),
              trackerManager.analyzeMessageForTrackerUpdates(aiResponse, characterId)
            ]) : Promise.resolve()
          ]).then(results => {
            const memoryResult = results[0];
            const trackerResult = results[1];
            
            if (memoryResult.status === 'rejected') {
              console.error('🧠 Auto-memory processing failed:', memoryResult.reason);
            } else {
              console.log('🧠 Auto-memory processing completed successfully');
            }
            
            if (trackerResult.status === 'rejected') {
              console.error('🎯 Tracker analysis failed:', trackerResult.reason);
            } else if (trackerResult.status === 'fulfilled' && trackerResult.value) {
              const allUpdates = trackerResult.value.flat();
              console.log(`🎯 Tracker analysis completed: ${allUpdates.length} total updates`);
            }
            
            console.log('✨ Background processing completed for character:', characterId?.substring(0, 8) + '...');
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

  regenerateLastMessage: async () => {
    set({ is_generating: true });
    try {
      const activeSessionId = get().active_session_id;
      if (!activeSessionId) {
        console.warn("Regeneration aborted: No active session ID.");
        return;
      }
      
      const session = get().sessions.get(activeSessionId);
      // C案：より堅牢なチェック
      if (!session || session.messages.length < 2) {
        console.warn("Regeneration aborted: Session not found or not enough messages.");
        return;
      }

      // 最後のAIメッセージとその直前のユーザーメッセージを見つける
      const lastAiMessageIndex = session.messages.findLastIndex(m => m.role === 'assistant' && !m.is_deleted);
      if (lastAiMessageIndex <= 0) { // Should be at least the second message
        console.warn("Regeneration aborted: No valid AI message to regenerate.");
        return;
      }

      const lastUserMessage = session.messages[lastAiMessageIndex - 1];
      if (!lastUserMessage || lastUserMessage.role !== 'user' || lastUserMessage.is_deleted) {
        console.warn("Regeneration aborted: No valid user message found before the last AI message.");
        return;
      }

      const messagesForPrompt = session.messages.slice(0, lastAiMessageIndex);

      const characterId = session.participants.characters[0]?.id;
      const trackerManager = characterId ? get().trackerManagers.get(activeSessionId) : null;
      
      let systemPrompt = await promptBuilderService.buildPrompt(
        { ...session, messages: messagesForPrompt },
        lastUserMessage.content,
        trackerManager
      );
      
      // A案：メタ発言を抑制する指示を追加
      const antiMetaPrompt = `
<meta_instruction>
**重要**: あなたはAIアシスタントではなく、キャラクターとして応答しています。
AI、モデル、システムといったメタ的な話題に言及することは固く禁じられています。
以前の応答とは異なる、より創造的でキャラクターらしい応答を生成してください。
</meta_instruction>
`;
      systemPrompt += antiMetaPrompt;

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
        geminiApiKey: get().geminiApiKey
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
          sessions: new Map(_state.sessions).set(session.id, updatedSession)
        };
      });
    } catch (error) {
        console.error("Regeneration failed:", error);
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
        console.warn("Continue aborted: No active session ID.");
        return;
      }
      
      const session = get().sessions.get(activeSessionId);
      if (!session || session.messages.length === 0) {
        console.warn("Continue aborted: Session not found or no messages.");
        return;
      }

      // 最後のAIメッセージを見つける
      const lastAiMessageIndex = session.messages.findLastIndex(m => m.role === 'assistant' && !m.is_deleted);
      if (lastAiMessageIndex === -1) {
        console.warn("Continue aborted: No valid AI message to continue.");
        return;
      }

      const lastAiMessage = session.messages[lastAiMessageIndex];
      const characterId = session.participants.characters[0]?.id;
      const trackerManager = characterId ? get().trackerManagers.get(activeSessionId) : null;
      
      // 続きを生成するため、前のメッセージの内容を基にプロンプトを構築
      const continuePrompt = `前のメッセージの続きを書いてください。前のメッセージ内容:\n「${lastAiMessage.content}」\n\nこの続きとして自然に繋がる内容を生成してください。`;
      
      let systemPrompt = await promptBuilderService.buildPrompt(
        session,
        continuePrompt,
        trackerManager
      );

      const { apiManager } = await import('@/services/api-manager');
      
      const conversationHistory = session.messages
        .filter(m => !m.is_deleted)
        .slice(-10) // 最新10件の履歴を使用
        .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

      const apiConfig = get().apiConfig || {};
      const openRouterApiKey = get().openRouterApiKey;
      const geminiApiKey = get().geminiApiKey;

      const aiResponse = await apiManager.generateMessage(
        systemPrompt,
        continuePrompt,
        conversationHistory,
        { ...apiConfig, openRouterApiKey, geminiApiKey }
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
          continuation_count: (lastAiMessage.metadata?.continuation_count || 0) + 1
        }
      };

      // セッションにメッセージを追加
      set(state => {
        const currentSession = state.sessions.get(activeSessionId);
        if (!currentSession) return state;

        const updatedMessages = [...currentSession.messages, newContinuationMessage];
        const updatedSession = {
          ...currentSession,
          messages: updatedMessages,
          message_count: updatedMessages.length,
          updated_at: new Date().toISOString(),
        };
        
        return {
          sessions: new Map(state.sessions).set(activeSessionId, updatedSession)
        };
      });

      console.log('✅ Solo message continued successfully');
    } catch (error) {
        console.error("Continue failed:", error);
    } finally {
        set({ is_generating: false });
    }
  },

  rollbackSession: (message_id) => {
    const activeSessionId = get().active_session_id;
    if (!activeSessionId) return;

    const session = get().sessions.get(activeSessionId);
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
      sessions: new Map(state.sessions).set(activeSessionId, updatedSession)
    }));

    // 2. ConversationManagerのキャッシュをクリア
    promptBuilderService.clearManagerCache(activeSessionId);

    // 3. トラッカーをリセット
    const characterId = session.participants.characters[0]?.id;
    if (characterId) {
      const trackerManager = get().trackerManagers.get(activeSessionId);
      if (trackerManager) {
        // 全てのトラッカーを初期値にリセット
        trackerManager.initializeTrackerSet(characterId, session.participants.characters[0]?.trackers || []);
        console.log(`🔄 Trackers reset for character ${characterId}`);
      }
    }
    
    console.log(`⏪ Session rolled back to message ${message_id}`);
  },

  deleteMessage: (message_id) => {
    const activeSessionId = get().active_session_id;
    if (!activeSessionId) return;
    
    const activeSession = get().sessions.get(activeSessionId);
    if(activeSession) {
        const updatedMessages = activeSession.messages.filter(msg => msg.id !== message_id);
        const updatedSession = { 
            ...activeSession, 
            messages: updatedMessages,
            message_count: updatedMessages.length,
            updated_at: new Date().toISOString()
        };
        set(_state => ({
            sessions: new Map(_state.sessions).set(activeSessionId, updatedSession)
        }));
    }
  },

  getActiveSession: () => {
    const activeSessionId = get().active_session_id;
    if (!activeSessionId) return null;
    return get().sessions.get(activeSessionId) || null;
  },

  getSessionMessages: (session_id) => {
    return get().sessions.get(session_id)?.messages || [];
  },

  clearActiveConversation: () => {
    const activeSessionId = get().active_session_id;
    if (!activeSessionId) return;
    
    const activeSession = get().sessions.get(activeSessionId);
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
        sessions: new Map(_state.sessions).set(activeSessionId, clearedSession)
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

  // For Sidebar
  setActiveSessionId: (sessionId) => {
    if (sessionId) {
      const session = get().sessions.get(sessionId);
      if (session) {
        // セッションのキャラクターのトラッカーマネージャーが存在しない場合は初期化
        const trackerManagers = get().trackerManagers;
        // 一つのセッションには一つのトラッカーマネージャー（複数キャラクター対応）
        if (!trackerManagers.has(sessionId)) {
          const trackerManager = new TrackerManager();
          // 各キャラクターのトラッカーを初期化
          session.participants.characters.forEach(character => {
            trackerManager.initializeTrackerSet(character.id, character.trackers);
            console.log(`Initialized tracker set for character ${character.name} (${character.id})`);
          });
          trackerManagers.set(sessionId, trackerManager);
          console.log(`Tracker manager created for session ${sessionId}`);
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
      const newSessions = new Map(state.sessions);
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
      const targetSession = _state.sessions.get(session.id);
      if (targetSession) {
        const updatedSession = { ...targetSession, ...session };
        const newSessions = new Map(_state.sessions).set(session.id, updatedSession);
        return { sessions: newSessions };
      }
      return _state;
    });
  },

  // 履歴管理: セッションを履歴として保存
  saveSessionToHistory: async (session_id) => {
    const session = get().sessions.get(session_id);
    if (!session) return;
    
    try {
      const response = await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(session)
      });
      
      if (!response.ok) throw new Error('Failed to save history');
      console.log(`✅ Session ${session_id} saved to history`);
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
        sessions: new Map(state.sessions).set(session_id, sessionData),
        active_session_id: session_id
      }));
      
      console.log(`✅ Session ${session_id} loaded from history`);
    } catch (error) {
      console.error('Error loading session from history:', error);
    }
  },
  
  // 履歴管理: セッションのピン留め
  pinSession: (session_id, isPinned) => {
    set(state => {
      const session = state.sessions.get(session_id);
      if (!session) return state;
      
      const updatedSession = { ...session, isPinned };
      const newSessions = new Map(state.sessions).set(session_id, updatedSession);
      
      // APIに更新を送信
      fetch('/api/history', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: session_id, updates: { isPinned } })
      }).catch(console.error);
      
      return { sessions: newSessions };
    });
  },

  // ヘルパー関数: トラッカーマネージャーの存在を確保
  ensureTrackerManagerExists: (character) => {
    const activeSessionId = get().active_session_id;
    if (!activeSessionId) return;
    
    const trackerManagers = get().trackerManagers;
    if (!trackerManagers.has(activeSessionId)) {
      const trackerManager = new TrackerManager();
      trackerManager.initializeTrackerSet(character.id, character.trackers);
      trackerManagers.set(activeSessionId, trackerManager);
      
      set(_state => ({
        trackerManagers: new Map(trackerManagers)
      }));
      
      console.log(`Tracker manager initialized for character ${character.name} (${character.id})`);
    }
  },
});
