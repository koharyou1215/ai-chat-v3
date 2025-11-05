/**
 * Safari TTS Manager
 * Safari iOS/macOSでの音声読み上げを最適化
 *
 * Safari特有の問題への対策:
 * 1. 長文（15秒以上）で再生が途切れる問題 → 自動分割
 * 2. 音声リストの非同期読み込み → Promise対応
 * 3. ユーザーインタラクション必須 → エラーハンドリング
 */

export interface SafariTTSOptions {
  rate?: number;          // 速度 (0.5 - 2.0)
  pitch?: number;         // ピッチ (0.0 - 2.0)
  volume?: number;        // 音量 (0.0 - 1.0)
  lang?: string;          // 言語 ('ja-JP', 'en-US', etc.)
  voiceName?: string;     // 音声名
  maxChunkLength?: number; // 最大チャンク長（デフォルト200文字）
}

export class SafariTTSManager {
  private queue: string[] = [];
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isPaused: boolean = false;
  private isProcessing: boolean = false;

  /**
   * テキストを音声で読み上げ
   * 長文は自動的に分割して順次再生
   */
  async speak(text: string, options: SafariTTSOptions = {}): Promise<void> {
    // 既存の再生を停止
    this.stop();

    // 音声リストが読み込まれているか確認
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) {
      console.warn('⚠️ Safari TTS: 音声リストがまだ読み込まれていません。音声読み込み待機中...');
      // 音声リストの読み込みを待つ
      await SafariTTSManager.getAvailableVoices();
    }

    // 長文を自動分割
    const chunks = this.splitTextForSafari(
      text,
      options.maxChunkLength || 200
    );

    console.log('🔊 Safari TTS 再生開始:', {
      textLength: text.length,
      chunksCount: chunks.length,
      options,
      availableVoices: voices.length,
    });

    this.queue = chunks;
    await this.processQueue(options);
  }

  /**
   * キューを順次処理
   */
  private async processQueue(options: SafariTTSOptions): Promise<void> {
    if (this.isProcessing) return;

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const chunk = this.queue.shift()!;

      try {
        await this.speakChunk(chunk, options);
      } catch (error) {
        console.error('Safari TTS chunk error:', error);
        // エラーが発生してもキューを継続
      }
    }

    this.isProcessing = false;
  }

  /**
   * 単一チャンクを再生（Promiseベース）
   */
  private speakChunk(text: string, options: SafariTTSOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);

      // パラメーター設定
      utterance.rate = options.rate ?? 1.0;
      utterance.pitch = options.pitch ?? 1.0;
      utterance.volume = options.volume ?? 1.0;
      utterance.lang = options.lang ?? 'ja-JP';

      // 音声選択
      if (options.voiceName) {
        const voices = window.speechSynthesis.getVoices();
        const voice = voices.find(v => v.name === options.voiceName);
        if (voice) {
          utterance.voice = voice;
        }
      }

      // イベントハンドラー
      utterance.onend = () => {
        this.currentUtterance = null;
        resolve();
      };

      utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
        console.error('Safari TTS error details:', {
          event,
          error: event.error,
          type: event.type,
          utteranceText: text.substring(0, 50) + '...',
          utteranceRate: utterance.rate,
          utteranceVolume: utterance.volume,
          utteranceLang: utterance.lang,
          isSpeaking: window.speechSynthesis.speaking,
          isPaused: window.speechSynthesis.paused,
          pending: window.speechSynthesis.pending,
        });
        this.currentUtterance = null;
        reject(new Error(`Safari TTS failed: ${event.error || event.type || 'Unknown error'}`));
      };

      // Safari対策: 再生前に短い遅延を入れる
      setTimeout(() => {
        this.currentUtterance = utterance;
        window.speechSynthesis.speak(utterance);
      }, 100);
    });
  }

  /**
   * Safari用テキスト分割アルゴリズム
   *
   * Safari/iOSでは15秒以上の長文で再生が途切れる問題があるため、
   * 適切な長さに分割する。
   *
   * 分割ルール:
   * 1. 句点（。！？）で分割を優先
   * 2. maxLengthを超えない範囲で結合
   * 3. 改行も分割ポイントとして扱う
   */
  private splitTextForSafari(text: string, maxLength: number): string[] {
    // 句点・改行で分割
    const sentences = text.match(/[^。！？\n]+[。！？\n]?/g) || [text];
    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      const combinedLength = currentChunk.length + sentence.length;

      if (combinedLength > maxLength && currentChunk.length > 0) {
        // 現在のチャンクを保存して新しいチャンクを開始
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        // 現在のチャンクに追加
        currentChunk += sentence;
      }
    }

    // 最後のチャンクを追加
    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks.length > 0 ? chunks : [text];
  }

  /**
   * 再生停止
   */
  stop(): void {
    window.speechSynthesis.cancel();
    this.queue = [];
    this.currentUtterance = null;
    this.isProcessing = false;
    this.isPaused = false;
  }

  /**
   * 一時停止
   */
  pause(): void {
    if (!this.isPaused && this.currentUtterance) {
      window.speechSynthesis.pause();
      this.isPaused = true;
    }
  }

  /**
   * 再開
   */
  resume(): void {
    if (this.isPaused) {
      window.speechSynthesis.resume();
      this.isPaused = false;
    }
  }

  /**
   * 再生中かどうか
   */
  isSpeaking(): boolean {
    return window.speechSynthesis.speaking;
  }

  /**
   * 利用可能な音声のリストを取得
   */
  static async getAvailableVoices(): Promise<SpeechSynthesisVoice[]> {
    return new Promise((resolve) => {
      let voices = window.speechSynthesis.getVoices();

      if (voices.length > 0) {
        resolve(voices);
      } else {
        // Safariでは非同期で音声リストが読み込まれる
        window.speechSynthesis.onvoiceschanged = () => {
          voices = window.speechSynthesis.getVoices();
          resolve(voices);
        };
      }
    });
  }

  /**
   * 日本語音声を取得
   */
  static async getJapaneseVoices(): Promise<SpeechSynthesisVoice[]> {
    const voices = await SafariTTSManager.getAvailableVoices();
    return voices.filter(v => v.lang.startsWith('ja'));
  }
}
