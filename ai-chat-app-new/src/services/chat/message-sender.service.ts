import { UUID } from '@/types';
import { UnifiedMessage, UnifiedChatSession, Character, Persona } from '@/types';
import { generateStableId } from '@/utils/uuid';
import { simpleAPIManagerV2 } from '@/services/simple-api-manager-v2';
import { promptBuilderService } from '@/services/prompt-builder.service';

interface MessageSenderConfig {
  maxRetries: number;
  retryDelay: number;
  enableProgressive: boolean;
}

// Simple error handler utility
export class ChatErrorHandler {
  static async withErrorHandling<T>(
    operation: () => Promise<T>,
    operationName: string = 'Operation',
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`${operationName} failed (attempt ${attempt}/${maxRetries}):`, lastError);
        
        if (attempt === maxRetries) {
          throw lastError;
        }
        
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    
    throw lastError!;
  }
}

export class MessageSenderService {
  private config: MessageSenderConfig;
  private getState: () => any;
  private setState: (updater: (state: any) => any) => void;

  constructor(
    getState: () => any, 
    setState: (updater: (state: any) => any) => void,
    config?: Partial<MessageSenderConfig>
  ) {
    this.getState = getState;
    this.setState = setState;
    this.config = {
      maxRetries: 3,
      retryDelay: 1000,
      enableProgressive: false,
      ...config
    };
  }

  /**
   * メインのメッセージ送信メソッド
   */
  public async sendMessage(
    content: string,
    sessionId: UUID,
    imageUrl?: string
  ): Promise<{ userMessage: UnifiedMessage; aiMessage: UnifiedMessage }> {
    const state = this.getState();
    const session = state.sessions.get(sessionId);

    if (!session) {
      throw new Error('Session not found');
    }

    const user = state.personas.get(state.activePersonaId);
    const character = state.characters.get(state.selectedCharacterId);

    if (!user) {
      throw new Error('No active persona found');
    }
    
    if (!character) {
      throw new Error('No character selected');
    }

    // ユーザーメッセージ作成
    const userMessage = this.createUserMessage(
      content,
      sessionId,
      user,
      imageUrl
    );

    // セッションに追加
    this.addMessageToSession(sessionId, userMessage);

    // AI応答を生成
    const aiMessage = await this.generateAIResponse(userMessage, session);

    // AI応答をセッションに追加
    this.addMessageToSession(sessionId, aiMessage);

    return { userMessage, aiMessage };
  }

  /**
   * ユーザーメッセージの作成
   */
  private createUserMessage(
    content: string,
    sessionId: UUID,
    user: Persona,
    imageUrl?: string
  ): UnifiedMessage {
    return {
      id: generateStableId('user'),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
      session_id: sessionId,
      role: 'user' as const,
      content,
      // Note: sender_id removed as it's not part of UnifiedMessage type
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
        user_id: user.id, // Store user info in metadata instead
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
    
    // プロンプト構築 - 正しい引数でbuildPromptを呼び出し
    const systemPrompt = await promptBuilderService.buildPrompt(
      session,
      userMessage.content
    );

    // API呼び出し
    const response = await ChatErrorHandler.withErrorHandling(
      async () => {
        return await simpleAPIManagerV2.generateMessage(
          systemPrompt,
          userMessage.content,
          this.formatConversationHistory(session.messages)
        );
      },
      'AI応答生成',
      this.config.maxRetries
    );

    // AI応答メッセージ作成
    return this.createAIMessage(
      response,
      session.id,
      session.participants.characters[0]
    );
  }

  /**
   * AI応答メッセージの作成
   */
  private createAIMessage(
    content: string,
    sessionId: UUID,
    character: Character
  ): UnifiedMessage {
    return {
      id: generateStableId('ai'),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
      session_id: sessionId,
      role: 'assistant' as const,
      content,
      character_name: character.name,
      memory: {
        importance: {
          score: 0.7,
          factors: {
            emotional_weight: 0.7,
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
        emotion: { primary: 'neutral', intensity: 0.5, emoji: '🤖' },
        style: { font_weight: 'normal', text_color: '#ffffff' },
        effects: [],
      },
      edit_history: [],
      regeneration_count: 0,
      is_deleted: false,
      metadata: {
        character_id: character.id, // Store character info in metadata
      },
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
        role: msg.role === 'user' ? 'user' : 'assistant', // Explicit type narrowing
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
    this.setState(state => {
      const session = state.sessions.get(sessionId);
      if (session) {
        session.messages.push(message);
        session.updated_at = new Date().toISOString();
        session.message_count = session.messages.length;
      }
      return state;
    });
  }

  /**
   * 設定更新
   */
  public updateConfig(newConfig: Partial<MessageSenderConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}