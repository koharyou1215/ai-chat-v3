'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';

export const EmergencyReset: React.FC = () => {
  const [safeMode, setSafeMode] = React.useState(
    () => typeof window !== 'undefined' && localStorage.getItem('safe-mode') === 'true'
  );
  const [isExpanded, setIsExpanded] = React.useState(false);

  const handleEmergencyReset = () => {
    try {
      // ローカルストレージを完全クリア
      localStorage.clear();
      // セッションストレージもクリア
      sessionStorage.clear();
      
      alert('ストレージをクリアしました。ページをリロードします。');
      
      // ページリロード
      window.location.reload();
    } catch (error) {
      console.error('Emergency reset failed:', error);
      alert('リセットに失敗しました。手動でページをリロードしてください。');
    }
  };

  const toggleSafeMode = () => {
    const newSafeMode = !safeMode;
    setSafeMode(newSafeMode);
    
    try {
      if (newSafeMode) {
        localStorage.setItem('safe-mode', 'true');
        alert('セーフモードを有効にしました。全アニメーションが無効化されます。ページをリロードします。');
      } else {
        localStorage.removeItem('safe-mode');
        alert('セーフモードを無効にしました。ページをリロードします。');
      }
      window.location.reload();
    } catch (error) {
      console.error('Safe mode toggle failed:', error);
      window.location.reload();
    }
  };

  return (
    <div className="fixed top-4 left-4 z-[9999]">
      {/* 折りたたみ可能なトグルボタン */}
      <div className="flex flex-col gap-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs opacity-80 hover:opacity-100"
          title="デバッグメニュー"
        >
          <span>{isExpanded ? '🔻' : '🔧'}</span>
        </button>
        
        {isExpanded && (
          <div className="flex flex-col gap-2 bg-slate-900/95 p-2 rounded-lg shadow-lg backdrop-blur-sm">
            <button
              onClick={toggleSafeMode}
              className={`flex items-center gap-2 px-3 py-2 text-white rounded text-xs ${
                safeMode 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-orange-600 hover:bg-orange-700'
              }`}
              title={safeMode ? 'セーフモードON（全アニメーション無効）' : 'セーフモードOFF'}
            >
              <span className="text-xs">
                {safeMode ? '🛡️ セーフ' : '⚡ 通常'}
              </span>
            </button>
            
            <button
              onClick={handleEmergencyReset}
              className="flex items-center gap-1 px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs"
              title="JSONエラーが発生している場合、ストレージをクリアしてリセット"
            >
              <AlertTriangle className="w-3 h-3" />
              <span className="text-xs">リセット</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmergencyReset;