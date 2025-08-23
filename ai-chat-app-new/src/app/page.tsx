'use client';

import React from 'react';
import { ChatInterface } from '@/components/chat/ChatInterface';

export default function Home() {
  return (
    <main className="h-screen flex flex-col">
      <ChatInterface />
    </main>
  );
}