'use client';

import { useEffect, ReactNode } from 'react';
import { useAppStore } from '@/store';
import { StorageManager } from '@/utils/storage-cleanup';
import { StorageAnalyzer } from '@/utils/storage-analyzer';
import { StorageCleaner } from '@/utils/storage-cleaner';
import { checkStorageUsage } from '@/utils/check-storage';
import { AppearanceProvider } from '@/components/providers/AppearanceProvider';
import { PreloadStrategies, BundleAnalysis } from '@/utils/dynamic-imports';

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
    effectSettings, // Add effect settings for preloading
    loadStoreFromStorage, // Add store loading
  } = useAppStore();

  // データの読み込み（Safari対応：console.log削除）+ Performance optimization
  useEffect(() => {
    const loadData = async () => {
      try {
        // Performance monitoring start
        const loadStartTime = performance.now();
        
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
          const cleanupResult = StorageCleaner.cleanupLocalStorage();
          console.log('🧹 Cleanup completed:', cleanupResult);
        }
        
        // Store data is automatically loaded by Zustand persist middleware
        // No need to manually call loadStoreFromStorage()
        
        // データの並列読み込み（パフォーマンス最適化）
        const [charactersResult, personasResult] = await Promise.allSettled([
          loadCharactersFromPublic(),
          loadPersonasFromPublic()
        ]);

        // エラーハンドリング
        if (charactersResult.status === 'rejected') {
          console.error('❌ キャラクター読み込みエラー:', charactersResult.reason);
        }
        if (personasResult.status === 'rejected') {
          console.error('❌ ペルソナ読み込みエラー:', personasResult.reason);
        }

        // Performance monitoring end
        const loadEndTime = performance.now();
        console.log(`⚡ App initialization completed in ${(loadEndTime - loadStartTime).toFixed(2)}ms`);
        
        // Preload critical components after successful data load
        PreloadStrategies.preloadCriticalComponents();
        
        // Preload effects based on user settings
        PreloadStrategies.preloadEffects(effectSettings);
        
        // Log bundle analysis in development
        if (process.env.NODE_ENV === 'development') {
          setTimeout(() => {
            BundleAnalysis.logLoadingStatus();
          }, 5000);
        }

      } catch (error) {
        console.error('❌ 初期化中にエラーが発生しました:', error);
      }
    };

    loadData();
  }, [
    loadCharactersFromPublic, 
    loadPersonasFromPublic, 
    loadStoreFromStorage,
    effectSettings
  ]);

  // セッション自動作成ロジック（パフォーマンス最適化版）
  useEffect(() => {
    const createInitialSession = async () => {
      // 読み込み完了を待つ
      if (!isCharactersLoaded || !isPersonasLoaded) return;
      
      // 既にアクティブなセッションがある場合はスキップ
      if (active_session_id && sessions.has(active_session_id)) {
        console.log('👌 既存のアクティブセッションを使用:', active_session_id);
        return;
      }

      try {
        const selectedPersona = getSelectedPersona();
        
        // キャラクターが選択されている場合
        if (selectedCharacterId && characters.has(selectedCharacterId) && selectedPersona) {
          const selectedCharacter = characters.get(selectedCharacterId);
          if (selectedCharacter) {
            console.log('🔄 選択中のキャラクターでセッション作成:', selectedCharacter.name);
            await createSession(selectedCharacter, selectedPersona);
            return;
          }
        }

        // フォールバック：最初のキャラクターを使用
        const firstCharacter = characters.values().next().value;
        if (firstCharacter && selectedPersona) {
          console.log('🎯 フォールバック：最初のキャラクターでセッション作成:', firstCharacter.name);
          await createSession(firstCharacter, selectedPersona);
          setSelectedCharacterId(firstCharacter.id);
        }
      } catch (error) {
        console.error('❌ 初期セッション作成エラー:', error);
      }
    };

    // Debounce session creation to avoid multiple calls
    const timeoutId = setTimeout(createInitialSession, 500);
    return () => clearTimeout(timeoutId);
  }, [
    isCharactersLoaded, 
    isPersonasLoaded, 
    active_session_id, 
    sessions, 
    selectedCharacterId, 
    characters, 
    getSelectedPersona, 
    createSession, 
    setSelectedCharacterId
  ]);

  return (
    <AppearanceProvider>
      {children}
    </AppearanceProvider>
  );
};

export default AppInitializer;