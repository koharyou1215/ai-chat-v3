// 🧠 感情知能システム v2.0 - 汎用基盤型定義
// ソロチャット・グループチャット共通で使用する基盤型

import { UUID } from './base.types';
import { Character } from './character.types';
import { UnifiedMessage } from './message.types';

// ======================== 基盤感情分析型 ========================

/**
 * 感情重み - すべての感情分析の基本単位
 */
export interface EmotionalWeight {
  // 主要感情
  primaryEmotion: 'joy' | 'sadness' | 'anger' | 'fear' | 'surprise' | 'disgust' | 'neutral' | 'love' | 'excitement' | 'anxiety';
  
  // 強度と信頼度 (0.0-1.0)
  intensity: number;    // 感情の強さ
  confidence: number;   // 分析の信頼度
  
  // 分析詳細
  context: string;      // 感情を生んだ文脈
  triggers: string[];   // 感情のトリガー
  timestamp: string;    // 検出時刻
}

/**
 * 多層感情分析結果
 */
export interface MultiLayerEmotionResult {
  surface: {
    joy: number;
    sadness: number;
    anger: number;
    fear: number;
    surprise: number;
    disgust: number;
    confidence: number;
    intensity: number;
  };
  
  contextual: {
    current_emotion: string;
    previous_emotion?: string;
    emotion_transition?: string;
    relationship_impact: number;
    confidence: number;
  };
  
  deep: {
    joy: number;
    sadness: number;
    anger: number;
    fear: number;
    surprise: number;
    disgust: number;
    trust: number;
    anticipation: number;
    intensity: number;
    confidence: number;
  };
  
  conversation_context?: {
    relationship_stage: 'stranger' | 'acquaintance' | 'friend' | 'close_relationship' | 'deep_bond';
    intimacy_level: number;
    trust_level: number;
  };
}

/**
 * 会話文脈 - ソロ・グループ両対応
 */
export interface ConversationalContext {
  // メッセージ文脈
  recentMessages: UnifiedMessage[];
  messageCount: number;
  
  // キャラクター文脈
  activeCharacters: Character[];
  
  // セッション情報
  sessionType: 'solo' | 'group';
  sessionId: UUID;
  sessionDuration: number; // 分
  
  // 会話フェーズ
  conversationPhase: 'introduction' | 'development' | 'climax' | 'resolution';
}

/**
 * 感情分析結果
 */
export interface EmotionAnalysisResult {
  id: UUID;
  timestamp: string;
  
  // 分析対象
  messageId: UUID;
  characterId?: UUID;
  
  // 分析結果
  emotion: EmotionalWeight;
  processingTime: number; // ミリ秒
  
  // 付加情報
  insights: string[];     // 洞察
  recommendations: string[]; // 推奨アクション
}

// ======================== 感情記憶システム ========================

/**
 * 感情記憶 - 重要な感情体験の記録
 */
export interface EmotionalMemory {
  id: UUID;
  timestamp: string;
  
  // 記憶内容
  description: string;
  participantIds: UUID[];
  emotionalImpact: number; // 0.0-1.0
  
  // 記憶特性
  significance: number;   // 重要度 (0.0-1.0)
  clarity: number;       // 鮮明さ (0.0-1.0)
  emotionalCharge: number; // 感情の極性 (-1.0 to 1.0)
  
  // 関連データ
  keywords: string[];
  consequences: string[];
}

// ======================== 性能最適化システム ========================

/**
 * 適応的性能管理設定
 */
export interface EmotionalPerformanceConfig {
  // 分析頻度
  emotionAnalysisFrequency: 'reduced' | 'standard' | 'enhanced';
  
  // 文脈深度
  contextDepth: 'shallow' | 'medium' | 'deep';
  
  // キャッシュサイズ
  cacheSize: 'minimal' | 'standard' | 'extensive';
  
  // 処理スレッド数
  workerThreads: number;
  
  // リアルタイム機能
  realTimeEffects: boolean;
  
  // 予測処理
  predictiveProcessing?: boolean;
}

/**
 * システム性能メトリクス
 */
export interface PerformanceMetrics {
  // 応答時間
  averageResponseTime: number; // ミリ秒
  
  // リソース使用量
  memoryUsage: number;    // MB
  cpuUsage: number;       // 0.0-1.0
  
  // キャッシュ効率
  cacheHitRate: number;   // 0.0-1.0
  
  // エラー率
  errorRate: number;      // 0.0-1.0
}

// ======================== 感情表現システム ========================

/**
 * 視覚効果
 */
export interface VisualEffect {
  effectType: 'color_shift' | 'glow' | 'pulse' | 'particle' | 'wave';
  intensity: number;      // 0.0-1.0
  duration: number;       // ミリ秒
  colors: string[];
  targetElement: 'message' | 'avatar' | 'background';
  triggerEmotion: string;
}

/**
 * 音響効果
 */
export interface AudioEffect {
  soundType: 'ambient' | 'voice_filter' | 'environmental';
  volume: number;         // 0.0-1.0
  duration: number;       // ミリ秒
  emotionalTrigger: string;
}

/**
 * テキスト装飾効果
 */
export interface TextStyleEffect {
  fontWeight?: 'normal' | 'bold';
  fontSize?: string;
  textColor?: string;
  animationType?: 'typewriter' | 'fade_in' | 'glow';
  animationDuration?: number;
}

/**
 * 感情表現統合
 */
export interface EmotionalExpression {
  visualEffects: VisualEffect[];
  audioEffects: AudioEffect[];
  textEffects: TextStyleEffect[];
  
  // 表現制御
  intensity: number;      // 全体の強度 (0.0-1.0)
  synchronization: boolean; // 同期制御
}

// ======================== 機能制御フラグ ========================

/**
 * 感情知能システム機能フラグ
 */
export interface EmotionalIntelligenceFlags {
  // フェーズ1: 基盤機能
  emotion_analysis_enabled: boolean;
  emotional_memory_enabled: boolean;
  basic_effects_enabled: boolean;
  
  // フェーズ2: 統合機能
  contextual_analysis_enabled: boolean;
  adaptive_performance_enabled: boolean;
  visual_effects_enabled: boolean;
  
  // フェーズ3: 高度機能
  predictive_analysis_enabled: boolean;
  advanced_effects_enabled: boolean;
  multi_layer_analysis_enabled: boolean;
  
  // 安全制御
  safe_mode: boolean;
  fallback_to_legacy: boolean;
  performance_monitoring: boolean;
  debug_mode: boolean;
}

/**
 * 感情知能システム状態
 */
export interface EmotionalIntelligenceState {
  // システム状態
  isEnabled: boolean;
  currentMode: 'solo' | 'group';
  
  // 感情データ
  currentEmotions: Map<UUID, EmotionalWeight>;
  emotionalMemories: EmotionalMemory[];
  
  // 分析結果履歴
  analysisHistory: EmotionAnalysisResult[];
  
  // 性能状態
  performanceMetrics: PerformanceMetrics;
  
  // 最終更新
  lastUpdated: string;
}

// ======================== キャッシュシステム ========================

/**
 * 感情キャッシュエントリ
 */
export interface EmotionCacheEntry {
  key: string;
  emotion: EmotionalWeight;
  timestamp: string;
  hitCount: number;
  similarity: number; // 類似度 (0.0-1.0)
}

/**
 * 文脈キャッシュエントリ
 */
export interface ContextCacheEntry {
  key: string;
  context: ConversationalContext;
  timestamp: string;
  relevanceScore: number; // 関連度 (0.0-1.0)
}

// ======================== ユーティリティ型 ========================

/**
 * 感情分析タスク
 */
export interface EmotionalAnalysisTask {
  taskId: UUID;
  messageId: UUID;
  content: string;
  context: string[];
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
}

/**
 * 分析品質設定
 */
export interface AnalysisQualitySettings {
  accuracy: 'fast' | 'balanced' | 'precise';
  contextWindow: number; // メッセージ数
  analysisLayers: ('surface' | 'contextual' | 'deep')[];
  confidenceThreshold: number; // 0.0-1.0
}

/**
 * エラー情報
 */
export interface EmotionalIntelligenceError {
  errorId: UUID;
  timestamp: string;
  errorType: 'analysis_failed' | 'cache_miss' | 'performance_degraded';
  message: string;
  recoveryAction?: string;
}

// ======================== 設定とプリセット ========================

/**
 * 感情知能システム設定
 */
export interface EmotionalIntelligenceSettings {
  // 基本設定
  analysisQuality: AnalysisQualitySettings;
  performanceConfig: EmotionalPerformanceConfig;
  
  // 表現設定
  expressionIntensity: number; // 0.0-1.0
  enableVisualEffects: boolean;
  enableAudioEffects: boolean;
  
  // キャッシュ設定
  cacheMaxSize: number;
  cacheTTL: number; // 秒
  
  // デバッグ設定
  enableLogging: boolean;
  verboseOutput: boolean;
}

/**
 * プリセット設定
 */
export interface EmotionalIntelligencePreset {
  name: string;
  description: string;
  settings: EmotionalIntelligenceSettings;
  recommendedFor: ('solo' | 'group' | 'performance' | 'quality')[];
}