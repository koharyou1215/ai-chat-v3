#!/bin/bash

echo "🚀 VoiceVoxエンジン クラウドデプロイスクリプト"
echo "================================================"

# Railway CLIのインストール確認
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLIがインストールされていません"
    echo "📥 インストール中..."
    npm install -g @railway/cli
fi

# ログイン確認
if ! railway whoami &> /dev/null; then
    echo "🔐 Railwayにログインしてください"
    railway login
fi

# プロジェクト作成
echo "🏗️ 新しいRailwayプロジェクトを作成中..."
railway init --name voicevox-engine

# デプロイ
echo "🚀 デプロイを開始中..."
railway up

echo "✅ デプロイ完了！"
echo "🌐 以下のURLでアクセスできます："
railway status

echo ""
echo "🔧 次のステップ："
echo "1. Vercelの環境変数を更新"
echo "2. VOICEVOX_ENGINE_URLを新しいURLに設定"
echo "3. 接続テストを実行"
