/**
 * Chat Error Handler Service
 * チャットシステムのエラーハンドリングを一元管理
 */

import { toast } from 'react-hot-toast';

export interface ChatError {
  type: 'send' | 'receive' | 'parse' | 'network' | 'quota' | 'auth';
  message: string;
  timestamp: string;
  details?: unknown;
  recoverable?: boolean;
}

export class ChatErrorHandler {
  /**
   * エラーから詳細なメッセージを取得
   */
  static getDetailedErrorMessage(error: unknown): string {
    // APIエラーの詳細解析
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      // Gemini API関連
      if (message.includes('quota exceeded')) {
        return 'API利用制限に達しました。しばらく待ってから再試行してください。';
      }
      if (message.includes('gemini api key')) {
        return 'Gemini APIキーが設定されていません。設定画面でAPIキーを入力してください。';
      }
      if (message.includes('invalid model')) {
        return '無効なモデルが指定されました。設定を確認してください。';
      }
      
      // OpenRouter関連
      if (message.includes('openrouter')) {
        return 'OpenRouter APIエラー。APIキーと設定を確認してください。';
      }
      if (message.includes('unauthorized') || message.includes('401')) {
        return 'APIキーが無効です。設定画面で正しいAPIキーを入力してください。';
      }
      
      // ネットワーク関連
      if (message.includes('network') || message.includes('fetch')) {
        return 'ネットワークエラーが発生しました。接続を確認してください。';
      }
      if (message.includes('timeout')) {
        return 'リクエストがタイムアウトしました。もう一度お試しください。';
      }
      
      // JSON解析エラー
      if (message.includes('json')) {
        return 'レスポンスの解析に失敗しました。もう一度お試しください。';
      }
      
      // デフォルトメッセージ
      return `エラー: ${error.message}`;
    }
    
    // 文字列エラー
    if (typeof error === 'string') {
      return error;
    }
    
    // 不明なエラー
    return '予期しないエラーが発生しました。もう一度お試しください。';
  }

  /**
   * ユーザーフレンドリーなエラー表示
   */
  static showUserFriendlyError(message: string, duration: number = 5000): void {
    toast.error(message, {
      duration,
      style: {
        background: '#ef4444',
        color: '#ffffff',
        borderRadius: '8px',
        padding: '12px 16px',
      },
      iconTheme: {
        primary: '#ffffff',
        secondary: '#ef4444',
      },
    });
  }

  /**
   * エラーログ記録
   */
  static logError(error: unknown, context: string): void {
    const timestamp = new Date().toISOString();
    const errorInfo = {
      timestamp,
      context,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
      } : error,
    };
    
    // コンソールにエラー情報を出力
    console.error(`[${context}] Error at ${timestamp}:`, errorInfo);
    
    // 本番環境ではエラー追跡サービスに送信
    if (process.env.NODE_ENV === 'production') {
      // TODO: Sentryなどのエラー追跡サービスに送信
    }
  }

  /**
   * エラーからChatError型を生成
   */
  static createChatError(error: unknown, type: ChatError['type'] = 'send'): ChatError {
    return {
      type,
      message: this.getDetailedErrorMessage(error),
      timestamp: new Date().toISOString(),
      details: error,
      recoverable: this.isRecoverable(error),
    };
  }

  /**
   * エラーが回復可能かどうか判定
   */
  static isRecoverable(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      // 回復不可能なエラー
      if (message.includes('invalid api key') || 
          message.includes('unauthorized') ||
          message.includes('invalid model')) {
        return false;
      }
      
      // 回復可能なエラー
      if (message.includes('timeout') ||
          message.includes('network') ||
          message.includes('quota')) {
        return true;
      }
    }
    
    return true; // デフォルトは回復可能
  }

  /**
   * エラーハンドリング付きの非同期処理実行
   */
  static async withErrorHandling<T>(
    operation: () => Promise<T>,
    context: string,
    options?: {
      showToast?: boolean;
      fallback?: T;
      retries?: number;
      retryDelay?: number;
    }
  ): Promise<T> {
    const { showToast = true, fallback, retries = 0, retryDelay = 1000 } = options || {};
    
    let lastError: unknown;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        this.logError(error, `${context} (attempt ${attempt + 1}/${retries + 1})`);
        
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
          continue;
        }
        
        if (showToast) {
          this.showUserFriendlyError(this.getDetailedErrorMessage(error));
        }
        
        if (fallback !== undefined) {
          return fallback;
        }
      }
    }
    
    throw lastError;
  }
}