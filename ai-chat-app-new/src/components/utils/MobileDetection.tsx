'use client';

import React, { useState, useEffect, ReactNode } from 'react';
import { MobileFallback } from './MobileFallback';

interface MobileDetectionProps {
  children: ReactNode;
}

export const MobileDetection: React.FC<MobileDetectionProps> = ({ children }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const detectMobileIssues = () => {
      try {
        // モバイル検出
        const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
                   || window.innerWidth < 768;
        setIsMobile(mobile);

        // 表示問題の検出
        if (mobile) {
          // ビューポート問題のチェック
          const viewportMeta = document.querySelector('meta[name="viewport"]');
          if (!viewportMeta) {
            setHasError(true);
            setErrorMessage('ビューポート設定が見つかりません');
            return;
          }

          // CSS問題のチェック
          if (document.documentElement.clientHeight < 100) {
            setHasError(true);
            setErrorMessage('画面の高さが正しく設定されていません');
            return;
          }

          // JavaScript エラーのチェック
          if (typeof window === 'undefined') {
            setHasError(true);
            setErrorMessage('JavaScriptの実行環境に問題があります');
            return;
          }
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Mobile detection error:', error);
        setHasError(true);
        setErrorMessage(`検出エラー: ${error}`);
        setIsLoading(false);
      }
    };

    // 少し遅延させて確実に検出
    const timeoutId = setTimeout(detectMobileIssues, 500);
    
    return () => clearTimeout(timeoutId);
  }, []);

  // エラーまたはモバイルで問題がある場合
  if (hasError || (isMobile && isLoading)) {
    return <MobileFallback error={errorMessage} onRetry={() => window.location.reload()} />;
  }

  // ローディング中
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p>読み込み中...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default MobileDetection;