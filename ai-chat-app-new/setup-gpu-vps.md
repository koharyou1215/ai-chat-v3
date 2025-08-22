# GPU VPS + VOICEVOX セットアップガイド

## 🚀 ステップ1: GPU VPS選択と申し込み

### 推奨プロバイダー: Contabo
- **URL**: https://contabo.com/en/gpu-vps/
- **プラン**: GPU M (RTX 4060, 8GB GPU RAM)
- **仕様**: 32GB RAM, 8 vCPU, 500GB SSD
- **月額**: $39.99

### 申し込み手順
1. Contabo アカウント作成
2. GPU VPS M プランを選択
3. OS: Ubuntu 22.04 LTS
4. データセンター: 最寄りの場所（日本なら Singapore）
5. 支払い設定

## 🔧 ステップ2: VPS初期設定

### SSH接続
```bash
ssh root@YOUR_VPS_IP
```

### システム更新
```bash
apt update && apt upgrade -y
apt install -y curl wget git htop nano
```

### Docker インストール
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
```

### NVIDIA Container Toolkit インストール
```bash
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/$distribution/libnvidia-container.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

apt update
apt install -y nvidia-container-toolkit
systemctl restart docker
```

## 🎤 ステップ3: VOICEVOX デプロイ

### VOICEVOX Engine 起動
```bash
# NVIDIA GPU版 VOICEVOX
docker run -d \
  --name voicevox-engine \
  --gpus all \
  --restart unless-stopped \
  -p 50021:50021 \
  -e VV_CPU_NUM_THREADS=4 \
  -e VV_ENABLE_CANCELLABLE_SYNTHESIS=true \
  voicevox/voicevox_engine:nvidia-ubuntu20.04-latest
```

### 動作確認
```bash
# ヘルスチェック
curl http://localhost:50021/version

# 音声合成テスト
curl -X POST "http://localhost:50021/audio_query?text=こんにちは&speaker=1" \
  -H "Content-Type: application/json" \
  -o query.json

curl -X POST "http://localhost:50021/synthesis?speaker=1" \
  -H "Content-Type: application/json" \
  -d @query.json \
  --output test.wav
```

## 🌐 ステップ4: 音声サーバー構築

### Node.js インストール
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
```

### 音声サーバーディレクトリ作成
```bash
mkdir -p /opt/voice-server
cd /opt/voice-server
```

### package.json 作成
```json
{
  "name": "ai-chat-voice-server",
  "version": "1.0.0",
  "description": "Voice server for AI Chat V3",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "ws": "^8.16.0",
    "express": "^4.18.2",
    "node-vad": "^1.1.4",
    "openai": "^4.28.0",
    "axios": "^1.6.7",
    "uuid": "^9.0.1",
    "cors": "^2.8.5"
  }
}
```

### 依存関係インストール
```bash
npm install
```

## 🔐 ステップ5: セキュリティ設定

### ファイアウォール設定
```bash
ufw allow 22      # SSH
ufw allow 50021   # VOICEVOX
ufw allow 8080    # WebSocket
ufw allow 443     # HTTPS
ufw --force enable
```

### SSL証明書 (Let's Encrypt)
```bash
apt install -y certbot
certbot certonly --standalone -d your-domain.com
```

### Nginx リバースプロキシ
```bash
apt install -y nginx

# Nginx設定は後で追加
```

## 📊 ステップ6: モニタリング設定

### システムモニタリング
```bash
# GPU使用率監視
watch -n 1 nvidia-smi

# メモリ・CPU監視
htop
```

### ログ監視
```bash
# Docker ログ
docker logs -f voicevox-engine

# 音声サーバーログ
tail -f /opt/voice-server/voice-server.log
```

## 🔄 ステップ7: 自動起動設定

### systemd サービス作成
```bash
cat > /etc/systemd/system/voice-server.service << EOF
[Unit]
Description=AI Chat Voice Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/voice-server
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

systemctl enable voice-server
systemctl start voice-server
```

## 💾 ステップ8: バックアップ設定

### 自動バックアップスクリプト
```bash
#!/bin/bash
# /opt/backup-voice-server.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups"
mkdir -p $BACKUP_DIR

# 設定ファイルのバックアップ
tar -czf $BACKUP_DIR/voice-server-$DATE.tar.gz /opt/voice-server

# 古いバックアップの削除（7日以上前）
find $BACKUP_DIR -name "voice-server-*.tar.gz" -mtime +7 -delete
```

### crontab 設定
```bash
crontab -e
# 毎日午前3時にバックアップ
0 3 * * * /opt/backup-voice-server.sh
```

## 🧪 ステップ9: 負荷テスト

### 同時接続テスト
```bash
# Apache Bench でテスト
apt install -y apache2-utils

# VOICEVOX API負荷テスト
ab -n 100 -c 10 http://localhost:50021/version
```

### パフォーマンス最適化
```bash
# GPU メモリ使用量監視
nvidia-smi -l 1

# CPU 使用率監視
top -p $(pgrep node)
```

## 📈 ステップ10: スケーリング準備

### マルチインスタンス対応
- Redis での音声キャッシュ共有
- ロードバランサー設定
- 複数VPSでの分散処理

### CDN連携
- 音声ファイルのCDN配信
- 静的アセットの最適化

---

## 🚨 トラブルシューティング

### よくある問題
1. **GPU認識しない** → NVIDIA ドライバー再インストール
2. **メモリ不足** → swap ファイル作成
3. **ネットワーク遅延** → 最寄りリージョン選択
4. **音声品質低下** → サンプリングレート調整

### 緊急時対応
```bash
# 全サービス再起動
systemctl restart voice-server
docker restart voicevox-engine
```

### パフォーマンス監視コマンド
```bash
# GPU使用率
nvidia-smi

# メモリ使用量
free -h

# ディスク使用量
df -h

# ネットワーク統計
netstat -tuln
```