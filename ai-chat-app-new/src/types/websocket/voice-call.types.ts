/**
 * Voice Call specific WebSocket message types
 * Types matching the voice server implementation
 */

export type VoiceCallMessageType = 
  | 'session_start'
  | 'session_end'
  | 'pong'
  | 'voice_activity'
  | 'transcription'
  | 'audio_start'
  | 'audio_end'
  | 'ai_response'
  | 'response'
  | 'error'
  | 'stats'
  | 'status';

export type VoiceActivityStatus = 
  | 'idle'
  | 'listening'
  | 'speaking'
  | 'processing';

export interface BaseVoiceMessage {
  type: VoiceCallMessageType;
  sessionId?: string;
  timestamp?: number;
}

export interface SessionStartMessage extends BaseVoiceMessage {
  type: 'session_start';
  sessionId: string;
}

export interface PongMessage extends BaseVoiceMessage {
  type: 'pong';
}

export interface VoiceActivityMessage extends BaseVoiceMessage {
  type: 'voice_activity';
  status: VoiceActivityStatus;
}

export interface TranscriptionMessage extends BaseVoiceMessage {
  type: 'transcription';
  text: string;
  confidence?: number;
}

export interface AudioStartMessage extends BaseVoiceMessage {
  type: 'audio_start';
}

export interface AudioEndMessage extends BaseVoiceMessage {
  type: 'audio_end';
}

export interface AIResponseMessage extends BaseVoiceMessage {
  type: 'ai_response';
  text: string;
  characterName?: string;
  emotion?: string;
}

export interface ResponseMessage extends BaseVoiceMessage {
  type: 'response';
  message: string;
  audioUrl?: string;
}

export interface ErrorMessage extends BaseVoiceMessage {
  type: 'error';
  error: string;
  code?: string;
}

export interface StatsMessage extends BaseVoiceMessage {
  type: 'stats';
  stats: {
    latency: number;
    packetsLost: number;
    audioQuality: number;
    bufferHealth: number;
  };
}

export interface StatusMessage extends BaseVoiceMessage {
  type: 'status';
  status: VoiceActivityStatus | 'connected' | 'disconnected' | 'error';
}

export type VoiceCallMessage = 
  | SessionStartMessage
  | PongMessage
  | VoiceActivityMessage
  | TranscriptionMessage
  | AudioStartMessage
  | AudioEndMessage
  | AIResponseMessage
  | ResponseMessage
  | ErrorMessage
  | StatsMessage
  | StatusMessage;

// Type guards
export function isSessionStartMessage(msg: VoiceCallMessage): msg is SessionStartMessage {
  return msg.type === 'session_start';
}

export function isVoiceActivityMessage(msg: VoiceCallMessage): msg is VoiceActivityMessage {
  return msg.type === 'voice_activity';
}

export function isTranscriptionMessage(msg: VoiceCallMessage): msg is TranscriptionMessage {
  return msg.type === 'transcription';
}

export function isAIResponseMessage(msg: VoiceCallMessage): msg is AIResponseMessage {
  return msg.type === 'ai_response';
}

export function isResponseMessage(msg: VoiceCallMessage): msg is ResponseMessage {
  return msg.type === 'response';
}

export function isErrorMessage(msg: VoiceCallMessage): msg is ErrorMessage {
  return msg.type === 'error';
}

export function isStatsMessage(msg: VoiceCallMessage): msg is StatsMessage {
  return msg.type === 'stats';
}

// Outgoing message types
export interface OutgoingPingMessage {
  type: 'ping';
}

export interface OutgoingStopAudioMessage {
  type: 'stop_audio';
  timestamp: number;
}

export type OutgoingVoiceMessage = OutgoingPingMessage | OutgoingStopAudioMessage;