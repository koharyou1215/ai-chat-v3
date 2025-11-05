// src/app/admin/characters/page.tsx

import { CharacterManagementDashboard } from '@/components/admin/CharacterManagementDashboard';

export const metadata = {
  title: 'キャラクター管理 | AI Chat V3',
  description: 'キャラクターファイルの重複検出、整合性チェック、自動修正',
};

export default function CharacterManagementPage() {
  return (
    <div className="min-h-screen bg-background">
      <CharacterManagementDashboard />
    </div>
  );
}
