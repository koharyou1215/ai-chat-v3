'use client';

import React from 'react';
import { AlertCircle, Smartphone, RefreshCw } from 'lucide-react';

interface MobileFallbackProps {
  error?: string;
  onRetry?: () => void;
}

export const MobileFallback: React.FC<MobileFallbackProps> = ({ error, onRetry }) => {
  const handleRefresh = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  return (
    <div 
      className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4"
      style={{ 
        height: '100vh',
        width: '100vw',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 9999
      }}
    >
      <div className="text-center max-w-md w-full">
        <div className="flex justify-center mb-6">
          <Smartphone className="w-16 h-16 text-purple-400" />
        </div>
        
        <h1 className="text-2xl font-bold mb-4">モバイル表示の問題</h1>
        
        <div className="bg-slate-800 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-yellow-400" />
            <span className="font-semibold">診断情報</span>
          </div>
          <div className="text-sm text-gray-300 text-left">
            <p>• デバイス: {navigator.userAgent.includes('Mobile') ? 'モバイル' : 'デスクトップ'}</p>
            <p>• 画面サイズ: {window.innerWidth}x{window.innerHeight}</p>
            <p>• ビューポート: {window.screen.width}x{window.screen.height}</p>
            {error && <p>• エラー: {error}</p>}
          </div>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleRefresh}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            ページを再読み込み
          </button>
          
          <button
            onClick={() => {
              localStorage.setItem('safe-mode', 'true');
              window.location.reload();
            }}
            className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
          >
            🛡️ セーフモードで再起動
          </button>
          
          <button
            onClick={() => {
              localStorage.clear();
              sessionStorage.clear();
              window.location.reload();
            }}
            className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 rounded-lg transition-colors text-sm"
          >
            データをリセットして再起動
          </button>
        </div>
        
        <div className="mt-6 text-xs text-gray-400">
          <p>この画面が表示される場合、モバイル表示に問題があります。</p>
          <p>上記のボタンを試すか、デスクトップブラウザをご利用ください。</p>
        </div>
      </div>
    </div>
  );
};

export default MobileFallback;