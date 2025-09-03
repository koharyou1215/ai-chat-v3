'use client';

import ChatInterface from '@/components/chat/ChatInterface';
import AppInitializer from '@/components/AppInitializer';

export default function Home() {
  return (
    <AppInitializer>
      <ChatInterface />
    </AppInitializer>
  );
}