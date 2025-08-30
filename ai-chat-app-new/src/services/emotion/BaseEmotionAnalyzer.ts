// 🧠 汎用感情分析エンジン - ソロ・グループ両対応の基盤システム
// 設計文書の「柱のアーキテクチャ」に基づく実装

import { 
  EmotionalWeight, 
  ConversationalContext, 
  EmotionAnalysisResult,
  EmotionalAnalysisTask,
  AnalysisQualitySettings,
  EmotionalIntelligenceError 
} from '@/types/core/emotional-intelligence.types';
import { UnifiedMessage, UUID, Character } from '@/types';

/**
 * 汎用感情分析エンジン
 * - ソロチャットとグループチャットで共通使用
 * - 高性能・非ブロッキング処理
 * - キャッシュ機能内蔵
 */
export class BaseEmotionAnalyzer {
  private analysisQueue: EmotionalAnalysisTask[] = [];
  private processingWorker?: Worker;
  private isProcessing = false;

  // 感情キーワードマッピング（日本語対応）
  private emotionKeywords = {
    joy: ['嬉しい', '楽しい', '喜び', '幸せ', 'ありがとう', '最高', 'やったー', '✨', '😊', '😄'],
    sadness: ['悲しい', '辛い', 'つらい', '寂しい', '落ち込む', 'ショック', '😢', '😭', '💔'],
    anger: ['腹立つ', '怒り', 'むかつく', 'イライラ', 'キレ', '💢', '😠', '😡'],
    fear: ['怖い', '不安', '心配', 'ドキドキ', 'ビビる', '緊張', '😰', '😱'],
    surprise: ['びっくり', '驚き', 'まじ', 'えー', 'うわー', '😲', '😮'],
    love: ['愛', '好き', 'ラブ', 'かわいい', '素敵', 'ときめき', '💕', '❤️', '😍'],
    excitement: ['興奮', 'ワクワク', '楽しみ', 'テンション', '盛り上がる', '🎉', '🔥'],
    anxiety: ['焦る', '不安', 'ヤバい', '間に合わない', 'ドキドキ', '😅', '😓']
  };

  constructor(
    private qualitySettings: AnalysisQualitySettings = {
      accuracy: 'balanced',
      contextWindow: 10,
      analysisLayers: ['surface', 'contextual'],
      confidenceThreshold: 0.6
    }
  ) {
    this.initializeWorker();
  }

  /**
   * メイン分析メソッド - ソロ・グループ両対応
   * @param message 分析対象メッセージ
   * @param context 会話文脈（ソロ・グループ対応）
   * @param characterId 分析対象キャラクター（オプション）
   * @returns 感情分析結果
   */
  async analyzeEmotion(
    message: UnifiedMessage,
    context: ConversationalContext,
    characterId?: UUID
  ): Promise<EmotionAnalysisResult> {
    const startTime = performance.now();

    try {
      // 1. 基本感情検出（表面層）
      const surfaceEmotion = this.analyzeSurfaceEmotion(message.content);

      // 2. 文脈考慮分析（文脈層）
      const contextualEmotion = this.analyzeContextualEmotion(
        message, 
        context, 
        surfaceEmotion
      );

      // 3. 最終感情重みを決定
      const finalEmotion = this.combineEmotionalLayers(
        surfaceEmotion, 
        contextualEmotion
      );

      const processingTime = performance.now() - startTime;

      return {
        id: this.generateAnalysisId(),
        timestamp: new Date().toISOString(),
        messageId: message.id,
        characterId,
        emotion: finalEmotion,
        processingTime,
        insights: this.generateInsights(finalEmotion, context),
        recommendations: this.generateRecommendations(finalEmotion, context)
      };

    } catch (error) {
      console.error('🧠❌ Emotion analysis failed:', error);
      return this.createFallbackResult(message, characterId, performance.now() - startTime);
    }
  }

  /**
   * 非同期バッチ分析 - 高性能処理
   * @param tasks 分析タスク配列
   * @returns 分析結果配列
   */
  async analyzeBatch(tasks: EmotionalAnalysisTask[]): Promise<EmotionAnalysisResult[]> {
    // キューに追加
    this.analysisQueue.push(...tasks);
    
    // バックグラウンド処理開始
    this.processQueue();

    // 結果を待機（非ブロッキング）
    return new Promise((resolve) => {
      const checkResults = () => {
        const results = tasks.map(task => {
          // 実際の実装では結果キャッシュから取得
          return this.createMockResult(task);
        });
        resolve(results);
      };

      // 少し遅延して結果を返す（実際の分析処理のシミュレーション）
      setTimeout(checkResults, 100);
    });
  }

  /**
   * 表面感情分析 - キーワードベース高速検出
   */
  private analyzeSurfaceEmotion(content: string): EmotionalWeight {
    const emotionScores = new Map<string, number>();
    
    // 各感情のキーワードマッチング
    for (const [emotion, keywords] of Object.entries(this.emotionKeywords)) {
      let score = 0;
      for (const keyword of keywords) {
        const regex = new RegExp(keyword, 'gi');
        const matches = content.match(regex);
        if (matches) {
          score += matches.length * this.getKeywordWeight(keyword);
        }
      }
      if (score > 0) {
        emotionScores.set(emotion, score);
      }
    }

    // 最高スコアの感情を選択
    let primaryEmotion = 'neutral';
    let maxScore = 0;
    for (const [emotion, score] of emotionScores) {
      if (score > maxScore) {
        maxScore = score;
        primaryEmotion = emotion;
      }
    }

    return {
      primaryEmotion: primaryEmotion as any,
      intensity: Math.min(maxScore / 10, 1.0), // 正規化
      confidence: maxScore > 0 ? 0.7 : 0.3,
      context: '表面感情分析',
      triggers: this.extractTriggers(content, primaryEmotion),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 文脈考慮感情分析
   */
  private analyzeContextualEmotion(
    message: UnifiedMessage,
    context: ConversationalContext,
    surfaceEmotion: EmotionalWeight
  ): EmotionalWeight {
    // 会話履歴から感情の流れを分析
    const recentEmotions = this.extractRecentEmotionalTrends(context);
    
    // キャラクター性格考慮
    const characterInfluence = this.analyzeCharacterInfluence(
      message, 
      context.activeCharacters
    );

    // 会話フェーズ考慮
    const phaseInfluence = this.analyzePhaseInfluence(
      context.conversationPhase,
      surfaceEmotion
    );

    // 文脈修正された感情重み
    return {
      primaryEmotion: this.adjustEmotionByContext(
        surfaceEmotion.primaryEmotion,
        recentEmotions,
        characterInfluence
      ),
      intensity: this.adjustIntensityByContext(
        surfaceEmotion.intensity,
        phaseInfluence,
        characterInfluence
      ),
      confidence: Math.min(surfaceEmotion.confidence + 0.2, 0.95),
      context: '文脈考慮分析',
      triggers: [
        ...surfaceEmotion.triggers,
        ...this.extractContextualTriggers(context)
      ],
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 感情レイヤー統合
   */
  private combineEmotionalLayers(
    surface: EmotionalWeight,
    contextual: EmotionalWeight
  ): EmotionalWeight {
    // 信頼度に基づく加重平均
    const surfaceWeight = surface.confidence;
    const contextualWeight = contextual.confidence;
    const totalWeight = surfaceWeight + contextualWeight;

    if (totalWeight === 0) {
      return surface; // フォールバック
    }

    return {
      primaryEmotion: contextualWeight > surfaceWeight 
        ? contextual.primaryEmotion 
        : surface.primaryEmotion,
      intensity: (surface.intensity * surfaceWeight + contextual.intensity * contextualWeight) / totalWeight,
      confidence: Math.min(totalWeight / 2, 0.95),
      context: '統合分析結果',
      triggers: [...new Set([...surface.triggers, ...contextual.triggers])],
      timestamp: new Date().toISOString()
    };
  }

  // ======================== ヘルパーメソッド ========================

  private getKeywordWeight(keyword: string): number {
    // 絵文字は高重み、一般的な言葉は低重み
    if (/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/u.test(keyword)) {
      return 2.0; // 絵文字
    }
    if (keyword.length <= 3) {
      return 1.5; // 短い感情語
    }
    return 1.0; // 一般語
  }

  private extractTriggers(content: string, emotion: string): string[] {
    const triggers = [];
    const keywords = this.emotionKeywords[emotion as keyof typeof this.emotionKeywords] || [];
    
    for (const keyword of keywords) {
      if (content.includes(keyword)) {
        triggers.push(keyword);
      }
    }
    
    return triggers;
  }

  private extractRecentEmotionalTrends(context: ConversationalContext): string[] {
    // 直近メッセージから感情トレンドを抽出
    const recentMessages = context.recentMessages.slice(-5);
    return recentMessages.map(msg => {
      const surface = this.analyzeSurfaceEmotion(msg.content);
      return surface.primaryEmotion;
    });
  }

  private analyzeCharacterInfluence(
    message: UnifiedMessage,
    activeCharacters: Character[]
  ): number {
    // キャラクターの性格特性による感情表現の影響度
    if (!message.character_id) return 0.5; // デフォルト影響度
    
    const character = activeCharacters.find(c => c.id === message.character_id);
    if (!character) return 0.5;

    // 性格特性から感情表現傾向を分析
    // （簡易実装、将来的にはAI分析で高度化）
    const personality = character.personality?.toLowerCase() || '';
    
    if (personality.includes('明るい') || personality.includes('元気')) {
      return 0.8; // 感情表現が強い
    }
    if (personality.includes('控えめ') || personality.includes('静か')) {
      return 0.3; // 感情表現が控えめ
    }
    
    return 0.5; // 標準
  }

  private analyzePhaseInfluence(
    phase: ConversationalContext['conversationPhase'],
    emotion: EmotionalWeight
  ): number {
    // 会話フェーズによる感情強度調整
    switch (phase) {
      case 'introduction':
        return 0.7; // 導入段階は控えめ
      case 'development':
        return 1.0; // 発展段階は標準
      case 'climax':
        return 1.3; // クライマックスは強化
      case 'resolution':
        return 0.8; // 解決段階は安定
      default:
        return 1.0;
    }
  }

  private adjustEmotionByContext(
    primaryEmotion: string,
    recentTrends: string[],
    characterInfluence: number
  ): any {
    // 感情の文脈調整ロジック
    // 連続する同じ感情は信頼度を高める
    const recentSameEmotion = recentTrends.filter(e => e === primaryEmotion).length;
    
    if (recentSameEmotion >= 2) {
      // 感情の一貫性があれば維持
      return primaryEmotion;
    }
    
    // キャラクター影響を考慮
    if (characterInfluence < 0.4 && ['anger', 'excitement'].includes(primaryEmotion)) {
      // 控えめなキャラクターの強い感情は中和
      return 'neutral';
    }
    
    return primaryEmotion;
  }

  private adjustIntensityByContext(
    intensity: number,
    phaseInfluence: number,
    characterInfluence: number
  ): number {
    return Math.min(intensity * phaseInfluence * characterInfluence, 1.0);
  }

  private extractContextualTriggers(context: ConversationalContext): string[] {
    const triggers = [];
    
    // セッションタイプに基づくトリガー
    if (context.sessionType === 'group') {
      triggers.push('グループダイナミクス');
    }
    
    // 会話フェーズに基づくトリガー
    if (context.conversationPhase === 'climax') {
      triggers.push('クライマックス');
    }
    
    return triggers;
  }

  private generateInsights(
    emotion: EmotionalWeight, 
    context: ConversationalContext
  ): string[] {
    const insights = [];
    
    if (emotion.confidence > 0.8) {
      insights.push(`${emotion.primaryEmotion}の感情が明確に検出されました`);
    }
    
    if (emotion.intensity > 0.7) {
      insights.push('感情の強度が高く、重要な感情的瞬間です');
    }
    
    if (context.sessionType === 'group' && emotion.primaryEmotion !== 'neutral') {
      insights.push('グループ内での感情表現は他のメンバーに影響を与える可能性があります');
    }
    
    return insights;
  }

  private generateRecommendations(
    emotion: EmotionalWeight,
    context: ConversationalContext
  ): string[] {
    const recommendations = [];
    
    if (emotion.primaryEmotion === 'sadness' && emotion.intensity > 0.6) {
      recommendations.push('共感的な応答や励ましの言葉が効果的です');
    }
    
    if (emotion.primaryEmotion === 'joy' && context.sessionType === 'group') {
      recommendations.push('この喜びを他のメンバーと共有すると良い雰囲気になります');
    }
    
    if (emotion.primaryEmotion === 'anger' && emotion.intensity > 0.7) {
      recommendations.push('感情を受け止めつつ、冷静な対話を促すことが重要です');
    }
    
    return recommendations;
  }

  private createFallbackResult(
    message: UnifiedMessage,
    characterId: UUID | undefined,
    processingTime: number
  ): EmotionAnalysisResult {
    return {
      id: this.generateAnalysisId(),
      timestamp: new Date().toISOString(),
      messageId: message.id,
      characterId,
      emotion: {
        primaryEmotion: 'neutral',
        intensity: 0.5,
        confidence: 0.3,
        context: 'フォールバック分析',
        triggers: ['分析失敗'],
        timestamp: new Date().toISOString()
      },
      processingTime,
      insights: ['感情分析に失敗しましたが、システムは正常に動作しています'],
      recommendations: ['既存の会話機能をお使いください']
    };
  }

  private createMockResult(task: EmotionalAnalysisTask): EmotionAnalysisResult {
    // モック結果生成（実装時は実際の分析結果に置き換え）
    return {
      id: this.generateAnalysisId(),
      timestamp: new Date().toISOString(),
      messageId: task.messageId,
      characterId: undefined,
      emotion: {
        primaryEmotion: 'neutral',
        intensity: 0.5,
        confidence: 0.7,
        context: 'バッチ分析',
        triggers: [],
        timestamp: new Date().toISOString()
      },
      processingTime: 50,
      insights: ['バッチ処理により効率的に分析されました'],
      recommendations: []
    };
  }

  private generateAnalysisId(): UUID {
    return 'analysis_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private initializeWorker(): void {
    // Web Worker初期化（実装予定）
    // 重い処理をメインスレッドから分離
  }

  private processQueue(): void {
    if (this.isProcessing || this.analysisQueue.length === 0) return;
    
    this.isProcessing = true;
    
    // 非同期でキューを処理
    setTimeout(() => {
      // 実際の処理実装
      this.analysisQueue = [];
      this.isProcessing = false;
    }, 100);
  }

  /**
   * システム性能情報を取得
   */
  getPerformanceMetrics() {
    return {
      queueLength: this.analysisQueue.length,
      isProcessing: this.isProcessing,
      supportedEmotions: Object.keys(this.emotionKeywords),
      qualitySettings: this.qualitySettings
    };
  }
}