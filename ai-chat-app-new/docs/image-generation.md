# 画像生成機能

## 概要
AI Chat V3にStable Diffusion APIと連携した文脈認識型画像生成機能を実装しました。この機能は、チャットの状況やトラッカーの状態を正確に反映した画像を生成します。

## 主な特徴

### 1. コンテキスト認識
- チャットメッセージから現在のシーン（戦闘、拘束、感情など）を分析
- トラッカーの状態（拘束レベル、感情状態、バフ・デバフ）を画像に反映
- キャラクターの外見情報と状況を適切に組み合わせ

### 2. 優先度システム
- **Critical**: 拘束状態、戦闘中など最優先の状態
- **High**: 現在のアクションと感情
- **Medium**: キャラクター特徴
- **Low**: 環境と基本設定

### 3. 矛盾解決
- 状況に応じて矛盾する要素を自動的に解決
- 例：拘束状態なら「自由な動き」は除外

## セットアップ

### 1. Stable Diffusion WebUIの準備
```bash
# Stable Diffusion WebUIを起動（API有効化）
python launch.py --api --listen
```

### 2. 環境変数の設定
`.env.local`ファイルを作成：
```env
NEXT_PUBLIC_SD_API_URL=http://localhost:7860
```

## 使用方法

### チャットから画像生成
1. キャラクターとの会話中、アシスタントメッセージにホバー
2. メッセージメニューの紫色の画像アイコンをクリック
3. 現在のシーンを反映した画像が自動生成されメッセージに追加

## アーキテクチャ

### コンポーネント構成

```
src/
├── services/image-generation/
│   ├── sd-image-generator.ts      # メインサービス
│   ├── context-analyzer.ts        # チャット文脈分析
│   └── tracker-prompt-mapper.ts   # トラッカー→プロンプト変換
├── hooks/
│   └── useImageGeneration.ts      # UI層用フック
└── components/chat/
    └── MessageBubble.tsx           # 画像生成ボタンUI
```

### データフロー

```
1. ユーザーが画像生成ボタンをクリック
   ↓
2. 現在のセッション情報を取得
   - キャラクター情報
   - チャットメッセージ履歴
   - トラッカー状態
   ↓
3. コンテキスト分析
   - ContextAnalyzer: メッセージから状況を抽出
   - TrackerPromptMapper: トラッカーをプロンプトに変換
   ↓
4. プロンプト構築
   - 優先度付きで要素を統合
   - 矛盾を解決
   ↓
5. SD API呼び出し
   - txt2img エンドポイント
   - Base64画像を取得
   ↓
6. 画像をメッセージとして表示
```

## トラッカー対応

### 実装済みトラッカー

#### 拘束状態 (restraint_status)
- 自由 → "free movement, relaxed pose"
- 手首拘束 → "hands tied, wrists bound"
- 全身拘束 → "fully tied up, rope bondage"
- 完全拘束 → "completely restrained, blindfolded, gagged"

#### 戦闘状態 (combat_state)
- 非戦闘 → "peaceful, calm"
- 戦闘中 → "fighting pose, battle stance"
- 勝利 → "victorious pose, triumphant"
- 敗北 → "defeated, on the ground"

#### 感情状態 (emotion_state)
- 通常 → "neutral expression"
- 興奮 → "excited expression, flushed face"
- 恐怖 → "scared expression, trembling"
- 怒り → "angry expression, fierce eyes"

#### 数値型トラッカー (arousal_level等)
- 0-30: Low状態のプロンプト
- 31-70: Medium状態のプロンプト
- 71-100: High状態のプロンプト

## トラブルシューティング

### 画像が生成されない
1. Stable Diffusion WebUIが起動しているか確認
2. APIが有効になっているか確認（--apiフラグ）
3. ポート7860が使用可能か確認

### エラーメッセージ
- "SD API Error": Stable Diffusion APIに接続できない
- "キャラクターが選択されていません": キャラクターを選択してから実行
- "セッションが見つかりません": 会話を開始してから実行

## 今後の拡張予定
- [ ] カスタムプロンプト入力機能
- [ ] 生成パラメータの調整UI
- [ ] モデル切り替え機能
- [ ] 生成履歴の保存
- [ ] バッチ生成対応