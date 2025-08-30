// src/services/emotion/SoloEmotionAnalyzer.ts
'use client';

import { UnifiedMessage, Character } from '@/types/core/chat.types';
import { 
  EmotionalWeight, 
  MultiLayerEmotionResult, 
  EmotionalIntelligenceFlags 
} from '@/types/core/group-emotional-intelligence.types';
import { EmotionIntelligenceSystem } from './index';

/**
 * ソロチャット専用感情分析エンジン
 * 1対1の会話における感情的なやり取りに特化
 */
export class SoloEmotionAnalyzer {
  private analysisCache = new Map<string, MultiLayerEmotionResult>();
  private lastAnalysisTime = 0;
  private readonly ANALYSIS_COOLDOWN = 1000; // 1秒のクールダウン

  /**
   * ソロチャットメッセージの感情分析
   * 既存のチャット機能を一切変更せず、バックグラウンドで実行
   */
  async analyzeSoloMessage(
    message: UnifiedMessage,
    character: Character,
    conversationHistory: UnifiedMessage[]
  ): Promise<MultiLayerEmotionResult | null> {
    try {
      // ソロチャット機能フラグチェック
      if (!EmotionIntelligenceSystem.isSoloEmotionAvailable()) {
        return null;
      }

      const now = Date.now();
      if (now - this.lastAnalysisTime < this.ANALYSIS_COOLDOWN) {
        return null; // クールダウン中
      }

      // キャッシュチェック
      const cacheKey = `${message.id}-${character.id}`;
      if (this.analysisCache.has(cacheKey)) {
        return this.analysisCache.get(cacheKey)!;
      }

      // バックグラウンド分析実行
      const analysis = await this.performSoloAnalysis(message, character, conversationHistory);
      
      if (analysis) {
        this.analysisCache.set(cacheKey, analysis);
        this.lastAnalysisTime = now;
        
        // キャッシュサイズ制限（メモリリーク防止）
        if (this.analysisCache.size > 100) {
          const oldestKey = this.analysisCache.keys().next().value;
          this.analysisCache.delete(oldestKey);
        }
      }

      return analysis;
    } catch (error) {
      console.warn('SoloEmotionAnalyzer: Analysis failed safely', error);
      return null; // エラー時は既存機能に影響しない
    }
  }

  /**
   * ソロチャット専用の感情分析実行
   */
  private async performSoloAnalysis(
    message: UnifiedMessage,
    character: Character,
    conversationHistory: UnifiedMessage[]
  ): Promise<MultiLayerEmotionResult | null> {
    
    // 1. 基本感情解析（表面レベル）
    const surfaceEmotion = await this.analyzeSurfaceEmotion(message);
    
    // 2. 文脈感情解析（会話履歴を考慮）
    const contextualEmotion = await this.analyzeContextualEmotion(
      message, conversationHistory
    );
    
    // 3. キャラクター関係性を考慮した深層感情
    const deepEmotion = await this.analyzeDeepEmotion(
      message, character, conversationHistory
    );

    // 4. 1対1関係性の進化予測
    const relationshipPrediction = await this.predictRelationshipEvolution(
      message, character, conversationHistory
    );

    return {
      surface: surfaceEmotion,
      contextual: contextualEmotion, 
      deep: deepEmotion,
      predictive: relationshipPrediction,
      confidence: this.calculateOverallConfidence([
        surfaceEmotion, contextualEmotion, deepEmotion
      ]),
      analysis_timestamp: Date.now(),
      conversation_context: {
        message_count: conversationHistory.length,
        character_id: character.id,
        relationship_stage: this.assessRelationshipStage(conversationHistory)
      }
    };
  }

  /**
   * 表面的感情分析（基本的な感情検出）
   */
  private async analyzeSurfaceEmotion(message: UnifiedMessage): Promise<EmotionalWeight> {
    const content = message.content.toLowerCase();
    
    // 感情キーワード検出
    const emotionKeywords = {
      joy: ['嬉しい', '楽しい', '幸せ', '喜び', 'ありがとう', '素晴らしい'],
      sadness: ['悲しい', 'つらい', '寂しい', '憂鬱', '落ち込み', 'ショック'],
      anger: ['怒り', 'イライラ', 'ムカつく', '腹立つ', '許せない'],
      fear: ['怖い', '不安', '心配', 'ドキドキ', '緊張', 'ビクビク'],
      surprise: ['驚き', 'ビックリ', '意外', 'まさか', 'えっ', '本当？'],
      disgust: ['嫌', '気持ち悪い', 'うんざり', '最悪', '不快'],
      trust: ['信頼', '頼もしい', '安心', '信じる', '頼りになる'],
      anticipation: ['期待', '楽しみ', 'わくわく', '待ち遠しい', 'ドキドキ']
    };

    const emotionScores: Record<string, number> = {};
    let totalMatches = 0;

    // キーワードマッチング
    for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
      const matches = keywords.filter(keyword => content.includes(keyword)).length;
      emotionScores[emotion] = matches;
      totalMatches += matches;
    }

    // 正規化
    const intensity = Math.min(totalMatches / 3, 1); // 3個以上で最大強度
    
    return {
      joy: emotionScores.joy / Math.max(totalMatches, 1),
      sadness: emotionScores.sadness / Math.max(totalMatches, 1),
      anger: emotionScores.anger / Math.max(totalMatches, 1),
      fear: emotionScores.fear / Math.max(totalMatches, 1),
      surprise: emotionScores.surprise / Math.max(totalMatches, 1),
      disgust: emotionScores.disgust / Math.max(totalMatches, 1),
      trust: emotionScores.trust / Math.max(totalMatches, 1),
      anticipation: emotionScores.anticipation / Math.max(totalMatches, 1),
      intensity: intensity,
      confidence: totalMatches > 0 ? 0.7 : 0.3,
      timestamp: Date.now(),
      analyzed_by: 'surface'
    };
  }

  /**
   * 文脈感情分析（会話の流れを考慮）
   */
  private async analyzeContextualEmotion(
    message: UnifiedMessage,
    conversationHistory: UnifiedMessage[]
  ): Promise<EmotionalWeight> {
    
    // 直近5メッセージの感情的文脈を分析
    const recentMessages = conversationHistory.slice(-5);
    const conversationTone = this.analyzeConversationTone(recentMessages);
    
    // メッセージのタイミング分析
    const timingFactor = this.analyzeMessageTiming(message, conversationHistory);
    
    // 会話の深度分析
    const conversationDepth = this.analyzeConversationDepth(recentMessages);

    // 表面感情を文脈で調整
    const surfaceEmotion = await this.analyzeSurfaceEmotion(message);
    
    return {
      joy: surfaceEmotion.joy * conversationTone.positivity * conversationDepth,
      sadness: surfaceEmotion.sadness * conversationTone.negativity,
      anger: surfaceEmotion.anger * (1 - conversationTone.harmony),
      fear: surfaceEmotion.fear * conversationTone.tension,
      surprise: surfaceEmotion.surprise * timingFactor,
      disgust: surfaceEmotion.disgust * conversationTone.negativity,
      trust: surfaceEmotion.trust * conversationTone.intimacy * conversationDepth,
      anticipation: surfaceEmotion.anticipation * conversationTone.engagement,
      intensity: surfaceEmotion.intensity * (1 + conversationDepth),
      confidence: 0.8,
      timestamp: Date.now(),
      analyzed_by: 'contextual'
    };
  }

  /**
   * 深層感情分析（キャラクターとの関係性を考慮）
   */
  private async analyzeDeepEmotion(
    message: UnifiedMessage,
    character: Character,
    conversationHistory: UnifiedMessage[]
  ): Promise<EmotionalWeight> {
    
    // キャラクターの性格特性を考慮
    const personalityImpact = this.analyzePersonalityImpact(character, message);
    
    // 関係性の深さを分析
    const relationshipDepth = this.assessRelationshipDepth(conversationHistory);
    
    // 感情的な成長・変化を検出
    const emotionalGrowth = this.detectEmotionalGrowth(conversationHistory);

    // 文脈感情をさらに深化
    const contextualEmotion = await this.analyzeContextualEmotion(message, conversationHistory);
    
    return {
      joy: contextualEmotion.joy * personalityImpact.openness * relationshipDepth,
      sadness: contextualEmotion.sadness * personalityImpact.empathy,
      anger: contextualEmotion.anger * (1 - personalityImpact.agreeableness),
      fear: contextualEmotion.fear * personalityImpact.neuroticism,
      surprise: contextualEmotion.surprise * personalityImpact.openness,
      disgust: contextualEmotion.disgust * (1 - personalityImpact.agreeableness),
      trust: contextualEmotion.trust * relationshipDepth * personalityImpact.empathy,
      anticipation: contextualEmotion.anticipation * emotionalGrowth,
      intensity: contextualEmotion.intensity * (1 + relationshipDepth + emotionalGrowth),
      confidence: 0.9,
      timestamp: Date.now(),
      analyzed_by: 'deep'
    };
  }

  /**
   * 1対1関係性の進化予測
   */
  private async predictRelationshipEvolution(
    message: UnifiedMessage,
    character: Character,
    conversationHistory: UnifiedMessage[]
  ): Promise<EmotionalWeight> {
    
    const currentDepth = this.assessRelationshipDepth(conversationHistory);
    const growthTrend = this.detectEmotionalGrowth(conversationHistory);
    const intimacyProgression = this.analyzeIntimacyProgression(conversationHistory);
    
    // 未来の感情状態を予測
    const futureEmotionalPotential = {
      joy: currentDepth * growthTrend * intimacyProgression.joy_potential,
      trust: currentDepth * intimacyProgression.trust_development,
      anticipation: growthTrend * intimacyProgression.future_expectation,
      sadness: (1 - currentDepth) * intimacyProgression.vulnerability,
      fear: (1 - intimacyProgression.trust_development) * 0.5,
      anger: Math.max(0, intimacyProgression.conflict_potential - currentDepth),
      surprise: intimacyProgression.discovery_potential * growthTrend,
      disgust: Math.max(0, 1 - intimacyProgression.compatibility)
    };

    return {
      joy: futureEmotionalPotential.joy,
      sadness: futureEmotionalPotential.sadness,
      anger: futureEmotionalPotential.anger,
      fear: futureEmotionalPotential.fear,
      surprise: futureEmotionalPotential.surprise,
      disgust: futureEmotionalPotential.disgust,
      trust: futureEmotionalPotential.trust,
      anticipation: futureEmotionalPotential.anticipation,
      intensity: (currentDepth + growthTrend) / 2,
      confidence: 0.6, // 予測は不確実性が高い
      timestamp: Date.now(),
      analyzed_by: 'predictive'
    };
  }

  /**
   * ヘルパーメソッド群
   */
  private analyzeConversationTone(messages: UnifiedMessage[]) {
    // 会話のトーン分析実装
    return {
      positivity: 0.7,
      negativity: 0.2,
      harmony: 0.8,
      tension: 0.1,
      intimacy: 0.6,
      engagement: 0.8
    };
  }

  private analyzeMessageTiming(message: UnifiedMessage, history: UnifiedMessage[]): number {
    // メッセージタイミング分析実装
    return 1.0;
  }

  private analyzeConversationDepth(messages: UnifiedMessage[]): number {
    // 会話の深度分析実装
    return Math.min(messages.length / 20, 1); // 20メッセージで最大深度
  }

  private analyzePersonalityImpact(character: Character, message: UnifiedMessage) {
    // キャラクター性格特性の影響分析
    return {
      openness: 0.7,
      agreeableness: 0.8,
      empathy: 0.9,
      neuroticism: 0.3
    };
  }

  private assessRelationshipDepth(history: UnifiedMessage[]): number {
    // 関係性の深さ評価
    return Math.min(history.length / 50, 1); // 50メッセージで最大関係性
  }

  private detectEmotionalGrowth(history: UnifiedMessage[]): number {
    // 感情的成長の検出
    return Math.min(history.length / 30, 1);
  }

  private analyzeIntimacyProgression(history: UnifiedMessage[]) {
    // 親密性の進行分析
    const messageCount = history.length;
    const baseIntimacy = Math.min(messageCount / 100, 1);
    
    return {
      joy_potential: baseIntimacy * 0.9,
      trust_development: baseIntimacy * 0.8,
      future_expectation: baseIntimacy * 0.7,
      vulnerability: baseIntimacy * 0.5,
      discovery_potential: Math.max(0, 1 - baseIntimacy),
      conflict_potential: baseIntimacy * 0.1, // 親密になるほど衝突の可能性は低下
      compatibility: baseIntimacy * 0.85
    };
  }

  private assessRelationshipStage(history: UnifiedMessage[]): string {
    const messageCount = history.length;
    
    if (messageCount < 5) return 'initial_contact';
    if (messageCount < 20) return 'getting_acquainted';
    if (messageCount < 50) return 'developing_friendship';
    if (messageCount < 100) return 'close_relationship';
    return 'deep_bond';
  }

  private calculateOverallConfidence(emotions: EmotionalWeight[]): number {
    const confidenceSum = emotions.reduce((sum, emotion) => sum + emotion.confidence, 0);
    return confidenceSum / emotions.length;
  }

  /**
   * キャッシュクリア（メモリリーク防止）
   */
  clearCache(): void {
    this.analysisCache.clear();
  }
}

// シングルトンインスタンス
export const soloEmotionAnalyzer = new SoloEmotionAnalyzer();