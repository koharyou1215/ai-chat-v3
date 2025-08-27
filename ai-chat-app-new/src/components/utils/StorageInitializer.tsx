'use client';

import { useEffect } from 'react';

export const StorageInitializer: React.FC = () => {
  useEffect(() => {
    // Import storage utilities on client-side only
    import('@/utils/storage-cleanup').then(() => {
      console.log('✅ Storage utilities loaded');
    }).catch((error) => {
      console.error('❌ Failed to load storage utilities:', error);
    });
  }, []);

  return null; // This component doesn't render anything
};