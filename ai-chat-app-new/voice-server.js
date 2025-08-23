/**
 * AI Chat V3 Voice Server
 * GPU VPS用 高性能音声通話サーバー
 */

const WebSocket = require('ws');
const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');
const axios = require('axios');
const VAD = require('node-vad'); // VADを有効化
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

class VoiceCallServer {
  constructor(options = {}) {
    this.port = options.port || 8080;
    this.httpsPort = options.httpsPort || 8443;
    this.voicevoxUrl = process.env.VOICEVOX_ENGINE_URL || 'http://localhost:50021';
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.geminiApiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    this.elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
    
    // Sessions管理
    this.sessions = new Map();
    this.audioCache = new Map();
    this.maxCacheSize = 200;
    
    // 音声設定
    this.sampleRate = 16000;
    this.frameDurationMs = 20;
    this.silenceThresholdMs = 1500; // 1.5秒に延長
    
    this.initializeServer();
  }

  initializeServer() {
    // Express アプリケーション
    this.app = express();
    this.app.use(cors());
    this.app.use(express.json());
    
    // ヘルスチェックエンドポイント
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        sessions: this.sessions.size,
        cache: this.audioCache.size
      });
    });
    
    // VOICEVOX ヘルスチェック
    this.app.get('/voicevox/health', async (req, res) => {
      try {
        const response = await axios.get(`${this.voicevoxUrl}/version`, {
          timeout: 5000
        });
        res.json({
          status: 'healthy',
          voicevox: response.data,
          endpoint: this.voicevoxUrl
        });
      } catch (error) {
        res.status(503).json({
          status: 'error',
          error: error.message,
          endpoint: this.voicevoxUrl
        });
      }
    });

    // HTTPサーバー作成
    this.server = http.createServer(this.app);
    
    // HTTPS サーバー（SSL証明書がある場合）
    this.setupHttpsServer();
    
    // WebSocketサーバー
    this.wss = new WebSocket.Server({ 
      server: this.server,
      perMessageDeflate: false,
      clientTracking: true
    });
    
    this.setupWebSocketHandlers();
    this.startServer();
  }

  setupHttpsServer() {
    try {
      // SSL証明書のパス（Let's Encryptの場合）
      const privateKey = fs.readFileSync('/etc/letsencrypt/live/your-domain.com/privkey.pem', 'utf8');
      const certificate = fs.readFileSync('/etc/letsencrypt/live/your-domain.com/cert.pem', 'utf8');
      const ca = fs.readFileSync('/etc/letsencrypt/live/your-domain.com/chain.pem', 'utf8');

      const credentials = {
        key: privateKey,
        cert: certificate,
        ca: ca
      };

      this.httpsServer = https.createServer(credentials, this.app);
      this.wssSecure = new WebSocket.Server({ 
        server: this.httpsServer,
        perMessageDeflate: false,
        clientTracking: true
      });
      
      // HTTPS WebSocket も同じハンドラーを使用
      this.setupWebSocketHandlers(this.wssSecure);
      
    } catch (error) {
      console.log('HTTPS server setup skipped (SSL certificates not found)');
    }
  }

  setupWebSocketHandlers(wss = this.wss) {
    wss.on('connection', (ws, req) => {
      const sessionId = uuidv4();
      const clientIp = req.socket.remoteAddress;
      
      console.log(`[${new Date().toISOString()}] New voice session: ${sessionId} from ${clientIp}`);
      
      // セッション初期化
      const session = {
        id: sessionId,
        ws,
        clientIp,
        audioBuffer: [],
        isProcessing: false,
        lastSpeechTime: 0,
        conversationHistory: [],
        vad: new VAD(VAD.Mode.AGGRESSIVE), // VAD初期化
        responseQueue: [],
        isPlayingResponse: false,
        startTime: Date.now(),
        stats: {
          messagesReceived: 0,
          audioProcessed: 0,
          errorsOccurred: 0
        }
      };
      
      this.sessions.set(sessionId, session);
      
      // 接続確立メッセージ
      this.sendMessage(ws, {
        type: 'session_start',
        sessionId,
        config: {
          sampleRate: this.sampleRate,
          frameSize: this.frameDurationMs,
          serverTime: Date.now()
        }
      });
      
      // メッセージハンドラー
      ws.on('message', async (data) => {
        session.stats.messagesReceived++;
        
        try {
          if (data instanceof Buffer) {
            // 音声データ処理
            await this.handleAudioData(sessionId, data);
          } else {
            // JSONメッセージ処理
            const message = JSON.parse(data.toString());
            await this.handleControlMessage(sessionId, message);
          }
        } catch (error) {
          console.error(`[${sessionId}] Message handling error:`, error);
          session.stats.errorsOccurred++;
        }
      });
      
      // 切断ハンドラー
      ws.on('close', (code, reason) => {
        const duration = Date.now() - session.startTime;
        console.log(`[${sessionId}] Session closed: ${code} ${reason} (duration: ${duration}ms)`);
        console.log(`[${sessionId}] Stats:`, session.stats);
        this.sessions.delete(sessionId);
      });
      
      // エラーハンドラー
      ws.on('error', (error) => {
        console.error(`[${sessionId}] WebSocket error:`, error);
        session.stats.errorsOccurred++;
        this.sessions.delete(sessionId);
      });
    });
  }

  async handleAudioData(sessionId, audioData) {
    const session = this.sessions.get(sessionId);
    if (!session || session.isProcessing) return;

    try {
      // 音声データの基本チェック
      if (!audioData || audioData.length === 0) {
        return;
      }

      // VADで音声区間検出
      const isSpeech = await this.detectSpeech(audioData, session.vad);
      const currentTime = Date.now();
      
      const chunk = {
        timestamp: currentTime,
        data: audioData,
        isSpeech
      };
      
      if (isSpeech) {
        // 音声検出時
        session.audioBuffer.push(chunk);
        session.lastSpeechTime = currentTime;
        
        this.sendMessage(session.ws, {
          type: 'voice_activity',
          status: 'speaking',
          timestamp: currentTime
        });
        
      } else if (
        session.lastSpeechTime > 0 && 
        currentTime - session.lastSpeechTime > 500 && // 500ms の無音で発話終了
        session.audioBuffer.length > 0 &&
        !session.isProcessing
      ) {
        // 発話終了検出
        session.isProcessing = true;
        
        this.sendMessage(session.ws, {
          type: 'voice_activity',
          status: 'processing',
          timestamp: currentTime
        });
        
        // 音声データを結合
        const completeAudio = Buffer.concat(
          session.audioBuffer.map(chunk => chunk.data)
        );
        
        console.log(`[${sessionId}] 🎤 Processing ${session.audioBuffer.length} audio chunks (${completeAudio.length} bytes)`);
        
        // バッファクリア
        session.audioBuffer = [];
        session.lastSpeechTime = 0;
        session.stats.audioProcessed++;
        
        // 非同期で音声処理開始
        setImmediate(() => this.processUtterance(sessionId, completeAudio));
      }
      
    } catch (error) {
      console.error(`[${sessionId}] Audio processing error:`, error);
      session.stats.errorsOccurred++;
    }
  }

  // VAD音声検出（安全版）
  async detectSpeech(audioData, vad) {
    return new Promise((resolve) => {
      if (!vad) {
        resolve(true); // VADが無効の場合は常に音声として扱う
        return;
      }

      try {
        // バッファサイズをチェックしてVADの処理に適したサイズに調整
        if (audioData.length < 32) {
          resolve(false); // データが小さすぎる場合は無音として扱う
          return;
        }

        // VADが期待するサイズ（16bitサンプル）に調整
        const expectedSize = Math.floor(audioData.length / 2) * 2;
        const adjustedBuffer = audioData.slice(0, expectedSize);

        vad.processAudio(adjustedBuffer, 16000, (err, res) => {
          if (err) {
            console.error('VAD error:', err);
            resolve(false); // エラー時は無音として扱う（音声処理を停止）
          } else {
            resolve(res === VAD.Event.VOICE);
          }
        });
      } catch (error) {
        console.error('VAD processing error:', error);
        resolve(false); // エラー時は無音として扱う
      }
    });
  }

  async handleControlMessage(sessionId, message) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    console.log(`[${sessionId}] Received control message:`, message.type);

    switch (message.type) {
      case 'ping':
        this.sendMessage(session.ws, {
          type: 'pong',
          timestamp: Date.now()
        });
        console.log(`[${sessionId}] Pong sent`);
        break;
        
      case 'test':
        this.sendMessage(session.ws, {
          type: 'test_response',
          message: 'Hello from voice server!',
          timestamp: Date.now()
        });
        console.log(`[${sessionId}] Test response sent`);
        break;
        
      case 'clear_history':
        session.conversationHistory = [];
        this.sendMessage(session.ws, {
          type: 'history_cleared',
          timestamp: Date.now()
        });
        break;
        
      case 'get_stats':
        this.sendMessage(session.ws, {
          type: 'stats',
          stats: session.stats,
          timestamp: Date.now()
        });
        break;
        
      case 'stop_audio':
        // 音声処理を即座に停止
        session.isProcessing = false;
        session.audioBuffer = [];
        console.log(`[${sessionId}] Audio processing stopped and buffers cleared`);
        
        this.sendMessage(session.ws, {
          type: 'audio_stopped',
          timestamp: Date.now()
        });
        break;
    }
  }

  async processUtterance(sessionId, audioData) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    try {
      // 1. 音声認識
      const text = await this.speechToText(audioData);
      
      if (!text || text.trim().length === 0) {
        session.isProcessing = false;
        return;
      }
      
      console.log(`[${sessionId}] 認識: "${text}"`);
      
      // 認識結果送信
      this.sendMessage(session.ws, {
        type: 'transcription',
        text,
        timestamp: Date.now()
      });
      
      // 2. 応答生成（ストリーミング）
      let fullResponse = '';
      let currentSentence = '';
      
      const responseStream = this.generateResponseStream(text, session);
      
      for await (const chunk of responseStream) {
        if (!chunk) continue;
        
        currentSentence += chunk;
        fullResponse += chunk;
        
        // 文区切りで音声合成
        if (this.isSentenceEnd(currentSentence)) {
          const sentence = currentSentence.trim();
          if (sentence) {
            // 音声合成を並列実行
            setImmediate(() => this.synthesizeAndSend(sessionId, sentence));
            currentSentence = '';
          }
        }
      }
      
      // 残りテキスト処理
      if (currentSentence.trim()) {
        await this.synthesizeAndSend(sessionId, currentSentence.trim());
      }
      
      // AI応答をクライアントに送信
      this.sendMessage(session.ws, {
        type: 'ai_response',
        text: fullResponse,
        timestamp: Date.now()
      });

      // 会話履歴更新
      session.conversationHistory.push(
        { role: 'user', content: text },
        { role: 'assistant', content: fullResponse }
      );
      
      // 履歴サイズ制限
      if (session.conversationHistory.length > 20) {
        session.conversationHistory = session.conversationHistory.slice(-20);
      }
      
    } catch (error) {
      console.error(`[${sessionId}] Processing error:`, error);
      session.stats.errorsOccurred++;
      
      this.sendMessage(session.ws, {
        type: 'error',
        message: 'Processing failed',
        timestamp: Date.now()
      });
      
    } finally {
      session.isProcessing = false;
    }
  }

  async speechToText(audioData) {
    // Gemini APIを優先して使用
    if (this.geminiApiKey && this.geminiApiKey !== 'YOUR_GEMINI_API_KEY_HERE') {
      return await this.speechToTextWithGemini(audioData);
    }
    
    // OpenAI Whisper APIを使用  
    if (this.openaiApiKey && this.openaiApiKey.startsWith('sk-')) {
      return await this.speechToTextWithWhisper(audioData);
    }
    
    // テスト用モック応答（一回だけ）
    console.log('🧪 APIキーが未設定のため、テスト応答を返します');
    return 'こんにちは、音声通話のテストです。';
  }

  async speechToTextWithGemini(audioData) {
    try {
      // Geminiでは現在音声ファイルの直接処理はできないため、
      // テスト用に固定応答を返す（一回だけ）
      console.log('🤖 Geminiを使用した音声処理をシミュレート');
      return 'Geminiによる音声認識テストです。';
    } catch (error) {
      console.error('Gemini Speech-to-Text Error:', error);
      return 'Gemini音声認識でエラーが発生しました。';
    }
  }

  async speechToTextWithWhisper(audioData) {

    try {
      const wavBuffer = this.addWavHeader(audioData);
      
      const formData = new FormData();
      formData.append('file', new Blob([wavBuffer], { type: 'audio/wav' }), 'audio.wav');
      formData.append('model', 'whisper-1');
      formData.append('language', 'ja');
      formData.append('prompt', '自然な日本語での会話です。');
      formData.append('temperature', '0.2');
      
      const response = await axios.post(
        'https://api.openai.com/v1/audio/transcriptions',
        formData,
        {
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            'Content-Type': 'multipart/form-data'
          },
          timeout: 10000
        }
      );
      
      return response.data.text || '';
      
    } catch (error) {
      console.error('STT Error:', error.message);
      return '';
    }
  }

  async* generateResponseStream(text, session) {
    // Gemini APIを優先して使用
    if (this.geminiApiKey && this.geminiApiKey !== 'YOUR_GEMINI_API_KEY_HERE') {
      yield* this.generateResponseWithGemini(text, session);
      return;
    }
    
    // OpenAI APIを使用
    if (this.openaiApiKey && this.openaiApiKey.startsWith('sk-')) {
      yield* this.generateResponseWithOpenAI(text, session);
      return;
    }
    
    // テスト用モック応答
    console.log('🧪 APIキーが未設定のため、テスト応答を返します');
    yield `了解しました。「${text}」ですね。音声合成のテストを行います。`;
  }

  async* generateResponseWithGemini(text, session) {
    try {
      console.log('🤖 Geminiで応答生成中...');
      
      // Gemini APIを使用した応答生成
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.geminiApiKey}`,
        {
          contents: [
            {
              parts: [
                {
                  text: `あなたは親切で自然な会話ができるAIアシスタントです。
音声通話での会話なので、簡潔で分かりやすい返答（1-2文程度）をしてください。

ユーザーの発言: "${text}"

自然な日本語で応答してください。`
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 100,
            topP: 0.95
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      const responseText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || 'すみません、うまく聞こえませんでした。';
      console.log(`🤖 Gemini応答: "${responseText}"`);
      yield responseText;
      
    } catch (error) {
      console.error('Gemini Generation Error:', error);
      yield 'すみません、少し調子が悪いようです。もう一度お話しください。';
    }
  }

  async* generateResponseWithOpenAI(text, session) {

    try {
      const messages = [
        {
          role: 'system',
          content: `あなたは親切で自然な会話ができるAIアシスタントです。
音声通話での会話なので、以下の点に注意してください：

- 簡潔で分かりやすい返答
- 自然な日本語での応答
- 適度な感情表現
- 長すぎない文章（1-2文程度）
- 会話のテンポを重視`
        },
        ...session.conversationHistory.slice(-10),
        { role: 'user', content: text }
      ];
      
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages,
          temperature: 0.8,
          max_tokens: 150,
          stream: true,
          presence_penalty: 0.6,
          frequency_penalty: 0.3
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            'Content-Type': 'application/json'
          },
          responseType: 'stream',
          timeout: 15000
        }
      );
      
      for await (const chunk of response.data) {
        const lines = chunk.toString().split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') return;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) yield content;
            } catch (e) {
              // JSON parse error, skip
            }
          }
        }
      }
      
    } catch (error) {
      console.error('Generation Error:', error.message);
      yield 'すみません、もう一度お聞かせください。';
    }
  }

  async synthesizeAndSend(sessionId, text) {
    const session = this.sessions.get(sessionId);
    if (!session || !text.trim()) return;

    try {
      // キャッシュチェック
      const cacheKey = `tts_${text.trim()}_voicevox`;
      let audioData = this.audioCache.get(cacheKey);
      
      if (!audioData) {
        try {
          // まずVOICEVOXで試行
          audioData = await this.synthesizeWithVoicevox(text);
          console.log(`[${sessionId}] TTS Success: VOICEVOX`);
        } catch (voicevoxError) {
          console.warn(`[${sessionId}] VOICEVOX failed, falling back to ElevenLabs:`, voicevoxError.message);
          
          // フォールバック: ElevenLabs
          try {
            audioData = await this.synthesizeWithElevenLabs(text);
            console.log(`[${sessionId}] TTS Success: ElevenLabs`);
          } catch (elevenLabsError) {
            console.error(`[${sessionId}] ElevenLabs also failed:`, elevenLabsError.message);
            throw new Error('All TTS services failed');
          }
        }
        
        // キャッシュ保存
        if (this.audioCache.size < this.maxCacheSize) {
          this.audioCache.set(cacheKey, audioData);
        } else {
          // 古いキャッシュを削除
          const firstKey = this.audioCache.keys().next().value;
          this.audioCache.delete(firstKey);
          this.audioCache.set(cacheKey, audioData);
        }
      }
      
      // 音声ストリーミング送信
      await this.streamAudioToClient(session, audioData);
      
    } catch (error) {
      console.error(`[${sessionId}] TTS Error:`, error.message);
      
      // 最終的なエラー通知
      this.sendMessage(session.ws, {
        type: 'tts_error',
        message: 'All audio synthesis services failed',
        text,
        timestamp: Date.now()
      });
    }
  }

  async synthesizeWithVoicevox(text) {
    try {
      // 1. 音声クエリ作成
      const queryResponse = await axios.post(
        `${this.voicevoxUrl}/audio_query`,
        null,
        {
          params: {
            text: text.trim(),
            speaker: 1
          },
          timeout: 5000
        }
      );
      
      const audioQuery = queryResponse.data;
      
      // 速度調整（少し早めに）
      audioQuery.speedScale = 1.15;
      audioQuery.intonationScale = 1.1;
      
      // 2. 音声合成
      const synthesisResponse = await axios.post(
        `${this.voicevoxUrl}/synthesis`,
        audioQuery,
        {
          params: { speaker: 1 },
          responseType: 'arraybuffer',
          timeout: 10000
        }
      );
      
      return Buffer.from(synthesisResponse.data);
      
    } catch (error) {
      console.error('VOICEVOX Error:', error.message);
      throw error;
    }
  }

  async synthesizeWithElevenLabs(text) {
    if (!this.elevenLabsApiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    try {
      const response = await axios.post(
        'https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM',
        {
          text: text.trim(),
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true
          }
        },
        {
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': this.elevenLabsApiKey
          },
          responseType: 'arraybuffer',
          timeout: 15000
        }
      );
      
      return Buffer.from(response.data);
      
    } catch (error) {
      console.error('ElevenLabs Error:', error.message);
      throw error;
    }
  }

  async streamAudioToClient(session, audioData) {
    const chunkSize = 2048;
    const chunkDelay = 8; // ms
    
    // 音声開始通知
    this.sendMessage(session.ws, {
      type: 'audio_start',
      size: audioData.length,
      timestamp: Date.now()
    });
    
    // チャンク送信
    for (let i = 0; i < audioData.length; i += chunkSize) {
      if (session.ws.readyState !== WebSocket.OPEN) break;
      
      const chunk = audioData.slice(i, Math.min(i + chunkSize, audioData.length));
      session.ws.send(chunk, { binary: true });
      
      // 適度な遅延でバッファオーバーフロー防止
      if (i + chunkSize < audioData.length) {
        await new Promise(resolve => setTimeout(resolve, chunkDelay));
      }
    }
    
    // 音声終了通知
    this.sendMessage(session.ws, {
      type: 'audio_end',
      timestamp: Date.now()
    });
  }

  sendMessage(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  isSentenceEnd(text) {
    const sentenceEnders = ['。', '！', '？', '、', '．', '\n'];
    return sentenceEnders.some(ender => text.endsWith(ender));
  }

  addWavHeader(audioData) {
    const wavHeader = Buffer.alloc(44);
    const dataSize = audioData.length;
    const fileSize = dataSize + 36;
    
    // RIFF header
    wavHeader.write('RIFF', 0);
    wavHeader.writeUInt32LE(fileSize, 4);
    wavHeader.write('WAVE', 8);
    
    // fmt subchunk
    wavHeader.write('fmt ', 12);
    wavHeader.writeUInt32LE(16, 16);
    wavHeader.writeUInt16LE(1, 20);
    wavHeader.writeUInt16LE(1, 22);
    wavHeader.writeUInt32LE(this.sampleRate, 24);
    wavHeader.writeUInt32LE(this.sampleRate * 2, 28);
    wavHeader.writeUInt16LE(2, 32);
    wavHeader.writeUInt16LE(16, 34);
    
    // data subchunk
    wavHeader.write('data', 36);
    wavHeader.writeUInt32LE(dataSize, 40);
    
    return Buffer.concat([wavHeader, audioData]);
  }

  startServer() {
    this.server.listen(this.port, () => {
      console.log(`🎤 Voice Server listening on port ${this.port}`);
      console.log(`🔊 VOICEVOX endpoint: ${this.voicevoxUrl}`);
      console.log(`💾 Cache size limit: ${this.maxCacheSize}`);
    });
    
    if (this.httpsServer) {
      this.httpsServer.listen(this.httpsPort, () => {
        console.log(`🔒 Secure Voice Server listening on port ${this.httpsPort}`);
      });
    }
    
    // グレースフルシャットダウン
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());
  }

  shutdown() {
    console.log('🛑 Shutting down voice server...');
    
    // 全セッションを閉じる
    for (const [sessionId, session] of this.sessions) {
      session.ws.close(1001, 'Server shutdown');
    }
    
    // サーバーを閉じる
    this.server.close(() => {
      console.log('✅ Voice server shutdown complete');
      process.exit(0);
    });
    
    if (this.httpsServer) {
      this.httpsServer.close();
    }
  }

  // 統計情報取得
  getStats() {
    return {
      activeSessions: this.sessions.size,
      cacheSize: this.audioCache.size,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };
  }
}

// サーバー起動
const voiceServer = new VoiceCallServer({
  port: process.env.PORT || 8082,
  httpsPort: process.env.HTTPS_PORT || 8443
});

// 統計ログ出力（5分ごと）
setInterval(() => {
  console.log('📊 Server Stats:', voiceServer.getStats());
}, 5 * 60 * 1000);

module.exports = VoiceCallServer;