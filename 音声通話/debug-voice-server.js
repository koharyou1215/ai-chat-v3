// voice-server-debug.js
// デバッグ機能を強化した音声サーバー

const WebSocket = require('ws');
const express = require('express');
const { createServer } = require('http');
const OpenAI = require('openai');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// デバッグフラグ
const DEBUG = true;
const debugLog = (category, message, data = null) => {
  if (DEBUG) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${category}] ${message}`, data || '');
  }
};

class VoiceCallServer {
  constructor(port = 8082) {
    this.port = port;
    this.sessions = new Map();
    this.audioCache = new Map();
    
    // 設定の確認とログ出力
    this.config = {
      openaiApiKey: process.env.OPENAI_API_KEY,
      voicevoxUrl: process.env.VOICEVOX_ENGINE_URL || 'http://127.0.0.1:50021',
      elevenLabsApiKey: process.env.ELEVENLABS_API_KEY,
      sampleRate: 16000,
      frameDurationMs: 20,
      silenceThresholdMs: 500,
      maxCacheSize: 100
    };
    
    // 設定の検証
    this.validateConfig();
    
    // OpenAI初期化（APIキーがある場合のみ）
    if (this.config.openaiApiKey) {
      this.openai = new OpenAI.OpenAI({
        apiKey: this.config.openaiApiKey
      });
      debugLog('INIT', 'OpenAI client initialized');
    } else {
      debugLog('WARNING', 'OpenAI API key not found - using mock responses');
    }
    
    this.initServer();
  }
  
  validateConfig() {
    debugLog('CONFIG', 'Server configuration:', {
      hasOpenAIKey: !!this.config.openaiApiKey,
      voicevoxUrl: this.config.voicevoxUrl,
      hasElevenLabsKey: !!this.config.elevenLabsApiKey,
      port: this.port
    });
    
    // VOICEVOXの接続テスト
    this.testVoicevoxConnection();
  }
  
  async testVoicevoxConnection() {
    try {
      const response = await axios.get(`${this.config.voicevoxUrl}/speakers`);
      debugLog('VOICEVOX', `Connection successful. Available speakers: ${response.data.length}`);
    } catch (error) {
      debugLog('ERROR', 'VOICEVOX connection failed:', error.message);
      debugLog('ERROR', 'Make sure VOICEVOX is running on ' + this.config.voicevoxUrl);
    }
  }
  
  initServer() {
    const app = express();
    const server = createServer(app);
    
    // ヘルスチェックエンドポイント
    app.get('/health', (req, res) => {
      res.json({
        status: 'running',
        sessions: this.sessions.size,
        config: {
          voicevoxUrl: this.config.voicevoxUrl,
          hasOpenAI: !!this.config.openaiApiKey
        }
      });
    });
    
    this.wss = new WebSocket.Server({ 
      server,
      perMessageDeflate: false
    });
    
    this.setupWebSocketHandlers();
    
    server.listen(this.port, () => {
      debugLog('SERVER', `Voice call server listening on port ${this.port}`);
      debugLog('SERVER', `Health check: http://localhost:${this.port}/health`);
    });
  }
  
  setupWebSocketHandlers() {
    this.wss.on('connection', (ws, req) => {
      const sessionId = uuidv4();
      debugLog('WS', `New connection: ${sessionId}`);
      
      const session = {
        id: sessionId,
        ws,
        audioBuffer: [],
        isProcessing: false,
        lastSpeechTime: 0,
        conversationHistory: [],
        messageCount: 0,
        audioChunkCount: 0
      };
      
      this.sessions.set(sessionId, session);
      
      // 接続確認メッセージ
      ws.send(JSON.stringify({
        type: 'session_start',
        sessionId,
        config: {
          sampleRate: this.config.sampleRate,
          frameSize: this.config.frameDurationMs
        }
      }));
      
      // メッセージハンドラー
      ws.on('message', async (data) => {
        session.messageCount++;
        
        if (session.messageCount % 100 === 0) {
          debugLog('WS', `Session ${sessionId}: Received ${session.messageCount} messages`);
        }
        
        // データタイプを確認
        if (Buffer.isBuffer(data)) {
          session.audioChunkCount++;
          await this.handleAudioData(sessionId, data);
        } else {
          // テキストメッセージの処理
          try {
            const message = JSON.parse(data.toString());
            debugLog('WS', `Text message from ${sessionId}:`, message);
            await this.handleTextMessage(sessionId, message);
          } catch (error) {
            debugLog('ERROR', 'Failed to parse text message:', error);
          }
        }
      });
      
      ws.on('close', () => {
        debugLog('WS', `Session closed: ${sessionId}`, {
          messageCount: session.messageCount,
          audioChunkCount: session.audioChunkCount
        });
        this.sessions.delete(sessionId);
      });
      
      ws.on('error', (error) => {
        debugLog('ERROR', `WebSocket error for ${sessionId}:`, error);
        this.sessions.delete(sessionId);
      });
    });
  }
  
  async handleTextMessage(sessionId, message) {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    // テストメッセージへの応答
    if (message.type === 'test') {
      debugLog('TEST', 'Received test message, sending test response');
      
      // テスト音声を生成して送信
      try {
        const testText = 'こんにちは、音声通話のテストです。';
        await this.synthesizeAndSend(sessionId, testText);
        
        session.ws.send(JSON.stringify({
          type: 'test_response',
          status: 'success',
          message: 'Test audio sent'
        }));
      } catch (error) {
        debugLog('ERROR', 'Test response failed:', error);
        session.ws.send(JSON.stringify({
          type: 'test_response',
          status: 'error',
          message: error.message
        }));
      }
    }
  }
  
  async handleAudioData(sessionId, audioData) {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    try {
      const currentTime = Date.now();
      
      // 簡易的な音声検出（VADの代替）
      const audioLevel = this.calculateAudioLevel(audioData);
      const isSpeech = audioLevel > 0.01; // 閾値は調整可能
      
      if (isSpeech) {
        session.audioBuffer.push(audioData);
        session.lastSpeechTime = currentTime;
        
        // 初回の音声検出をログ
        if (session.audioBuffer.length === 1) {
          debugLog('AUDIO', `Speech started for ${sessionId}`);
          session.ws.send(JSON.stringify({
            type: 'voice_activity',
            status: 'speaking'
          }));
        }
      } else if (
        session.lastSpeechTime > 0 && 
        currentTime - session.lastSpeechTime > this.config.silenceThresholdMs &&
        session.audioBuffer.length > 10 && // 最小バッファサイズ
        !session.isProcessing
      ) {
        // 発話終了を検出
        debugLog('AUDIO', `Speech ended for ${sessionId}. Buffer size: ${session.audioBuffer.length}`);
        session.isProcessing = true;
        
        session.ws.send(JSON.stringify({
          type: 'voice_activity',
          status: 'processing'
        }));
        
        const completeAudio = Buffer.concat(session.audioBuffer);
        session.audioBuffer = [];
        session.lastSpeechTime = 0;
        
        // 音声処理を開始
        await this.processUtterance(sessionId, completeAudio);
      }
    } catch (error) {
      debugLog('ERROR', `Audio processing error for ${sessionId}:`, error);
      session.isProcessing = false;
    }
  }
  
  calculateAudioLevel(audioData) {
    // 簡易的な音声レベル計算
    let sum = 0;
    for (let i = 0; i < audioData.length; i += 2) {
      const sample = audioData.readInt16LE(i);
      sum += Math.abs(sample) / 32768.0;
    }
    return sum / (audioData.length / 2);
  }
  
  async processUtterance(sessionId, audioData) {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    debugLog('PROCESS', `Processing utterance for ${sessionId}. Audio size: ${audioData.length} bytes`);
    
    try {
      // 1. 音声認識
      let text = '';
      if (this.openai) {
        text = await this.speechToText(audioData);
      } else {
        // モックテキスト（OpenAIキーがない場合）
        text = 'テストメッセージです';
        debugLog('MOCK', 'Using mock transcription');
      }
      
      if (!text || text.trim().length === 0) {
        debugLog('PROCESS', 'No text recognized');
        session.isProcessing = false;
        return;
      }
      
      debugLog('STT', `Recognized: "${text}"`);
      
      // 認識結果を送信
      session.ws.send(JSON.stringify({
        type: 'transcription',
        text,
        timestamp: Date.now()
      }));
      
      // 2. 応答生成
      let response = '';
      if (this.openai) {
        response = await this.generateResponse(text, session);
      } else {
        // モック応答
        response = 'こんにちは。音声通話のテストです。正常に動作しています。';
        debugLog('MOCK', 'Using mock response');
      }
      
      debugLog('AI', `Response: "${response}"`);
      
      // 3. 音声合成と送信
      await this.synthesizeAndSend(sessionId, response);
      
      // 会話履歴に追加
      session.conversationHistory.push(
        { role: 'user', content: text },
        { role: 'assistant', content: response }
      );
      
    } catch (error) {
      debugLog('ERROR', `Processing error for ${sessionId}:`, error);
      
      // エラーを通知
      session.ws.send(JSON.stringify({
        type: 'error',
        message: `Processing failed: ${error.message}`
      }));
    } finally {
      session.isProcessing = false;
      debugLog('PROCESS', `Processing completed for ${sessionId}`);
    }
  }
  
  async speechToText(audioData) {
    try {
      // WAVヘッダーを追加
      const wavBuffer = this.addWavHeader(audioData);
      
      // ファイルライクオブジェクトを作成
      const file = new File([wavBuffer], 'audio.wav', { type: 'audio/wav' });
      
      const response = await this.openai.audio.transcriptions.create({
        file: file,
        model: 'whisper-1',
        language: 'ja'
      });
      
      return response.text;
    } catch (error) {
      debugLog('ERROR', 'STT Error:', error);
      throw error;
    }
  }
  
  async generateResponse(text, session) {
    try {
      const messages = [
        {
          role: 'system',
          content: '簡潔で自然な会話をしてください。'
        },
        ...session.conversationHistory.slice(-6), // 最近の3往復
        { role: 'user', content: text }
      ];
      
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages,
        temperature: 0.8,
        max_tokens: 100
      });
      
      return completion.choices[0].message.content;
    } catch (error) {
      debugLog('ERROR', 'AI Generation Error:', error);
      throw error;
    }
  }
  
  async synthesizeAndSend(sessionId, text) {
    const session = this.sessions.get(sessionId);
    if (!session || !text.trim()) return;
    
    debugLog('TTS', `Synthesizing: "${text}" for ${sessionId}`);
    
    try {
      // VOICEVOXで音声合成
      const audioData = await this.synthesizeWithVoicevox(text);
      
      if (!audioData || audioData.length === 0) {
        throw new Error('No audio data generated');
      }
      
      debugLog('TTS', `Audio generated: ${audioData.length} bytes`);
      
      // 音声データを送信
      await this.streamAudioToClient(session, audioData);
      
    } catch (error) {
      debugLog('ERROR', `TTS Error for ${sessionId}:`, error);
      throw error;
    }
  }
  
  async synthesizeWithVoicevox(text) {
    try {
      // 音声クエリ作成
      const queryResponse = await axios.post(
        `${this.config.voicevoxUrl}/audio_query`,
        text,
        {
          params: { speaker: 1 },
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      debugLog('VOICEVOX', 'Query created successfully');
      
      // 音声合成
      const synthesisResponse = await axios.post(
        `${this.config.voicevoxUrl}/synthesis`,
        queryResponse.data,
        {
          params: { speaker: 1 },
          responseType: 'arraybuffer',
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      debugLog('VOICEVOX', `Synthesis completed: ${synthesisResponse.data.byteLength} bytes`);
      
      return Buffer.from(synthesisResponse.data);
      
    } catch (error) {
      debugLog('ERROR', 'VOICEVOX Error:', error.response?.data || error.message);
      throw error;
    }
  }
  
  async streamAudioToClient(session, audioData) {
    const CHUNK_SIZE = 2048;
    
    debugLog('STREAM', `Starting audio stream. Total size: ${audioData.length} bytes`);
    
    // 音声開始通知
    session.ws.send(JSON.stringify({
      type: 'audio_start',
      timestamp: Date.now(),
      totalSize: audioData.length
    }));
    
    let bytesSent = 0;
    
    // チャンク単位で送信
    for (let i = 0; i < audioData.length; i += CHUNK_SIZE) {
      if (session.ws.readyState !== WebSocket.OPEN) {
        debugLog('STREAM', 'WebSocket closed, stopping stream');
        break;
      }
      
      const chunk = audioData.slice(i, Math.min(i + CHUNK_SIZE, audioData.length));
      session.ws.send(chunk, { binary: true });
      bytesSent += chunk.length;
      
      // 進捗ログ（25%ごと）
      const progress = Math.floor((bytesSent / audioData.length) * 100);
      if (progress % 25 === 0 && progress > 0) {
        debugLog('STREAM', `Progress: ${progress}% (${bytesSent}/${audioData.length} bytes)`);
      }
      
      // バッファオーバーフロー防止
      await new Promise(resolve => setTimeout(resolve, 5));
    }
    
    // 音声終了通知
    session.ws.send(JSON.stringify({
      type: 'audio_end',
      timestamp: Date.now(),
      bytesSent
    }));
    
    debugLog('STREAM', `Stream completed. Sent ${bytesSent} bytes`);
  }
  
  addWavHeader(audioData) {
    const wavHeader = Buffer.alloc(44);
    const dataSize = audioData.length;
    const fileSize = dataSize + 36;
    
    wavHeader.write('RIFF', 0);
    wavHeader.writeUInt32LE(fileSize, 4);
    wavHeader.write('WAVE', 8);
    wavHeader.write('fmt ', 12);
    wavHeader.writeUInt32LE(16, 16);
    wavHeader.writeUInt16LE(1, 20);
    wavHeader.writeUInt16LE(1, 22);
    wavHeader.writeUInt32LE(16000, 24);
    wavHeader.writeUInt32LE(32000, 28);
    wavHeader.writeUInt16LE(2, 32);
    wavHeader.writeUInt16LE(16, 34);
    wavHeader.write('data', 36);
    wavHeader.writeUInt32LE(dataSize, 40);
    
    return Buffer.concat([wavHeader, audioData]);
  }
}

// 環境変数の読み込み
require('dotenv').config({ path: '.env.local' });

// サーバー起動
const server = new VoiceCallServer(8082);

// プロセス終了時のクリーンアップ
process.on('SIGINT', () => {
  debugLog('SERVER', 'Shutting down...');
  process.exit(0);
});