import { StateCreator } from 'zustand';
import { UnifiedMessage, UUID, Character, Persona } from '@/types';
import { GroupChatSession, GroupChatMode, GroupChatScenario } from '@/types/core/group-chat.types';
import { apiManager } from '@/services/api-manager';
import { TrackerManager } from '@/services/tracker/tracker-manager';
import { generateCompactGroupPrompt } from '@/utils/character-summarizer';
import { AppStore } from '..';
import { 
  generateGroupSessionId, 
  generateWelcomeMessageId, 
  generateUserMessageId, 
  generateAIMessageId,
  generateSystemMessageId 
} from '@/utils/uuid';

export interface GroupChatSlice {
  groupSessions: Map<UUID, GroupChatSession>;
  active_group_session_id: UUID | null;
  is_group_mode: boolean;
  group_generating: boolean;
  
  // Character reselection state
  showCharacterReselectionModal: boolean;
  
  createGroupSession: (characters: Character[], persona: Persona, mode?: GroupChatMode, groupName?: string, scenario?: GroupChatScenario) => Promise<UUID>;
  sendGroupMessage: (content: string, imageUrl?: string) => Promise<void>;
  setGroupMode: (isGroupMode: boolean) => void;
  setActiveGroupSessionId: (sessionId: UUID | null) => void;
  setActiveGroupSession: (sessionId: UUID | null) => void; // エイリアス
  getActiveGroupSession: () => GroupChatSession | null;
  toggleGroupCharacter: (sessionId: UUID, characterId: string) => void;
  setGroupChatMode: (sessionId: UUID, mode: GroupChatMode) => void;
  
  // 🆕 Character reselection functionality
  setShowCharacterReselectionModal: (show: boolean) => void;
  updateSessionCharacters: (sessionId: UUID, newCharacters: Character[]) => void;
  addSystemMessage: (sessionId: UUID, content: string) => void;
  
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
    console.log('[GroupChat] Sending group message:', { content: content.substring(0, 50) + '...', hasImage: !!imageUrl });
    
    const activeGroupSessionId = get().active_group_session_id;
    if (!activeGroupSessionId) {
      console.error('[GroupChat] No active group session ID');
      return;
    }

    if (get().group_generating) return;
    set({ group_generating: true });

    const groupSession = get().groupSessions.get(activeGroupSessionId);
    if (!groupSession) {
      console.error('[GroupChat] Group session not found:', activeGroupSessionId);
      set({ group_generating: false });
      return;
    }
    
    console.log('[GroupChat] Found group session:', {
      id: groupSession.id,
      characterCount: groupSession.characters.length,
      activeCharacterCount: groupSession.active_character_ids.size,
      chatMode: groupSession.chat_mode
    });

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

      // アクティブキャラクターからの応答を生成
      const activeCharacters = Array.from(groupSession.active_character_ids)
        .map(id => groupSession.characters.find(c => c.id === id))
        .filter((char): char is Character => char !== undefined);

      console.log('[GroupChat] Active characters for response:', activeCharacters.map(c => ({ id: c.id, name: c.name })));

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
        console.log('[GroupChat] Generated responses:', responses.length, responses.map(r => ({ character: r.character_name, preview: r.content.substring(0, 50) + '...' })));
        groupSession.messages.push(...responses);
      }
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

  generateCharacterResponse: async (groupSession, character, userMessage, previousResponses) => {
    // API設定を取得（ソロモードと同じ方法で）
    const apiConfig = get().apiConfig || {};
    const openRouterApiKey = get().openRouterApiKey;
    const geminiApiKey = get().geminiApiKey;
    
    // デバッグ: API設定の確認
    console.log('🔐 [GroupChat] API Configuration:', {
      provider: apiConfig.provider,
      model: apiConfig.model,
      hasOpenRouterKey: !!openRouterApiKey,
      hasGeminiKey: !!geminiApiKey,
      maxTokens: apiConfig.max_tokens
    });
    
    // グループチャット用にトークンを均等配分
    const activeCharCount = groupSession.active_character_ids.size;
    const baseMaxTokens = apiConfig.max_tokens || 500;
    const perCharacterMaxTokens = Math.floor(baseMaxTokens / Math.max(activeCharCount, 1));
    
    // 最小保証トークン数
    const adjustedMaxTokens = Math.max(perCharacterMaxTokens, 150);
    
    console.log(`🎯 [${character.name}] トークン配分: ${adjustedMaxTokens} / ${baseMaxTokens} (キャラ数: ${activeCharCount})`);
    // グループチャット用のシステムプロンプトを構築
    const otherCharacters = groupSession.characters
      .filter(c => c.id !== character.id && groupSession.active_character_ids.has(c.id))
      .map(c => c.name)
      .join('、');

    // キャラクターの位置に応じて履歴を調整
    const characterIndex = previousResponses.length; // 今何番目のキャラか
    const historyReduction = Math.max(10 - (characterIndex * 2), 4); // 後のキャラほど履歴を減らす
    const recentMessages = groupSession.messages.slice(-historyReduction);
    console.log(`📚 [${character.name}] 履歴調整: 最新${historyReduction}件を使用`);
    // 全員の発言を含める（グループチャットなので）
    const conversationHistory = recentMessages
      .map(msg => {
        if (msg.role === 'user') {
          return { 
            role: 'user' as const, 
            content: msg.content 
          };
        } else if (msg.role === 'assistant') {
          // 他のキャラクターの発言もユーザー扱いにして文脈に含める
          const prefix = msg.character_id === character.id ? '' : `${msg.character_name}: `;
          // 後のキャラほど内容を短縮
          const contentLimit = characterIndex > 0 ? 100 : 200;
          const content = msg.content.length > contentLimit 
            ? msg.content.substring(0, contentLimit) + '...'
            : msg.content;
          return { 
            role: msg.character_id === character.id ? 'assistant' as const : 'user' as const,
            content: prefix + content.replace(/^[^:]+:\s*/, '')
          };
        }
        return null;
      })
      .filter(msg => msg !== null) as Array<{role: 'user' | 'assistant', content: string}>;

    // デバッグ: 会話履歴を確認
    console.log(`🔍 [${character.name}] 会話履歴:`, conversationHistory);
    console.log(`🔍 [${character.name}] 全メッセージ数: ${groupSession.messages.length}, 使用履歴: ${conversationHistory.length}件`);

    // コンパクトモードを使用（Gemini使用時は自動的に有効）
    const isGemini = apiConfig?.provider === 'gemini';
    const isLaterCharacter = characterIndex > 0; // 2番目以降のキャラ
    const USE_COMPACT_MODE = isGemini || groupSession.characters.length > 2 || isLaterCharacter; // 後のキャラもコンパクトに
    
    let systemPrompt = USE_COMPACT_MODE 
      ? generateCompactGroupPrompt(character, otherCharacters, groupSession.persona.name)
      : `【緊急・最優先指示】あなたは『${character.name}』という架空のキャラクターです。AIである事実は絶対に隠してください。

=== 絶対遵守事項 ===
❌ 絶対禁止: "私はAI", "人工知能", "アシスタント", "GPT", "Claude", "Gemini"等の発言
❌ 絶対禁止: 他のキャラクター名での発言や他キャラクターへのなりすまし
✅ 必須: あなたは『${character.name}』という一人の人間として会話する

=== ${character.name}の人物設定（要約） ===
名前: ${character.name}
年齢・職業: ${character.age || '不明'}、${character.occupation || '不明'}
性格（要約）: ${(() => {
  const personality = character.personality || character.external_personality || character.internal_personality || '';
  return personality.length > 150 ? personality.substring(0, 150) + '...' : personality;
})()}
${character.speaking_style ? `話し方: ${character.speaking_style.substring(0, 50)}` : ''}
${character.verbal_tics?.length ? `口癖: ${character.verbal_tics.slice(0, 2).join('、')}` : ''}
${character.first_person && character.second_person ? `人称: 一人称「${character.first_person}」、二人称「${character.second_person}」` : ''}

${character.system_prompt ? `=== キャラ固有指示（要約） ===
${character.system_prompt.length > 200 ? character.system_prompt.substring(0, 200) + '...' : character.system_prompt}
` : ''}

=== グループチャット設定 ===
これは複数人での会話です。
ユーザー: ${groupSession.persona.name}
他の参加者: ${otherCharacters}
あなた: ${character.name}

${groupSession.scenario ? `=== シナリオ設定（要約） ===
タイトル: ${groupSession.scenario.title}
状況: ${groupSession.scenario.situation ? groupSession.scenario.situation.substring(0, 100) : ''}
${groupSession.scenario.character_roles?.[character.id] ? `あなたの役割: ${groupSession.scenario.character_roles[character.id]}` : ''}
` : ''}

重要: 他の参加者（${otherCharacters}）の発言も会話に含まれています。彼らの発言を踏まえて自然に会話に参加してください。

=== 【厳重な行動指針】 ===
1. 【最重要】あなたは人間の『${character.name}』です。AIであることを絶対に言ってはいけません
2. 【最重要】自分以外のキャラクター（${otherCharacters}）の名前で発言は絶対禁止
3. 【必須】${character.name}の性格・話し方・設定に100%従って発言
4. 【必須】${character.name}らしい自然な感情と反応を表現
5. 会話の流れを理解し、${character.name}として適切に参加
6. 一度に一人分の発言のみ。複数キャラクターの発言を混在させない`; // テンプレートリテラルを閉じる

    // シナリオ情報を追加（コンパクトモードでも必要な場合）
    if (groupSession.scenario) {
      systemPrompt += `\n\n=== シナリオ ===\n${groupSession.scenario.title}: ${groupSession.scenario.situation?.substring(0, 100) || ''}`;
      if (groupSession.scenario.character_roles?.[character.id]) {
        systemPrompt += `\nあなたの役割: ${groupSession.scenario.character_roles[character.id]}`;
      }
    }

    // 直前の応答がある場合
    if (previousResponses.length > 0) {
      systemPrompt += `\n\n=== 直前の他キャラクターの発言 ===\n`;
      previousResponses.forEach(r => {
        if (r.character_name !== character.name) { // 自分の発言は除外
          systemPrompt += `${r.character_name}: ${r.content}\n`;
        }
      });
      systemPrompt += `\n【重要リマインド】これらは他のキャラクターの発言です。あなたは『${character.name}』として、独自の視点で応答してください。他のキャラクターの発言を繰り返したり、真似したりしないでください。`;
    }

    try {
      // テキストフォーマット設定を取得（ソロモードと同じ）
      const effectSettings = get().effectSettings || {};
      const textFormatting = effectSettings.textFormatting || 'readable';
      
      const aiResponse = await apiManager.generateMessage(
        systemPrompt,
        userMessage,
        conversationHistory,
        { 
          ...apiConfig,
          openRouterApiKey, // OpenRouterのAPIキーを追加
          geminiApiKey, // GeminiのAPIキーも追加
          max_tokens: adjustedMaxTokens,
          textFormatting // 読みやすさ設定を追加
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

  updateSessionCharacters: (sessionId, newCharacters) => {
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
});
