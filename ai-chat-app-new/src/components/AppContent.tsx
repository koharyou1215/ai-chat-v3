'use client';

import { ChatInterface } from '@/components/chat/ChatInterface';
import AppInitializer from '@/components/AppInitializer';

/**
 * AppContent - Client-side only application wrapper
 *
 * This component is dynamically imported with ssr:false to completely
 * eliminate hydration mismatches by ensuring all rendering happens
 * only on the client side.
 */
export default function AppContent() {
  return (
    <AppInitializer>
      <ChatInterface />
    </AppInitializer>
  );
}
