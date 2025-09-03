// src/types/api/responses.types.ts

// API応答基本型
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: APIErrorInterface;
  metadata?: APIMetadata;
}

// APIエラー型（インターフェース）
export interface APIErrorInterface {
  code: string;
  message: string;
  details?: unknown;
  timestamp: string;
}

// APIメタデータ型
export interface APIMetadata {
  request_id: string;
  timestamp: string;
  duration_ms: number;
  rate_limit?: {
    limit: number;
    remaining: number;
    reset_at: string;
  };
}

// AI生成応答型
export interface AIGenerationResponse {
  content: string;
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  finish_reason: string;
  metadata?: Record<string, unknown>;
}

// 音声合成応答型
export interface VoiceSynthesisResponse {
  audio_url: string;
  duration_seconds: number;
  format: string;
  size_bytes: number;
}

// 画像生成応答型
export interface ImageGenerationResponse {
  image_url: string;
  width: number;
  height: number;
  seed: number;
  metadata?: Record<string, unknown>;
}

// メッセージ生成応答型
export interface MessageGenerationResponse {
  content: string;
  characterId?: string;
  messageId: string;
  timestamp: string;
  metadata?: {
    model: string;
    usage: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
    finish_reason: string;
  };
}

// 感情分析応答型
export interface EmotionAnalysisResponse {
  emotion_analysis: {
    primary_emotion: string;
    intensity: number;
    confidence: number;
    context: string;
    triggers: string[];
  };
  multi_layer?: {
    surface: Record<string, number>;
    contextual: Record<string, number>;
    deep: Record<string, number>;
  };
  processing_time_ms: number;
}

// 感情追跡応答型
export interface EmotionTrackingResponse {
  change_detected: boolean;
  change_type: 'stable' | 'improvement' | 'deterioration';
  intensity: number;
  triggers: string[];
  suggestions: string[];
}

// 感情ベース応答応答型
export interface EmotionBasedResponseResponse {
  strategy: string;
  approach: 'direct' | 'indirect' | 'gradual';
  key_phrases: string[];
  topics_to_avoid: string[];
  topics_to_emphasize: string[];
  expected_outcome: string;
}

// 文脈分析応答型
export interface ContextAnalysisResponse {
  context_summary: string;
  mood: string;
  topic: string;
  relationship_level: number;
  conversation_depth: number;
  key_insights: string[];
  recommendations: string[];
}

// ベクトル検索応答型
export interface VectorSearchResponse {
  results: Array<{
    id: string;
    content: string;
    score: number;
    metadata?: Record<string, any>;
  }>;
  totalCount: number;
  processingTime: number;
}

// メモリインデックス応答型
export interface MemoryIndexResponse {
  indexed: number;
  failed: number;
  errors?: string[];
  processingTime: number;
}

// 類似度計算応答型
export interface SimilarityCalculationResponse {
  matrix: number[][];
  clusters?: Array<{
    id: string;
    members: string[];
    centroid: number[];
  }>;
  statistics?: {
    mean: number;
    median: number;
    stdDev: number;
  };
}