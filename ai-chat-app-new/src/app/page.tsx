'use client';

import React from 'react';
import AppInitializer from '@/components/AppInitializer';
import { ChatInterface } from '@/components/chat/ChatInterface';

export default function Home() {
  return (
    <AppInitializer>
      <main className="h-screen flex flex-col">
        <ChatInterface />
      </main>
    </AppInitializer>
  );
}