// 🧠 ソロチャット専用感情分析エンジン - BaseEmotionAnalyzerの拡張
// Phase 2: 汎用基盤の上にソロチャット特化機能を構築

import { BaseEmotionAnalyzer } from './BaseEmotionAnalyzer';
import { 
  EmotionalWeight, 
  ConversationalContext, 
  EmotionAnalysisResult,
  EmotionalMemory,
  AnalysisQualitySettings
} from '@/types/core/emotional-intelligence.types';
import { UnifiedMessage, UUID, Character } from '@/types';

/**
 * ソロチャット専用感情分析エンジン
 * - BaseEmotionAnalyzerを継承し、汎用基盤を活用
 * - 1対1会話に特化した高精度分析
 * - 個人的関係性と長期記憶の管理
 */
export class SoloEmotionAnalyzer extends BaseEmotionAnalyzer {
  private userEmotionalProfile: Map<string, UserEmotionalPattern> = new Map();
  private characterRelationships: Map<UUID, RelationshipProfile> = new Map();
  private emotionalMemories: Map<string, EmotionalMemory[]> = new Map();
  private memoryOptimizationInterval: NodeJS.Timeout | null = null;

  constructor(qualitySettings?: AnalysisQualitySettings) {
    super(qualitySettings);
    this.initializeSoloFeatures();
  }

  /**
   * ソロチャット専用感情分析
   * - BaseEmotionAnalyzer機能を拡張
   * - 個人的関係性と履歴を考慮した高精度分析
   */
  async analyzeSoloEmotion(
    message: UnifiedMessage,
    context: ConversationalContext,
    characterId: UUID,
    userId: string = 'default_user'
  ): Promise<SoloEmotionAnalysisResult> {
    
    // 1. 基盤分析実行（BaseEmotionAnalyzer）
    const baseAnalysis = await this.analyzeEmotion(message, context, characterId);
    
    // 2. ソロチャット特化分析の追加
    const personalizedAnalysis = await this.enhanceWithPersonalization(
      baseAnalysis,
      message,
      characterId,
      userId
    );
    
    // 3. 関係性影響の分析
    const relationshipAnalysis = await this.analyzeRelationshipImpact(
      personalizedAnalysis,
      characterId,
      userId,
      context
    );
    
    // 4. 長期記憶への保存
    await this.updateEmotionalMemory(
      relationshipAnalysis,
      characterId,
      userId
    );
    
    return relationshipAnalysis;
  }

  /**
   * パーソナライズ強化分析
   * - ユーザーの感情パターンを学習・適用
   * - キャラクターとの個人的関係性を考慮
   */
  private async enhanceWithPersonalization(
    baseAnalysis: EmotionAnalysisResult,
    message: UnifiedMessage,
    characterId: UUID,
    userId: string
  ): Promise<SoloEmotionAnalysisResult> {
    
    // ユーザーの感情パターン分析
    const userPattern = await this.analyzeUserEmotionalPattern(
      message.content,
      userId
    );
    
    // キャラクターとの関係性取得または作成
    const relationshipKey = `${userId}_${characterId}`;
    const relationship = this.characterRelationships.get(relationshipKey) || 
      this.createNewRelationship(characterId, userId);
    
    // 感情重みの個人化調整
    const personalizedEmotion = this.adjustEmotionForPersonalization(
      baseAnalysis.emotion,
      userPattern,
      relationship
    );
    
    // ソロチャット特化の洞察生成
    const soloInsights = this.generateSoloInsights(
      personalizedEmotion,
      relationship,
      userPattern
    );
    
    return {
      ...baseAnalysis,
      emotion: personalizedEmotion,
      insights: [...baseAnalysis.insights, ...soloInsights],
      personalization: {
        userEmotionalProfile: userPattern,
        relationshipLevel: relationship.intimacyLevel,
        trustScore: relationship.trustScore,
        communicationCompatibility: relationship.communicationCompatibility
      },
      soloSpecific: {
        intimacyGrowth: this.calculateIntimacyGrowth(relationship, personalizedEmotion),
        personalizedRecommendations: this.generatePersonalizedRecommendations(
          personalizedEmotion, relationship
        ),
        emotionalResonance: this.calculateEmotionalResonance(
          userPattern, personalizedEmotion
        )
      }
    };
  }

  /**
   * 関係性影響分析
   * - キャラクターとユーザーの関係性への影響を分析
   */
  private async analyzeRelationshipImpact(
    analysis: SoloEmotionAnalysisResult,
    characterId: UUID,
    userId: string,
    context: ConversationalContext
  ): Promise<SoloEmotionAnalysisResult> {
    
    const relationshipKey = `${userId}_${characterId}`;
    const currentRelationship = this.characterRelationships.get(relationshipKey)!;
    
    // 関係性への影響計算
    const relationshipImpact = this.calculateRelationshipImpact(
      analysis.emotion,
      currentRelationship,
      context
    );
    
    // 関係性の更新
    const updatedRelationship = this.updateRelationship(
      currentRelationship,
      relationshipImpact
    );
    
    this.characterRelationships.set(relationshipKey, updatedRelationship);
    
    // 関係性変化の記録
    const relationshipEvolution = {
      previousLevel: currentRelationship.intimacyLevel,
      newLevel: updatedRelationship.intimacyLevel,
      changeReason: this.identifyChangeReason(analysis.emotion),
      significance: relationshipImpact.significance
    };
    
    return {
      ...analysis,
      relationshipEvolution,
      predictions: {
        futureIntimacyLevel: this.predictFutureIntimacy(updatedRelationship),
        recommendedInteractions: this.recommendInteractions(updatedRelationship),
        potentialMilestones: this.identifyPotentialMilestones(updatedRelationship)
      }
    };
  }

  /**
   * ユーザー感情パターン分析
   */
  private async analyzeUserEmotionalPattern(
    content: string,
    userId: string
  ): Promise<UserEmotionalPattern> {
    
    const existingPattern = this.userEmotionalProfile.get(userId) || 
      this.createDefaultUserPattern(userId);
    
    // 現在のメッセージから感情傾向を分析
    const currentTendencies = this.extractEmotionalTendencies(content);
    
    // パターンの更新（学習）
    const updatedPattern = this.updateUserPattern(
      existingPattern,
      currentTendencies
    );
    
    this.userEmotionalProfile.set(userId, updatedPattern);
    return updatedPattern;
  }

  // ======================== ヘルパーメソッド ========================

  private initializeSoloFeatures(): void {
    console.log('🧠👤 Solo Emotion Analyzer initialized on top of BaseEmotionAnalyzer');
    
    // 定期的なメモリ最適化（メモリリークを防ぐためタイマーIDを保存）
    this.memoryOptimizationInterval = setInterval(() => {
      this.optimizeSoloMemory();
    }, 300000); // 5分間隔
  }

  /**
   * アナライザーの停止とクリーンアップ
   */
  public dispose(): void {
    if (this.memoryOptimizationInterval) {
      clearInterval(this.memoryOptimizationInterval);
      this.memoryOptimizationInterval = null;
    }
    
    // 基底クラスのクリーンアップも実行
    super.dispose && super.dispose();
    
    console.log('🧠👤 Solo Emotion Analyzer disposed');
  }

  private createNewRelationship(characterId: UUID, userId: string): RelationshipProfile {
    return {
      characterId,
      userId,
      intimacyLevel: 0.1,
      trustScore: 0.5,
      communicationCompatibility: 0.5,
      interactionCount: 0,
      lastInteraction: new Date().toISOString(),
      emotionalHistory: [],
      milestones: [],
      relationshipTrend: 'stable'
    };
  }

  private createDefaultUserPattern(userId: string): UserEmotionalPattern {
    return {
      userId,
      dominantEmotion: 'neutral',
      expressiveness: 0.5,
      emotionalStability: 0.7,
      positivityBias: 0.6,
      empathyLevel: 0.8,
      communicationStyle: 'balanced',
      lastUpdated: new Date().toISOString()
    };
  }

  private adjustEmotionForPersonalization(
    emotion: EmotionalWeight,
    userPattern: UserEmotionalPattern,
    relationship: RelationshipProfile
  ): EmotionalWeight {
    
    // ユーザーの感情表現傾向に基づく調整
    const intensityAdjustment = 0.8 + (userPattern.expressiveness * 0.3) + (relationship.intimacyLevel * 0.2);
    
    // 関係性レベルに基づく信頼度調整
    const confidenceBoost = relationship.intimacyLevel * 0.2;
    
    return {
      ...emotion,
      intensity: Math.min(emotion.intensity * intensityAdjustment, 1.0),
      confidence: Math.min(emotion.confidence + confidenceBoost, 0.95),
      context: emotion.context + ' (ソロチャット個人化)',
      triggers: [
        ...emotion.triggers,
        `関係性Lv${Math.round(relationship.intimacyLevel * 100)}%`
      ]
    };
  }

  private generateSoloInsights(
    emotion: EmotionalWeight,
    relationship: RelationshipProfile,
    userPattern: UserEmotionalPattern
  ): string[] {
    const insights = [];
    
    if (relationship.intimacyLevel > 0.7) {
      insights.push(`深い関係性(${Math.round(relationship.intimacyLevel * 100)}%)の中での${emotion.primaryEmotion}表現`);
    }
    
    if (userPattern.emotionalStability < 0.3 && emotion.intensity > 0.6) {
      insights.push('感情的な変動期における強い感情表現を検出');
    }
    
    if (emotion.primaryEmotion === userPattern.dominantEmotion) {
      insights.push('個人的な感情パターンと一致した自然な表現');
    }
    
    return insights;
  }

  private calculateRelationshipImpact(
    emotion: EmotionalWeight,
    relationship: RelationshipProfile,
    context: ConversationalContext
  ): RelationshipImpact {
    
    const baseImpact = emotion.intensity * emotion.confidence;
    
    // 感情の種類による影響度調整
    const emotionalImpactMap: Record<string, number> = {
      'love': 2.0, 'joy': 1.5, 'trust': 1.8, 'sadness': 1.3,
      'anger': 0.7, 'fear': 0.8, 'neutral': 0.2
    };
    
    const emotionalMultiplier = emotionalImpactMap[emotion.primaryEmotion] || 1.0;
    const contextMultiplier = context.conversationPhase === 'climax' ? 1.5 : 1.0;
    
    const totalImpact = baseImpact * emotionalMultiplier * contextMultiplier;
    
    return {
      intimacyChange: this.calculateIntimacyChange(emotion, totalImpact),
      trustChange: this.calculateTrustChange(emotion, totalImpact),
      compatibilityChange: totalImpact * 0.03,
      significance: totalImpact
    };
  }

  private updateRelationship(
    relationship: RelationshipProfile,
    impact: RelationshipImpact
  ): RelationshipProfile {
    
    return {
      ...relationship,
      intimacyLevel: Math.max(0, Math.min(1.0, relationship.intimacyLevel + impact.intimacyChange)),
      trustScore: Math.max(0, Math.min(1.0, relationship.trustScore + impact.trustChange)),
      communicationCompatibility: Math.max(0, Math.min(1.0, 
        relationship.communicationCompatibility + impact.compatibilityChange
      )),
      interactionCount: relationship.interactionCount + 1,
      lastInteraction: new Date().toISOString(),
      relationshipTrend: this.determineRelationshipTrend(impact)
    };
  }

  private extractEmotionalTendencies(content: string): EmotionalTendencies {
    const length = content.length;
    const questionCount = (content.match(/[？?]/g) || []).length;
    const exclamationCount = (content.match(/[！!]/g) || []).length;
    
    return {
      textLength: length,
      questionFrequency: questionCount / Math.max(length, 1),
      excitementLevel: exclamationCount / Math.max(length, 1),
      formalityLevel: this.analyzeFormalityLevel(content)
    };
  }

  private analyzeFormalityLevel(content: string): number {
    const formalWords = ['です', 'ます', 'である', 'ございます'];
    let formalCount = 0;
    
    formalWords.forEach(word => {
      formalCount += (content.match(new RegExp(word, 'g')) || []).length;
    });
    
    return Math.min(formalCount / Math.max(content.length / 20, 1), 1.0);
  }

  private updateUserPattern(
    existing: UserEmotionalPattern,
    tendencies: EmotionalTendencies
  ): UserEmotionalPattern {
    const learningRate = 0.1;
    
    return {
      ...existing,
      expressiveness: existing.expressiveness * (1 - learningRate) + 
        tendencies.excitementLevel * learningRate,
      lastUpdated: new Date().toISOString()
    };
  }

  private calculateIntimacyGrowth(
    relationship: RelationshipProfile,
    emotion: EmotionalWeight
  ): number {
    const growthMap: Record<string, number> = {
      'love': 2.0, 'joy': 1.5, 'trust': 1.8, 'sadness': 1.3
    };
    const growthRate = growthMap[emotion.primaryEmotion] || 1.0;
    return emotion.intensity * emotion.confidence * growthRate * 0.1;
  }

  private generatePersonalizedRecommendations(
    emotion: EmotionalWeight,
    relationship: RelationshipProfile
  ): string[] {
    const recommendations = [];
    
    if (relationship.intimacyLevel < 0.3) {
      recommendations.push('関係性構築期：共通の話題から親密度を深めましょう');
    } else if (relationship.intimacyLevel > 0.8) {
      recommendations.push('深い関係性：より個人的な感情表現が適切です');
    }
    
    if (emotion.primaryEmotion === 'sadness' && emotion.intensity > 0.7) {
      recommendations.push('強い悲しみ：共感的なサポートが最も効果的');
    }
    
    return recommendations;
  }

  private calculateEmotionalResonance(
    userPattern: UserEmotionalPattern,
    emotion: EmotionalWeight
  ): number {
    const patternMatch = userPattern.dominantEmotion === emotion.primaryEmotion ? 1.0 : 0.5;
    const intensityMatch = 1 - Math.abs(userPattern.expressiveness - emotion.intensity);
    return (patternMatch + intensityMatch) / 2;
  }

  private async updateEmotionalMemory(
    analysis: SoloEmotionAnalysisResult,
    characterId: UUID,
    userId: string
  ): Promise<void> {
    
    if (analysis.emotion.intensity > 0.6) {
      const memoryKey = `${userId}_${characterId}`;
      const memories = this.emotionalMemories.get(memoryKey) || [];
      
      const newMemory: EmotionalMemory = {
        id: `memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        description: `${analysis.emotion.primaryEmotion}の感情体験`,
        participantIds: [characterId],
        emotionalImpact: analysis.emotion.intensity,
        significance: analysis.emotion.confidence,
        clarity: analysis.emotion.confidence,
        emotionalCharge: this.calculateEmotionalCharge(analysis.emotion),
        keywords: analysis.emotion.triggers,
        consequences: analysis.soloSpecific?.personalizedRecommendations || []
      };
      
      memories.push(newMemory);
      if (memories.length > 50) memories.shift();
      
      this.emotionalMemories.set(memoryKey, memories);
      console.log(`🧠💾 Solo emotional memory saved: ${analysis.emotion.primaryEmotion}`);
    }
  }

  private optimizeSoloMemory(): void {
    // 30日以上古い記憶を削除
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    
    for (const [key, memories] of this.emotionalMemories) {
      const filteredMemories = memories.filter(memory => 
        new Date(memory.timestamp) > cutoffDate
      );
      
      if (filteredMemories.length !== memories.length) {
        this.emotionalMemories.set(key, filteredMemories);
      }
    }
  }

  // ======================== ユーティリティメソッド ========================

  private calculateEmotionalCharge(emotion: EmotionalWeight): number {
    const positiveEmotions = ['joy', 'love', 'excitement', 'surprise'];
    const negativeEmotions = ['sadness', 'anger', 'fear', 'disgust'];
    
    if (positiveEmotions.includes(emotion.primaryEmotion)) {
      return emotion.intensity;
    } else if (negativeEmotions.includes(emotion.primaryEmotion)) {
      return -emotion.intensity;
    }
    return 0;
  }

  private calculateIntimacyChange(emotion: EmotionalWeight, impact: number): number {
    const positiveEmotions = ['joy', 'love', 'trust'];
    const change = positiveEmotions.includes(emotion.primaryEmotion) ? 
      impact * 0.05 : impact * -0.02;
    return Math.max(-0.1, Math.min(0.1, change));
  }

  private calculateTrustChange(emotion: EmotionalWeight, impact: number): number {
    if (emotion.primaryEmotion === 'trust') return impact * 0.1;
    if (['anger', 'fear'].includes(emotion.primaryEmotion)) return impact * -0.05;
    return impact * 0.02;
  }

  private determineRelationshipTrend(impact: RelationshipImpact): RelationshipProfile['relationshipTrend'] {
    const totalChange = Math.abs(impact.intimacyChange) + Math.abs(impact.trustChange);
    
    if (totalChange > 0.1) {
      return impact.intimacyChange > 0 ? 'strengthening' : 'weakening';
    } else if (totalChange > 0.05) {
      return 'volatile';
    }
    return 'stable';
  }

  private identifyChangeReason(emotion: EmotionalWeight): string {
    const reasons: Record<string, string> = {
      'joy': '喜びの共有', 'love': '愛情表現', 'sadness': '悲しみのサポート',
      'anger': '怒りの表現', 'fear': '不安の相談', 'trust': '信頼の構築'
    };
    return reasons[emotion.primaryEmotion] || '感情的交流';
  }

  private predictFutureIntimacy(relationship: RelationshipProfile): number {
    switch (relationship.relationshipTrend) {
      case 'strengthening': return Math.min(1.0, relationship.intimacyLevel + 0.2);
      case 'weakening': return Math.max(0.0, relationship.intimacyLevel - 0.1);
      case 'volatile': return relationship.intimacyLevel;
      default: return relationship.intimacyLevel + 0.05;
    }
  }

  private recommendInteractions(relationship: RelationshipProfile): string[] {
    if (relationship.intimacyLevel < 0.5) {
      return ['共通の興味について話す', '軽い個人的な質問をする'];
    } else {
      return ['深い感情を共有する', '個人的なサポートを提供する'];
    }
  }

  private identifyPotentialMilestones(relationship: RelationshipProfile): string[] {
    const intimacy = relationship.intimacyLevel;
    
    if (intimacy < 0.3) return ['初回の個人的な話題'];
    if (intimacy < 0.6) return ['感情的サポート体験', '共通思い出形成'];
    return ['深い信頼関係確立', '重要な相談共有'];
  }

  // ======================== パブリックAPI ========================

  /**
   * ソロチャット統計情報
   */
  getSoloAnalysisStats() {
    return {
      analyzedUsers: this.userEmotionalProfile.size,
      trackedRelationships: this.characterRelationships.size,
      totalMemories: Array.from(this.emotionalMemories.values())
        .reduce((sum, memories) => sum + memories.length, 0),
      baseAnalyzerStats: this.getPerformanceMetrics()
    };
  }

  /**
   * ユーザー感情プロファイル取得
   */
  getUserEmotionalProfile(userId: string): UserEmotionalPattern | null {
    return this.userEmotionalProfile.get(userId) || null;
  }

  /**
   * キャラクター関係性取得
   */
  getCharacterRelationship(userId: string, characterId: UUID): RelationshipProfile | null {
    return this.characterRelationships.get(`${userId}_${characterId}`) || null;
  }
}

// ======================== ソロチャット専用型定義 ========================

interface SoloEmotionAnalysisResult extends EmotionAnalysisResult {
  personalization: {
    userEmotionalProfile: UserEmotionalPattern;
    relationshipLevel: number;
    trustScore: number;
    communicationCompatibility: number;
  };
  
  soloSpecific: {
    intimacyGrowth: number;
    personalizedRecommendations: string[];
    emotionalResonance: number;
  };
  
  relationshipEvolution?: {
    previousLevel: number;
    newLevel: number;
    changeReason: string;
    significance: number;
  };
  
  predictions?: {
    futureIntimacyLevel: number;
    recommendedInteractions: string[];
    potentialMilestones: string[];
  };
}

interface RelationshipProfile {
  characterId: UUID;
  userId: string;
  intimacyLevel: number;
  trustScore: number;
  communicationCompatibility: number;
  interactionCount: number;
  lastInteraction: string;
  emotionalHistory: EmotionalWeight[];
  milestones: string[];
  relationshipTrend: 'strengthening' | 'weakening' | 'stable' | 'volatile';
}

interface UserEmotionalPattern {
  userId: string;
  dominantEmotion: string;
  expressiveness: number;
  emotionalStability: number;
  positivityBias: number;
  empathyLevel: number;
  communicationStyle: 'formal' | 'casual' | 'balanced';
  lastUpdated: string;
}

interface RelationshipImpact {
  intimacyChange: number;
  trustChange: number;
  compatibilityChange: number;
  significance: number;
}

interface EmotionalTendencies {
  textLength: number;
  questionFrequency: number;
  excitementLevel: number;
  formalityLevel: number;
}