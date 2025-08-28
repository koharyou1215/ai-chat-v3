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
    
    // 2.【改善案】最小保証トークン数を引き上げ、シナリオの長さに応じて動的に調整
    const baseTokens = Math.max(perCharacterMaxTokens, 250); // 最小保証を250に引き上げ
    const scenarioBonus = groupSession.scenario?.situation?.length || 0 > 100 ? 150 : 0; // シナリオが長い場合はボーナス
    const finalMaxTokens = Math.min(baseTokens + scenarioBonus, 1024); // 上限を1024に設定

    console.log(`🎯 [${character.name}] トークン配分: ${finalMaxTokens} (Base: ${baseTokens}, Bonus: ${scenarioBonus})`);
    
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
    // 全員の発言を含める（グループチャットなので） + 重複除去
    const tempHistory = recentMessages
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
    console.log(`🔍 [${character.name}] 会話履歴:`, conversationHistory);
    console.log(`🔍 [${character.name}] 全メッセージ数: ${groupSession.messages.length}, 使用履歴: ${conversationHistory.length}件`);

    // コンパクトモードを使用（Gemini使用時は自動的に有効）
    const isGemini = apiConfig?.provider === 'gemini';
    const isLaterCharacter = characterIndex > 0; // 2番目以降のキャラ
    const USE_COMPACT_MODE = isGemini || groupSession.characters.length > 2 || isLaterCharacter; // 後のキャラもコンパクトに
    
    let systemPrompt = USE_COMPACT_MODE 
      ? generateCompactGroupPrompt(character, otherCharacters, groupSession.persona.name)
      : `【超重要・絶対厳守】
あなたは、グループチャットに参加している『${character.name}』というキャラクターです。
AIやアシスタントとしての応答は固く禁じられています。

=== あなたの唯一のタスク ===
- これから提示される会話の文脈に対し、『${character.name}』として、**あなた自身のセリフのみを**出力してください。

=== 禁止事項（違反厳禁） ===
- **地の文やナレーションの禁止:** 小説のような三人称視点の描写（「〇〇は言った」など）は絶対に使用しないでください。
- **他のキャラクターのなりすまし禁止:** あなた以外のキャラクター（${otherCharacters || '他の参加者'}）のセリフや行動を絶対に生成しないでください。
- **AIとしての自己言及の禁止:** "AI", "モデル", "システム" などの単語は絶対に使用しないでください。

=== ${character.name}の人物設定（要約） ===
- **名前:** ${character.name}
- **性格:** ${character.personality ? character.personality.substring(0, 150) + '...' : '未設定'}
- **話し方:** ${character.speaking_style ? character.speaking_style.substring(0, 100) + '...' : '未設定'}
- **一人称:** ${character.first_person || '未設定'}, **二人称:** ${character.second_person || '未設定'}

=== グループチャットの状況 ===
- **ユーザー:** ${groupSession.persona.name}
- **他の参加者:** ${otherCharacters || 'なし'}
- **あなた:** ${character.name}
${groupSession.scenario ? `- **現在のシナリオ:** ${groupSession.scenario.title}` : ''}

【応答形式】
- **必ず『${character.name}』のセリフのみを出力してください。**
- 例：こんにちは！
- 例：今日は何を話しましょうか？`;
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
          max_tokens: finalMaxTokens,
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

    // 1. チャット履歴を切り詰める
    const rollbackMessages = session.messages.slice(0, messageIndex + 1);
    
    const updatedSession = {
      ...session,
      messages: rollbackMessages,
      message_count: rollbackMessages.length,
      updated_at: new Date().toISOString(),
    };

    set(state => ({
      groupSessions: new Map(state.groupSessions).set(activeSessionId, updatedSession)
    }));
    
    console.log(`⏪ Group session rolled back to message ${message_id}`);
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
        console.warn("Group regeneration aborted: No active group session ID.");
        return;
      }
      
      const session = state.groupSessions.get(activeSessionId);
      if (!session || session.messages.length < 2) {
        console.warn("Group regeneration aborted: Session not found or not enough messages.");
        return;
      }

      // 最後のAIメッセージとその直前のユーザーメッセージを見つける
      const lastAiMessageIndex = session.messages.findLastIndex(m => m.role === 'assistant' && !m.is_deleted && !m.metadata?.is_system_message);
      if (lastAiMessageIndex <= 0) {
        console.warn("Group regeneration aborted: No valid AI message to regenerate.");
        return;
      }

      const lastUserMessage = session.messages[lastAiMessageIndex - 1];
      if (!lastUserMessage || lastUserMessage.role !== 'user' || lastUserMessage.is_deleted) {
        console.warn("Group regeneration aborted: No valid user message found before the last AI message.");
        return;
      }

      const lastAiMessage = session.messages[lastAiMessageIndex];
      const targetCharacter = session.characters.find(c => c.id === lastAiMessage.character_id);
      
      if (!targetCharacter) {
        console.warn("Group regeneration aborted: Character not found for last AI message.");
        return;
      }

      // メッセージ履歴を最後のユーザーメッセージまで切り詰める
      const messagesForPrompt = session.messages.slice(0, lastAiMessageIndex);

      // 新しい応答を生成
      const previousResponses: UnifiedMessage[] = [];
      const regeneratedMessage = await state.generateCharacterResponse(
        session,
        targetCharacter,
        lastUserMessage.content,
        previousResponses
      );

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

      console.log('✅ Group message regenerated successfully');
    } catch (error) {
      console.error('❌ Group regeneration failed:', error);
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
        console.warn("Group continue aborted: No active group session ID.");
        return;
      }
      
      const session = state.groupSessions.get(activeSessionId);
      if (!session || session.messages.length === 0) {
        console.warn("Group continue aborted: Session not found or no messages.");
        return;
      }

      // 最後のAIメッセージを見つける
      const lastAiMessageIndex = session.messages.findLastIndex(m => m.role === 'assistant' && !m.is_deleted && !m.metadata?.is_system_message);
      if (lastAiMessageIndex === -1) {
        console.warn("Group continue aborted: No valid AI message to continue.");
        return;
      }

      const lastAiMessage = session.messages[lastAiMessageIndex];
      const targetCharacter = session.characters.find(c => c.id === lastAiMessage.character_id);
      
      if (!targetCharacter) {
        console.warn("Group continue aborted: Character not found for last AI message.");
        return;
      }

      // 続きを生成するため、最後のメッセージの内容に"続き"プロンプトを追加
      const continuePrompt = `前のメッセージの続きを書いてください。前のメッセージ内容:\n「${lastAiMessage.content}」\n\nこの続きとして自然に繋がる内容を生成してください。`;

      // 新しい続きメッセージを生成
      const previousResponses: UnifiedMessage[] = [];
      const continuationMessage = await state.generateCharacterResponse(
        session,
        targetCharacter,
        continuePrompt,
        previousResponses
      );

      // 元のメッセージ内容と続きを結合
      const combinedContent = `${lastAiMessage.content}\n\n${continuationMessage.content}`;

      // 元のメッセージを更新（続きを追加）
      const updatedLastMessage = {
        ...lastAiMessage,
        content: combinedContent,
        updated_at: new Date().toISOString(),
        metadata: {
          ...lastAiMessage.metadata,
          has_continuation: true,
          continuation_count: (lastAiMessage.metadata?.continuation_count || 0) + 1
        }
      };

      // メッセージ配列を更新
      const updatedMessages = [...session.messages];
      updatedMessages[lastAiMessageIndex] = updatedLastMessage;

      const updatedSession = {
        ...session,
        messages: updatedMessages,
        updated_at: new Date().toISOString()
      };

      set(state => ({
        groupSessions: new Map(state.groupSessions).set(activeSessionId, updatedSession)
      }));

      console.log('✅ Group message continued successfully');
    } catch (error) {
      console.error('❌ Group continuation failed:', error);
    } finally {
      set({ group_generating: false });
    }
  },
});
