'use client';

import { ReactNode, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { StorageInitializer } from '@/components/utils/StorageInitializer';
import HydrationFix from '@/components/utils/HydrationFix';

// Dynamically import ErrorBoundary with no SSR to prevent hydration issues
const ErrorBoundary = dynamic(
  () => import('@/components/utils/ErrorBoundary'),
  { ssr: false }
);

interface LayoutContentProps {
  children: ReactNode;
}

export function LayoutContent({ children }: LayoutContentProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Render children directly during SSR, wrap with ErrorBoundary only after hydration
  if (!isMounted) {
    return (
      <>
        <HydrationFix />
        <StorageInitializer />
        {children}
      </>
    );
  }

  return (
    <ErrorBoundary>
      <HydrationFix />
      <StorageInitializer />
      {children}
    </ErrorBoundary>
  );
}
