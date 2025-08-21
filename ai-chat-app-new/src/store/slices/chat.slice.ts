import { StateCreator } from 'zustand';
import { UnifiedChatSession, UnifiedMessage, UUID, Character, Persona } from '@/types';
import { GroupChatSession, GroupChatMode } from '@/types/core/group-chat.types';
import { apiManager } from '@/services/api-manager';
import { promptBuilderService } from '@/services/prompt-builder.service';
import { TrackerManager } from '@/services/tracker/tracker-manager';
import { autoMemoryManager } from '@/services/memory/auto-memory-manager';
import { AppStore } from '..';

export interface ChatSlice {
  sessions: Map<UUID, UnifiedChatSession>;
  trackerManagers: Map<UUID, TrackerManager>;
  active_session_id: UUID | null;
  is_generating: boolean;
  showSettingsModal: boolean;
  currentInputText: string;
  
  // グループチャット機能
  groupSessions: Map<UUID, GroupChatSession>;
  active_group_session_id: UUID | null;
  is_group_mode: boolean;
  group_generating: boolean;
  
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
  
  // グループチャット機能
  createGroupSession: (characters: Character[], persona: Persona, mode?: GroupChatMode, groupName?: string) => Promise<UUID>;
  sendGroupMessage: (content: string, imageUrl?: string) => Promise<void>;
  setGroupMode: (isGroupMode: boolean) => void;
  setActiveGroupSessionId: (sessionId: UUID | null) => void;
  getActiveGroupSession: () => GroupChatSession | null;
  toggleGroupCharacter: (sessionId: UUID, characterId: string) => void;
  setGroupChatMode: (sessionId: UUID, mode: GroupChatMode) => void;
  
  // ヘルパー関数
  ensureTrackerManagerExists: (character: Character) => void;
}

export const createChatSlice: StateCreator<AppStore, [], [], ChatSlice> = (set, get) => ({
  sessions: new Map(),
  trackerManagers: new Map(),
  active_session_id: null,
  is_generating: false,
  showSettingsModal: false,
  currentInputText: '',
  
  // グループチャット初期値
  groupSessions: new Map(),
  active_group_session_id: null,
  is_group_mode: false,
  group_generating: false,
  
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
    // グループモードの場合はグループメッセージ送信を使用
    if (get().is_group_mode) {
      return get().sendGroupMessage(content, imageUrl);
    }

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
        // トラッカーマネージャーの存在を確保
        activeSession.participants.characters.forEach(character => {
          get().ensureTrackerManagerExists(character);
        });
        
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

        // 4. 自動メモリー管理 - AIメッセージを分析して重要度判定
        try {
            const characterId = activeSession.participants.characters[0]?.id;
            await autoMemoryManager.processNewMessage(
                aiResponse,
                activeSessionId,
                characterId,
                get().createMemoryCard
            );
        } catch (autoMemoryError) {
            console.error('Auto memory management error:', autoMemoryError);
            // 自動メモリー管理のエラーはサイレントに処理（メイン機能を妨げない）
        }

        // 5. トラッカー自動更新 - ユーザーメッセージとAIメッセージの両方を分析
        try {
            const characterId = activeSession.participants.characters[0]?.id;
            if (characterId && trackerManager) {
                // ユーザーメッセージの分析
                const userUpdates = trackerManager.analyzeMessageForTrackerUpdates(userMessage, characterId);
                if (userUpdates.length > 0) {
                    console.log('User message tracker updates:', userUpdates);
                }

                // AIメッセージの分析
                const aiUpdates = trackerManager.analyzeMessageForTrackerUpdates(aiResponse, characterId);
                if (aiUpdates.length > 0) {
                    console.log('AI message tracker updates:', aiUpdates);
                }
            }
        } catch (trackerError) {
            console.error('Auto tracker update error:', trackerError);
            // トラッカーの自動更新エラーはサイレントに処理（メイン機能を妨げない）
        }

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
        set(state => ({
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

  // グループチャット機能実装
  createGroupSession: async (characters, persona, mode = 'sequential', groupName) => {
    const groupSessionId = `group-${Date.now()}`;
    
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
      messages: [
        {
          id: `group-welcome-${Date.now()}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          version: 1,
          session_id: groupSessionId,
          role: 'assistant',
          content: `${characters.map(c => c.name).join('、')}がグループチャットに参加しました！`,
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
      max_active_characters: 3,
      speaking_order: characters.map(c => c.id),
      voice_settings: new Map(),
      response_delay: 500,
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
    if (!activeGroupSessionId) return;

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
        id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
        metadata: {}
      };

      groupSession.messages.push(userMessage);

      // アクティブキャラクターからの応答を生成
      const activeCharacters = Array.from(groupSession.active_character_ids)
        .map(id => groupSession.characters.find(c => c.id === id))
        .filter(Boolean);

      const responses: UnifiedMessage[] = [];

      if (groupSession.chat_mode === 'simultaneous') {
        // 同時応答 - 全キャラクターが同時に応答
        const responsePromises = activeCharacters.map(async (character, index) => {
          const response = await get().generateCharacterResponse(groupSession, character, content, []);
          return { ...response, metadata: { ...response.metadata, response_order: index } };
        });
        
        const parallelResponses = await Promise.all(responsePromises);
        responses.push(...parallelResponses);
        
      } else if (groupSession.chat_mode === 'random') {
        // ランダム応答 - アクティブキャラクターからランダムに1人選択
        const randomCharacter = activeCharacters[Math.floor(Math.random() * activeCharacters.length)];
        const response = await get().generateCharacterResponse(groupSession, randomCharacter, content, []);
        responses.push({ ...response, metadata: { ...response.metadata, response_order: 0 } });
        
      } else if (groupSession.chat_mode === 'smart') {
        // スマート応答 - AIが最適なキャラクターを選択
        // とりあえず最初のキャラクターを選択（後で改善可能）
        const smartCharacter = activeCharacters[0]; // TODO: AI判断ロジック
        const response = await get().generateCharacterResponse(groupSession, smartCharacter, content, []);
        responses.push({ ...response, metadata: { ...response.metadata, response_order: 0 } });
        
      } else {
        // 順次応答 (sequential) - キャラクターが順番に応答
        for (let i = 0; i < activeCharacters.length; i++) {
          const character = activeCharacters[i];
          const response = await get().generateCharacterResponse(groupSession, character, content, responses);
          responses.push({ ...response, metadata: { ...response.metadata, response_order: i } });
          
          // 少し遅延
          if (i < activeCharacters.length - 1 && groupSession.response_delay > 0) {
            await new Promise(resolve => setTimeout(resolve, groupSession.response_delay));
          }
        }
      }

      // 応答をセッションに追加
      groupSession.messages.push(...responses);
      groupSession.message_count += responses.length + 1; // ユーザーメッセージも含む
      groupSession.last_message_at = new Date().toISOString();
      groupSession.updated_at = new Date().toISOString();

      set(state => ({
        groupSessions: new Map(state.groupSessions).set(activeGroupSessionId, groupSession)
      }));

    } catch (error) {
      console.error('Group message generation failed:', error);
    } finally {
      set({ group_generating: false });
    }
  },

  // ヘルパー関数: キャラクターの応答生成
  generateCharacterResponse: async (groupSession: GroupChatSession, character: any, userMessage: string, previousResponses: UnifiedMessage[]) => {
    // グループチャット用のシステムプロンプトを構築
    const otherCharacters = groupSession.characters
      .filter(c => c.id !== character.id && groupSession.active_character_ids.has(c.id))
      .map(c => c.name)
      .join('、');

    const recentMessages = groupSession.messages.slice(-10);
    const conversationHistory = recentMessages
      .filter(msg => msg.role === 'user' || msg.role === 'assistant')
      .map(msg => ({ 
        role: msg.role as 'user' | 'assistant', 
        content: msg.content 
      }));

    let systemPrompt = `あなたは${character.name}として、グループチャットに参加しています。

=== 基本設定 ===
他の参加者: ${otherCharacters}
ユーザー: ${groupSession.persona.name}

=== キャラクター詳細 ===
性格: ${character.personality}
${character.speaking_style ? `話し方: ${character.speaking_style}` : ''}
${character.background ? `背景: ${character.background}` : ''}
${character.scenario ? `シナリオ: ${character.scenario}` : ''}

=== 行動指針 ===
- グループチャットでは自然で協調的な会話を心がけてください
- 他のキャラクターの発言も考慮して、重複を避けながら独自の視点で応答してください
- あなたの性格と背景に基づいて、一貫したキャラクターを演じてください
- ${character.name}らしい反応や発言を心がけてください`;

    // 直前の応答がある場合
    if (previousResponses.length > 0) {
      systemPrompt += `\n\n直前の応答:\n`;
      previousResponses.forEach(r => {
        systemPrompt += `${r.character_name}: ${r.content}\n`;
      });
      systemPrompt += `\nこれらも考慮して、${character.name}として応答してください。`;
    }

    try {
      const aiResponse = await apiManager.generateMessage(
        systemPrompt,
        userMessage,
        conversationHistory
      );

      return {
        id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1,
        session_id: groupSession.id,
        role: 'assistant',
        content: aiResponse,
        character_id: character.id,
        character_name: character.name,
        character_avatar: character.avatar_url,
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
        metadata: { is_group_response: true }
      } as UnifiedMessage;

    } catch (error) {
      console.error(`Failed to generate response for ${character.name}:`, error);
      
      return {
        id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1,
        session_id: groupSession.id,
        role: 'assistant',
        content: '...',
        character_id: character.id,
        character_name: character.name,
        character_avatar: character.avatar_url,
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

  // ヘルパー関数: トラッカーマネージャーの存在を確保
  ensureTrackerManagerExists: (character) => {
    const trackerManagers = get().trackerManagers;
    if (!trackerManagers.has(character.id)) {
      const trackerManager = new TrackerManager();
      trackerManager.initializeTrackerSet(character.id, character.trackers);
      trackerManagers.set(character.id, trackerManager);
      
      set(state => ({
        trackerManagers: new Map(trackerManagers)
      }));
      
      console.log(`Tracker manager initialized for character ${character.name} (${character.id})`);
    }
  },
});
