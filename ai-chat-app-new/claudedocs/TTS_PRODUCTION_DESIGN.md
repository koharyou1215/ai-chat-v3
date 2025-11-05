# 🎤 本番環境対応 音声読み上げ（TTS）システム設計書

## 📋 Executive Summary

### ✅ **結論: 本番環境でも音声読み上げは既に可能です**

AI Chat V3には既に**3種類の音声プロバイダー**が実装されており、**ブラウザのWeb Speech API（`system`プロバイダー）**を使用することで、**本番環境（Vercel）でも追加のサーバーサイドコストなしで音声読み上げが利用可能**です。

---

## 🎯 設計目標

1. **本番環境での動作保証**: Vercelデプロイ環境でも音声読み上げ機能を提供
2. **Safari完全対応**: iPhone 15 Pro Max（430x932 viewport）での完璧な動作
3. **ゼロコスト運用**: 追加のAPIコストなしでの基本TTS機能提供
4. **段階的な品質向上**: 無料のWeb Speech APIから有料高品質APIへのアップグレードパス
5. **既存機能の保護**: 現在実装されているVoiceVox/ElevenLabs統合の維持

---

## 🏗️ システムアーキテクチャ

### 📊 Multi-Tier TTS Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    TTS Provider Hierarchy                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Tier 1: System Voice (Web Speech API) ← 本番環境デフォルト  │
│  ├─ Cost: 無料                                               │
│  ├─ Deployment: ブラウザサイド（Vercel Edge無関係）          │
│  ├─ Quality: 中程度（OS依存）                                │
│  └─ Safari Support: ✅ 完全対応                              │
│                                                              │
│  Tier 2: VoiceVox (Local/VPS Server)                        │
│  ├─ Cost: サーバー運用コストのみ                              │
│  ├─ Deployment: 外部APIサーバー必要                          │
│  ├─ Quality: 高品質（日本語特化）                            │
│  └─ Safari Support: ✅ Audio API経由で対応                   │
│                                                              │
│  Tier 3: ElevenLabs (Cloud API)                             │
│  ├─ Cost: 従量課金                                           │
│  ├─ Deployment: サーバーサイドAPI経由                        │
│  ├─ Quality: 最高品質（多言語対応）                          │
│  └─ Safari Support: ✅ Audio API経由で対応                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔍 既存実装の分析

### ✅ 実装済み機能（`useAudioPlayback.ts`）

```typescript
// Line 164-181: Web Speech API実装
else if ('speechSynthesis' in window) {
  const utter = new SpeechSynthesisUtterance(message.content);
  globalSpeechUtterance = utter;

  // VoiceVox設定からパラメーターを適用
  if (voiceSettings?.voicevox) {
    utter.rate = voiceSettings.voicevox.speed || 1.0;
    utter.pitch = Math.max(0, Math.min(2, (voiceSettings.voicevox.pitch || 0) / 100 + 1));
    utter.volume = voiceSettings.voicevox.volume || 1.0;
  }

  utter.onend = () => setIsSpeaking(false);
  utter.onerror = () => setIsSpeaking(false);
  window.speechSynthesis.speak(utter);
}
```

### 📋 VoiceSettings型定義

```typescript
export interface VoiceSettings {
  enabled: boolean;
  provider: "voicevox" | "elevenlabs" | "system";
  autoPlay: boolean;

  voicevox: { speaker: number; speed: number; pitch: number; intonation: number; volume: number; };
  elevenlabs: { voiceId: string; stability: number; similarity: number; };
  system: { voice: string; rate: number; pitch: number; volume: number; }; // ← Web Speech API設定

  advanced: {
    bufferSize: number;
    crossfade: boolean;
    normalization: boolean;
    noiseReduction: boolean;
    echoCancellation: boolean;
  };
}
```

---

## 🌐 Web Speech API 互換性分析

### ✅ Safari（iOS）完全対応

| ブラウザ | バージョン | Support | 備考 |
|---------|----------|---------|------|
| Safari (iOS) | 14.5+ | ✅ Full | `speechSynthesis` API完全対応 |
| Safari (macOS) | 14.1+ | ✅ Full | 高品質な日本語音声対応 |
| Chrome (Desktop) | 33+ | ✅ Full | Google音声エンジン |
| Edge (Desktop) | 14+ | ✅ Full | Microsoft音声エンジン |

### 📱 Safari/iOS特有の制約と対策

#### 1. **ユーザーインタラクション必須**
```typescript
// ❌ 自動再生は失敗する可能性
useEffect(() => {
  if (autoPlay) {
    window.speechSynthesis.speak(utterance); // iOS Safariでブロックされる
  }
}, []);

// ✅ ユーザーアクションをトリガーに
const handleSpeak = () => {
  window.speechSynthesis.speak(utterance); // ボタンクリックなら成功
};
```

#### 2. **長文の自動分割**
Safari/iOSでは15秒以上の長文で再生が途切れる問題があります。

```typescript
// ✅ 文章を適切な長さに分割
const splitTextForSafari = (text: string, maxLength: number = 200): string[] => {
  const sentences = text.match(/[^。！？\n]+[。！？\n]/g) || [text];
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxLength) {
      if (currentChunk) chunks.push(currentChunk);
      currentChunk = sentence;
    } else {
      currentChunk += sentence;
    }
  }
  if (currentChunk) chunks.push(currentChunk);

  return chunks;
};
```

#### 3. **音声リスト取得のタイミング**
```typescript
// ✅ 音声リストの確実な取得
const getVoices = (): Promise<SpeechSynthesisVoice[]> => {
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
};
```

---

## 🚀 本番環境デプロイ戦略

### ✅ Vercel環境での動作保証

#### 1. **ブラウザサイド実行**
Web Speech APIは**完全にブラウザサイド**で動作するため、Vercelの制約（サーバーレス関数のタイムアウト、Edge Functionの制限）の影響を受けません。

```typescript
// ✅ ブラウザ環境チェック
const isBrowserSupported = (): boolean => {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
};
```

#### 2. **フォールバック戦略**
```typescript
const getTTSProvider = (): 'system' | 'voicevox' | 'elevenlabs' => {
  // 本番環境では常にsystemをデフォルトに
  if (process.env.NODE_ENV === 'production' && isBrowserSupported()) {
    return 'system';
  }

  // 開発環境ではユーザー設定を優先
  return userSettings.voice.provider;
};
```

#### 3. **APIキー不要**
Web Speech APIは追加の認証・APIキーが不要なため、環境変数の設定も不要です。

---

## 🔧 改善提案と実装仕様

### 🎯 Phase 1: Safari最適化（必須）

#### 1. **Safari専用TTSマネージャー**

```typescript
// src/services/tts/safari-tts-manager.ts

export class SafariTTSManager {
  private queue: string[] = [];
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isPaused: boolean = false;

  /**
   * Safari用の長文分割・キュー管理システム
   */
  async speak(text: string, options: SafariTTSOptions): Promise<void> {
    // 長文を自動分割
    const chunks = this.splitTextForSafari(text, options.maxChunkLength);
    this.queue.push(...chunks);

    if (!this.currentUtterance) {
      await this.processQueue(options);
    }
  }

  /**
   * キューを順次処理
   */
  private async processQueue(options: SafariTTSOptions): Promise<void> {
    while (this.queue.length > 0) {
      const chunk = this.queue.shift()!;
      await this.speakChunk(chunk, options);
    }
  }

  /**
   * 単一チャンクを再生（Promiseベース）
   */
  private speakChunk(text: string, options: SafariTTSOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);

      // Safari最適化パラメーター
      utterance.rate = options.rate || 1.0;
      utterance.pitch = options.pitch || 1.0;
      utterance.volume = options.volume || 1.0;
      utterance.lang = options.lang || 'ja-JP';

      // 音声選択（日本語音声を優先）
      if (options.voiceName) {
        const voices = window.speechSynthesis.getVoices();
        const voice = voices.find(v => v.name === options.voiceName);
        if (voice) utterance.voice = voice;
      }

      utterance.onend = () => {
        this.currentUtterance = null;
        resolve();
      };

      utterance.onerror = (error) => {
        this.currentUtterance = null;
        reject(error);
      };

      // Safari対策: 再生前に短い遅延
      setTimeout(() => {
        this.currentUtterance = utterance;
        window.speechSynthesis.speak(utterance);
      }, 100);
    });
  }

  /**
   * Safari用テキスト分割アルゴリズム
   */
  private splitTextForSafari(text: string, maxLength: number = 200): string[] {
    const sentences = text.match(/[^。！？\n]+[。！？\n]/g) || [text];
    const chunks: string[] = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > maxLength) {
        if (currentChunk) chunks.push(currentChunk);
        currentChunk = sentence;
      } else {
        currentChunk += sentence;
      }
    }
    if (currentChunk) chunks.push(currentChunk);

    return chunks;
  }

  /**
   * 再生停止
   */
  stop(): void {
    window.speechSynthesis.cancel();
    this.queue = [];
    this.currentUtterance = null;
  }

  /**
   * 一時停止/再開
   */
  pause(): void {
    if (!this.isPaused) {
      window.speechSynthesis.pause();
      this.isPaused = true;
    }
  }

  resume(): void {
    if (this.isPaused) {
      window.speechSynthesis.resume();
      this.isPaused = false;
    }
  }
}

export interface SafariTTSOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  lang?: string;
  voiceName?: string;
  maxChunkLength?: number;
}
```

#### 2. **音声選択UI強化**

```typescript
// src/components/settings/SystemVoiceSelector.tsx

export const SystemVoiceSelector: React.FC = () => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const { voice, updateVoiceSettings } = useAppStore();

  useEffect(() => {
    const loadVoices = async () => {
      const availableVoices = await getVoices();

      // 日本語音声を優先してソート
      const sortedVoices = availableVoices.sort((a, b) => {
        const aIsJa = a.lang.startsWith('ja');
        const bIsJa = b.lang.startsWith('ja');
        if (aIsJa && !bIsJa) return -1;
        if (!aIsJa && bIsJa) return 1;
        return a.name.localeCompare(b.name);
      });

      setVoices(sortedVoices);
    };

    loadVoices();
  }, []);

  return (
    <select
      value={voice.system.voice}
      onChange={(e) => updateVoiceSettings({
        system: { ...voice.system, voice: e.target.value }
      })}
      className="w-full bg-slate-700 border border-white/10 rounded-lg px-3 py-2 text-white"
    >
      <option value="">デフォルト音声</option>
      {voices.map((v) => (
        <option key={v.name} value={v.name}>
          {v.name} ({v.lang}) {v.localService ? '📱' : '☁️'}
        </option>
      ))}
    </select>
  );
};

const getVoices = (): Promise<SpeechSynthesisVoice[]> => {
  return new Promise((resolve) => {
    let voices = window.speechSynthesis.getVoices();

    if (voices.length > 0) {
      resolve(voices);
    } else {
      window.speechSynthesis.onvoiceschanged = () => {
        voices = window.speechSynthesis.getVoices();
        resolve(voices);
      };
    }
  });
};
```

---

### 🎯 Phase 2: 品質向上（オプション）

#### 1. **SSML対応（ブラウザ依存）**
一部のブラウザはSSML（Speech Synthesis Markup Language）に対応しています。

```typescript
const createSSMLUtterance = (text: string, emotion: string): string => {
  // 感情に応じたピッチ・速度調整
  const emotionMap = {
    happy: { pitch: '+10%', rate: '1.1' },
    sad: { pitch: '-10%', rate: '0.9' },
    angry: { pitch: '+15%', rate: '1.2' },
    neutral: { pitch: '0%', rate: '1.0' }
  };

  const params = emotionMap[emotion] || emotionMap.neutral;

  return `
    <speak>
      <prosody pitch="${params.pitch}" rate="${params.rate}">
        ${text}
      </prosody>
    </speak>
  `;
};
```

#### 2. **音声キャッシング（ブラウザストレージ）**
頻繁に使用されるフレーズをキャッシュして高速化。

```typescript
// src/services/tts/voice-cache.service.ts

export class VoiceCacheService {
  private cache: Map<string, Blob> = new Map();

  /**
   * 音声をIndexedDBにキャッシュ
   */
  async cacheAudio(text: string, audioBlob: Blob): Promise<void> {
    const cacheKey = this.generateCacheKey(text);
    this.cache.set(cacheKey, audioBlob);

    // IndexedDBに永続化
    await this.saveToIndexedDB(cacheKey, audioBlob);
  }

  /**
   * キャッシュから音声を取得
   */
  async getCachedAudio(text: string): Promise<Blob | null> {
    const cacheKey = this.generateCacheKey(text);

    // メモリキャッシュを優先
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // IndexedDBから取得
    return await this.loadFromIndexedDB(cacheKey);
  }

  private generateCacheKey(text: string): string {
    return `voice_${hashString(text)}`;
  }

  private async saveToIndexedDB(key: string, blob: Blob): Promise<void> {
    // IndexedDB実装
  }

  private async loadFromIndexedDB(key: string): Promise<Blob | null> {
    // IndexedDB実装
  }
}
```

---

### 🎯 Phase 3: UX向上（推奨）

#### 1. **視覚的フィードバック**

```typescript
// src/components/chat/TTSIndicator.tsx

export const TTSIndicator: React.FC<{ isSpeaking: boolean }> = ({ isSpeaking }) => {
  return (
    <AnimatePresence>
      {isSpeaking && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className="flex items-center gap-2 text-purple-400"
        >
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-1 h-4 bg-purple-500 rounded-full"
                animate={{ scaleY: [1, 1.5, 1] }}
                transition={{
                  repeat: Infinity,
                  duration: 0.6,
                  delay: i * 0.1
                }}
              />
            ))}
          </div>
          <span className="text-sm">読み上げ中...</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
```

#### 2. **再生速度コントロール（モバイル対応）**

```typescript
// src/components/settings/TTSSpeedControl.tsx

export const TTSSpeedControl: React.FC = () => {
  const { voice, updateVoiceSettings } = useAppStore();

  const speeds = [
    { label: '0.5x', value: 0.5 },
    { label: '0.75x', value: 0.75 },
    { label: '1.0x', value: 1.0 },
    { label: '1.25x', value: 1.25 },
    { label: '1.5x', value: 1.5 },
    { label: '2.0x', value: 2.0 }
  ];

  return (
    <div className="grid grid-cols-6 gap-2">
      {speeds.map(({ label, value }) => (
        <button
          key={value}
          onClick={() => updateVoiceSettings({
            system: { ...voice.system, rate: value }
          })}
          className={`
            px-3 py-2 rounded-lg text-sm font-medium transition-colors
            ${voice.system.rate === value
              ? 'bg-purple-600 text-white'
              : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
            }
          `}
        >
          {label}
        </button>
      ))}
    </div>
  );
};
```

---

## 📊 パフォーマンス最適化

### ⚡ メモリ管理

```typescript
// src/hooks/useAudioPlayback.ts

// グローバル再生管理の改善
class GlobalAudioManager {
  private static instance: GlobalAudioManager;
  private currentAudio: HTMLAudioElement | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  static getInstance(): GlobalAudioManager {
    if (!GlobalAudioManager.instance) {
      GlobalAudioManager.instance = new GlobalAudioManager();
    }
    return GlobalAudioManager.instance;
  }

  /**
   * すべての再生を停止してメモリを解放
   */
  stopAll(): void {
    // Audio要素の停止
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.src = ''; // メモリ解放
      this.currentAudio = null;
    }

    // Speech Synthesis停止
    if (this.currentUtterance) {
      window.speechSynthesis.cancel();
      this.currentUtterance = null;
    }
  }

  /**
   * 新しい再生を開始（既存を自動停止）
   */
  playAudio(audio: HTMLAudioElement): void {
    this.stopAll();
    this.currentAudio = audio;
  }

  /**
   * 新しい音声合成を開始（既存を自動停止）
   */
  speakUtterance(utterance: SpeechSynthesisUtterance): void {
    this.stopAll();
    this.currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }
}

// フック内で使用
export const useAudioPlayback = ({ message, isLatest }: UseAudioPlaybackProps) => {
  const audioManager = GlobalAudioManager.getInstance();

  const handleSpeak = useCallback(async () => {
    if (voiceSettings?.provider === 'system') {
      const utterance = new SpeechSynthesisUtterance(message.content);
      // 設定適用...
      audioManager.speakUtterance(utterance);
    }
  }, [message.content, voiceSettings]);

  // コンポーネントアンマウント時のクリーンアップ
  useEffect(() => {
    return () => {
      if (!isLatest) {
        audioManager.stopAll();
      }
    };
  }, [isLatest]);
};
```

---

## 🧪 テスト戦略

### 1. **クロスブラウザテスト**

```typescript
// tests/e2e/tts-browser-compatibility.spec.ts

describe('TTS Browser Compatibility', () => {
  test('Safari iOS: Long text chunking', async () => {
    const longText = '長文テキスト...'.repeat(50);
    const chunks = splitTextForSafari(longText, 200);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every(chunk => chunk.length <= 200)).toBe(true);
  });

  test('Safari iOS: Voice selection', async () => {
    const voices = await getVoices();
    const jaVoices = voices.filter(v => v.lang.startsWith('ja'));

    expect(jaVoices.length).toBeGreaterThan(0);
  });

  test('Safari iOS: Auto-play prevention', async () => {
    // ユーザーインタラクションなしでの再生を検証
  });
});
```

### 2. **本番環境デプロイテスト**

```bash
# Vercel Preview環境でのテスト
npm run build
vercel --prod

# Safari iOS実機でのテスト
- iPhone 15 Pro Max (Safari)
- iPad Pro (Safari)
- macOS Safari
```

---

## 📋 実装チェックリスト

### ✅ Phase 1: 基本対応（必須）

- [x] Web Speech API既存実装確認
- [ ] Safari専用TTSマネージャー実装
- [ ] 長文自動分割機能
- [ ] 音声選択UI改善
- [ ] Safari実機テスト

### 🔄 Phase 2: 品質向上（推奨）

- [ ] SSML対応（ブラウザ依存機能）
- [ ] 音声キャッシング（IndexedDB）
- [ ] エラーハンドリング強化
- [ ] フォールバック戦略改善

### 🎨 Phase 3: UX向上（オプション）

- [ ] 視覚的フィードバック
- [ ] 再生速度コントロールUI
- [ ] 音声プレビュー機能
- [ ] キャラクター専用音声設定

---

## 🚀 デプロイ手順

### 1. **開発環境での動作確認**

```bash
# 開発サーバー起動
npm run dev

# Safari/Chrome/Edgeで動作確認
# 特にiPhone実機Safariでの動作確認
```

### 2. **ビルドと型チェック**

```bash
# TypeScript型チェック
npx tsc --noEmit

# 本番ビルド
npm run build
```

### 3. **Vercelへのデプロイ**

```bash
# Preview環境にデプロイ
vercel

# 本番環境にデプロイ
vercel --prod
```

### 4. **デプロイ後の確認事項**

- [ ] Safari iOS実機での動作確認
- [ ] 長文の読み上げテスト（15秒以上）
- [ ] 自動再生の動作確認
- [ ] 音声選択UIの動作確認

---

## 🔒 セキュリティとプライバシー

### ✅ Web Speech APIの安全性

1. **ブラウザサイド実行**: すべての処理がブラウザ内で完結
2. **データ送信なし**: テキストがサーバーに送信されない（プライバシー保護）
3. **APIキー不要**: 認証情報の管理不要
4. **サンドボックス環境**: ブラウザのセキュリティモデル内で動作

### ⚠️ VoiceVox/ElevenLabsとの比較

| 項目 | System Voice | VoiceVox | ElevenLabs |
|-----|-------------|----------|------------|
| データ送信 | なし | サーバーに送信 | クラウドに送信 |
| プライバシー | ◎ 最高 | △ 中程度 | △ 中程度 |
| APIキー | 不要 | 不要 | 必要 |
| コスト | 無料 | サーバー運用費 | 従量課金 |

---

## 📚 参考資料

### 公式ドキュメント

- [MDN: Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [MDN: SpeechSynthesis](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis)
- [Safari Web Speech API Support](https://webkit.org/blog/7956/html5-speech-recognition/)

### ブラウザ互換性

- [Can I Use: Speech Synthesis](https://caniuse.com/speech-synthesis)
- [Safari Technology Preview](https://developer.apple.com/safari/technology-preview/)

---

## 🎯 まとめ

### ✅ 本番環境で既に動作可能

AI Chat V3は**既にWeb Speech APIによる音声読み上げをサポート**しており、`system`プロバイダーを選択することで**本番環境（Vercel）でも追加コストなしで音声読み上げが利用可能**です。

### 🚀 推奨アクション

1. **即座に利用可能**: 設定画面で`system`プロバイダーを選択
2. **Safari最適化**: Phase 1の実装（長文分割、音声選択UI）を追加
3. **段階的な品質向上**: 必要に応じてPhase 2, 3の機能を追加

### 💡 コスト比較

- **System Voice（Web Speech API）**: 無料、本番環境で即利用可能
- **VoiceVox**: 外部サーバー必要（VPS月額1,000円〜）
- **ElevenLabs**: 従量課金（1,000文字あたり$0.30〜）

**結論**: 本番環境では`system`プロバイダー（Web Speech API）の使用を推奨します。
