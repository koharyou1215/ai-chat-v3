import { apiClient } from './api-client';
import { 
  SummarizationRequest, 
  SummarizationResponse,
  KeywordExtractionRequest,
  KeywordExtractionResponse,
  CategoryClassificationRequest,
  CategoryClassificationResponse
} from '@/types/api';
import { UnifiedMessage, MemoryCategory, MemoryImportance } from '@/types';

export class SummarizationService {
  /**
   * 会話内容を要約する
   */
  async summarizeConversation(
    request: SummarizationRequest
  ): Promise<SummarizationResponse> {
    try {
      const response = await apiClient.post<SummarizationResponse>(
        '/summarize/conversation',
        request
      );
      
      return response;
    } catch (error) {
      console.error('Conversation summarization failed:', error);
      throw error;
    }
  }

  /**
   * キーワードを抽出する
   */
  async extractKeywords(
    request: KeywordExtractionRequest
  ): Promise<KeywordExtractionResponse> {
    try {
      const response = await apiClient.post<KeywordExtractionResponse>(
        '/extract/keywords',
        request
      );
      
      return response;
    } catch (error) {
      console.error('Keyword extraction failed:', error);
      throw error;
    }
  }

  /**
   * カテゴリを分類する
   */
  async classifyCategory(
    request: CategoryClassificationRequest
  ): Promise<CategoryClassificationResponse> {
    try {
      const response = await apiClient.post<CategoryClassificationResponse>(
        '/classify/category',
        request
      );
      
      return response;
    } catch (error) {
      console.error('Category classification failed:', error);
      throw error;
    }
  }

  /**
   * 会話からメモリーカードを自動生成する
   */
  async generateMemoryCard(
    messages: UnifiedMessage[],
    sessionId: string,
    characterId?: string
  ): Promise<{
    title: string;
    summary: string;
    keywords: string[];
    category: MemoryCategory;
    importance: MemoryImportance;
    emotional_content: string[];
    key_insights: string[];
  }> {
    try {
      const response = await apiClient.post('/generate/memory-card', {
        messages: messages.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
          metadata: msg.metadata
        })),
        session_id: sessionId,
        character_id: characterId
      });

      return response;
    } catch (error) {
      console.error('Memory card generation failed:', error);
      throw error;
    }
  }

  /**
   * 会話の感情的な流れを要約する
   */
  async summarizeEmotionalFlow(
    messages: UnifiedMessage[],
    sessionId: string
  ): Promise<{
    emotional_arc: string;
    key_emotional_moments: {
      timestamp: number;
      emotion: string;
      intensity: number;
      trigger: string;
    }[];
    overall_mood_trend: 'improving' | 'declining' | 'stable' | 'fluctuating';
    relationship_development: string;
    emotional_resolution: string;
  }> {
    try {
      const response = await apiClient.post('/summarize/emotional-flow', {
        messages: messages.map(msg => ({
          id: msg.id,
          content: msg.content,
          timestamp: msg.timestamp,
          metadata: msg.metadata
        })),
        session_id: sessionId
      });

      return response;
    } catch (error) {
      console.error('Emotional flow summarization failed:', error);
      throw error;
    }
  }

  /**
   * 会話のトピックを要約する
   */
  async summarizeTopics(
    messages: UnifiedMessage[],
    sessionId: string
  ): Promise<{
    main_topics: {
      topic: string;
      importance: number;
      discussion_depth: number;
      related_keywords: string[];
    }[];
    topic_transitions: {
      from_topic: string;
      to_topic: string;
      transition_reason: string;
      timestamp: number;
    }[];
    overall_conversation_theme: string;
    topic_coherence_score: number;
  }> {
    try {
      const response = await apiClient.post('/summarize/topics', {
        messages: messages.map(msg => ({
          id: msg.id,
          content: msg.content,
          timestamp: msg.timestamp,
          metadata: msg.metadata
        })),
        session_id: sessionId
      });

      return response;
    } catch (error) {
      console.error('Topic summarization failed:', error);
      throw error;
    }
  }

  /**
   * 会話の関係性の発展を要約する
   */
  async summarizeRelationshipDevelopment(
    messages: UnifiedMessage[],
    sessionId: string,
    characterId: string
  ): Promise<{
    relationship_level_change: number;
    trust_building_moments: {
      timestamp: number;
      action: string;
      impact: number;
    }[];
    conflict_resolution: {
      timestamp: number;
      conflict_type: string;
      resolution_method: string;
      outcome: string;
    }[];
    shared_experiences: string[];
    future_relationship_potential: number;
    recommendations: string[];
  }> {
    try {
      const response = await apiClient.post('/summarize/relationship-development', {
        messages: messages.map(msg => ({
          id: msg.id,
          content: msg.content,
          timestamp: msg.timestamp,
          metadata: msg.metadata
        })),
        session_id: sessionId,
        character_id: characterId
      });

      return response;
    } catch (error) {
      console.error('Relationship development summarization failed:', error);
      throw error;
    }
  }

  /**
   * 会話の学習内容を要約する
   */
  async summarizeLearningContent(
    messages: UnifiedMessage[],
    sessionId: string
  ): Promise<{
    key_learnings: {
      concept: string;
      explanation: string;
      examples: string[];
      importance: number;
    }[];
    knowledge_gaps: string[];
    learning_progress: {
      topic: string;
      initial_understanding: number;
      current_understanding: number;
      improvement: number;
    }[];
    suggested_next_steps: string[];
    overall_learning_score: number;
  }> {
    try {
      const response = await apiClient.post('/summarize/learning-content', {
        messages: messages.map(msg => ({
          id: msg.id,
          content: msg.content,
          timestamp: msg.timestamp,
          metadata: msg.metadata
        })),
        session_id: sessionId
      });

      return response;
    } catch (error) {
      console.error('Learning content summarization failed:', error);
      throw error;
    }
  }

  /**
   * 要約の品質を評価する
   */
  async evaluateSummaryQuality(
    originalContent: string,
    summary: string,
    criteria: {
      coherence: boolean;
      completeness: boolean;
      conciseness: boolean;
      accuracy: boolean;
    }
  ): Promise<{
    overall_score: number;
    coherence_score: number;
    completeness_score: number;
    conciseness_score: number;
    accuracy_score: number;
    improvement_suggestions: string[];
  }> {
    try {
      const response = await apiClient.post('/evaluate/summary-quality', {
        original_content: originalContent,
        summary,
        evaluation_criteria: criteria
      });

      return response;
    } catch (error) {
      console.error('Summary quality evaluation failed:', error);
      throw error;
    }
  }

  /**
   * 要約モデルを更新する
   */
  async updateSummarizationModel(
    trainingData: {
      input: string;
      expected_summary: string;
      quality_score: number;
      user_feedback: string;
    }[]
  ): Promise<{
    model_updated: boolean;
    quality_improvement: number;
    new_quality_score: number;
    training_samples_processed: number;
  }> {
    try {
      const response = await apiClient.post('/update/summarization-model', {
        training_data: trainingData
      });

      return response;
    } catch (error) {
      console.error('Summarization model update failed:', error);
      throw error;
    }
  }

  /**
   * 複数の要約スタイルで要約を生成する
   */
  async generateMultiStyleSummaries(
    content: string,
    styles: ('brief' | 'detailed' | 'emotional' | 'analytical' | 'storytelling')[]
  ): Promise<Record<string, string>> {
    try {
      const response = await apiClient.post('/generate/multi-style-summaries', {
        content,
        styles
      });

      return response.summaries;
    } catch (error) {
      console.error('Multi-style summary generation failed:', error);
      throw error;
    }
  }
}

// シングルトンインスタンス
export const summarizationService = new SummarizationService();








