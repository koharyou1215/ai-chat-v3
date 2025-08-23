'use client';

import React from 'react';
import { ChatInterface } from '@/components/chat/ChatInterface';
import AppInitializer from '@/components/AppInitializer';
import { useAppStore } from '@/store';

export default function Home() {
  const { isCharactersLoaded, isPersonasLoaded } = useAppStore();

  console.log('Home page render - isCharactersLoaded:', isCharactersLoaded, 'isPersonasLoaded:', isPersonasLoaded);

  return (
    <AppInitializer>
      {isCharactersLoaded && isPersonasLoaded ? (
        <main className="h-screen flex flex-col">
          <ChatInterface />
        </main>
      ) : (
        <main className="min-h-screen bg-slate-900 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <p className="text-white text-lg">AIチャットアプリケーションを初期化中...</p>
            <p className="text-white/60 text-sm mt-2">キャラクターとペルソナを読み込み中...</p>
          </div>
        </main>
      )}
    </AppInitializer>
  );
}