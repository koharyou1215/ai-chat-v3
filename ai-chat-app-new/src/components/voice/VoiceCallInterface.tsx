'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface VoiceCallInterfaceProps {
  characterId?: string;
  isActive?: boolean;
  onEnd?: () => void;
}


export const VoiceCallInterface: React.FC<VoiceCallInterfaceProps> = ({
  characterId,
  isActive,
  onEnd
}) => {
  console.log('🎤 VoiceCallInterface render - isActive:', isActive);
  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  
  // Audio state
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [audioLevel, setAudioLevel] = useState(0);
  
  // Call state
  const [callDuration, setCallDuration] = useState(0);
  const [voiceActivityStatus, setVoiceActivityStatus] = useState<'idle' | 'speaking' | 'listening' | 'processing'>('idle');
  const [transcription, setTranscription] = useState<string>('');
  const [lastMessage, setLastMessage] = useState<string>('');
  
  
  // Performance stats
  const [stats, setStats] = useState({
    latency: 0,
    packetsLost: 0,
    audioQuality: 100
  });

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioQueueRef = useRef<Blob[]>([]);
  const isPlayingRef = useRef(false);
  const callStartTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>();
  const pingTimeRef = useRef<number>(0);

  // WebSocket connection
  const initializeWebSocket = useCallback(() => {
    // Force localhost connection for debugging
    const voiceServerUrl = 'ws://localhost:8082';
    setConnectionStatus('connecting');
    console.log('🔗 Connecting to:', voiceServerUrl);
    console.log('ENV check:', process.env.NEXT_PUBLIC_VOICE_SERVER_URL);
    console.log('All env vars:', Object.keys(process.env).filter(k => k.includes('VOICE')));
    
    // Close existing WebSocket if any
    if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
      wsRef.current.close();
    }
    
    try {
      const ws = new WebSocket(voiceServerUrl);
      
      ws.onopen = () => {
        console.log('✅ Voice WebSocket connected successfully!');
        console.log('🔍 WebSocket readyState:', ws.readyState);
        setIsConnected(true);
        setConnectionStatus('connected');
        
        // Wait a moment before sending ping to ensure connection is stable
        setTimeout(() => {
          if (ws.readyState === WebSocket.OPEN) {
            pingTimeRef.current = Date.now();
            ws.send(JSON.stringify({ type: 'ping' }));
            console.log('📤 Ping sent to server');
          } else {
            console.log('⚠️ WebSocket not open when trying to ping, state:', ws.readyState);
          }
        }, 100);
      };

      ws.onmessage = async (event) => {
        console.log('📨 Received WebSocket message:', event.data.constructor.name);
        
        if (event.data instanceof Blob) {
          // Binary audio data
          console.log('🎵 Received audio data:', event.data.size, 'bytes');
          audioQueueRef.current.push(event.data);
          if (!isPlayingRef.current) {
            playNextAudio();
          }
        } else {
          // JSON messages
          try {
            const message = JSON.parse(event.data);
            console.log('📋 Received JSON message:', message.type);
            handleWebSocketMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
            console.error('Raw message:', event.data);
          }
        }
      };

      ws.onerror = (error) => {
        console.log('❌ WebSocket error event occurred');
        console.log('Error object:', error);
        console.log('Error type:', typeof error);
        console.log('Error properties:', Object.keys(error));
        console.log('Error details:', {
          type: error.type,
          target: error.target?.readyState,
          url: voiceServerUrl,
          timestamp: new Date().toISOString()
        });
        setConnectionStatus('error');
        setIsConnected(false);
        
        // Show user-friendly error message
        setLastMessage('Connection failed - please check server status');
      };

      ws.onclose = (event) => {
        console.log('🔌 WebSocket disconnected:', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
          url: voiceServerUrl,
          timestamp: new Date().toISOString()
        });
        console.log('🔍 Close event details:', event);
        setConnectionStatus('disconnected');
        setIsConnected(false);
        setIsCallActive(false);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setConnectionStatus('error');
      setLastMessage('WebSocket creation failed - server unavailable');
    }
  }, []);

  // Handle WebSocket messages
  const handleWebSocketMessage = (message: any) => {
    switch (message.type) {
      case 'session_start':
        console.log('✅ Voice session started:', message.sessionId);
        break;

      case 'pong':
        const latency = Date.now() - pingTimeRef.current;
        setStats(prev => ({ ...prev, latency }));
        break;

      case 'voice_activity':
        setVoiceActivityStatus(message.status);
        break;

      case 'transcription':
        setTranscription(message.text);
        setLastMessage(`You: ${message.text}`);
        break;

      case 'audio_start':
        setVoiceActivityStatus('listening');
        break;

      case 'audio_end':
        setVoiceActivityStatus('idle');
        break;

      case 'tts_error':
        console.error('TTS Error:', message.message);
        setLastMessage(`Error: ${message.message}`);
        break;

      case 'error':
        console.error('Voice call error:', message.message);
        setLastMessage(`Error: ${message.message}`);
        break;

      case 'stats':
        setStats(prev => ({ ...prev, ...message.stats }));
        break;
        
      case 'test_response':
        console.log('🧪 Test response received:', message.message);
        setLastMessage(`Test: ${message.message}`);
        break;
    }
  };

  // Play audio from queue
  const playNextAudio = async () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      return;
    }

    isPlayingRef.current = true;
    const audioBlob = audioQueueRef.current.shift()!;

    try {
      if (!audioContextRef.current) return;
      
      // Resume audio context if suspended (browser security requirement)
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      
      if (isSpeakerOn) {
        source.connect(audioContextRef.current.destination);
      }
      
      source.onended = () => {
        playNextAudio();
      };
      
      source.start();
      
    } catch (error) {
      console.error('Audio playback error:', error);
      // Don't retry immediately on NotAllowedError
      if (error.name !== 'NotAllowedError') {
        playNextAudio();
      } else {
        console.log('🔊 Audio blocked by browser - user interaction required');
        isPlayingRef.current = false;
      }
    }
  };

  // Start voice call
  const startCall = async () => {
    console.log('🟢 Starting voice call...');
    console.log('WebSocket state:', wsRef.current?.readyState);
    console.log('Is connected:', isConnected);
    
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      mediaStreamRef.current = stream;
      
      // Initialize AudioContext
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000
      });
      
      // Create source node
      sourceNodeRef.current = audioContextRef.current.createMediaStreamSource(stream);
      
      // Create analyser for visualization
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 128;
      sourceNodeRef.current.connect(analyserRef.current);
      
      // Create script processor
      scriptProcessorRef.current = audioContextRef.current.createScriptProcessor(512, 1, 1);
      
      scriptProcessorRef.current.onaudioprocess = (event) => {
        if (!isMuted && wsRef.current?.readyState === WebSocket.OPEN) {
          const inputData = event.inputBuffer.getChannelData(0);
          const buffer = new ArrayBuffer(inputData.length * 2);
          const view = new DataView(buffer);
          
          // Convert Float32 to Int16
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            view.setInt16(i * 2, s * 0x7FFF, true);
          }
          
          console.log('🎤 Sending audio data:', buffer.byteLength, 'bytes');
          wsRef.current.send(buffer);
        } else {
          console.log('🔇 Audio not sent - muted:', isMuted, 'WS state:', wsRef.current?.readyState);
        }
      };
      
      sourceNodeRef.current.connect(scriptProcessorRef.current);
      scriptProcessorRef.current.connect(audioContextRef.current.destination);
      
      // Start call
      setIsCallActive(true);
      callStartTimeRef.current = Date.now();
      
      // Start visualizer
      updateVisualizer();
      
    } catch (error) {
      console.error('Failed to start call:', error);
      alert('マイクへのアクセスが必要です。ブラウザの設定を確認してください。');
    }
  };

  // End voice call
  const endCall = () => {
    console.log('🔴 Ending voice call - stopping all audio playback');
    console.log('🔍 endCall called from:', new Error().stack);
    
    // **即座に全ての音声再生を停止**
    
    // 1. 音声キューを完全にクリア
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    
    // 2. 現在再生中の音声を停止するため、新しいAudioContextを作成して古いものを破棄
    if (audioContextRef.current) {
      try {
        // 全ての音源ノードを即座に停止
        audioContextRef.current.suspend().then(() => {
          audioContextRef.current?.close();
        });
      } catch (error) {
        console.log('Audio context cleanup error:', error);
      }
    }
    
    // 3. メディアストリームを停止
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    // 4. 全てのオーディオノードを切断
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }

    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }

    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }

    // 5. AudioContextを完全にクリア
    audioContextRef.current = null;

    // 6. アニメーションフレームをキャンセル
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // 7. WebSocketに停止シグナル送信
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ 
        type: 'stop_audio',
        timestamp: Date.now()
      }));
    }

    // 8. 状態リセット
    setIsCallActive(false);
    setCallDuration(0);
    setVoiceActivityStatus('idle');
    setTranscription('');
    setLastMessage('');
    
    // 9. 親コンポーネントに通知
    if (onEnd) {
      onEnd();
    }
    
    console.log('✅ Voice call ended - all audio stopped');
  };

  // Update audio visualizer
  const updateVisualizer = () => {
    if (!analyserRef.current || !isCallActive) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Calculate audio level
    const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
    setAudioLevel(average);

    animationFrameRef.current = requestAnimationFrame(updateVisualizer);
  };

  // Update call duration
  useEffect(() => {
    if (!isCallActive) return;

    const interval = setInterval(() => {
      const duration = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
      setCallDuration(duration);
    }, 1000);

    return () => clearInterval(interval);
  }, [isCallActive]);

  // Simple initialization effect
  useEffect(() => {
    console.log('🎤 VoiceCallInterface mounted, isActive:', isActive);
    
    if (isActive) {
      console.log('🟢 Initializing WebSocket...');
      initializeWebSocket();
    }

    // Only cleanup on unmount
    return () => {
      console.log('🔴 Component unmounting');
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []); // No dependencies to prevent re-runs

  // Separate effect for isActive changes
  useEffect(() => {
    console.log('🎯 isActive changed to:', isActive);
    
    if (isActive && !isConnected) {
      console.log('🟢 Starting WebSocket due to isActive=true');
      initializeWebSocket();
    } else if (!isActive) {
      console.log('🔴 Ending call due to isActive=false');
      endCall();
    }
  }, [isActive]);

  // Periodic ping for latency measurement
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        pingTimeRef.current = Date.now();
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isConnected]);

  // Format duration
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Connection status indicator
  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500 animate-pulse';
      case 'error': return 'bg-red-500 animate-pulse';
      default: return 'bg-gray-500';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-4 right-4 z-50 md:bottom-4 md:right-4 
                 max-md:bottom-20 max-md:right-2 max-md:left-2 max-md:mx-auto"
    >
      <div className="bg-gray-900/95 backdrop-blur-sm rounded-lg border border-gray-700 
                      p-4 shadow-2xl max-md:p-3 max-md:max-w-sm max-md:mx-auto">
        {/* Minimal status indicator */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${getConnectionStatusColor()}`} />
            <span className="text-xs text-gray-400">
              {isCallActive ? formatDuration(callDuration) : connectionStatus}
            </span>
          </div>
          
          {/* Voice activity indicator */}
          <AnimatePresence mode="wait">
            {voiceActivityStatus === 'speaking' && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="flex items-center space-x-1"
              >
                <Mic className="animate-pulse text-green-400" size={14} />
                <span className="text-xs text-green-400">話中</span>
              </motion.div>
            )}
            {voiceActivityStatus === 'listening' && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="flex items-center space-x-1"
              >
                <Volume2 className="animate-pulse text-blue-400" size={14} />
                <span className="text-xs text-blue-400">聴取</span>
              </motion.div>
            )}
            {voiceActivityStatus === 'processing' && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="flex items-center space-x-1"
              >
                <div className="animate-spin rounded-full h-3 w-3 border border-yellow-400 border-t-transparent" />
                <span className="text-xs text-yellow-400">処理</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Minimal control buttons */}
        <div className="flex items-center space-x-3 max-md:space-x-4 max-md:justify-center">
          {/* Mute Button */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            disabled={!isCallActive}
            className={`p-2 md:p-2 max-md:p-3 rounded-full transition-all touch-manipulation ${
              isCallActive
                ? isMuted
                  ? 'bg-red-500/30 text-red-400'
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                : 'bg-gray-800/50 text-gray-600 cursor-not-allowed'
            }`}
            title={isMuted ? "ミュート中" : "マイク ON"}
          >
            {isMuted ? <MicOff size={18} className="md:w-4 md:h-4" /> : <Mic size={18} className="md:w-4 md:h-4" />}
          </button>
          
          {/* End Call Button */}
          <button
            onClick={endCall}
            className="p-2 md:p-2 max-md:p-3 rounded-full bg-red-500/30 hover:bg-red-500/50 text-red-400 transition-all touch-manipulation"
            title="通話終了"
          >
            <PhoneOff size={18} className="md:w-4 md:h-4" />
          </button>
          
          {/* Speaker Button */}
          <button
            onClick={() => setIsSpeakerOn(!isSpeakerOn)}
            disabled={!isCallActive}
            className={`p-2 md:p-2 max-md:p-3 rounded-full transition-all touch-manipulation ${
              isCallActive
                ? isSpeakerOn
                  ? 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                  : 'bg-orange-500/30 text-orange-400'
                : 'bg-gray-800/50 text-gray-600 cursor-not-allowed'
            }`}
            title={isSpeakerOn ? "スピーカー ON" : "スピーカー OFF"}
          >
            {isSpeakerOn ? <Volume2 size={18} className="md:w-4 md:h-4" /> : <VolumeX size={18} className="md:w-4 md:h-4" />}
          </button>
        </div>
        
        {/* Debug info disabled */}
      </div>
    </motion.div>
  );
};