# VOICEVOX公式のDocker Hubイメージを使用
FROM voicevox/voicevox_engine:cpu-ubuntu20.04-latest

# 必要なパッケージのインストール
RUN apt-get update && apt-get install -y \
    curl \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

# 環境変数の設定
ENV PORT=50021
ENV HOST=0.0.0.0

# ポートを公開
EXPOSE $PORT

# Railway用の起動スクリプトを作成
COPY <<EOF /start.sh
#!/bin/bash
echo "Starting VOICEVOX Engine on \$HOST:\$PORT"
echo "Checking if port is set: \$PORT"
if [ -z "\$PORT" ]; then
    echo "PORT not set, using default 50021"
    export PORT=50021
fi
echo "Final command: ./run --host \$HOST --port \$PORT"
exec ./run --host "\$HOST" --port "\$PORT"
EOF

RUN chmod +x /start.sh

# ヘルスチェック（より簡単な手法でチェック）
HEALTHCHECK --interval=30s --timeout=10s --start-period=300s --retries=3 \
    CMD nc -z localhost 50021 || exit 1

# 起動コマンド
CMD ["/start.sh"]
