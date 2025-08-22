# 🚀 AI Chat V3 音声通話機能 デプロイガイド

## 📋 概要

このガイドでは、GPU VPS + VOICEVOX を使用した高性能音声通話システムの完全なデプロイ手順を説明します。

### システム構成
```
Next.js App (Railway) ←→ GPU VPS (Voice Server + VOICEVOX)
                         ↓
                    ElevenLabs (フォールバック)
```

## 🎯 ステップ1: GPU VPS申し込み

### 推奨プロバイダー: Contabo
1. [Contabo GPU VPS](https://contabo.com/en/gpu-vps/) にアクセス
2. **GPU M プラン**を選択
   - GPU: RTX 4060 (8GB)
   - RAM: 32GB
   - CPU: 8 vCPU
   - Storage: 500GB SSD
   - 月額: $39.99

3. 設定
   - OS: **Ubuntu 22.04 LTS**
   - データセンター: **Singapore** (日本向け)
   - 支払い方法設定

4. 申し込み完了後、SSH接続情報を受け取る

## 🔧 ステップ2: VPS初期設定

### SSH接続
```bash
ssh root@YOUR_VPS_IP
```

### システム更新とDocker導入
```bash
# システム更新
apt update && apt upgrade -y
apt install -y curl wget git htop nano

# Docker インストール
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# NVIDIA Container Toolkit
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/$distribution/libnvidia-container.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

apt update
apt install -y nvidia-container-toolkit
systemctl restart docker

# GPU動作確認
nvidia-smi
```

## 🎤 ステップ3: VOICEVOX デプロイ

### NVIDIA GPU版 VOICEVOX起動
```bash
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

# ファイルサイズ確認（正常なら数KB以上）
ls -la test.wav
```

## 🌐 ステップ4: 音声サーバー構築

### Node.js インストール
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
```

### 音声サーバーセットアップ
```bash
# サーバーディレクトリ作成
mkdir -p /opt/voice-server
cd /opt/voice-server

# ファイルアップロード
# voice-server.js を /opt/voice-server/ にアップロード
# package.json を作成
cat > package.json << 'EOF'
{
  "name": "ai-chat-voice-server",
  "version": "1.0.0",
  "description": "Voice server for AI Chat V3",
  "main": "voice-server.js",
  "scripts": {
    "start": "node voice-server.js",
    "dev": "nodemon voice-server.js"
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
EOF

# 依存関係インストール
npm install
```

### 環境変数設定
```bash
cat > .env << 'EOF'
VOICEVOX_ENGINE_URL=http://localhost:50021
OPENAI_API_KEY=your_openai_api_key_here
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
PORT=8080
HTTPS_PORT=8443
NODE_ENV=production
EOF
```

## 🔐 ステップ5: SSL証明書とドメイン設定

### ドメイン設定
1. ドメインプロバイダーでAレコード設定
   - `voice.your-domain.com` → `YOUR_VPS_IP`

### Let's Encrypt SSL証明書
```bash
# Certbot インストール
apt install -y certbot

# SSL証明書取得
certbot certonly --standalone -d voice.your-domain.com

# 証明書パス更新（voice-server.js内）
sed -i 's/your-domain.com/voice.your-domain.com/g' /opt/voice-server/voice-server.js
```

### Nginx リバースプロキシ（オプション）
```bash
apt install -y nginx

cat > /etc/nginx/sites-available/voice-server << 'EOF'
server {
    listen 80;
    server_name voice.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name voice.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/voice.your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/voice.your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

ln -s /etc/nginx/sites-available/voice-server /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

## 🔄 ステップ6: サービス自動起動設定

### systemd サービス作成
```bash
cat > /etc/systemd/system/voice-server.service << 'EOF'
[Unit]
Description=AI Chat Voice Server
After=network.target docker.service
Wants=docker.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/voice-server
ExecStart=/usr/bin/node voice-server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# サービス有効化と開始
systemctl enable voice-server
systemctl start voice-server
systemctl status voice-server
```

### ファイアウォール設定
```bash
ufw allow 22      # SSH
ufw allow 80      # HTTP
ufw allow 443     # HTTPS
ufw allow 8080    # Voice Server HTTP
ufw allow 8443    # Voice Server HTTPS
ufw --force enable
```

## 🚀 ステップ7: Railway アプリケーション設定

### 環境変数設定（Railway Dashboard）
```env
NEXT_PUBLIC_VOICE_SERVER_URL=wss://voice.your-domain.com:8443
NEXT_PUBLIC_VOICE_SERVER_HTTP=https://voice.your-domain.com:8443
OPENAI_API_KEY=your_openai_api_key_here
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
```

### package.json依存関係確認
```json
{
  "dependencies": {
    "ws": "^8.16.0"
  }
}
```

## 🧪 ステップ8: テストと動作確認

### VPS側テスト
```bash
# VOICEVOX動作確認
curl http://localhost:50021/version

# 音声サーバー動作確認
curl http://localhost:8080/health

# WebSocket接続テスト
curl -i -N \
     -H "Connection: Upgrade" \
     -H "Upgrade: websocket" \
     -H "Sec-WebSocket-Key: SGVsbG8sIHdvcmxkIQ==" \
     -H "Sec-WebSocket-Version: 13" \
     http://localhost:8080/
```

### ローカル環境テスト
```bash
# Railway アプリをローカルで起動
npm run dev

# ブラウザで音声通話ボタンをクリック
# コンソールで接続ログを確認
```

## 📊 ステップ9: モニタリングと運用

### ログ監視
```bash
# システムログ
journalctl -f -u voice-server

# Docker ログ
docker logs -f voicevox-engine

# リアルタイムモニタリング
htop
nvidia-smi -l 1
```

### パフォーマンス監視スクリプト
```bash
cat > /opt/monitor.sh << 'EOF'
#!/bin/bash
echo "=== システム状況 ==="
echo "CPU使用率: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')"
echo "メモリ使用率: $(free | grep Mem | awk '{printf("%.1f%%", $3/$2 * 100.0)}')"
echo "GPU使用率: $(nvidia-smi --query-gpu=utilization.gpu --format=csv,noheader,nounits)"
echo "GPU温度: $(nvidia-smi --query-gpu=temperature.gpu --format=csv,noheader,nounits)°C"
echo "GPU メモリ: $(nvidia-smi --query-gpu=memory.used,memory.total --format=csv,noheader,nounits)"
echo "アクティブセッション: $(curl -s http://localhost:8080/health | jq -r '.sessions')"
echo "音声キャッシュ: $(curl -s http://localhost:8080/health | jq -r '.cache')"
EOF

chmod +x /opt/monitor.sh
```

### 自動バックアップ設定
```bash
cat > /opt/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups"
mkdir -p $BACKUP_DIR

# 設定ファイルバックアップ
tar -czf $BACKUP_DIR/voice-server-$DATE.tar.gz /opt/voice-server

# SSL証明書バックアップ
tar -czf $BACKUP_DIR/ssl-certs-$DATE.tar.gz /etc/letsencrypt

# 古いバックアップ削除（7日以上前）
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

chmod +x /opt/backup.sh

# crontab 設定
crontab -e
# 毎日午前3時にバックアップ
# 0 3 * * * /opt/backup.sh >> /var/log/backup.log 2>&1
```

## 🔧 トラブルシューティング

### よくある問題と解決方法

#### 1. GPU認識しない
```bash
# NVIDIA ドライバー確認
nvidia-smi

# Docker GPU 設定確認
docker run --rm --gpus all nvidia/cuda:11.0-base nvidia-smi
```

#### 2. VOICEVOX接続エラー
```bash
# コンテナ状態確認
docker ps
docker logs voicevox-engine

# ポート確認
netstat -tlnp | grep :50021
```

#### 3. WebSocket接続失敗
```bash
# ファイアウォール確認
ufw status

# 音声サーバーログ確認
journalctl -f -u voice-server
```

#### 4. SSL証明書エラー
```bash
# 証明書更新
certbot renew

# 証明書確認
openssl x509 -in /etc/letsencrypt/live/voice.your-domain.com/cert.pem -text -noout
```

### パフォーマンス最適化

#### GPU メモリ最適化
```bash
# VOICEVOX設定調整
docker restart voicevox-engine

# GPU メモリクリア
nvidia-smi --gpu-reset
```

#### ネットワーク最適化
```bash
# TCP設定調整
echo 'net.core.rmem_max = 16777216' >> /etc/sysctl.conf
echo 'net.core.wmem_max = 16777216' >> /etc/sysctl.conf
sysctl -p
```

## 🎉 完了確認

✅ すべてのステップが完了したら：

1. **VPS側**: `curl http://localhost:8080/health`
2. **Railway側**: 音声通話ボタンをクリック
3. **ブラウザ**: マイク許可後、音声認識・合成が動作することを確認

### 期待される結果
- **遅延**: 500ms以下
- **音声品質**: 高品質（VOICEVOX）
- **安定性**: ElevenLabsフォールバック付き
- **同時接続**: 10+ セッション対応

---

## 🚀 次のステップ

- **スケーリング**: 複数VPSでの負荷分散
- **CDN連携**: 音声ファイルの高速配信
- **監視強化**: Prometheus + Grafana
- **機能拡張**: 多言語対応、感情認識

おつかれさまでした！🎊