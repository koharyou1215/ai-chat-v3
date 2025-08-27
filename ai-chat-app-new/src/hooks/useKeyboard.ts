'use client';

import { useEffect, useState } from 'react';

interface KeyboardInfo {
  isVisible: boolean;
  height: number;
}

export const useKeyboard = (): KeyboardInfo => {
  const [keyboardInfo, setKeyboardInfo] = useState<KeyboardInfo>({
    isVisible: false,
    height: 0,
  });

  useEffect(() => {
    // サーバーサイドレンダリングでは実行しない
    if (typeof window === 'undefined') {
      return;
    }

    // 初期化時の高さを記録
    const initialHeight = window.innerHeight;

    const handleFocusIn = () => {
      // フォーカス時は少し遅延してから高さをチェック
      setTimeout(() => {
        const currentHeight = window.visualViewport?.height || window.innerHeight;
        const heightDiff = initialHeight - currentHeight;
        
        console.log('Focus in - heights:', {
          initial: initialHeight,
          current: currentHeight,
          diff: heightDiff
        });
        
        if (heightDiff > 150) {
          setKeyboardInfo({
            isVisible: true,
            height: heightDiff,
          });
        }
      }, 300);
    };

    const handleFocusOut = () => {
      // フォーカスアウト時は遅延してキーボードを閉じる
      setTimeout(() => {
        console.log('Focus out - resetting keyboard state');
        setKeyboardInfo({
          isVisible: false,
          height: 0,
        });
      }, 300);
    };

    // テキストエリアのフォーカスイベントを監視
    const textareas = document.querySelectorAll('textarea, input[type="text"]');
    textareas.forEach(textarea => {
      textarea.addEventListener('focusin', handleFocusIn);
      textarea.addEventListener('focusout', handleFocusOut);
    });

    // Visual Viewport APIがある場合の補助的な監視
    const handleViewportResize = () => {
      const currentHeight = window.visualViewport?.height || window.innerHeight;
      const heightDiff = initialHeight - currentHeight;
      
      console.log('Viewport resize:', {
        initial: initialHeight,
        current: currentHeight,
        diff: heightDiff
      });
      
      if (heightDiff > 150) {
        setKeyboardInfo({
          isVisible: true,
          height: heightDiff,
        });
      } else if (heightDiff < 50) {
        setKeyboardInfo({
          isVisible: false,
          height: 0,
        });
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportResize);
    }

    return () => {
      textareas.forEach(textarea => {
        textarea.removeEventListener('focusin', handleFocusIn);
        textarea.removeEventListener('focusout', handleFocusOut);
      });
      
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportResize);
      }
    };
  }, []);

  return keyboardInfo;
};