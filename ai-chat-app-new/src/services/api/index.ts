export { apiClient } from './api-client';
export { messageGenerationService } from './message-generation';
export { emotionAnalysisService } from './emotion-analysis';
export { vectorSearchService } from './vector-search';
export { summarizationService } from './summarization';

// 統合APIサービスクラス
import { messageGenerationService } from './message-generation';
import { emotionAnalysisService } from './emotion-analysis';
import { vectorSearchService } from './vector-search';
import { summarizationService } from './summarization';
import { UnifiedMessage, Character, Persona, ConversationContext, MemoryCard } from '@/types';
import { EmotionResult } from '../emotion/EmotionAnalyzer';
import { SearchResult } from '../memory/vector-store';

export class IntegratedAPIService {
  /**
   * 完全な会話サイクルを実行する
   */
  async executeConversationCycle(
    userMessage: string,
    character: Character,
    persona: Persona,
    conversationHistory: UnifiedMessage[],
    context: ConversationContext
  ): Promise<{
    aiResponse: UnifiedMessage;
    emotion: EmotionResult;
    memoryCard?: MemoryCard;
    relevantMemories: SearchResult[];
    contextUpdate: ConversationContext;
  }> {
    try {
      // 1. 感情分析
      const emotion = await emotionAnalysisService.analyzeEmotion({
        text: userMessage,
        context: {
          conversation_history: conversationHistory.slice(-5),
          character_personality: character.personality,
          user_personality: persona.personality
        }
      });

      // 2. 関連メモリー検索
      const relevantMemories = await vectorSearchService.searchRelevantMemories(
        userMessage,
        context.session_id || 'default',
        5,
        0.7
      );

      // 3. AI応答生成
      const aiResponse = await messageGenerationService.generateCharacterMessage(
        userMessage,
        character,
        persona,
        conversationHistory,
        context
      );

      // 4. メモリーカード生成（重要な会話の場合）
      let memoryCard;
      if (this.shouldGenerateMemoryCard(userMessage, aiResponse, emotion)) {
        memoryCard = await summarizationService.generateMemoryCard(
          conversationHistory.slice(-10),
          context.session_id || 'default',
          character.id
        );
      }

      // 5. コンテキスト更新
      const contextUpdate = await this.updateConversationContext(
        context,
        userMessage,
        aiResponse,
        emotion,
        relevantMemories
      );

      return {
        aiResponse,
        emotion,
        memoryCard,
        relevantMemories,
        contextUpdate
      };
    } catch (error) {
      console.error('Conversation cycle execution failed:', error);
      throw error;
    }
  }

  /**
   * メモリーカードを生成すべきかどうかを判定
   */
  private shouldGenerateMemoryCard(
    userMessage: string,
    aiResponse: UnifiedMessage,
    emotion: EmotionResult
  ): boolean {
    // 感情の強度が高い場合
    if (emotion.intensity > 0.8) return true;
    
    // メッセージが長い場合
    if (userMessage.length > 100 || aiResponse.content.length > 100) return true;
    
    // 特定のキーワードが含まれている場合
    const importantKeywords = ['重要', '覚えて', '忘れないで', '大切', '特別'];
    if (importantKeywords.some(keyword => 
      userMessage.includes(keyword) || aiResponse.content.includes(keyword)
    )) return true;

    return false;
  }

  /**
   * 会話コンテキストを更新
   */
  private async updateConversationContext(
    currentContext: ConversationContext,
    userMessage: string,
    aiResponse: UnifiedMessage,
    emotion: EmotionResult,
    relevantMemories: SearchResult[]
  ): Promise<ConversationContext> {
    // 感情の変化を追跡
    const _emotionChange = await emotionAnalysisService.detectEmotionChange(
      emotion,
      currentContext.mood || { primary_emotion: 'neutral', intensity: 0.5 },
      {
        conversation_history: [],
        character: {} as Character,
        persona: {} as Persona
      }
    );

    // トピック分析
    const topicSummary = await summarizationService.summarizeTopics(
      [{ content: userMessage, role: 'user' } as UnifiedMessage],
      currentContext.session_id || 'default'
    );

    return {
      ...currentContext,
      mood: emotion,
      topic: topicSummary.overall_conversation_theme,
      relationship_level: this.calculateRelationshipChange(
        currentContext.relationship_level || 0.5,
        emotion,
        relevantMemories
      ),
      conversation_depth: this.assessConversationDepth(
        userMessage,
        aiResponse,
        relevantMemories
      ),
      last_updated: Date.now()
    };
  }

  /**
   * 関係性レベルの変化を計算
   */
  private calculateRelationshipChange(
    currentLevel: number,
    emotion: EmotionResult,
    relevantMemories: SearchResult[]
  ): number {
    let change = 0;
    
    // 感情の強度に基づく変化
    if (emotion.intensity > 0.7) {
      change += emotion.primary_emotion === 'positive' ? 0.1 : -0.05;
    }
    
    // 関連メモリーの数に基づく変化
    if (relevantMemories.length > 0) {
      change += 0.02;
    }
    
    // 範囲内に制限
    const newLevel = Math.max(0, Math.min(1, currentLevel + change));
    return Math.round(newLevel * 100) / 100;
  }

  /**
   * 会話の深さを評価
   */
  private assessConversationDepth(
    userMessage: string,
    aiResponse: UnifiedMessage,
    relevantMemories: SearchResult[]
  ): 'shallow' | 'medium' | 'deep' {
    const messageLength = userMessage.length + aiResponse.content.length;
    const memoryRelevance = relevantMemories.length;
    
    if (messageLength > 200 && memoryRelevance > 3) return 'deep';
    if (messageLength > 100 || memoryRelevance > 1) return 'medium';
    return 'shallow';
  }

  /**
   * 会話の品質を総合評価
   */
  async evaluateConversationQuality(
    conversationHistory: UnifiedMessage[],
    _character: Character,
    _persona: Persona
  ): Promise<{
    overall_score: number;
    engagement_score: number;
    coherence_score: number;
    emotional_depth_score: number;
    learning_value_score: number;
    recommendations: string[];
  }> {
    try {
      // 感情の安定性を評価
      const emotions = conversationHistory
        .filter(msg => msg.metadata?.emotion)
        .map(msg => msg.metadata!.emotion!);
      
      const emotionalStability = await emotionAnalysisService.evaluateEmotionalStability(emotions);
      
      // 要約の品質を評価
      const conversationText = conversationHistory
        .map(msg => msg.content)
        .join('\n');
      
      const summary = await summarizationService.summarizeConversation({
        content: conversationText,
        max_length: 500,
        style: 'analytical'
      });
      
      const summaryQuality = await summarizationService.evaluateSummaryQuality(
        conversationText,
        summary.summary,
        { coherence: true, completeness: true, conciseness: true, accuracy: true }
      );

      // 総合スコアを計算
      const overallScore = (
        emotionalStability.stability_score * 0.3 +
        summaryQuality.overall_score * 0.4 +
        (conversationHistory.length > 5 ? 0.3 : 0.1)
      );

      return {
        overall_score: Math.round(overallScore * 100) / 100,
        engagement_score: Math.round(emotionalStability.stability_score * 100) / 100,
        coherence_score: Math.round(summaryQuality.coherence_score * 100) / 100,
        emotional_depth_score: Math.round(emotionalStability.volatility_index * 100) / 100,
        learning_value_score: Math.round(summaryQuality.completeness_score * 100) / 100,
        recommendations: [
          ...emotionalStability.recommendations,
          ...summaryQuality.improvement_suggestions
        ]
      };
    } catch (error) {
      console.error('Conversation quality evaluation failed:', error);
      throw error;
    }
  }
}

// 統合APIサービスのインスタンス
export const integratedAPIService = new IntegratedAPIService();
