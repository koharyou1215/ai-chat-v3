'use client';

import { useEffect } from 'react';

export const StorageInitializer: React.FC = () => {
  useEffect(() => {
    // Import storage utilities on client-side only
    import('@/utils/storage').then(() => {
      // Storage utilities loaded
    }).catch(() => {
      // Failed to load storage utilities
    });
  }, []);

  return null; // This component doesn't render anything
};