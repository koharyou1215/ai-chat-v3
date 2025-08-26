'use client';

import { useEffect } from 'react';

const useVH = () => {
  useEffect(() => {
    const setVh = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
      
      // モバイルデバイスでのキーボード表示時の高さ調整
      const actualHeight = window.visualViewport?.height || window.innerHeight;
      const actualVh = actualHeight * 0.01;
      document.documentElement.style.setProperty('--actual-vh', `${actualVh}px`);
    };

    setVh();
    window.addEventListener('resize', setVh);
    
    // visualViewport APIをサポートするブラウザでの対応
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', setVh);
    }

    return () => {
      window.removeEventListener('resize', setVh);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', setVh);
      }
    };
  }, []);
};

export default useVH;
