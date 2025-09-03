// src/types/api/requests.types.ts
import { Character } from '../core/character.types';
import { Persona } from '../core/persona.types';
import { ConversationContext } from '../core/context.types';

// AIパラメータ型
export interface AIParameters {
  model: string;
  temperature: number;
  max_tokens: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop_sequences?: string[];
  stream?: boolean;
}

// AI生成リクエスト型
export interface AIGenerationRequest {
  prompt: string;
  system_prompt?: string;
  character?: Character;
  persona?: Persona;
  context?: ConversationContext;
  parameters?: AIParameters;
}

// 音声合成リクエスト型
export interface VoiceSynthesisRequest {
  text: string;
  voice_id?: string;
  speaker_id?: number;
  language?: string;
  speed?: number;
  pitch?: number;
  volume?: number;
  format?: 'mp3' | 'wav' | 'ogg';
}

// 画像生成リクエスト型
export interface ImageGenerationRequest {
  prompt: string;
  negative_prompt?: string;
  width?: number;
  height?: number;
  steps?: number;
  cfg_scale?: number;
  seed?: number;
  model?: string;
}

// メッセージ生成リクエスト型
export interface MessageGenerationRequest {
  message: string;
  characterId?: string;
  personaId?: string;
  systemPrompt?: string;
  context?: ConversationContext;
  parameters?: AIParameters;
}

// 感情分析リクエスト型
export interface EmotionAnalysisRequest {
  message: string;
  context?: string[];
  characterId?: string;
  sessionId?: string;
  analysisType?: 'surface' | 'contextual' | 'deep' | 'multi_layer';
}

// 感情追跡リクエスト型
export interface EmotionTrackingRequest {
  messageId: string;
  sessionId: string;
  characterId?: string;
  trackingMode?: 'continuous' | 'periodic' | 'triggered';
}

// 感情ベース応答リクエスト型
export interface EmotionBasedResponseRequest {
  baseMessage: string;
  emotionalContext: {
    current_emotion: string;
    intensity: number;
    triggers: string[];
  };
  characterId?: string;
  responseStyle?: 'empathetic' | 'supportive' | 'analytical';
}

// 文脈分析リクエスト型
export interface ContextAnalysisRequest {
  messages: string[];
  characters: Character[];
  sessionId: string;
  analysisDepth?: 'shallow' | 'medium' | 'deep';
}

// ベクトル検索リクエスト型
export interface VectorSearchRequest {
  query: string;
  limit?: number;
  threshold?: number;
  filters?: Record<string, any>;
}

// メモリインデックスリクエスト型
export interface MemoryIndexRequest {
  memories: Array<{
    id: string;
    content: string;
    metadata?: Record<string, any>;
  }>;
  method?: 'add' | 'update' | 'remove';
}

// 類似度計算リクエスト型
export interface SimilarityCalculationRequest {
  vectors: number[][];
  method?: 'cosine' | 'euclidean' | 'manhattan';
}