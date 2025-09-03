// 🧠 グループチャット専用感情分析エンジン - BaseEmotionAnalyzerの拡張
// Phase 3: 汎用基盤の上にグループチャット特化機能を構築

import { BaseEmotionAnalyzer } from './BaseEmotionAnalyzer';
import { 
  EmotionalWeight, 
  ConversationalContext, 
  EmotionAnalysisResult,
  EmotionalMemory,
  AnalysisQualitySettings
} from '@/types/core/emotional-intelligence.types';
import { UnifiedMessage } from '@/types/core/message.types';
import { UUID } from '@/types/core/base.types';
import { Character } from '@/types/core/character.types';

/**
 * グループチャット感情分析結果
 */
export interface GroupEmotionAnalysisResult extends EmotionAnalysisResult {
  // グループ固有の分析データ
  groupDynamics: {
    dominantEmotion: string;           // グループ内の支配的感情
    emotionalConsensus: number;        // 感情の合意度 (0.0-1.0)
    conflictLevel: number;             // 対立レベル (0.0-1.0)
    participationBalance: number;      // 参加バランス (0.0-1.0)
  };
  
  // キャラクター間関係
  characterRelations: {
    sourceCharacterId: UUID;
    targetCharacterId: UUID;
    relationshipTension: number;       // 関係の緊張度 (-1.0 to 1.0)
    emotionalAlignment: number;        // 感情的同調度 (0.0-1.0)
    interactionFrequency: number;      // 相互作用の頻度 (0.0-1.0)
  }[];
  
  // グループ感情履歴
  emotionalHistory: {
    timeWindow: string;
    averageEmotion: EmotionalWeight;
    emotionalVariance: number;         // 感情のばらつき
    stableEmotions: string[];          // 安定した感情
    volatileEmotions: string[];        // 不安定な感情
  }[];
}

/**
 * グループチャット専用感情分析エンジン
 * 
 * 機能:
 * - 複数キャラクター間の感情相互作用分析
 * - グループダイナミクス検出
 * - 感情的合意・対立の識別
 * - キャラクター関係性の感情的側面追跡
 */
export class GroupEmotionAnalyzer extends BaseEmotionAnalyzer {
  // グループ分析特有のキャッシュ
  private groupDynamicsCache = new Map<string, any>();
  private relationshipCache = new Map<string, any>();
  
  /**
   * グループチャット用感情分析
   */
  async analyzeGroupEmotion(
    message: UnifiedMessage,
    context: ConversationalContext,
    activeCharacters: Character[],
    messageCharacterId?: UUID
  ): Promise<GroupEmotionAnalysisResult> {
    const startTime = Date.now();
    
    try {
      // 1. 基盤感情分析を実行
      const baseAnalysis = await this.analyzeEmotion(message, context, messageCharacterId);
      
      // 2. グループダイナミクス分析
      const groupDynamics = await this.analyzeGroupDynamics(message, context, activeCharacters);
      
      // 3. キャラクター関係分析
      const characterRelations = await this.analyzeCharacterRelations(
        message, 
        context, 
        activeCharacters, 
        messageCharacterId
      );
      
      // 4. グループ感情履歴分析
      const emotionalHistory = await this.analyzeEmotionalHistory(context, activeCharacters);
      
      // 5. グループ特化の洞察生成
      const groupInsights = this.generateGroupInsights(
        baseAnalysis,
        groupDynamics,
        characterRelations,
        emotionalHistory
      );
      
      // 6. グループ推奨アクション生成
      const groupRecommendations = this.generateGroupRecommendations(
        groupDynamics,
        characterRelations,
        emotionalHistory
      );
      
      const processingTime = Date.now() - startTime;
      
      // 7. 結果統合
      const result: GroupEmotionAnalysisResult = {
        ...baseAnalysis,
        groupDynamics,
        characterRelations,
        emotionalHistory,
        insights: [...baseAnalysis.insights, ...groupInsights],
        recommendations: [...baseAnalysis.recommendations, ...groupRecommendations],
        processingTime
      };
      
      console.log(`🎭 Group emotion analysis completed in ${processingTime}ms`);
      
      return result;
      
    } catch (error) {
      console.error('🎭 Group emotion analysis failed:', error);
      
      // フォールバック: 基盤分析のみ返す
      const baseAnalysis = await this.analyzeEmotion(message, context, messageCharacterId);
      return {
        ...baseAnalysis,
        groupDynamics: {
          dominantEmotion: 'neutral',
          emotionalConsensus: 0.5,
          conflictLevel: 0.0,
          participationBalance: 0.5
        },
        characterRelations: [],
        emotionalHistory: [],
        processingTime: Date.now() - startTime
      };
    }
  }
  
  /**
   * グループダイナミクス分析
   */
  private async analyzeGroupDynamics(
    message: UnifiedMessage,
    context: ConversationalContext,
    activeCharacters: Character[]
  ): Promise<GroupEmotionAnalysisResult['groupDynamics']> {
    const cacheKey = `dynamics_${context.sessionId}_${context.messageCount}`;
    
    if (this.groupDynamicsCache.has(cacheKey)) {
      return this.groupDynamicsCache.get(cacheKey);
    }
    
    try {
      // 最近のメッセージから感情分析
      const recentEmotions = context.recentMessages
        .slice(-10)
        .map(msg => msg.expression?.emotion?.primary)
        .filter(Boolean);
      
      // 支配的感情の計算
      const emotionCounts = recentEmotions.reduce((acc, emotion) => {
        acc[emotion] = (acc[emotion] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const dominantEmotion = Object.entries(emotionCounts)
        .sort(([, a], [, b]) => b - a)[0]?.[0] || 'neutral';
      
      // 感情的合意度の計算
      const uniqueEmotions = Object.keys(emotionCounts).length;
      const totalMessages = recentEmotions.length || 1;
      const emotionalConsensus = Math.max(0, 1 - (uniqueEmotions / totalMessages));
      
      // 対立レベルの計算（感情の極性差から）
      const positiveEmotions = ['joy', 'love', 'excitement', 'gratitude'].filter(e => emotionCounts[e]);
      const negativeEmotions = ['sadness', 'anger', 'fear', 'disgust'].filter(e => emotionCounts[e]);
      const conflictLevel = Math.min(1.0, (positiveEmotions.length + negativeEmotions.length) / totalMessages);
      
      // 参加バランス（アクティブキャラクター数と実際の参加者数の比較）
      const activeParticipants = new Set(
        context.recentMessages.map(msg => msg.character_id).filter(Boolean)
      ).size;
      const participationBalance = Math.min(1.0, activeParticipants / activeCharacters.length);
      
      const dynamics = {
        dominantEmotion,
        emotionalConsensus,
        conflictLevel,
        participationBalance
      };
      
      this.groupDynamicsCache.set(cacheKey, dynamics);
      return dynamics;
      
    } catch (error) {
      console.warn('🎭 Group dynamics analysis failed:', error);
      return {
        dominantEmotion: 'neutral',
        emotionalConsensus: 0.5,
        conflictLevel: 0.0,
        participationBalance: 0.5
      };
    }
  }
  
  /**
   * キャラクター関係分析
   */
  private async analyzeCharacterRelations(
    message: UnifiedMessage,
    context: ConversationalContext,
    activeCharacters: Character[],
    messageCharacterId?: UUID
  ): Promise<GroupEmotionAnalysisResult['characterRelations']> {
    const cacheKey = `relations_${context.sessionId}_${activeCharacters.map(c => c.id).join('_')}`;
    
    if (this.relationshipCache.has(cacheKey)) {
      return this.relationshipCache.get(cacheKey);
    }
    
    try {
      const relations: GroupEmotionAnalysisResult['characterRelations'] = [];
      
      // 全ての組み合わせを分析
      for (let i = 0; i < activeCharacters.length; i++) {
        for (let j = i + 1; j < activeCharacters.length; j++) {
          const char1 = activeCharacters[i];
          const char2 = activeCharacters[j];
          
          // この2キャラクター間の最近のやり取りを分析
          const interactions = context.recentMessages.filter(msg => 
            msg.character_id === char1.id || msg.character_id === char2.id
          );
          
          if (interactions.length === 0) continue;
          
          // 感情的同調度の計算
          const char1Messages = interactions.filter(msg => msg.character_id === char1.id);
          const char2Messages = interactions.filter(msg => msg.character_id === char2.id);
          
          const char1Emotions = char1Messages.map(msg => msg.expression?.emotion?.primary).filter(Boolean);
          const char2Emotions = char2Messages.map(msg => msg.expression?.emotion?.primary).filter(Boolean);
          
          const commonEmotions = char1Emotions.filter(e => char2Emotions.includes(e));
          const emotionalAlignment = commonEmotions.length / Math.max(char1Emotions.length + char2Emotions.length, 1);
          
          // 相互作用の頻度
          const interactionFrequency = interactions.length / context.recentMessages.length;
          
          // 関係の緊張度（感情の極性差から推定）
          const relationshipTension = this.calculateRelationshipTension(char1Emotions, char2Emotions);
          
          relations.push({
            sourceCharacterId: char1.id,
            targetCharacterId: char2.id,
            relationshipTension,
            emotionalAlignment,
            interactionFrequency
          });
        }
      }
      
      this.relationshipCache.set(cacheKey, relations);
      return relations;
      
    } catch (error) {
      console.warn('🎭 Character relations analysis failed:', error);
      return [];
    }
  }
  
  /**
   * グループ感情履歴分析
   */
  private async analyzeEmotionalHistory(
    context: ConversationalContext,
    activeCharacters: Character[]
  ): Promise<GroupEmotionAnalysisResult['emotionalHistory']> {
    try {
      const history: GroupEmotionAnalysisResult['emotionalHistory'] = [];
      
      // 時間窓で区切って分析（例: 5分窓）
      const windowSize = 5 * 60 * 1000; // 5分
      const now = new Date().getTime();
      const windows = 3; // 直近3窓を分析
      
      for (let i = 0; i < windows; i++) {
        const windowStart = now - (windowSize * (i + 1));
        const windowEnd = now - (windowSize * i);
        
        const windowMessages = context.recentMessages.filter(msg => {
          const msgTime = new Date(msg.created_at).getTime();
          return msgTime >= windowStart && msgTime <= windowEnd;
        });
        
        if (windowMessages.length === 0) continue;
        
        const emotions = windowMessages
          .map(msg => msg.expression?.emotion?.primary)
          .filter(Boolean);
        
        if (emotions.length === 0) continue;
        
        // 平均感情の計算
        const emotionCounts = emotions.reduce((acc, emotion) => {
          acc[emotion] = (acc[emotion] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        const dominantEmotion = Object.entries(emotionCounts)
          .sort(([, a], [, b]) => b - a)[0]?.[0] || 'neutral';
        
        const averageEmotion: EmotionalWeight = {
          primaryEmotion: dominantEmotion as 'joy' | 'sadness' | 'anger' | 'fear' | 'surprise' | 'disgust' | 'neutral' | 'love' | 'excitement' | 'anxiety',
          intensity: 0.6,
          confidence: 0.7,
          context: `Group window ${i + 1}`,
          triggers: Object.keys(emotionCounts),
          timestamp: new Date(windowEnd).toISOString()
        };
        
        // 感情のばらつき計算
        const uniqueEmotions = Object.keys(emotionCounts).length;
        const emotionalVariance = uniqueEmotions / emotions.length;
        
        // 安定・不安定感情の判定
        const stableEmotions = Object.entries(emotionCounts)
          .filter(([, count]) => count >= emotions.length * 0.3)
          .map(([emotion]) => emotion);
        
        const volatileEmotions = Object.entries(emotionCounts)
          .filter(([, count]) => count < emotions.length * 0.2)
          .map(([emotion]) => emotion);
        
        history.push({
          timeWindow: `${new Date(windowStart).toLocaleTimeString()}-${new Date(windowEnd).toLocaleTimeString()}`,
          averageEmotion,
          emotionalVariance,
          stableEmotions,
          volatileEmotions
        });
      }
      
      return history.reverse(); // 時系列順にする
      
    } catch (error) {
      console.warn('🎭 Emotional history analysis failed:', error);
      return [];
    }
  }
  
  /**
   * 関係の緊張度計算
   */
  private calculateRelationshipTension(emotions1: string[], emotions2: string[]): number {
    const positiveEmotions = ['joy', 'love', 'excitement', 'gratitude'];
    const negativeEmotions = ['sadness', 'anger', 'fear', 'disgust'];
    
    const pos1 = emotions1.filter(e => positiveEmotions.includes(e)).length;
    const neg1 = emotions1.filter(e => negativeEmotions.includes(e)).length;
    const pos2 = emotions2.filter(e => positiveEmotions.includes(e)).length;
    const neg2 = emotions2.filter(e => negativeEmotions.includes(e)).length;
    
    const total1 = pos1 + neg1 || 1;
    const total2 = pos2 + neg2 || 1;
    
    const polarity1 = (pos1 - neg1) / total1;
    const polarity2 = (pos2 - neg2) / total2;
    
    // 極性差が大きいほど緊張度が高い
    return Math.abs(polarity1 - polarity2);
  }
  
  /**
   * グループ特化洞察生成
   */
  private generateGroupInsights(
    baseAnalysis: EmotionAnalysisResult,
    dynamics: GroupEmotionAnalysisResult['groupDynamics'],
    relations: GroupEmotionAnalysisResult['characterRelations'],
    history: GroupEmotionAnalysisResult['emotionalHistory']
  ): string[] {
    const insights: string[] = [];
    
    // グループダイナミクス洞察
    if (dynamics.emotionalConsensus > 0.7) {
      insights.push(`グループの感情的合意度が高く、${dynamics.dominantEmotion}で一致しています`);
    } else if (dynamics.emotionalConsensus < 0.3) {
      insights.push('グループ内で感情的な分散があり、多様な感情状態が見られます');
    }
    
    if (dynamics.conflictLevel > 0.6) {
      insights.push('グループ内に感情的な対立の兆候が見られます');
    }
    
    if (dynamics.participationBalance < 0.5) {
      insights.push('一部のキャラクターの参加が少なく、バランスが偏っています');
    }
    
    // 関係性洞察
    const highTensionRelations = relations.filter(r => r.relationshipTension > 0.6);
    if (highTensionRelations.length > 0) {
      insights.push(`${highTensionRelations.length}組のキャラクター間に緊張関係が見られます`);
    }
    
    const alignedRelations = relations.filter(r => r.emotionalAlignment > 0.7);
    if (alignedRelations.length > 0) {
      insights.push(`${alignedRelations.length}組のキャラクターが感情的に同調しています`);
    }
    
    // 履歴洞察
    if (history.length > 0) {
      const recentHistory = history[history.length - 1];
      if (recentHistory.emotionalVariance > 0.6) {
        insights.push('最近のグループ感情は不安定で変動が大きいです');
      } else if (recentHistory.emotionalVariance < 0.3) {
        insights.push('グループ感情が安定してきています');
      }
    }
    
    return insights;
  }
  
  /**
   * グループ推奨アクション生成
   */
  private generateGroupRecommendations(
    dynamics: GroupEmotionAnalysisResult['groupDynamics'],
    relations: GroupEmotionAnalysisResult['characterRelations'],
    history: GroupEmotionAnalysisResult['emotionalHistory']
  ): string[] {
    const recommendations: string[] = [];
    
    // 参加バランス改善
    if (dynamics.participationBalance < 0.5) {
      recommendations.push('非アクティブなキャラクターの参加を促進することを検討してください');
    }
    
    // 対立解決
    if (dynamics.conflictLevel > 0.6) {
      recommendations.push('グループ内の感情的対立を和らげるアプローチを試してみてください');
    }
    
    // 関係改善
    const problematicRelations = relations.filter(r => r.relationshipTension > 0.7);
    if (problematicRelations.length > 0) {
      recommendations.push('特定のキャラクター間の関係改善に焦点を当ててください');
    }
    
    // 感情安定化
    if (history.length > 0) {
      const recentHistory = history[history.length - 1];
      if (recentHistory.emotionalVariance > 0.7) {
        recommendations.push('グループの感情的安定性を向上させる要素を導入してください');
      }
    }
    
    return recommendations;
  }
  
  /**
   * キャッシュクリア
   */
  clearGroupCache(): void {
    this.groupDynamicsCache.clear();
    this.relationshipCache.clear();
    console.log('🎭 Group emotion analyzer cache cleared');
  }
}

export default GroupEmotionAnalyzer;