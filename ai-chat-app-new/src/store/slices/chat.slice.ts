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
  deleteMessage: (message_id: UUID) => void;
  clearActiveConversation: () => void;
  exportActiveConversation: () => void;
  setShowSettingsModal: (show: boolean) => void;
  setCurrentInputText: (text: string) => void;
  
  // For Sidebar
  setActiveSessionId: (sessionId: UUID | null) => void;
  deleteSession: (sessionId: UUID) => void;
  clearAllSessions: () => void;
  updateSession: (session: Partial<UnifiedChatSession> & { id: UUID }) => void;

  getActiveSession: () => UnifiedChatSession | null;
  getSessionMessages: (session_id: UUID) => UnifiedMessage[];
  
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

    if (state.is_generating) return;
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
        const trackerManager = characterId ? get().trackerManagers.get(characterId) : null;
        
        // ⚡ プログレッシブプロンプト構築でUIフリーズを防止 (50-100ms)
        const { basePrompt, enhancePrompt } = await promptBuilderService.buildPromptProgressive(
            sessionWithUserMessage,
            content, 
            trackerManager
        );
        
        console.log('⚡ Base prompt ready, starting API call...');

        const apiConfig = get().apiConfig;
        // ⚡ 高優先度チャットリクエストをキューに追加（競合を防止）
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
              conversationHistory: activeSession.messages.slice(-5).map(msg => ({ role: msg.role, content: msg.content })), // 5メッセージに短縮で高速化
              textFormatting: state.effectSettings.textFormatting,
              apiConfig: {
                ...apiConfig,
                openRouterApiKey: get().openRouterApiKey,
                geminiApiKey: get().geminiApiKey
              },
              useEnhancedPrompt: false // フラグで制御
            }),
          });
        });
        
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
      const trackerManager = characterId ? get().trackerManagers.get(characterId) : null;
      
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
        session.participants.characters.forEach(character => {
          if (!trackerManagers.has(character.id)) {
            const trackerManager = new TrackerManager();
            trackerManager.initializeTrackerSet(character.id, character.trackers);
            trackerManagers.set(character.id, trackerManager);
            console.log(`Initialized tracker set for character ${character.name} (${character.id})`);
          }
        });
        
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

  // ヘルパー関数: トラッカーマネージャーの存在を確保
  ensureTrackerManagerExists: (character) => {
    const trackerManagers = get().trackerManagers;
    if (!trackerManagers.has(character.id)) {
      const trackerManager = new TrackerManager();
      trackerManager.initializeTrackerSet(character.id, character.trackers);
      trackerManagers.set(character.id, trackerManager);
      
      set(_state => ({
        trackerManagers: new Map(trackerManagers)
      }));
      
      console.log(`Tracker manager initialized for character ${character.name} (${character.id})`);
    }
  },
});
