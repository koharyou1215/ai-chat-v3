// src/components/voice/VoiceCallTest.tsx
// 段階的にテストできるシンプルなコンポーネント

import React, { useState, useRef, useEffect } from 'react';
import { Phone, Mic, Volume2, CheckCircle, XCircle, Loader } from 'lucide-react';

export const VoiceCallTest: React.FC = () => {
  const [testResults, setTestResults] = useState({
    webSocket: 'pending',
    microphone: 'pending',
    voicevox: 'pending',
    audioPlayback: 'pending'
  });
  
  const [logs, setLogs] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  
  // ログ追加関数
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(`[VoiceTest] ${message}`);
  };
  
  // 1. WebSocket接続テスト
  const testWebSocket = async () => {
    addLog('WebSocket接続テスト開始...');
    setTestResults(prev => ({ ...prev, webSocket: 'testing' }));
    
    try {
      const ws = new WebSocket('ws://localhost:8082');
      
      ws.onopen = () => {
        addLog('✅ WebSocket接続成功');
        setIsConnected(true);
        setTestResults(prev => ({ ...prev, webSocket: 'success' }));
        wsRef.current = ws;
        
        // テストメッセージ送信
        ws.send(JSON.stringify({ type: 'test' }));
      };
      
      ws.onmessage = (event) => {
        if (event.data instanceof Blob) {
          addLog(`📨 音声データ受信: ${event.data.size} bytes`);
          playAudioBlob(event.data);
        } else {
          try {
            const message = JSON.parse(event.data);
            addLog(`📨 メッセージ受信: ${message.type}`);
            
            if (message.type === 'test_response') {
              addLog('✅ テスト応答受信成功');
              setTestResults(prev => ({ ...prev, voicevox: 'success' }));
            }
          } catch (error) {
            addLog(`⚠️ メッセージパースエラー: ${error}`);
          }
        }
      };
      
      ws.onerror = (error) => {
        addLog(`❌ WebSocketエラー: ${error}`);
        setTestResults(prev => ({ ...prev, webSocket: 'error' }));
      };
      
      ws.onclose = () => {
        addLog('WebSocket切断');
        setIsConnected(false);
      };
      
    } catch (error) {
      addLog(`❌ WebSocket接続失敗: ${error}`);
      setTestResults(prev => ({ ...prev, webSocket: 'error' }));
    }
  };
  
  // 2. マイクテスト
  const testMicrophone = async () => {
    addLog('マイクテスト開始...');
    setTestResults(prev => ({ ...prev, microphone: 'testing' }));
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      
      mediaStreamRef.current = stream;
      addLog('✅ マイクアクセス成功');
      setTestResults(prev => ({ ...prev, microphone: 'success' }));
      
      // AudioContextでテスト録音
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const processor = audioContextRef.current.createScriptProcessor(512, 1, 1);
      
      let sampleCount = 0;
      processor.onaudioprocess = (e) => {
        if (isRecording && wsRef.current?.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0);
          const buffer = new ArrayBuffer(inputData.length * 2);
          const view = new DataView(buffer);
          
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            view.setInt16(i * 2, s * 0x7FFF, true);
          }
          
          wsRef.current.send(buffer);
          sampleCount++;
          
          // 100サンプルごとにログ
          if (sampleCount % 100 === 0) {
            addLog(`🎤 音声送信中... (${sampleCount} chunks)`);
          }
        }
      };
      
      source.connect(processor);
      processor.connect(audioContextRef.current.destination);
      
    } catch (error) {
      addLog(`❌ マイクアクセス失敗: ${error}`);
      setTestResults(prev => ({ ...prev, microphone: 'error' }));
    }
  };
  
  // 3. 音声再生テスト
  const playAudioBlob = async (blob: Blob) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      
      const arrayBuffer = await blob.arrayBuffer();
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.start();
      
      addLog('✅ 音声再生成功');
      setTestResults(prev => ({ ...prev, audioPlayback: 'success' }));
      
    } catch (error) {
      addLog(`❌ 音声再生失敗: ${error}`);
      setTestResults(prev => ({ ...prev, audioPlayback: 'error' }));
    }
  };
  
  // 4. VOICEVOXダイレクトテスト
  const testVoicevoxDirect = async () => {
    addLog('VOICEVOX直接テスト開始...');
    
    try {
      // スピーカー一覧取得
      const speakersResponse = await fetch('http://127.0.0.1:50021/speakers');
      const speakers = await speakersResponse.json();
      addLog(`✅ VOICEVOX接続成功: ${speakers.length} speakers available`);
      
      // テスト音声生成
      const text = 'テスト音声です';
      const queryResponse = await fetch('http://127.0.0.1:50021/audio_query?speaker=1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(text)
      });
      const queryData = await queryResponse.json();
      
      const synthesisResponse = await fetch('http://127.0.0.1:50021/synthesis?speaker=1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(queryData)
      });
      
      const audioBlob = await synthesisResponse.blob();
      addLog(`✅ VOICEVOX音声生成成功: ${audioBlob.size} bytes`);
      
      // 再生
      const audio = new Audio(URL.createObjectURL(audioBlob));
      await audio.play();
      
    } catch (error) {
      addLog(`❌ VOICEVOXテスト失敗: ${error}`);
    }
  };
  
  // 録音開始/停止
  const toggleRecording = () => {
    if (isRecording) {
      addLog('🛑 録音停止');
      setIsRecording(false);
    } else {
      addLog('🎤 録音開始');
      setIsRecording(true);
    }
  };
  
  // クリーンアップ
  const cleanup = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    if (wsRef.current) {
      wsRef.current.close();
    }
  };
  
  useEffect(() => {
    return cleanup;
  }, []);
  
  // テスト結果のアイコン
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'error':
        return <XCircle className="text-red-500" size={20} />;
      case 'testing':
        return <Loader className="text-blue-500 animate-spin" size={20} />;
      default:
        return <div className="w-5 h-5 rounded-full bg-gray-400" />;
    }
  };
  
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">音声通話機能テスト</h2>
      
      {/* テスト結果 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span>WebSocket接続</span>
            {getStatusIcon(testResults.webSocket)}
          </div>
          <button
            onClick={testWebSocket}
            className="w-full px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            接続テスト
          </button>
        </div>
        
        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span>マイク</span>
            {getStatusIcon(testResults.microphone)}
          </div>
          <button
            onClick={testMicrophone}
            disabled={!isConnected}
            className="w-full px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            マイクテスト
          </button>
        </div>
        
        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span>VOICEVOX</span>
            {getStatusIcon(testResults.voicevox)}
          </div>
          <button
            onClick={testVoicevoxDirect}
            className="w-full px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            直接テスト
          </button>
        </div>
        
        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span>音声再生</span>
            {getStatusIcon(testResults.audioPlayback)}
          </div>
          <div className="text-sm text-gray-600">
            音声受信時に自動テスト
          </div>
        </div>
      </div>
      
      {/* 録音コントロール */}
      <div className="mb-6">
        <button
          onClick={toggleRecording}
          disabled={!isConnected || testResults.microphone !== 'success'}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            isRecording 
              ? 'bg-red-500 text-white hover:bg-red-600' 
              : 'bg-green-500 text-white hover:bg-green-600'
          } disabled:opacity-50`}
        >
          {isRecording ? '🛑 録音停止' : '🎤 録音開始'}
        </button>
        
        {isRecording && (
          <span className="ml-4 text-red-500 animate-pulse">
            ● 録音中...
          </span>
        )}
      </div>
      
      {/* ログ表示 */}
      <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm h-64 overflow-y-auto">
        {logs.map((log, index) => (
          <div key={index}>{log}</div>
        ))}
        {logs.length === 0 && (
          <div className="text-gray-600">ログがここに表示されます...</div>
        )}
      </div>
      
      {/* サーバー情報 */}
      <div className="mt-4 text-sm text-gray-600">
        <p>WebSocketサーバー: ws://localhost:8082</p>
        <p>VOICEVOX: http://127.0.0.1:50021</p>
        <p>接続状態: {isConnected ? '✅ 接続中' : '❌ 未接続'}</p>
      </div>
    </div>
  );
};