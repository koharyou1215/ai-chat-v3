import { StateCreator } from 'zustand';
import { UnifiedChatSession, UnifiedMessage, UUID, Character, Persona } from '@/types';
import { apiManager } from '@/services/api-manager';
import { promptBuilderService } from '@/services/prompt-builder.service';
import { TrackerManager } from '@/services/tracker/tracker-manager';
import { AppStore } from '..';

export interface ChatSlice {
  sessions: Map<UUID, UnifiedChatSession>;
  trackerManagers: Map<UUID, TrackerManager>; // Add tracker managers map
  active_session_id: UUID | null;
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
  updateSession: (session: Partial<UnifiedChatSession> & { id: UUID }) => void;

  getActiveSession: () => UnifiedChatSession | null;
  getSessionMessages: (session_id: UUID) => UnifiedMessage[];
}

export const createChatSlice: StateCreator<AppStore, [], [], ChatSlice> = (set, get) => ({
  sessions: new Map(),
  trackerManagers: new Map(),
  active_session_id: null,
  is_generating: false,
  showSettingsModal: false,
  currentInputText: '',
  
  createSession: async (character, persona) => {
    const newSession: UnifiedChatSession = {
      id: `session-${Date.now()}`,
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
          id: `welcome-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          version: 1,
          session_id: `session-${Date.now()}`,
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
          metadata: {}
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

    // Create and initialize a new TrackerManager for this session
    const trackerManager = new TrackerManager();
    trackerManager.initializeTrackerSet(character.id, character.trackers);

    set(state => ({
      sessions: new Map(state.sessions).set(newSession.id, newSession),
      trackerManagers: new Map(state.trackerManagers).set(newSession.id, trackerManager),
      active_session_id: newSession.id,
    }));

    return newSession.id;
  },

  sendMessage: async (content, imageUrl) => {
    const activeSessionId = get().active_session_id;
    if (!activeSessionId) return;

    if (get().is_generating) return;
    set({ is_generating: true });

    const activeSession = get().sessions.get(activeSessionId);
    if (!activeSession) {
      set({ is_generating: false });
      return;
    }

    // 1. ユーザーメッセージを作成
    const userMessage: UnifiedMessage = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
      session_id: activeSessionId,
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
    
    // 2. ユーザーメッセージをセッションに追加
    const sessionWithUserMessage = {
        ...activeSession,
        messages: [...activeSession.messages, userMessage],
        message_count: activeSession.message_count + 1,
        updated_at: new Date().toISOString(),
    };
    set(state => ({
        sessions: new Map(state.sessions).set(activeSessionId, sessionWithUserMessage)
    }));

    // 3. AI応答を生成
    try {
        const trackerManager = get().trackerManagers.get(activeSessionId);
        
        // 3a. 高度なプロンプトを構築
        const systemPrompt = await promptBuilderService.buildPrompt(
            sessionWithUserMessage, 
            content,
            trackerManager // Pass the tracker manager
        );

        // 3b. API呼び出し
        const aiResponseContent = await apiManager.generateMessage(
            systemPrompt,
            content,
            sessionWithUserMessage.messages.slice(-10).map(msg => ({ role: msg.role, content: msg.content }))
        );

        // 3c. AIメッセージを作成
        const aiResponse: UnifiedMessage = {
            id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            version: 1,
            session_id: activeSessionId,
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
        
        // 3d. AIメッセージをセッションに追加
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

    } catch (error) {
        console.error('AI応答生成エラー:', error);
        // TODO: Add error message to UI
    } finally {
        set({ is_generating: false });
    }
  },

  regenerateLastMessage: async () => {
    // 最後のAIメッセージの再生成ロジック
    const activeSessionId = get().active_session_id;
    if (!activeSessionId) return;
    const trackerManagers = get().trackerManagers;
    const session = get().sessions.get(activeSessionId);
    if (!session) return;
    const trackerManager = trackerManagers.get(activeSessionId);
    
    // 最後のAIメッセージを探す
    const lastAiIndex = [...session.messages].map((m, i) => ({ m, i })).reverse().find(obj => obj.m.role === 'assistant');
    if (!lastAiIndex) {
      alert('AIメッセージが見つかりません');
      return;
    }
    const lastAiMsg = lastAiIndex.m;
    const aiIdx = lastAiIndex.i;
    
    // 最後のユーザーメッセージを探す（再生成の基準）
    const lastUserMsg = [...session.messages].reverse().find(msg => msg.role === 'user');
    if (!lastUserMsg) {
      alert('ユーザーメッセージが見つかりません');
      return;
    }
    
    // AIメッセージを除いた履歴でプロンプトを再構築
    const messagesWithoutLastAi = session.messages.slice(0, aiIdx);
    const sessionForRegeneration = {
      ...session,
      messages: messagesWithoutLastAi
    };
    
    const systemPrompt = await promptBuilderService.buildPrompt(
      sessionForRegeneration,
      lastUserMsg.content,
      trackerManager
    );
    
    // 最後のAIメッセージを除いた会話履歴
    const conversationHistory = messagesWithoutLastAi
      .filter(msg => msg.role === 'user' || msg.role === 'assistant')
      .slice(-10)
      .map(msg => ({ role: msg.role as 'user' | 'assistant', content: msg.content }));
    
    const aiResponseContent = await apiManager.generateMessage(
      systemPrompt,
      lastUserMsg.content,
      conversationHistory
    );
    
    // 最後のAIメッセージを上書き（削除→新規追加）
    set(state => {
      const newMessage = {
        ...lastAiMsg,
        id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        content: aiResponseContent,
        regeneration_count: (lastAiMsg.regeneration_count || 0) + 1,
        is_deleted: false
      };
      const newMessages = [...session.messages];
      newMessages.splice(aiIdx, 1, newMessage); // 上書き
      const updatedSession = {
        ...session,
        messages: newMessages,
        message_count: newMessages.length,
        updated_at: new Date().toISOString(),
      };
      return {
        sessions: new Map(state.sessions).set(session.id, updatedSession)
      };
    });
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
        set(state => ({
            sessions: new Map(state.sessions).set(activeSessionId, updatedSession)
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
      
      set(state => ({
        sessions: new Map(state.sessions).set(activeSessionId, clearedSession)
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
    set({ active_session_id: sessionId });
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
  updateSession: (session) => {
    set(state => {
      const targetSession = state.sessions.get(session.id);
      if (targetSession) {
        const updatedSession = { ...targetSession, ...session };
        const newSessions = new Map(state.sessions).set(session.id, updatedSession);
        return { sessions: newSessions };
      }
      return state;
    });
  },
});
