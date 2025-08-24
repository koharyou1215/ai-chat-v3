// Automatic Memory Management Service
// Automatically creates memory cards from conversations

import { UnifiedMessage, MemoryCard } from '@/types';
// Removed unused import

export class AutoMemoryManager {
  private lastProcessedMessageId: string | null = null;
  private messageBuffer: UnifiedMessage[] = [];
  private readonly BUFFER_SIZE = 6;  // バッファサイズを減らして頻繁な生成を防ぐ
  private readonly IMPORTANCE_THRESHOLD = 0.8; // 閾値を上げてより重要な内容のみ生成
  private readonly TIME_THRESHOLD = 10 * 60 * 1000; // 10分に延長
  private lastMemoryCreated: number = 0; // 最後のメモリ作成時刻

  /**
   * 新しいメッセージを処理して自動メモリー作成を判定
   */
  async processNewMessage(
    message: UnifiedMessage,
    sessionId: string,
    characterId?: string,
    createMemoryCardFn?: (messageIds: string[], sessionId: string, characterId?: string) => Promise<MemoryCard>
  ): Promise<void> {
    this.messageBuffer.push(message);
    
    // バッファサイズ制限
    if (this.messageBuffer.length > this.BUFFER_SIZE) {
      this.messageBuffer.shift();
    }

    // 連続生成防止のチェック
    const now = Date.now();
    if (now - this.lastMemoryCreated < 60000) { // 1分以内は生成しない
      return;
    }
    
    // 自動作成の条件をチェック
    const shouldCreateMemory = await this.shouldCreateMemoryCard(message, this.messageBuffer);
    
    if (shouldCreateMemory && createMemoryCardFn) {
      try {
        // 重要なメッセージを含む最近の会話を抽出
        const relevantMessages = this.extractRelevantMessages(this.messageBuffer);
        const messageIds = relevantMessages.map(msg => msg.id);
        
        await createMemoryCardFn(messageIds, sessionId, characterId);
        console.log('[AutoMemory] Generated memory card for important conversation');
        
        // 処理済みマーク
        this.lastProcessedMessageId = message.id;
        this.lastMemoryCreated = now; // 作成時刻を記録
      } catch (error) {
        console.error('Failed to auto-create memory card:', error);
      }
    }
  }

  /**
   * メモリーカード作成の必要性を判定
   */
  private async shouldCreateMemoryCard(
    currentMessage: UnifiedMessage,
    messageHistory: UnifiedMessage[]
  ): Promise<boolean> {
    // 1. 重要キーワードの検出
    const importantKeywords = [
      '重要', '大事', '忘れないで', '覚えておいて', '約束', '決定', '決めた',
      '好き', '嫌い', '名前', '誕生日', '記念日', '住所', '電話', 
      '仕事', '会社', '学校', '家族', '恋人', '友達', '結婚', '離婚'
    ];
    
    const hasImportantKeywords = importantKeywords.some(keyword => 
      currentMessage.content.toLowerCase().includes(keyword)
    );

    // 2. 感情的な重要度の計算
    const emotionalWeight = this.calculateEmotionalImportance(currentMessage);

    // 3. 会話の長さと深さ
    const conversationDepth = this.calculateConversationDepth(messageHistory);

    // 4. ユーザーの強調表現
    const userEmphasis = this.detectUserEmphasis(currentMessage);

    // 5. 時間的な重要性（長時間の会話）
    const timeImportance = this.calculateTimeImportance(messageHistory);

    // 総合スコア計算
    const totalScore = 
      (hasImportantKeywords ? 0.3 : 0) +
      emotionalWeight * 0.25 +
      conversationDepth * 0.2 +
      userEmphasis * 0.15 +
      timeImportance * 0.1;

    return totalScore >= this.IMPORTANCE_THRESHOLD;
  }

  /**
   * 感情的重要度を計算
   */
  private calculateEmotionalImportance(message: UnifiedMessage): number {
    const emotionalMarkers = [
      '嬉しい', '悲しい', '怒り', '驚き', '心配', '安心', '感動', '失望',
      '愛してる', '大好き', '最高', '最悪', '感謝', '申し訳', 'ありがとう'
    ];

    const emotionalPunctuation = ['！！', '？？', '♪', '♡', '💕', '😊', '😢', '😠'];

    let score = 0;
    
    emotionalMarkers.forEach(marker => {
      if (message.content.includes(marker)) score += 0.1;
    });

    emotionalPunctuation.forEach(punct => {
      const count = (message.content.match(new RegExp(punct.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      score += count * 0.05;
    });

    return Math.min(1.0, score);
  }

  /**
   * 会話の深さを計算
   */
  private calculateConversationDepth(messages: UnifiedMessage[]): number {
    if (messages.length < 3) return 0;

    // 連続した対話の回数
    let exchanges = 0;
    for (let i = 1; i < messages.length; i++) {
      if (messages[i].role !== messages[i-1].role) {
        exchanges++;
      }
    }

    // 平均メッセージ長
    const avgLength = messages.reduce((sum, msg) => sum + msg.content.length, 0) / messages.length;

    return Math.min(1.0, (exchanges / 10) + (avgLength / 200));
  }

  /**
   * ユーザーの強調表現を検出
   */
  private detectUserEmphasis(message: UnifiedMessage): number {
    if (message.role !== 'user') return 0;

    let score = 0;
    
    // 大文字の使用
    const capsCount = (message.content.match(/[A-Z]{2,}/g) || []).length;
    score += capsCount * 0.1;

    // 感嘆符の連続
    const exclamationCount = (message.content.match(/！+/g) || []).length;
    score += exclamationCount * 0.1;

    // 強調語の使用
    const emphasisWords = ['絶対', '必ず', '本当に', 'めちゃくちゃ', 'すごく', 'とても'];
    emphasisWords.forEach(word => {
      if (message.content.includes(word)) score += 0.1;
    });

    return Math.min(1.0, score);
  }

  /**
   * 時間的重要性を計算
   */
  private calculateTimeImportance(messages: UnifiedMessage[]): number {
    if (messages.length < 2) return 0;

    const firstMessage = messages[0];
    const lastMessage = messages[messages.length - 1];
    
    const timeDiff = new Date(lastMessage.created_at).getTime() - new Date(firstMessage.created_at).getTime();
    
    // 5分以上の会話は時間的に重要
    return Math.min(1.0, timeDiff / this.TIME_THRESHOLD);
  }

  /**
   * 関連メッセージを抽出
   */
  private extractRelevantMessages(messages: UnifiedMessage[]): UnifiedMessage[] {
    // 最新から遡って最大7メッセージを抽出
    return messages.slice(-7);
  }

  /**
   * バッファをクリア
   */
  clearBuffer(): void {
    this.messageBuffer = [];
    this.lastProcessedMessageId = null;
  }

  /**
   * 設定可能な閾値の更新
   */
  updateThreshold(threshold: number): void {
    if (threshold >= 0 && threshold <= 1) {
      // this.IMPORTANCE_THRESHOLD = threshold; // readonly なので実際は設定ファイルで管理
    }
  }
}

export const autoMemoryManager = new AutoMemoryManager();