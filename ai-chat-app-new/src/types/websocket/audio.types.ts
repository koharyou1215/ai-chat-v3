/**
 * Audio Processing Type Definitions
 * Types for audio handling in WebSocket communication
 */

export interface AudioConfig {
  sampleRate: number;
  channels: number;
  bitDepth: number;
  frameSize: number;
  codec?: 'pcm' | 'opus' | 'mp3';
}

export interface AudioBuffer {
  data: Float32Array | Int16Array | Uint8Array;
  sampleRate: number;
  numberOfChannels: number;
  length: number;
}

export interface AudioProcessingOptions {
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
  normalization: boolean;
  crossfade: boolean;
  bufferSize: number;
}

export interface VoiceActivityDetection {
  enabled: boolean;
  threshold: number;
  debounceTime: number;
  silenceTimeout: number;
}

export interface AudioStreamMetrics {
  bitrate: number;
  packetLoss: number;
  jitter: number;
  roundTripTime: number;
  bufferLevel: number;
}

export interface AudioPlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
}

export interface AudioRecordingState {
  isRecording: boolean;
  duration: number;
  audioLevel: number;
  isSpeaking: boolean;
}