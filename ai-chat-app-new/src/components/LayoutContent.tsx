'use client';

import { ReactNode } from 'react';
import ErrorBoundary from '@/components/utils/ErrorBoundary';
import { StorageInitializer } from '@/components/utils/StorageInitializer';
import HydrationFix from '@/components/utils/HydrationFix';

interface LayoutContentProps {
  children: ReactNode;
}

export function LayoutContent({ children }: LayoutContentProps) {
  return (
    <ErrorBoundary>
      <HydrationFix />
      <StorageInitializer />
      {children}
    </ErrorBoundary>
  );
}
