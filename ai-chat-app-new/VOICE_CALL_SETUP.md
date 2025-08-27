# 音声通話機能セットアップガイド

## 🎤 実装完了内容

### 1. サーバー側
- ✅ WebSocketサーバー（port 8082）実装済み
- ✅ 音声データの送受信処理
- ✅ VAD（Voice Activity Detection）による音声区間検出
- ✅ 音声認識・応答生成・音声合成のパイプライン
- ✅ VOICEVOX/ElevenLabsとの連携

### 2. クライアント側
- ✅ VoiceCallModalコンポーネント実装
- ✅ マイク入力の取得とストリーミング
- ✅ 音声データの受信と再生機能
- ✅ WebSocket接続管理
- ✅ リアルタイムビジュアライザー
- ✅ チャットヘッダーに通話ボタン追加

## 🚀 使用方法

### 1. 音声サーバーの起動

```bash
# 方法1: コマンドラインから
node voice-server.js

# 方法2: バッチファイルを使用（Windows）
start-voice-server.bat
```

サーバーが正常に起動すると以下のメッセージが表示されます：
```
🎤 Voice Server listening on port 8082
🔊 VOICEVOX endpoint: http://localhost:50021
💾 Cache size limit: 200
```

### 2. Next.jsアプリケーションの起動

```bash
npm run dev
```

### 3. 音声通話の開始

1. チャットヘッダーの電話アイコン🔊をクリック
2. モーダルが開いたら緑の通話ボタンをクリック
3. ブラウザがマイクへのアクセス許可を求めるので「許可」をクリック
4. 話し始めると自動的に音声認識が開始されます

## ⚙️ 必要な設定

### 環境変数（.env.local）

```env
# AI API設定（いずれか必須）
OPENAI_API_KEY=sk-xxxxx  # OpenAI Whisper & GPT
NEXT_PUBLIC_GEMINI_API_KEY=xxxxx  # Google Gemini

# 音声合成（オプション）
ELEVENLABS_API_KEY=xxxxx  # ElevenLabs API
```

### VOICEVOXの設定（オプション）

日本語音声合成を使用する場合：

1. [VOICEVOX](https://voicevox.hiroshiba.jp/)をダウンロード
2. VOICEVOXエンジンを起動（デフォルトでport 50021）
3. サーバーが自動的に検出します

## 🔧 トラブルシューティング

### 問題: WebSocket接続エラー

**症状**: 「サーバーに接続されていません」というメッセージ

**解決方法**:
1. 音声サーバーが起動しているか確認
2. ポート8082が使用可能か確認
3. ブラウザのコンソールでエラーを確認

### 問題: マイクが認識されない

**症状**: 「マイクへのアクセスが必要です」というメッセージ

**解決方法**:
1. HTTPSまたはlocalhostでアクセスしているか確認
2. ブラウザの設定でマイクアクセスが許可されているか確認
3. 他のアプリケーションがマイクを使用していないか確認

### 問題: 音声が聞こえない

**症状**: AIの応答テキストは表示されるが音声が再生されない

**解決方法**:
1. スピーカーボタンがONになっているか確認
2. ブラウザの音量設定を確認
3. VOICEVOXが起動しているか確認（日本語音声の場合）

### 問題: 音声認識が動作しない

**症状**: 話しても認識されない

**解決方法**:
1. APIキー（OpenAI/Gemini）が設定されているか確認
2. マイクの音量が適切か確認
3. 500ms以上の無音で発話終了と判定されるので、短く区切って話す

## 📝 現在の制限事項

1. **API依存**: 音声認識にはOpenAI WhisperまたはGemini APIが必要
2. **音声合成**: VOICEVOXまたはElevenLabsが必要（なくてもテキスト応答は可能）
3. **ブラウザサポート**: Chrome/Edge推奨（SafariやFirefoxは一部機能制限あり）
4. **レイテンシー**: ネットワークとAPIの処理時間により1-3秒の遅延あり

## 🔄 今後の改善点

- [ ] WebRTC P2P通信の実装（低レイテンシー化）
- [ ] リアルタイムストリーミング音声認識
- [ ] 複数言語対応
- [ ] グループ通話機能
- [ ] 音声コマンド機能
- [ ] オフライン音声認識（Web Speech API）

## 🆘 サポート

問題が解決しない場合は、以下の情報と共にissueを作成してください：

1. ブラウザとOSの情報
2. コンソールのエラーメッセージ
3. 音声サーバーのログ
4. 実行した手順

## 📚 関連ドキュメント

- [WebSocket API仕様](./src/types/websocket/voice-call.types.ts)
- [音声サーバー実装](./voice-server.js)
- [VoiceCallModalコンポーネント](./src/components/voice/VoiceCallModal.tsx)