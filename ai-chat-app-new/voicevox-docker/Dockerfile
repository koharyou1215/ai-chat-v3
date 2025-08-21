# VOICEVOX公式のDocker Hubイメージを使用
FROM voicevox/voicevox_engine:cpu-ubuntu20.04-latest

# 必要なパッケージのインストール
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 環境変数の設定
ENV PORT=50021
ENV HOST=0.0.0.0

# ポートを公開
EXPOSE $PORT

# Railway用の起動スクリプトを作成
RUN echo '#!/bin/bash\n\
echo "Starting VOICEVOX Engine on $HOST:$PORT"\n\
echo "Checking if port is set: $PORT"\n\
if [ -z "$PORT" ]; then\n\
    echo "PORT not set, using default 50021"\n\
    export PORT=50021\n\
fi\n\
echo "Final command: ./run --host $HOST --port $PORT"\n\
exec ./run --host "$HOST" --port "$PORT"' > /start.sh \
    && chmod +x /start.sh

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=30s --start-period=120s --retries=5 \
    CMD curl -f http://localhost:$PORT/version || exit 1

# 起動コマンド
CMD ["/start.sh"]
