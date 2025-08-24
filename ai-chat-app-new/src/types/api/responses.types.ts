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
