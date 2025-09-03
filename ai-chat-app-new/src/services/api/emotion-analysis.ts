import { apiClient } from './api-client';
import { 
  EmotionAnalysisRequest, 
  EmotionAnalysisResponse,
  EmotionTrackingRequest,
  EmotionTrackingResponse,
  EmotionBasedResponseRequest,
  EmotionBasedResponseResponse
} from '@/types/api';
import { UnifiedMessage, EmotionState, Character, Persona } from '@/types';

export class EmotionAnalysisService {
  /**
   * テキストの感情を分析する
   */
  async analyzeEmotion(
    request: EmotionAnalysisRequest
  ): Promise<EmotionAnalysisResponse> {
    try {
      const response = await apiClient.post<EmotionAnalysisResponse>(
        '/analyze/emotion',
        request
      );
      
      return response;
    } catch (error) {
      console.error('Emotion analysis failed:', error);
      throw error;
    }
  }

  /**
   * 会話の感情の流れを追跡する
   */
  async trackEmotionFlow(
    request: EmotionTrackingRequest
  ): Promise<EmotionTrackingResponse> {
    try {
      const response = await apiClient.post<EmotionTrackingResponse>(
        '/track/emotion-flow',
        request
      );
      
      return response;
    } catch (error) {
      console.error('Emotion flow tracking failed:', error);
      throw error;
    }
  }

  /**
   * 感情に基づいて応答を生成する
   */
  async generateEmotionBasedResponse(
    request: EmotionBasedResponseRequest
  ): Promise<EmotionBasedResponseResponse> {
    try {
      const response = await apiClient.post<EmotionBasedResponseResponse>(
        '/generate/emotion-based-response',
        request
      );
      
      return response;
    } catch (error) {
      console.error('Emotion-based response generation failed:', error);
      throw error;
    }
  }

  /**
   * 感情の変化を検出する
   */
  async detectEmotionChange(
    currentEmotion: EmotionState,
    previousEmotion: EmotionState,
    context: {
      conversation_history: UnifiedMessage[];
      character: Character;
      persona: Persona;
    }
  ): Promise<{
    change_detected: boolean;
    change_type: 'improvement' | 'deterioration' | 'stable';
    intensity: number;
    triggers: string[];
    suggestions: string[];
  }> {
    try {
      const response = await apiClient.post('/detect/emotion-change', {
        current_emotion: currentEmotion,
        previous_emotion: previousEmotion,
        context
      });

      return response as {
        change_detected: boolean;
        change_type: "improvement" | "deterioration" | "stable";
        intensity: number;
        triggers: string[];
        suggestions: string[];
      };
    } catch (error) {
      console.error('Emotion change detection failed:', error);
      throw error;
    }
  }

  /**
   * 感情の安定性を評価する
   */
  async evaluateEmotionalStability(
    emotionHistory: EmotionState[],
    timeWindow: number = 3600000 // 1時間
  ): Promise<{
    stability_score: number;
    volatility_index: number;
    dominant_emotions: string[];
    stability_trend: 'improving' | 'declining' | 'stable';
    recommendations: string[];
  }> {
    try {
      const response = await apiClient.post('/evaluate/emotional-stability', {
        emotion_history: emotionHistory,
        time_window: timeWindow
      });

      return response as {
        stability_score: number;
        volatility_index: number;
        dominant_emotions: string[];
        stability_trend: "stable" | "improving" | "declining";
        recommendations: string[];
      };
    } catch (error) {
      console.error('Emotional stability evaluation failed:', error);
      throw error;
    }
  }

  /**
   * 感情に基づく会話戦略を提案する
   */
  async suggestEmotionalStrategy(
    currentEmotion: EmotionState,
    targetEmotion: EmotionState,
    character: Character,
    conversationContext: {
      topic: string;
      relationship_level: number;
      conversation_depth: string;
    }
  ): Promise<{
    strategy: string;
    approach: 'direct' | 'indirect' | 'gradual';
    key_phrases: string[];
    topics_to_avoid: string[];
    topics_to_emphasize: string[];
    expected_outcome: string;
  }> {
    try {
      const response = await apiClient.post('/suggest/emotional-strategy', {
        current_emotion: currentEmotion,
        target_emotion: targetEmotion,
        character: {
          id: character.id,
          personality: character.personality,
          dialogue_style: character.dialogue_style
        },
        conversation_context: conversationContext
      });

      return response as {
        strategy: string;
        approach: "direct" | "indirect" | "gradual";
        key_phrases: string[];
        topics_to_avoid: string[];
        topics_to_emphasize: string[];
        expected_outcome: string;
      };
    } catch (error) {
      console.error('Emotional strategy suggestion failed:', error);
      throw error;
    }
  }

  /**
   * 感情の共感レベルを測定する
   */
  async measureEmpathyLevel(
    userMessage: string,
    aiResponse: string,
    userEmotion: EmotionState,
    character: Character
  ): Promise<{
    empathy_score: number;
    emotional_alignment: number;
    response_appropriateness: number;
    improvement_suggestions: string[];
  }> {
    try {
      const response = await apiClient.post('/measure/empathy-level', {
        user_message: userMessage,
        ai_response: aiResponse,
        user_emotion: userEmotion,
        character: {
          id: character.id,
          personality: character.personality,
          dialogue_style: character.dialogue_style
        }
      });

      return response as {
        empathy_score: number;
        emotional_alignment: number;
        response_appropriateness: number;
        improvement_suggestions: string[];
      };
    } catch (error) {
      console.error('Empathy level measurement failed:', error);
      throw error;
    }
  }

  /**
   * 感情の予測モデルを更新する
   */
  async updateEmotionPredictionModel(
    trainingData: {
      input: string;
      expected_emotion: EmotionState;
      actual_emotion: EmotionState;
      accuracy: number;
    }[]
  ): Promise<{
    model_updated: boolean;
    accuracy_improvement: number;
    new_accuracy: number;
    training_samples_processed: number;
  }> {
    try {
      const response = await apiClient.post('/update/emotion-prediction-model', {
        training_data: trainingData
      });

      return response as {
        model_updated: boolean;
        accuracy_improvement: number;
        new_accuracy: number;
        training_samples_processed: number;
      };
    } catch (error) {
      console.error('Emotion prediction model update failed:', error);
      throw error;
    }
  }

  /**
   * 感情分析の精度を評価する
   */
  async evaluateAnalysisAccuracy(
    predictions: EmotionState[],
    actualEmotions: EmotionState[]
  ): Promise<{
    overall_accuracy: number;
    per_emotion_accuracy: Record<string, number>;
    confusion_matrix: Record<string, Record<string, number>>;
    improvement_areas: string[];
  }> {
    try {
      const response = await apiClient.post('/evaluate/analysis-accuracy', {
        predictions,
        actual_emotions: actualEmotions
      });

      return response as {
        overall_accuracy: number;
        per_emotion_accuracy: Record<string, number>;
        confusion_matrix: Record<string, Record<string, number>>;
        improvement_areas: string[];
      };
    } catch (error) {
      console.error('Analysis accuracy evaluation failed:', error);
      throw error;
    }
  }
}

// シングルトンインスタンス
export const emotionAnalysisService = new EmotionAnalysisService();
