'use client';

import { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { StorageInitializer } from '@/components/utils/StorageInitializer';
import HydrationFix from '@/components/utils/HydrationFix';

// Dynamically import ErrorBoundary with no SSR to prevent hydration issues
const ErrorBoundary = dynamic(
  () => import('@/components/utils/ErrorBoundary'),
  {
    ssr: false,
    loading: () => null
  }
);

interface LayoutContentProps {
  children: ReactNode;
}

export function LayoutContent({ children }: LayoutContentProps) {
  // Always render the same structure to avoid hydration mismatch
  return (
    <>
      <HydrationFix />
      <StorageInitializer />
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    </>
  );
}
