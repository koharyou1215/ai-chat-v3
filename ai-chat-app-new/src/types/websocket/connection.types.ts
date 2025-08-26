/**
 * WebSocket Connection Type Definitions
 * Types for WebSocket connection management
 */

export type ConnectionState = 
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

export interface ConnectionOptions {
  url: string;
  protocols?: string[];
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  timeout?: number;
  heartbeatInterval?: number;
  perMessageDeflate?: boolean;
}

export interface ConnectionMetrics {
  connectedAt: Date | null;
  lastMessageAt: Date | null;
  messagesSent: number;
  messagesReceived: number;
  bytesTransmitted: number;
  reconnectCount: number;
  averageLatency: number;
}

export interface ConnectionError {
  code: string;
  message: string;
  timestamp: Date;
  isRecoverable: boolean;
  retryAfter?: number;
}

export interface HeartbeatConfig {
  interval: number;
  timeout: number;
  message: string | object;
}

export interface ReconnectionStrategy {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
}