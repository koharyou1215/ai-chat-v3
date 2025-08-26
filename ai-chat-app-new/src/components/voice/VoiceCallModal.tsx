import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, X, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/store';
import { UnifiedMessage } from '@/types/core/message.types';

interface WebSocketMessage {
  type: string;
  sessionId?: string;
  data?: unknown;
  audioUrl?: string;
  error?: string;
  status?: 'speaking' | 'listening' | 'processing' | 'idle';
  text?: string;
  message?: string;
  stats?: Record<string, unknown>;
  timestamp?: number;
}

interface VoiceCallModalProps {
  characterId?: string;
  isOpen: boolean;
  onClose: () => void;
}

interface AudioVisualizerModalProps {
  audioData: Uint8Array;
  isActive: boolean;
  className?: string;
}

// Large AudioVisualizer for Modal
const AudioVisualizerModal: React.FC<AudioVisualizerModalProps> = ({ audioData, isActive, className = "" }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      // Set canvas size
      canvas.width = canvas.offsetWidth * (window.devicePixelRatio || 1);
      canvas.height = canvas.offsetHeight * (window.devicePixelRatio || 1);
      
      ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
      
      if (!isActive || !audioData || audioData.length === 0) {
        // Show idle state with pulsing line
        const gradient = ctx.createLinearGradient(0, 0, canvas.offsetWidth, 0);
        gradient.addColorStop(0, '#374151');
        gradient.addColorStop(0.5, '#6b7280');
        gradient.addColorStop(1, '#374151');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, canvas.offsetHeight / 2 - 2, canvas.offsetWidth, 4);
        return;
      }
      
      // Draw audio bars with enhanced visuals
      const barWidth = canvas.offsetWidth / audioData.length;
      const barSpacing = 2;
      const maxBarHeight = canvas.offsetHeight - 8;
      const centerY = canvas.offsetHeight / 2;
      
      for (let i = 0; i < audioData.length; i++) {
        const barHeight = (audioData[i] / 255) * maxBarHeight;
        const x = i * barWidth + barSpacing / 2;
        const y1 = centerY - barHeight / 2;
        const y2 = centerY + barHeight / 2;
        
        // Create gradient based on intensity
        const intensity = audioData[i] / 255;
        const gradient = ctx.createLinearGradient(x, y1, x, y2);
        
        if (intensity > 0.8) {
          gradient.addColorStop(0, '#ef4444'); // red-500
          gradient.addColorStop(0.5, '#f97316'); // orange-500
          gradient.addColorStop(1, '#ef4444');
        } else if (intensity > 0.6) {
          gradient.addColorStop(0, '#f59e0b'); // yellow-500
          gradient.addColorStop(0.5, '#eab308'); // yellow-400
          gradient.addColorStop(1, '#f59e0b');
        } else if (intensity > 0.3) {
          gradient.addColorStop(0, '#10b981'); // green-500
          gradient.addColorStop(0.5, '#34d399'); // green-400
          gradient.addColorStop(1, '#10b981');
        } else if (intensity > 0.1) {
          gradient.addColorStop(0, '#3b82f6'); // blue-500
          gradient.addColorStop(0.5, '#60a5fa'); // blue-400
          gradient.addColorStop(1, '#3b82f6');
        } else {
          gradient.addColorStop(0, '#6b7280'); // gray-500
          gradient.addColorStop(0.5, '#9ca3af'); // gray-400
          gradient.addColorStop(1, '#6b7280');
        }
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y1, Math.max(barWidth - barSpacing, 2), Math.max(barHeight, 4));
        
        // Add glow effect for high intensity
        if (intensity > 0.7) {
          ctx.shadowColor = intensity > 0.8 ? '#ef4444' : '#f59e0b';
          ctx.shadowBlur = 10;
          ctx.fillRect(x, y1, Math.max(barWidth - barSpacing, 2), Math.max(barHeight, 4));
          ctx.shadowBlur = 0;
        }
      }
    };

    draw();
  }, [audioData, isActive]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-32 rounded-lg ${className}`}
      style={{ 
        background: 'linear-gradient(135deg, rgba(17,24,39,0.9) 0%, rgba(31,41,55,0.9) 50%, rgba(17,24,39,0.9) 100%)',
        imageRendering: 'pixelated'
      }}
    />
  );
};

export const VoiceCallModal: React.FC<VoiceCallModalProps> = ({
  characterId,
  isOpen,
  onClose
}) => {
  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  
  // Audio state
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [audioVisualizerData, setAudioVisualizerData] = useState<Uint8Array>(new Uint8Array(64));
  
  // Call state
  const [callDuration, setCallDuration] = useState(0);
  const [voiceActivityStatus, setVoiceActivityStatus] = useState<'idle' | 'speaking' | 'listening' | 'processing'>('idle');
  const [transcription, setTranscription] = useState<string>('');
  const [lastMessage, setLastMessage] = useState<string>('');
  
  // Statistics
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
  const callStartTimeRef = useRef<number>(0);
  const visualizerUpdateRef = useRef<number>();

  // Store hooks
  const { active_session_id, sendMessage } = useAppStore();

  // Mock character data (in real implementation, get from store)
  const character = {
    id: characterId || 'default',
    name: 'AI Assistant',
    avatar_url: null
  };

  // WebSocket initialization
  const initializeWebSocket = useCallback(() => {
    const voiceServerUrl = 'ws://localhost:8082';
    setConnectionStatus('connecting');
    console.log('🔗 Connecting to:', voiceServerUrl);
    
    try {
      const ws = new WebSocket(voiceServerUrl);
      
      ws.onopen = () => {
        console.log('✅ Voice WebSocket connected successfully!');
        setIsConnected(true);
        setConnectionStatus('connected');
      };

      ws.onmessage = async (event) => {
        if (typeof event.data === 'string') {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            handleWebSocketMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        }
      };

      ws.onerror = (_error) => {
        console.log('❌ WebSocket error event occurred');
        setConnectionStatus('error');
        setIsConnected(false);
        setLastMessage('Connection failed - please check server status');
      };

      ws.onclose = (event) => {
        console.log('🔌 WebSocket disconnected:', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean
        });
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
  }, [handleWebSocketMessage]);

  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case 'pong':
        if (message.timestamp) {
          const latency = Date.now() - message.timestamp;
          setStats(prev => ({ ...prev, latency }));
        }
        break;

      case 'voice_activity':
        setVoiceActivityStatus(message.status);
        break;

      case 'transcription':
        setTranscription(message.text);
        
        // Add user message to chat history
        if (active_session_id && message.text) {
          const userMessage: Partial<UnifiedMessage> = {
            role: 'user',
            content: message.text,
            session_id: active_session_id,
            metadata: { 
              source: 'voice',
              timestamp: new Date().toISOString(),
              call_duration: Math.floor((Date.now() - callStartTimeRef.current) / 1000)
            }
          };
          
          sendMessage(userMessage as UnifiedMessage);
        }
        break;

      case 'ai_response':
        // Add AI response to chat history
        if (active_session_id && message.text) {
          const aiMessage: Partial<UnifiedMessage> = {
            role: 'assistant',
            content: message.text,
            session_id: active_session_id,
            metadata: { 
              source: 'voice',
              timestamp: new Date().toISOString(),
              call_duration: Math.floor((Date.now() - callStartTimeRef.current) / 1000)
            }
          };
          
          sendMessage(aiMessage as UnifiedMessage);
        }
        break;

      case 'error':
        console.error('Voice call error:', message.message);
        setLastMessage(`Error: ${message.message}`);
        break;

      case 'stats':
        setStats(prev => ({ ...prev, ...message.stats }));
        break;
    }
  }, [active_session_id, sendMessage]);

  // Start voice call
  const startCall = async () => {
    if (!isConnected) {
      alert('サーバーに接続されていません');
      return;
    }

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
      audioContextRef.current = new (window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)({
        sampleRate: 16000
      });
      
      // Create source node
      sourceNodeRef.current = audioContextRef.current.createMediaStreamSource(stream);
      
      // Create analyser for visualization (higher resolution for modal)
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256; // Higher resolution
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
          
          wsRef.current.send(buffer);
        }
      };
      
      sourceNodeRef.current.connect(scriptProcessorRef.current);
      scriptProcessorRef.current.connect(audioContextRef.current.destination);
      
      // Start call
      setIsCallActive(true);
      callStartTimeRef.current = Date.now();
      
      // Start audio visualizer updates
      updateAudioVisualizer();
      
    } catch (error) {
      console.error('Failed to start call:', error);
      alert('マイクへのアクセスが必要です。ブラウザの設定を確認してください。');
    }
  };

  // End voice call
  const endCall = () => {
    console.log('🔴 Ending voice call');
    
    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    // Disconnect audio nodes
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

    // Close AudioContext
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Cancel animation frames
    if (visualizerUpdateRef.current) {
      cancelAnimationFrame(visualizerUpdateRef.current);
    }

    // Reset states
    setIsCallActive(false);
    setCallDuration(0);
    setVoiceActivityStatus('idle');
    setTranscription('');
    setLastMessage('');
    setAudioVisualizerData(new Uint8Array(64));
  };

  // Update audio visualizer
  const updateAudioVisualizer = () => {
    if (!analyserRef.current || !isCallActive) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    // Use more data points for modal version
    const reducedData = new Uint8Array(64);
    const blockSize = Math.floor(dataArray.length / 64);
    
    for (let i = 0; i < 64; i++) {
      let sum = 0;
      for (let j = 0; j < blockSize; j++) {
        sum += dataArray[i * blockSize + j];
      }
      reducedData[i] = Math.floor(sum / blockSize);
    }
    
    setAudioVisualizerData(reducedData);
    visualizerUpdateRef.current = requestAnimationFrame(updateAudioVisualizer);
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

  // Initialize WebSocket on mount
  useEffect(() => {
    if (isOpen) {
      initializeWebSocket();
    }

    return () => {
      endCall();
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [isOpen, initializeWebSocket]);

  // Format duration
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get connection status color
  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500 animate-pulse';
      case 'error': return 'bg-red-500 animate-pulse';
      default: return 'bg-gray-500';
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-lg"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="relative w-full max-w-2xl p-8 mx-4 bg-gray-900/95 backdrop-blur-sm rounded-3xl shadow-2xl border border-gray-700"
      >
        {/* Close Button - Fixed Position and Always Visible */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-3 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/10 bg-gray-800/90 backdrop-blur-sm border border-gray-600/50 shadow-lg"
          title="閉じる"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="relative inline-block mb-6">
            <div className="w-40 h-40 rounded-full overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 border-4 border-gray-700 shadow-2xl">
              {character?.avatar_url ? (
                <img 
                  src={character.avatar_url} 
                  alt={character.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-600">
                  <User size={64} />
                </div>
              )}
            </div>

            {/* Status indicator */}
            <div className={`absolute bottom-4 right-4 w-8 h-8 rounded-full border-4 border-gray-900 ${
              isCallActive ? 'bg-green-500 animate-pulse' : isConnected ? 'bg-blue-500' : 'bg-gray-500'
            }`} />
          </div>
          
          <h1 className="text-3xl font-bold text-white mb-2">
            {character?.name || 'Voice Call'}
          </h1>
          
          {isCallActive && (
            <div className="text-2xl font-mono text-blue-400 mb-2">
              {formatDuration(callDuration)}
            </div>
          )}

          {/* Connection Status */}
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className={`w-3 h-3 rounded-full ${getConnectionStatusColor()}`} />
            <span className="text-sm text-gray-400 capitalize">{connectionStatus}</span>
            {stats.latency > 0 && (
              <span className="text-sm text-gray-500">• {stats.latency}ms</span>
            )}
          </div>
        </div>

        {/* Voice Activity Status */}
        <div className="mb-6">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <AnimatePresence mode="wait">
              {voiceActivityStatus === 'speaking' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center space-x-2 text-green-400"
                >
                  <Mic className="animate-pulse" size={20} />
                  <span className="text-lg">話しています...</span>
                </motion.div>
              )}
              {voiceActivityStatus === 'listening' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center space-x-2 text-blue-400"
                >
                  <Volume2 className="animate-pulse" size={20} />
                  <span className="text-lg">聞いています...</span>
                </motion.div>
              )}
              {voiceActivityStatus === 'processing' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center space-x-2 text-yellow-400"
                >
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-yellow-400 border-t-transparent" />
                  <span className="text-lg">処理中...</span>
                </motion.div>
              )}
              {voiceActivityStatus === 'idle' && !isCallActive && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center space-x-2 text-gray-400"
                >
                  <Phone size={20} />
                  <span className="text-lg">通話待機中</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Enhanced Audio Visualizer */}
          <AudioVisualizerModal 
            audioData={audioVisualizerData}
            isActive={isCallActive}
            className="border border-gray-600/30 shadow-lg"
          />
        </div>

        {/* Transcription Display */}
        {transcription && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-gray-800/70 rounded-lg border border-gray-700"
          >
            <p className="text-sm text-gray-400 mb-2">最後の発話:</p>
            <p className="text-white text-lg">{transcription}</p>
          </motion.div>
        )}

        {/* Control Buttons */}
        <div className="flex items-center justify-center space-x-6">
          {/* Mute Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsMuted(!isMuted)}
            disabled={!isCallActive}
            className={`p-4 rounded-full transition-all ${
              isCallActive
                ? isMuted
                  ? 'bg-red-500/30 hover:bg-red-500/50 text-red-400'
                  : 'bg-gray-700/50 hover:bg-gray-600/50 text-gray-300'
                : 'bg-gray-800/50 text-gray-600 cursor-not-allowed'
            }`}
            title={isMuted ? "ミュート中" : "マイク ON"}
          >
            {isMuted ? <MicOff size={28} /> : <Mic size={28} />}
          </motion.button>

          {/* Call Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={isCallActive ? endCall : startCall}
            disabled={!isConnected}
            className={`p-6 rounded-full transition-all shadow-lg ${
              isCallActive
                ? 'bg-red-500/30 hover:bg-red-500/50 text-red-400 animate-pulse'
                : isConnected
                  ? 'bg-green-500/30 hover:bg-green-500/50 text-green-400'
                  : 'bg-gray-800/50 text-gray-600 cursor-not-allowed'
            }`}
            title={isCallActive ? "通話終了" : "通話開始"}
          >
            {isCallActive ? (
              <PhoneOff size={36} />
            ) : (
              <Phone size={36} />
            )}
          </motion.button>

          {/* Speaker Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsSpeakerOn(!isSpeakerOn)}
            disabled={!isCallActive}
            className={`p-4 rounded-full transition-all ${
              isCallActive
                ? isSpeakerOn
                  ? 'bg-gray-700/50 hover:bg-gray-600/50 text-gray-300'
                  : 'bg-orange-500/30 hover:bg-orange-500/50 text-orange-400'
                : 'bg-gray-800/50 text-gray-600 cursor-not-allowed'
            }`}
            title={isSpeakerOn ? "スピーカー ON" : "スピーカー OFF"}
          >
            {isSpeakerOn ? <Volume2 size={28} /> : <VolumeX size={28} />}
          </motion.button>
        </div>

        {/* Status Message */}
        {lastMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 text-center text-sm text-gray-400"
          >
            {lastMessage}
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
};