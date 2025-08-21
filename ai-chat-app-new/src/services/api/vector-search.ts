import { apiClient } from './api-client';
import { 
  VectorSearchRequest, 
  VectorSearchResponse,
  MemoryIndexRequest,
  MemoryIndexResponse,
  SimilarityCalculationRequest,
  SimilarityCalculationResponse
} from '@/types/api';
import { MemoryCard, VectorSearchResult } from '@/types';

export class VectorSearchService {
  /**
   * ベクトル検索を実行する
   */
  async searchVectors(
    request: VectorSearchRequest
  ): Promise<VectorSearchResponse> {
    try {
      const response = await apiClient.post<VectorSearchResponse>(
        '/search/vectors',
        request
      );
      
      return response;
    } catch (error) {
      console.error('Vector search failed:', error);
      throw error;
    }
  }

  /**
   * メモリーインデックスを作成・更新する
   */
  async indexMemory(
    request: MemoryIndexRequest
  ): Promise<MemoryIndexResponse> {
    try {
      const response = await apiClient.post<MemoryIndexResponse>(
        '/index/memory',
        request
      );
      
      return response;
    } catch (error) {
      console.error('Memory indexing failed:', error);
      throw error;
    }
  }

  /**
   * 類似度を計算する
   */
  async calculateSimilarity(
    request: SimilarityCalculationRequest
  ): Promise<SimilarityCalculationResponse> {
    try {
      const response = await apiClient.post<SimilarityCalculationResponse>(
        '/calculate/similarity',
        request
      );
      
      return response;
    } catch (error) {
      console.error('Similarity calculation failed:', error);
      throw error;
    }
  }

  /**
   * 会話履歴から関連するメモリーを検索する
   */
  async searchRelevantMemories(
    query: string,
    sessionId: string,
    limit: number = 10,
    threshold: number = 0.7
  ): Promise<VectorSearchResult[]> {
    try {
      const response = await apiClient.post<VectorSearchResponse>(
        '/search/relevant-memories',
        {
          query,
          session_id: sessionId,
          limit,
          similarity_threshold: threshold
        }
      );

      return response.results;
    } catch (error) {
      console.error('Relevant memory search failed:', error);
      throw error;
    }
  }

  /**
   * 感情に基づいて関連するメモリーを検索する
   */
  async searchMemoriesByEmotion(
    emotion: string,
    intensity: number,
    sessionId: string,
    limit: number = 5
  ): Promise<VectorSearchResult[]> {
    try {
      const response = await apiClient.post<VectorSearchResponse>(
        '/search/memories-by-emotion',
        {
          emotion,
          intensity,
          session_id: sessionId,
          limit
        }
      );

      return response.results;
    } catch (error) {
      console.error('Emotion-based memory search failed:', error);
      throw error;
    }
  }

  /**
   * トピックに基づいて関連するメモリーを検索する
   */
  async searchMemoriesByTopic(
    topic: string,
    sessionId: string,
    limit: number = 8
  ): Promise<VectorSearchResult[]> {
    try {
      const response = await apiClient.post<VectorSearchResponse>(
        '/search/memories-by-topic',
        {
          topic,
          session_id: sessionId,
          limit
        }
      );

      return response.results;
    } catch (error) {
      console.error('Topic-based memory search failed:', error);
      throw error;
    }
  }

  /**
   * 時系列でメモリーを検索する
   */
  async searchMemoriesByTimeRange(
    startTime: number,
    endTime: number,
    sessionId: string,
    limit: number = 10
  ): Promise<VectorSearchResult[]> {
    try {
      const response = await apiClient.post<VectorSearchResponse>(
        '/search/memories-by-time',
        {
          start_time: startTime,
          end_time: endTime,
          session_id: sessionId,
          limit
        }
      );

      return response.results;
    } catch (error) {
      console.error('Time-based memory search failed:', error);
      throw error;
    }
  }

  /**
   * 複数のクエリを組み合わせて検索する
   */
  async searchMemoriesWithMultipleQueries(
    queries: {
      text?: string;
      emotion?: string;
      topic?: string;
      time_range?: { start: number; end: number };
      weight: number;
    }[],
    sessionId: string,
    limit: number = 10
  ): Promise<VectorSearchResult[]> {
    try {
      const response = await apiClient.post<VectorSearchResponse>(
        '/search/memories-multi-query',
        {
          queries,
          session_id: sessionId,
          limit
        }
      );

      return response.results;
    } catch (error) {
      console.error('Multi-query memory search failed:', error);
      throw error;
    }
  }

  /**
   * メモリーの類似度マトリックスを生成する
   */
  async generateSimilarityMatrix(
    memories: MemoryCard[],
    sessionId: string
  ): Promise<{
    matrix: number[][];
    memory_ids: string[];
    average_similarity: number;
    clusters: string[][];
  }> {
    try {
      const response = await apiClient.post('/generate/similarity-matrix', {
        memories: memories.map(m => ({
          id: m.id,
          content: m.summary,
          keywords: m.keywords,
          category: m.category
        })),
        session_id: sessionId
      });

      return response;
    } catch (error) {
      console.error('Similarity matrix generation failed:', error);
      throw error;
    }
  }

  /**
   * メモリーのクラスタリングを実行する
   */
  async clusterMemories(
    sessionId: string,
    algorithm: 'kmeans' | 'hierarchical' | 'dbscan' = 'kmeans',
    numClusters: number = 5
  ): Promise<{
    clusters: {
      id: string;
      memories: string[];
      centroid: number[];
      coherence_score: number;
      representative_keywords: string[];
    }[];
    overall_coherence: number;
  }> {
    try {
      const response = await apiClient.post('/cluster/memories', {
        session_id: sessionId,
        algorithm,
        num_clusters: numClusters
      });

      return response;
    } catch (error) {
      console.error('Memory clustering failed:', error);
      throw error;
    }
  }

  /**
   * 検索結果の品質を評価する
   */
  async evaluateSearchQuality(
    query: string,
    results: VectorSearchResult[],
    userFeedback: {
      relevant: string[];
      irrelevant: string[];
      rating: number;
    }
  ): Promise<{
    precision: number;
    recall: number;
    f1_score: number;
    user_satisfaction: number;
    improvement_suggestions: string[];
  }> {
    try {
      const response = await apiClient.post('/evaluate/search-quality', {
        query,
        results: results.map(r => ({
          id: r.memory_id,
          similarity_score: r.similarity_score,
          content: r.content
        })),
        user_feedback: userFeedback
      });

      return response;
    } catch (error) {
      console.error('Search quality evaluation failed:', error);
      throw error;
    }
  }

  /**
   * ベクトル検索モデルを更新する
   */
  async updateSearchModel(
    trainingData: {
      query: string;
      relevant_memories: string[];
      irrelevant_memories: string[];
    }[]
  ): Promise<{
    model_updated: boolean;
    accuracy_improvement: number;
    new_accuracy: number;
    training_samples_processed: number;
  }> {
    try {
      const response = await apiClient.post('/update/search-model', {
        training_data: trainingData
      });

      return response;
    } catch (error) {
      console.error('Search model update failed:', error);
      throw error;
    }
  }
}

// シングルトンインスタンス
export const vectorSearchService = new VectorSearchService();




