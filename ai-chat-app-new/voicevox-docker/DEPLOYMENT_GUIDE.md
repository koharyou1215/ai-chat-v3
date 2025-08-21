# 🚀 VoiceVoxエンジン クラウドデプロイガイド

## 📋 概要
このガイドでは、VoiceVoxエンジンをクラウドにデプロイして、本番環境で高速音声合成を実現する手順を説明します。

## 🎯 デプロイ先の選択

### 1. **Railway** (推奨)
- ✅ 無料枠あり
- ✅ 簡単デプロイ
- ✅ 高速起動
- ✅ 自動スケーリング

### 2. **Render**
- ✅ 無料枠あり
- ✅ 安定性高い
- ✅ 自動デプロイ
- ✅ カスタムドメイン対応

### 3. **Heroku**
- ✅ 有料だが安定
- ✅ 簡単デプロイ
- ✅ スケーラブル
- ✅ アドオン豊富

## 🚀 Railwayへのデプロイ手順

### ステップ1: Railwayアカウント作成
1. [Railway](https://railway.app/) にアクセス
2. GitHubアカウントでログイン
3. 新しいプロジェクトを作成

### ステップ2: GitHubリポジトリにプッシュ
```bash
# voicevox-dockerディレクトリをGitリポジトリとして初期化
cd voicevox-docker
git init
git add .
git commit -m "Initial commit: VoiceVox Docker setup"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/voicevox-docker.git
git push -u origin main
```

### ステップ3: Railwayでデプロイ
1. Railwayダッシュボードで「New Project」をクリック
2. 「Deploy from GitHub repo」を選択
3. 作成したリポジトリを選択
4. 自動デプロイが開始される

### ステップ4: 環境変数の設定
Railwayダッシュボードで以下を設定：
- `PORT`: 50021
- `NODE_ENV`: production

## 🌐 Renderへのデプロイ手順

### ステップ1: Renderアカウント作成
1. [Render](https://render.com/) にアクセス
2. GitHubアカウントでログイン
3. 新しいWeb Serviceを作成

### ステップ2: サービス設定
- **Name**: voicevox-engine
- **Environment**: Docker
- **Region**: 東京（Tokyo）
- **Branch**: main
- **Root Directory**: voicevox-docker

### ステップ3: 環境変数設定
- `PORT`: 50021

## 🔧 本番環境の設定更新

### ステップ1: 環境変数の更新
デプロイが完了したら、本番環境の環境変数を更新：

```bash
# Vercelの場合
VOICEVOX_ENGINE_URL=https://your-voicevox-app.railway.app
# または
VOICEVOX_ENGINE_URL=https://your-voicevox-app.onrender.com
```

### ステップ2: APIルートの確認
`/api/voice/voicevox/check` エンドポイントで接続テスト：

```bash
curl https://your-app.vercel.app/api/voice/voicevox/check
```

## 🧪 テスト手順

### 1. 接続テスト
```bash
curl https://your-voicevox-app.railway.app/version
```

### 2. 音声合成テスト
```bash
curl -X POST https://your-voicevox-app.railway.app/audio_query \
  -H "Content-Type: application/json" \
  -d '{"text":"こんにちは","speaker":1}'
```

## 📊 パフォーマンス比較

| サービス | 速度 | 品質 | コスト | 安定性 |
|---------|------|------|--------|--------|
| **ElevenLabs** | 3-10秒 | ⭐⭐⭐⭐⭐ | 高 | ⭐⭐⭐ |
| **Azure Speech** | 1-2秒 | ⭐⭐⭐⭐ | 中 | ⭐⭐⭐⭐⭐ |
| **VoiceVox(ローカル)** | 0.5-1秒 | ⭐⭐⭐⭐⭐ | 低 | ⭐⭐⭐ |
| **VoiceVox(クラウド)** | 1-2秒 | ⭐⭐⭐⭐⭐ | 中 | ⭐⭐⭐⭐ |

## 🚨 トラブルシューティング

### よくある問題と解決方法

#### 1. デプロイ失敗
- **原因**: Dockerビルドエラー
- **解決**: Dockerfileの構文確認、依存関係の確認

#### 2. 起動失敗
- **原因**: ポート設定の問題
- **解決**: 環境変数`PORT`の確認

#### 3. 音声合成エラー
- **原因**: モデルファイルの不足
- **解決**: 初回起動時のダウンロード完了を確認

## 🎉 完了後の確認事項

1. ✅ クラウド上のVoiceVoxエンジンが起動している
2. ✅ 本番環境から接続できる
3. ✅ 音声合成が正常に動作する
4. ✅ 環境変数が正しく設定されている

## 📞 サポート

問題が発生した場合は：
1. Railway/Renderのログを確認
2. ヘルスチェックの結果を確認
3. 環境変数の設定を確認
4. 必要に応じて再デプロイ

---

**注意**: 初回デプロイ時は、VoiceVoxエンジンの起動に5-10分かかる場合があります。
