'use client';

import { useEffect, ReactNode } from 'react';
import { useAppStore } from '@/store';
import { StorageManager } from '@/utils/storage-cleanup';
import { StorageAnalyzer } from '@/utils/storage-analyzer';
import { StorageCleaner } from '@/utils/storage-cleaner';
import { checkStorageUsage } from '@/utils/check-storage';
import { AppearanceProvider } from '@/components/providers/AppearanceProvider';

interface AppInitializerProps {
  children: ReactNode;
}

const AppInitializer: React.FC<AppInitializerProps> = ({ children }) => {
  const { 
    sessions, 
    active_session_id,
    createSession, 
    getSelectedPersona,
    characters, 
    personas, 
    isCharactersLoaded, 
    isPersonasLoaded,
    loadCharactersFromPublic,
    loadPersonasFromPublic,
    selectedCharacterId,
    setSelectedCharacterId,
  } = useAppStore();

  // データの読み込み（Safari対応：console.log削除）
  useEffect(() => {
    const loadData = async () => {
      try {
        // ストレージ状況を詳細に分析
        const storageInfo = StorageManager.getStorageInfo();
        console.log('📊 Storage info:', storageInfo);
        
        // ストレージ使用状況をチェック
        checkStorageUsage();
        
        // 詳細分析（開発環境のみ）
        if (process.env.NODE_ENV === 'development') {
          StorageAnalyzer.printAnalysis();
          StorageAnalyzer.analyzeMessages();
        }
        
        // 自動クリーンアップ
        if (StorageManager.isStorageNearLimit()) {
          console.warn('⚠️ Storage is near limit - starting cleanup');
          StorageCleaner.cleanupLocalStorage();
        }
        
        // キャラクターとペルソナを並行で読み込み（個別エラーハンドリング付き）
        await Promise.allSettled([
          loadCharactersFromPublic(),
          loadPersonasFromPublic()
        ]);
      } catch (error) {
        console.error('❌ AppInitializer error:', error);
      }
    };

    if (!isCharactersLoaded || !isPersonasLoaded) {
      loadData();
    }
  }, [isCharactersLoaded, isPersonasLoaded, loadCharactersFromPublic, loadPersonasFromPublic, characters.size, personas.size]);

  // セッションの初期化（Safari対応：console.log削除）
  useEffect(() => {
    // データが読み込まれるまで待機
    if (!isCharactersLoaded || !isPersonasLoaded) {
      return;
    }

    // セッションが存在する場合の処理
    if (sessions.size > 0) {
      // しかし、選択中のキャラクターがいない場合
      if (!selectedCharacterId) {
        // アクティブなセッション、または最初のセッションを取得
        const sessionToSetActive = sessions.get(active_session_id!) || sessions.values().next().value;
        if (sessionToSetActive && sessionToSetActive.participants.characters.length > 0) {
          const charId = sessionToSetActive.participants.characters[0].id;
          setSelectedCharacterId(charId);
        }
      }
      return; // セッションがあるので初期化は不要
    }

    // 以下はセッションが一つもない場合（初回起動時など）の処理
    const initializeSession = async () => {
      // 最初のキャラクターとアクティブなペルソナを取得
      const firstCharacter = characters.values().next().value;
      const activePersona = getSelectedPersona();

      if (firstCharacter && activePersona) {
        try {
          await createSession(firstCharacter, activePersona);
          console.log('✅ 初期セッションを作成しました');
        } catch (error) {
          console.error('❌ 初期セッション作成エラー:', error);
          // セッション作成が失敗した場合、少し待ってからリトライ
          setTimeout(async () => {
            try {
              console.log('🔄 セッション作成をリトライします...');
              await createSession(firstCharacter, activePersona);
              console.log('✅ リトライでセッション作成成功');
            } catch (retryError) {
              console.error('❌ セッション作成リトライも失敗:', retryError);
              // 最後の手段：ストレージをクリアして再初期化を促す
              if (typeof window !== 'undefined') {
                localStorage.removeItem('ai-chat-sessions');
                localStorage.removeItem('ai-chat-active-session');
                console.log('🧹 破損データをクリアしました。ページをリロードしてください。');
              }
            }
          }, 2000);
        }
      } else {
        console.warn('⚠️ セッション作成に必要なデータが不足:', {
          hasCharacter: !!firstCharacter,
          hasPersona: !!activePersona,
          charactersCount: characters.size,
          personasCount: personas.size
        });
      }
    };

    initializeSession();
  }, [isCharactersLoaded, isPersonasLoaded, characters, personas, sessions, getSelectedPersona, createSession, selectedCharacterId, setSelectedCharacterId, active_session_id]);

  return (
    <AppearanceProvider>
      {children}
    </AppearanceProvider>
  );
};

export default AppInitializer;