'use client';

export interface EmotionResult {
  primary: string;
  secondary: string[];
  implicit: string[];
  intensity: number;
  confidence: number;
  flow: EmotionFlow;
  suggestedReactions: AutoReaction[];
}

export interface EmotionFlow {
  previous: string;
  current: string;
  trend: 'rising' | 'falling' | 'stable';
  velocity: number;
}

export interface AutoReaction {
  type: 'visual' | 'audio' | 'background' | 'avatar';
  effect?: string;
  sound?: string;
  color?: string;
  duration?: number;
  animation?: string;
  intensity?: number;
  volume?: number;
  expression?: string;
}

export interface MoodPoint {
  timestamp: number;
  valence: number;
  arousal: number;
  dominantEmotion: string;
  messageIndex: number;
}

export interface MoodTimeline {
  timeline: MoodPoint[];
  overallMood: string;
  moodShifts: { from: string; to: string; timestamp: number }[];
  recommendation: string;
}

/**
 * 高度な感情分析システム
 * メッセージから複数の感情を検出し、適切なリアクションを生成
 */
export class EmotionAnalyzer {
  // 感情カテゴリと強度
  private emotions = {
    joy: { emoji: '😊', color: '#FFD700', sound: 'happy.mp3', keywords: ['嬉しい', '楽しい', 'わーい', '😊', '😄', 'ハッピー', 'うれしい'] },
    love: { emoji: '💕', color: '#FF69B4', sound: 'love.mp3', keywords: ['愛してる', '好き', '大切', '💕', '❤️', 'ラブ', '愛'] },
    surprise: { emoji: '😮', color: '#00CED1', sound: 'surprise.mp3', keywords: ['びっくり', '驚き', 'まさか', '😮', '😲', 'え！', 'わお'] },
    sadness: { emoji: '😢', color: '#4169E1', sound: 'sad.mp3', keywords: ['悲しい', '辛い', '😢', '涙', 'かなしい', '落ち込み'] },
    anger: { emoji: '😠', color: '#DC143C', sound: 'angry.mp3', keywords: ['怒', '腹立', '💢', '😠', 'むかつく', 'イライラ'] },
    fear: { emoji: '😨', color: '#8B008B', sound: 'fear.mp3', keywords: ['怖い', '不安', '😨', '恐怖', 'こわい', '心配'] },
    excitement: { emoji: '🎉', color: '#FF4500', sound: 'excited.mp3', keywords: ['すごい', '最高', '！！', 'わお', '🎉', 'やったー', 'すげー'] },
    curiosity: { emoji: '🤔', color: '#32CD32', sound: 'curious.mp3', keywords: ['？', 'なんで', '気になる', '🤔', '疑問', 'どうして'] },
    gratitude: { emoji: '🙏', color: '#DDA0DD', sound: 'grateful.mp3', keywords: ['ありがとう', '感謝', 'ありがと', '🙏', 'サンキュー', 'お疲れ様'] },
    confusion: { emoji: '😵', color: '#A0A0A0', sound: 'confused.mp3', keywords: ['わからない', '混乱', '😵', '意味不明', 'は？', '分からん'] }
  };

  private emotionHistory: { emotion: string; timestamp: number; intensity: number }[] = [];

  /**
   * 複合感情分析
   * 複数の感情とその強度を検出
   */
  async analyzeEmotion(text: string): Promise<EmotionResult> {
    // 基本的な感情検出
    const basicEmotions = await this.detectBasicEmotions(text);
    
    // 文脈的感情検出
    const contextualEmotions = await this.detectContextualEmotions(text);
    
    // 潜在的感情検出（言外の意味）
    const implicitEmotions = await this.detectImplicitEmotions(text);
    
    // 感情の時系列変化を追跡
    const emotionFlow = this.trackEmotionFlow(basicEmotions);
    
    // 強度計算
    const intensity = this.calculateIntensity(text);
    
    // 信頼度計算
    const confidence = this.calculateConfidence(basicEmotions);
    
    // 履歴に追加
    this.emotionHistory.push({
      emotion: basicEmotions.primary,
      timestamp: Date.now(),
      intensity: intensity
    });

    // 履歴を最新50件に制限
    if (this.emotionHistory.length > 50) {
      this.emotionHistory = this.emotionHistory.slice(-50);
    }

    return {
      primary: basicEmotions.primary,
      secondary: contextualEmotions,
      implicit: implicitEmotions,
      intensity: intensity,
      confidence: confidence,
      flow: emotionFlow,
      suggestedReactions: this.generateReactions(basicEmotions.primary, intensity)
    };
  }

  /**
   * 基本感情検出
   */
  private async detectBasicEmotions(text: string): Promise<{ primary: string; scores: Record<string, number> }> {
    const scores: Record<string, number> = {};
    
    // キーワードベースの検出
    Object.entries(this.emotions).forEach(([emotion, data]) => {
      let score = 0;
      data.keywords.forEach(keyword => {
        const count = (text.match(new RegExp(keyword, 'gi')) || []).length;
        score += count * 0.3;
      });
      
      // 句読点や感嘆符の分析
      const exclamation = (text.match(/[！!？?]{2,}/g) || []).length;
      if (emotion === 'excitement' && exclamation > 0) {
        score += exclamation * 0.2;
      }
      
      // 文字の長さと繰り返しパターン
      const repetition = (text.match(/(.)\1{2,}/g) || []).length;
      if (repetition > 0) {
        score += repetition * 0.1;
      }
      
      scores[emotion] = Math.min(score, 1.0);
    });
    
    // 最高スコアの感情を特定
    const primary = Object.entries(scores).reduce((a, b) => scores[a[0]] > scores[b[0]] ? a : b)[0];
    
    return { primary, scores };
  }

  /**
   * 文脈的感情検出
   */
  private async detectContextualEmotions(text: string): Promise<string[]> {
    const contextualEmotions: string[] = [];
    
    // 否定形の検出
    if (text.includes('ない') || text.includes('ん')) {
      contextualEmotions.push('uncertainty');
    }
    
    // 質問形の検出
    if (text.includes('？') || text.includes('?') || text.includes('ですか')) {
      contextualEmotions.push('curiosity');
    }
    
    // 過去形の検出（思い出や懐かしさ）
    if (text.includes('だった') || text.includes('でした')) {
      contextualEmotions.push('nostalgia');
    }
    
    // 将来形の検出（期待や不安）
    if (text.includes('でしょう') || text.includes('だろう') || text.includes('つもり')) {
      contextualEmotions.push('anticipation');
    }
    
    return contextualEmotions;
  }

  /**
   * 潜在的感情検出
   */
  private async detectImplicitEmotions(text: string): Promise<string[]> {
    const implicitEmotions: string[] = [];
    
    // 省略や曖昧さ（迷いや困惑）
    if (text.includes('...') || text.includes('…')) {
      implicitEmotions.push('confusion');
    }
    
    // 短い返答（不機嫌や急いでいる）
    if (text.length < 5 && !text.match(/[！!？?]/)) {
      implicitEmotions.push('brevity');
    }
    
    // 過度な丁寧語（緊張や距離感）
    const politeWords = ['ございます', 'いらっしゃい', 'おっしゃる'];
    if (politeWords.some(word => text.includes(word))) {
      implicitEmotions.push('formality');
    }
    
    return implicitEmotions;
  }

  /**
   * 感情の時系列変化を追跡
   */
  private trackEmotionFlow(currentEmotion: { primary: string }): EmotionFlow {
    const recent = this.emotionHistory.slice(-3);
    
    if (recent.length < 2) {
      return {
        previous: 'neutral',
        current: currentEmotion.primary,
        trend: 'stable',
        velocity: 0
      };
    }
    
    const previous = recent[recent.length - 2];
    const current = recent[recent.length - 1];
    
    // 感情の変化速度を計算
    const timeDiff = current.timestamp - previous.timestamp;
    const intensityDiff = current.intensity - previous.intensity;
    const velocity = intensityDiff / Math.max(timeDiff / 1000, 1); // per second
    
    // トレンドの判定
    let trend: 'rising' | 'falling' | 'stable' = 'stable';
    if (Math.abs(velocity) > 0.1) {
      trend = velocity > 0 ? 'rising' : 'falling';
    }
    
    return {
      previous: previous.emotion,
      current: currentEmotion.primary,
      trend,
      velocity
    };
  }

  /**
   * 感情強度の計算
   */
  private calculateIntensity(text: string): number {
    let intensity = 0.5; // ベース強度
    
    // 感嘆符や疑問符の数
    const exclamations = (text.match(/[！!？?]/g) || []).length;
    intensity += Math.min(exclamations * 0.1, 0.3);
    
    // 大文字の使用
    const uppercase = (text.match(/[A-Z]{2,}/g) || []).length;
    intensity += Math.min(uppercase * 0.05, 0.2);
    
    // 絵文字の数
    const emojis = (text.match(/[\u{1f300}-\u{1f9ff}]/gu) || []).length;
    intensity += Math.min(emojis * 0.1, 0.25);
    
    // 文字の繰り返し
    const repetitions = (text.match(/(.)\1{2,}/g) || []).length;
    intensity += Math.min(repetitions * 0.05, 0.15);
    
    return Math.min(intensity, 1.0);
  }

  /**
   * 信頼度の計算
   */
  private calculateConfidence(emotions: { scores: Record<string, number> }): number {
    const scores = Object.values(emotions.scores);
    const maxScore = Math.max(...scores);
    const secondMaxScore = scores.sort((a, b) => b - a)[1] || 0;
    
    // 最高スコアと2番目のスコアの差が大きいほど信頼度が高い
    return Math.min(maxScore - secondMaxScore + 0.5, 1.0);
  }

  /**
   * 感情に基づく自動リアクション生成
   */
  private generateReactions(emotion: string, intensity: number): AutoReaction[] {
    const reactions: AutoReaction[] = [];
    const emotionData = this.emotions[emotion as keyof typeof this.emotions];
    
    if (!emotionData) return reactions;
    
    // ビジュアルエフェクト
    if (intensity > 0.7) {
      reactions.push({
        type: 'visual',
        effect: 'particle_explosion',
        color: emotionData.color,
        duration: 2000,
        intensity: intensity
      });
    }
    
    // サウンドエフェクト（将来実装）
    reactions.push({
      type: 'audio',
      sound: emotionData.sound,
      volume: intensity * 0.5
    });
    
    // 背景アニメーション
    reactions.push({
      type: 'background',
      animation: this.selectBackgroundAnimation(emotion),
      intensity: intensity,
      color: emotionData.color,
      duration: 3000
    });
    
    // AIキャラクターの表情変化
    reactions.push({
      type: 'avatar',
      expression: emotion,
      duration: 3000
    });
    
    return reactions;
  }

  /**
   * 背景アニメーション選択
   */
  private selectBackgroundAnimation(emotion: string): string {
    const animations: Record<string, string> = {
      joy: 'bounce',
      love: 'pulse',
      surprise: 'shake',
      sadness: 'fade',
      anger: 'flash',
      fear: 'tremble',
      excitement: 'rainbow',
      curiosity: 'rotate'
    };
    
    return animations[emotion] || 'subtle-glow';
  }

  /**
   * リアルタイムムード追跡
   */
  trackConversationMood(): MoodTimeline {
    const timeline: MoodPoint[] = [];
    const cumulativeMood = { valence: 0, arousal: 0 };
    
    this.emotionHistory.forEach((entry, index) => {
      const valence = this.calculateValence(entry.emotion);
      const arousal = this.calculateArousal(entry.emotion);
      
      // 累積ムードの更新（指数移動平均）
      cumulativeMood.valence = cumulativeMood.valence * 0.7 + valence * 0.3;
      cumulativeMood.arousal = cumulativeMood.arousal * 0.7 + arousal * 0.3;
      
      timeline.push({
        timestamp: entry.timestamp,
        valence: cumulativeMood.valence,
        arousal: cumulativeMood.arousal,
        dominantEmotion: entry.emotion,
        messageIndex: index
      });
    });
    
    return {
      timeline,
      overallMood: this.classifyMood(cumulativeMood),
      moodShifts: this.detectMoodShifts(timeline),
      recommendation: this.generateMoodRecommendation(cumulativeMood)
    };
  }

  /**
   * 感情の快感度を計算
   */
  private calculateValence(emotion: string): number {
    const valenceMap: Record<string, number> = {
      joy: 0.8,
      love: 0.9,
      surprise: 0.1,
      sadness: -0.8,
      anger: -0.7,
      fear: -0.6,
      excitement: 0.7,
      curiosity: 0.2,
      gratitude: 0.8,
      confusion: -0.2
    };
    
    return valenceMap[emotion] || 0;
  }

  /**
   * 感情の覚醒度を計算
   */
  private calculateArousal(emotion: string): number {
    const arousalMap: Record<string, number> = {
      joy: 0.6,
      love: 0.5,
      surprise: 0.9,
      sadness: 0.3,
      anger: 0.8,
      fear: 0.9,
      excitement: 0.9,
      curiosity: 0.4,
      gratitude: 0.4,
      confusion: 0.6
    };
    
    return arousalMap[emotion] || 0.5;
  }

  /**
   * ムードの分類
   */
  private classifyMood(mood: { valence: number; arousal: number }): string {
    if (mood.valence > 0.3 && mood.arousal > 0.3) return 'excited';
    if (mood.valence > 0.3 && mood.arousal < 0.3) return 'calm-happy';
    if (mood.valence < -0.3 && mood.arousal > 0.3) return 'agitated';
    if (mood.valence < -0.3 && mood.arousal < 0.3) return 'depressed';
    return 'neutral';
  }

  /**
   * ムードの変化を検出
   */
  private detectMoodShifts(timeline: MoodPoint[]): { from: string; to: string; timestamp: number }[] {
    const shifts = [];
    
    for (let i = 1; i < timeline.length; i++) {
      const previous = timeline[i - 1];
      const current = timeline[i];
      
      const prevMood = this.classifyMood({ valence: previous.valence, arousal: previous.arousal });
      const currMood = this.classifyMood({ valence: current.valence, arousal: current.arousal });
      
      if (prevMood !== currMood) {
        shifts.push({
          from: prevMood,
          to: currMood,
          timestamp: current.timestamp
        });
      }
    }
    
    return shifts;
  }

  /**
   * ムードに基づく推奨事項を生成
   */
  private generateMoodRecommendation(mood: { valence: number; arousal: number }): string {
    const moodType = this.classifyMood(mood);
    
    const recommendations: Record<string, string> = {
      'excited': '盛り上がっていますね！この調子で楽しく会話を続けましょう。',
      'calm-happy': '穏やかで良い雰囲気ですね。リラックスした対話が続いています。',
      'agitated': '少し興奮気味のようです。深呼吸してリラックスしてみてください。',
      'depressed': 'お疲れのようですね。無理をせず、必要に応じて休憩を取ってください。',
      'neutral': 'バランスの取れた状態です。どんな話題でも対応できそうです。'
    };
    
    return recommendations[moodType] || '会話を続けましょう。';
  }
}