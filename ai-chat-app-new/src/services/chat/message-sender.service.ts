/**
 * Message Sender Service
 * チャットメッセージ送信ロジックをカプセル化
 * 
 * Phase 2の実装例 - 段階的にchat.sliceから移行
 */

import { UnifiedMessage, UnifiedChatSession, UUID, Persona, Character } from '@/types';
import { generateUserMessageId, generateAIMessageId } from '@/utils/uuid';
import { simpleAPIManagerV2 } from '@/services/simple-api-manager-v2';
import { promptBuilderService } from '@/services/prompt-builder.service';
import { ChatErrorHandler } from './error-handler.service';
import { getSessionSafely } from '@/utils/chat/map-helpers';

export interface MessageSenderConfig {
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export class MessageSenderService {
  constructor(
    private getState: () => any,
    private setState: (state: any) => void,
    private config?: MessageSenderConfig
  ) {}

  /**
   * ユーザーメッセージを送信し、AI応答を生成
   */
  async sendMessage(
    content: string,
    imageUrl?: string,
    sessionId?: UUID
  ): Promise<UnifiedMessage | null> {
    try {
      // 1. 入力検証
      this.validateInput(content);

      // 2. セッション取得
      const session = this.getActiveSession(sessionId);
      if (!session) {
        throw new Error('アクティブなセッションが見つかりません');
      }

      // 3. ユーザーメッセージ作成
      const userMessage = this.createUserMessage(
        content,
        session.id,
        session.participants.user,
        imageUrl
      );

      // 4. メッセージを履歴に追加
      this.addMessageToSession(session.id, userMessage);

      // 5. AI応答を生成
      const aiResponse = await this.generateAIResponse(
        userMessage,
        session
      );

      // 6. AI応答を履歴に追加
      this.addMessageToSession(session.id, aiResponse);

      return aiResponse;
    } catch (error) {
      ChatErrorHandler.logError(error, 'MessageSenderService.sendMessage');
      ChatErrorHandler.showUserFriendlyError(
        ChatErrorHandler.getDetailedErrorMessage(error)
      );
      return null;
    }
  }

  /**
   * 入力検証
   */
  private validateInput(content: string): void {
    if (!content || content.trim().length === 0) {
      throw new Error('メッセージを入力してください');
    }

    if (content.length > 10000) {
      throw new Error('メッセージが長すぎます（最大10000文字）');
    }
  }

  /**
   * アクティブセッション取得
   */
  private getActiveSession(sessionId?: UUID): UnifiedChatSession | null {
    const state = this.getState();
    const id = sessionId || state.active_session_id;
    
    if (!id) return null;
    
    return getSessionSafely(state.sessions, id) || null;
  }

  /**
   * ユーザーメッセージ作成
   */
  private createUserMessage(
    content: string,
    sessionId: UUID,
    user: Persona,
    imageUrl?: string
  ): UnifiedMessage {
    return {
      id: generateUserMessageId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
      session_id: sessionId,
      role: 'user' as const,
      content,
      sender_id: user.id,
      memory: {
        importance: {
          score: 0.5,
          factors: {
            emotional_weight: 0.5,
            repetition_count: 0,
            user_emphasis: 0.5,
            ai_judgment: 0.5,
          },
        },
        is_pinned: false,
        is_bookmarked: false,
        keywords: [],
      },
      expression: {
        emotion: { primary: 'neutral', intensity: 0.5, emoji: '💬' },
        style: { font_weight: 'normal', text_color: '#ffffff' },
        effects: [],
      },
      edit_history: [],
      regeneration_count: 0,
      is_deleted: false,
      metadata: {
        image_url: imageUrl,
      },
    };
  }

  /**
   * AI応答生成
   */
  private async generateAIResponse(
    userMessage: UnifiedMessage,
    session: UnifiedChatSession
  ): Promise<UnifiedMessage> {
    const state = this.getState();
    const character = session.participants.characters[0];
    const user = session.participants.user;

    // プロンプト構築
    const systemPrompt = promptBuilderService.buildSystemPrompt(
      character,
      user,
      {
        // コンテキスト情報
        session_id: session.id,
        current_emotion: 'neutral',
        recent_messages: session.messages.slice(-10),
      }
    );

    // API呼び出し
    const response = await ChatErrorHandler.withErrorHandling(
      async () => {
        return await simpleAPIManagerV2.generateMessage(
          systemPrompt,
          userMessage.content,
          this.formatConversationHistory(session.messages),
          {
            ...this.config,
            ...state.apiConfig,
          }
        );
      },
      'AI Response Generation',
      {
        showToast: true,
        retries: 2,
        retryDelay: 1000,
      }
    );

    // AI応答メッセージ作成
    return {
      id: generateAIMessageId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
      session_id: session.id,
      role: 'assistant' as const,
      content: response,
      character_id: character.id,
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
        emotion: { primary: 'neutral', intensity: 0.6, emoji: '💬' },
        style: { font_weight: 'normal', text_color: '#ffffff' },
        effects: [],
      },
      edit_history: [],
      regeneration_count: 0,
      is_deleted: false,
      metadata: {},
    };
  }

  /**
   * 会話履歴のフォーマット
   */
  private formatConversationHistory(
    messages: UnifiedMessage[]
  ): { role: 'user' | 'assistant'; content: string }[] {
    return messages
      .slice(-20) // 最新20件
      .filter(msg => !msg.is_deleted)
      .map(msg => ({
        role: msg.role,
        content: msg.content,
      }));
  }

  /**
   * セッションにメッセージを追加
   */
  private addMessageToSession(
    sessionId: UUID,
    message: UnifiedMessage
  ): void {
    const state = this.getState();
    const session = getSessionSafely(state.sessions, sessionId);
    
    if (!session) return;

    const updatedSession = {
      ...session,
      messages: [...session.messages, message],
      message_count: session.message_count + 1,
      updated_at: new Date().toISOString(),
      last_message_at: new Date().toISOString(),
    };

    const updatedSessions = new Map(state.sessions);
    updatedSessions.set(sessionId, updatedSession);

    this.setState({
      sessions: updatedSessions,
    });
  }

  /**
   * メッセージ再生成
   */
  async regenerateMessage(messageId: UUID): Promise<UnifiedMessage | null> {
    try {
      const session = this.getActiveSession();
      if (!session) {
        throw new Error('セッションが見つかりません');
      }

      const messageIndex = session.messages.findIndex(m => m.id === messageId);
      if (messageIndex === -1) {
        throw new Error('メッセージが見つかりません');
      }

      // 最後のユーザーメッセージを取得
      const lastUserMessage = session.messages
        .slice(0, messageIndex)
        .reverse()
        .find(m => m.role === 'user');

      if (!lastUserMessage) {
        throw new Error('再生成するユーザーメッセージが見つかりません');
      }

      // 新しいAI応答を生成
      const newResponse = await this.generateAIResponse(lastUserMessage, session);

      // 古いメッセージを置換
      const updatedMessages = [...session.messages];
      updatedMessages[messageIndex] = {
        ...newResponse,
        regeneration_count: (updatedMessages[messageIndex].regeneration_count || 0) + 1,
      };

      // セッション更新
      const updatedSession = {
        ...session,
        messages: updatedMessages,
        updated_at: new Date().toISOString(),
      };

      const updatedSessions = new Map(this.getState().sessions);
      updatedSessions.set(session.id, updatedSession);

      this.setState({
        sessions: updatedSessions,
      });

      return newResponse;
    } catch (error) {
      ChatErrorHandler.logError(error, 'MessageSenderService.regenerateMessage');
      ChatErrorHandler.showUserFriendlyError(
        `再生成失敗: ${ChatErrorHandler.getDetailedErrorMessage(error)}`
      );
      return null;
    }
  }
}