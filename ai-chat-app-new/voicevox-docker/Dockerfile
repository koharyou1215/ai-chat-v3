# VoiceVox Engine Dockerfile
FROM python:3.9-slim

# 必要なパッケージをインストール
RUN apt-get update && apt-get install -y \
    wget \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# 作業ディレクトリを設定
WORKDIR /app

# VoiceVoxエンジンをダウンロード（最新版）
RUN wget -O voicevox.zip "https://github.com/VOICEVOX/voicevox_engine/releases/latest/download/voicevox_engine_linux-x64.zip" \
    && unzip voicevox.zip \
    && rm voicevox.zip \
    && chmod +x voicevox_engine_linux-x64/run

# ポート50021を公開
EXPOSE 50021

# 起動コマンド
CMD ["./voicevox_engine_linux-x64/run", "--host", "0.0.0.0", "--port", "50021"]

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:50021/version || exit 1
