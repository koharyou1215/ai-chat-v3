'use client';

import dynamic from 'next/dynamic';

// 🔧 CRITICAL FIX: SSRを完全に無効化してハイドレーション問題を根本解決
const AppContent = dynamic(
  () => import('@/components/AppContent'),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'transparent' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p className="text-white/80">アプリケーションを読み込み中...</p>
        </div>
      </div>
    )
  }
);

export default function Home() {
  return <AppContent />;
}