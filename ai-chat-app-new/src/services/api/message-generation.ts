import { apiClient } from './api-client';
import { 
  MessageGenerationRequest, 
  MessageGenerationResponse,
  EmotionAnalysisRequest,
  EmotionAnalysisResponse,
  ContextAnalysisRequest,
  ContextAnalysisResponse
} from '@/types/api';
import { UnifiedMessage, Character, Persona, ConversationContext } from '@/types';

export class MessageGenerationService {
  /**
   * AIメッセージを生成する
   */
  async generateMessage(
    request: MessageGenerationRequest
  ): Promise<MessageGenerationResponse> {
    try {
      const response = await apiClient.post<MessageGenerationResponse>(
        '/generate/message',
        request
      );
      
      return response;
    } catch (error) {
      console.error('Message generation failed:', error);
      throw error;
    }
  }

  /**
   * ストリーミング形式でAIメッセージを生成する
   */
  async generateMessageStream(
    request: MessageGenerationRequest,
    onChunk: (chunk: Partial<MessageGenerationResponse>) => void
  ): Promise<MessageGenerationResponse> {
    try {
      const chunks = await apiClient.stream<Partial<MessageGenerationResponse>>(
        '/generate/message/stream',
        request,
        onChunk
      );
      
      // 最後のチャンクを完全なレスポンスとして返す
      const lastChunk = chunks[chunks.length - 1];
      return lastChunk as MessageGenerationResponse;
    } catch (error) {
      console.error('Streaming message generation failed:', error);
      throw error;
    }
  }

  /**
   * メッセージの感情を分析する
   */
  async analyzeEmotion(
    request: EmotionAnalysisRequest
  ): Promise<EmotionAnalysisResponse> {
    try {
      const response = await apiClient.post<EmotionAnalysisResponse>(
        '/analyze/emotion',
        request
      );
      
      return response;
    } catch (error) {
      console.error('Emotion analysis failed:', error);
      throw error;
    }
  }

  /**
   * 会話のコンテキストを分析する
   */
  async analyzeContext(
    request: ContextAnalysisRequest
  ): Promise<ContextAnalysisResponse> {
    try {
      const response = await apiClient.post<ContextAnalysisResponse>(
        '/analyze/context',
        request
      );
      
      return response;
    } catch (error) {
      console.error('Context analysis failed:', error);
      throw error;
    }
  }

  /**
   * キャラクターの性格に基づいてメッセージを生成する
   */
  async generateCharacterMessage(
    userMessage: string,
    character: Character,
    persona: Persona,
    conversationHistory: UnifiedMessage[],
    context: ConversationContext
  ): Promise<MessageGenerationResponse> {
    const request: MessageGenerationRequest = {
      user_message: userMessage,
      character: {
        id: character.id,
        name: character.identity.name,
        personality: character.personality,
        dialogue_style: character.dialogue_style,
        background: character.background,
        preferences: character.preferences
      },
      persona: {
        id: persona.id,
        name: persona.name,
        personality: persona.personality,
        preferences: persona.preferences
      },
      conversation_history: conversationHistory.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
        metadata: msg.metadata
      })),
      context: {
        mood: context.mood,
        topic: context.topic,
        relationship_level: context.relationship_level,
        conversation_depth: context.conversation_depth
      },
      generation_options: {
        max_length: 500,
        temperature: 0.8,
        include_emotion: true,
        include_memory_references: true
      }
    };

    return this.generateMessage(request);
  }

  /**
   * 感情分析付きでメッセージを生成する
   */
  async generateMessageWithEmotion(
    userMessage: string,
    character: Character,
    persona: Persona,
    conversationHistory: UnifiedMessage[]
  ): Promise<{
    message: MessageGenerationResponse;
    emotion: EmotionAnalysisResponse;
  }> {
    try {
      // 並行して感情分析とメッセージ生成を実行
      const [emotionResponse, messageResponse] = await Promise.all([
        this.analyzeEmotion({
          text: userMessage,
          context: {
            conversation_history: conversationHistory.slice(-5),
            character_personality: character.personality,
            user_personality: persona.personality
          }
        }),
        this.generateCharacterMessage(
          userMessage,
          character,
          persona,
          conversationHistory,
          {
            mood: 'neutral',
            topic: 'general',
            relationship_level: 0.5,
            conversation_depth: 'medium'
          }
        )
      ]);

      return {
        message: messageResponse,
        emotion: emotionResponse
      };
    } catch (error) {
      console.error('Message generation with emotion failed:', error);
      throw error;
    }
  }

  /**
   * 会話の流れを予測する
   */
  async predictConversationFlow(
    currentContext: ConversationContext,
    character: Character,
    persona: Persona
  ): Promise<{
    suggested_topics: string[];
    predicted_mood_change: string;
    relationship_impact: number;
  }> {
    try {
      const response = await apiClient.post('/predict/conversation-flow', {
        current_context: currentContext,
        character: character,
        persona: persona
      });

      return response;
    } catch (error) {
      console.error('Conversation flow prediction failed:', error);
      throw error;
    }
  }

  /**
   * メッセージの品質を評価する
   */
  async evaluateMessageQuality(
    message: string,
    context: ConversationContext,
    character: Character
  ): Promise<{
    quality_score: number;
    coherence_score: number;
    character_alignment_score: number;
    suggestions: string[];
  }> {
    try {
      const response = await apiClient.post('/evaluate/message-quality', {
        message,
        context,
        character: {
          id: character.id,
          personality: character.personality,
          dialogue_style: character.dialogue_style
        }
      });

      return response;
    } catch (error) {
      console.error('Message quality evaluation failed:', error);
      throw error;
    }
  }
}

// シングルトンインスタンス
export const messageGenerationService = new MessageGenerationService();

