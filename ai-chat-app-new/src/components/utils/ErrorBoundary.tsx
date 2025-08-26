'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      // Safari互換のストレージクリア
      if (typeof window !== 'undefined') {
        try {
          if (window.localStorage) {
            window.localStorage.clear();
          }
        } catch (e) {
          console.warn('localStorage.clear failed:', e);
        }
        
        try {
          if (window.sessionStorage) {
            window.sessionStorage.clear();
          }
        } catch (e) {
          console.warn('sessionStorage.clear failed:', e);
        }
      }
      
      // 状態をリセット
      this.setState({ hasError: false, error: undefined });
      
      // ページリロード
      window.location.reload();
    } catch (e) {
      console.error('Reset failed:', e);
      // 最後の手段
      if (typeof window !== 'undefined') {
        window.location.href = window.location.href;
      }
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-800 rounded-lg p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">アプリケーションエラー</h2>
            <p className="text-gray-300 mb-4">
              予期しないエラーが発生しました。データをリセットして復旧を試みます。
            </p>
            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 mx-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              アプリをリセット
            </button>
            {this.state.error && (
              <details className="mt-4 text-left">
                <summary className="text-sm text-gray-400 cursor-pointer">エラー詳細</summary>
                <pre className="text-xs mt-2 p-2 bg-slate-900 rounded overflow-auto">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;