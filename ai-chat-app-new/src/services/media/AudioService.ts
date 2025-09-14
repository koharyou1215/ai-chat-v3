/**
 * AudioService
 * 音声再生サービス
 * VOICEVOX APIとブラウザSpeech APIを統合管理
 */

import { Character } from '@/types/core/character.types';

export interface AudioOptions {
  voiceType?: 'voicevox' | 'browser';
  speakerId?: number;
  speed?: number;
  pitch?: number;
  volume?: number;
  lang?: string;
}

export class AudioService {
  private currentAudio: HTMLAudioElement | null = null;
  private speechSynthesis: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isInitialized = false;
  private voicevoxUrl: string;

  constructor(voicevoxUrl: string = 'http://localhost:50021') {
    this.voicevoxUrl = voicevoxUrl;

    // ブラウザSpeech APIの確認
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.speechSynthesis = window.speechSynthesis;
    }
  }

  /**
   * サービスの初期化
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('🎵 AudioService: Initializing...');

    // VOICEVOX APIの疎通確認
    try {
      const response = await fetch(`${this.voicevoxUrl}/version`, {
        method: 'GET',
      });

      if (response.ok) {
        console.log('✅ AudioService: VOICEVOX connected');
      } else {
        console.warn('⚠️ AudioService: VOICEVOX not available');
      }
    } catch (error) {
      console.warn('⚠️ AudioService: VOICEVOX connection failed', error);
    }

    this.isInitialized = true;
    console.log('✅ AudioService: Initialized');
  }

  /**
   * テキストを音声で再生
   */
  public async playText(
    text: string,
    character?: Character,
    options: AudioOptions = {}
  ): Promise<string> {
    const {
      voiceType = 'browser',
      speakerId = 1,
      speed = 1.0,
      pitch = 1.0,
      volume = 1.0,
      lang = 'ja-JP',
    } = options;

    // 現在の再生を停止
    this.stop();

    try {
      if (voiceType === 'voicevox') {
        return await this.playWithVoicevox(text, speakerId, speed, pitch);
      } else {
        return await this.playWithBrowserTTS(text, speed, pitch, volume, lang);
      }
    } catch (error) {
      console.error('❌ AudioService: Playback failed', error);
      // フォールバック: VOICEVOXが失敗したらブラウザTTSを試す
      if (voiceType === 'voicevox' && this.speechSynthesis) {
        console.log('🔄 AudioService: Falling back to browser TTS');
        return await this.playWithBrowserTTS(text, speed, pitch, volume, lang);
      }
      throw error;
    }
  }

  /**
   * VOICEVOX APIで音声再生
   */
  private async playWithVoicevox(
    text: string,
    speakerId: number,
    speed: number,
    pitch: number
  ): Promise<string> {
    // 音声クエリの生成
    const queryResponse = await fetch(
      `${this.voicevoxUrl}/audio_query?text=${encodeURIComponent(text)}&speaker=${speakerId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!queryResponse.ok) {
      throw new Error(`VOICEVOX query failed: ${queryResponse.statusText}`);
    }

    const query = await queryResponse.json();

    // パラメータの調整
    query.speedScale = speed;
    query.pitchScale = pitch;

    // 音声合成
    const synthesisResponse = await fetch(
      `${this.voicevoxUrl}/synthesis?speaker=${speakerId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(query),
      }
    );

    if (!synthesisResponse.ok) {
      throw new Error(`VOICEVOX synthesis failed: ${synthesisResponse.statusText}`);
    }

    // 音声データの取得
    const audioBlob = await synthesisResponse.blob();
    const audioUrl = URL.createObjectURL(audioBlob);

    // 音声再生
    this.currentAudio = new Audio(audioUrl);
    this.currentAudio.volume = 1.0;

    return new Promise((resolve, reject) => {
      if (!this.currentAudio) {
        reject(new Error('Audio element not created'));
        return;
      }

      this.currentAudio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        resolve(audioUrl);
      };

      this.currentAudio.onerror = (error) => {
        URL.revokeObjectURL(audioUrl);
        reject(error);
      };

      this.currentAudio.play().catch(reject);
    });
  }

  /**
   * ブラウザのSpeech APIで音声再生
   */
  private async playWithBrowserTTS(
    text: string,
    speed: number,
    pitch: number,
    volume: number,
    lang: string
  ): Promise<string> {
    if (!this.speechSynthesis) {
      throw new Error('Speech synthesis not supported');
    }

    return new Promise((resolve, reject) => {
      this.currentUtterance = new SpeechSynthesisUtterance(text);
      this.currentUtterance.lang = lang;
      this.currentUtterance.rate = speed;
      this.currentUtterance.pitch = pitch;
      this.currentUtterance.volume = volume;

      // 日本語の音声を優先的に選択
      const voices = this.speechSynthesis!.getVoices();
      const japaneseVoice = voices.find(
        (voice) => voice.lang === 'ja-JP' || voice.lang.startsWith('ja')
      );
      if (japaneseVoice) {
        this.currentUtterance.voice = japaneseVoice;
      }

      this.currentUtterance.onend = () => {
        resolve('browser-tts');
      };

      this.currentUtterance.onerror = (event) => {
        reject(new Error(`Speech synthesis error: ${event.error}`));
      };

      this.speechSynthesis!.speak(this.currentUtterance);
    });
  }

  /**
   * 音声再生の停止
   */
  public stop(): void {
    // VOICEVOXの音声を停止
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }

    // ブラウザTTSを停止
    if (this.speechSynthesis && this.currentUtterance) {
      this.speechSynthesis.cancel();
      this.currentUtterance = null;
    }
  }

  /**
   * 再生中かどうかを確認
   */
  public isPlaying(): boolean {
    if (this.currentAudio && !this.currentAudio.paused) {
      return true;
    }

    if (this.speechSynthesis && this.speechSynthesis.speaking) {
      return true;
    }

    return false;
  }

  /**
   * 利用可能な音声の取得
   */
  public getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!this.speechSynthesis) {
      return [];
    }
    return this.speechSynthesis.getVoices();
  }

  /**
   * VOICEVOXのスピーカー情報を取得
   */
  public async getVoicevoxSpeakers(): Promise<any[]> {
    try {
      const response = await fetch(`${this.voicevoxUrl}/speakers`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch speakers: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ AudioService: Failed to fetch VOICEVOX speakers', error);
      return [];
    }
  }

  /**
   * クリーンアップ
   */
  public async cleanup(): Promise<void> {
    this.stop();
    this.currentAudio = null;
    this.currentUtterance = null;
    console.log('✅ AudioService: Cleanup completed');
  }
}