'use client';

import { useEffect } from 'react';

const useVH = () => {
  useEffect(() => {
    // Safari互換性のため、より安全な実装に変更
    try {
      const setVh = () => {
        // 基本的な高さ設定のみ
        if (typeof window !== 'undefined') {
          const vh = window.innerHeight * 0.01;
          document.documentElement.style.setProperty('--vh', `${vh}px`);
          document.documentElement.style.setProperty('--actual-vh', `${vh}px`);
        }
      };

      // 初回実行
      setVh();
      
      // リサイズイベントのみ（シンプルに）
      window.addEventListener('resize', setVh);

      return () => {
        window.removeEventListener('resize', setVh);
      };
    } catch (error) {
      // エラーが発生してもアプリをクラッシュさせない
      console.error('useVH hook error:', error);
    }
  }, []);
};

export default useVH;
