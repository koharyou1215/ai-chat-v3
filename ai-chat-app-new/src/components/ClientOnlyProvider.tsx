'use client';

import React, { useEffect, useState } from 'react';

interface ClientOnlyProviderProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * SSRハイドレーション問題を解決するためのクライアント専用コンポーネント
 * ハイドレーション完了まで子コンポーネントをレンダリングしない
 */
export const ClientOnlyProvider: React.FC<ClientOnlyProviderProps> = ({ 
  children, 
  fallback = null 
}) => {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    // Ensure this runs after hydration
    const timer = setTimeout(() => {
      setHasMounted(true);
    }, 0);
    
    return () => clearTimeout(timer);
  }, []);

  // Check if we're in the browser
  if (typeof window === 'undefined') {
    return fallback as React.ReactElement;
  }

  if (!hasMounted) {
    return fallback as React.ReactElement;
  }

  return <>{children}</>;
};