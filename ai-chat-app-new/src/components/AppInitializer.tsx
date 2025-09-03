"use client";

import { useEffect, ReactNode } from "react";
import { useAppStore } from "@/store";
import { StorageManager } from "@/utils/storage-cleanup";
import { StorageAnalyzer } from "@/utils/storage-analyzer";
import { StorageCleaner } from "@/utils/storage-cleaner";
import { checkStorageUsage } from "@/utils/check-storage";
import { AppearanceProvider } from "@/components/providers/AppearanceProvider";
import { PreloadStrategies, BundleAnalysis } from "@/utils/dynamic-imports";
import { initializeModelMigration } from "@/utils/model-migration";
import { serverLog } from "@/utils/server-logger";

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
  } = useAppStore();

  // データの読み込み（Safari対応：console.log削除）+ Performance optimization
  useEffect(() => {
    const loadData = async () => {
      try {
        // Performance monitoring start
        const loadStartTime = performance.now();
        serverLog("init:start", {});

        // 🔧 レガシーモデル名の自動移行（最優先で実行）
        initializeModelMigration();

        // ストレージ状況を詳細に分析
        const storageInfo = StorageManager.getStorageInfo();
        serverLog("storage:info", storageInfo);

        // ストレージ使用状況をチェック
        checkStorageUsage();

        // 詳細分析（開発環境のみ）
        if (process.env.NODE_ENV === "development") {
          StorageAnalyzer.printAnalysis();
          StorageAnalyzer.analyzeMessages();
        }

        // 自動クリーンアップ
        if (StorageManager.isStorageNearLimit()) {
          serverLog("storage:cleanup:start");
          const cleanupResult = StorageCleaner.cleanupLocalStorage();
          serverLog("storage:cleanup:done", cleanupResult);
        }

        // Store data is automatically loaded by Zustand persist middleware
        // No need to manually call loadStoreFromStorage()

        // データの並列読み込み（パフォーマンス最適化）
        const [charactersResult, personasResult] = await Promise.allSettled([
          loadCharactersFromPublic(),
          loadPersonasFromPublic(),
        ]);

        // エラーハンドリング
        if (charactersResult.status === "rejected") {
          serverLog("load:characters:error", String(charactersResult.reason));
        }
        if (personasResult.status === "rejected") {
          serverLog("load:personas:error", String(personasResult.reason));
        }

        // Performance monitoring end
        const loadEndTime = performance.now();
        serverLog("init:completed", { ms: Number((loadEndTime - loadStartTime).toFixed(2)) });

        // Preload critical components after successful data load
        PreloadStrategies.preloadCriticalComponents();

        // Preload effects based on user settings
        PreloadStrategies.preloadEffects(effectSettings);

        // Log bundle analysis in development
        if (process.env.NODE_ENV === "development") {
          setTimeout(() => {
            BundleAnalysis.logLoadingStatus();
          }, 5000);
        }
      } catch (error) {
        serverLog("init:error", String(error));
      }
    };

    loadData();
  }, [loadCharactersFromPublic, loadPersonasFromPublic, effectSettings]);

  // セッション自動作成ロジック（パフォーマンス最適化版）
  useEffect(() => {
    const createInitialSession = async () => {
      // 読み込み完了を待つ（フラグ OR 実データサイズ）
      const safeCharactersSize =
        characters instanceof Map ? characters.size : 0;
      const safePersonasSize = personas instanceof Map ? personas.size : 0;
      const flagsReady = isCharactersLoaded && isPersonasLoaded;
      const dataReady = safeCharactersSize > 0 && safePersonasSize > 0;
      serverLog("session:auto:guard", { flagsReady, dataReady, safeCharactersSize, safePersonasSize });
      if (!flagsReady && !dataReady) return;

      // 既にアクティブなセッションがある場合はスキップ
      if (active_session_id && sessions.has(active_session_id)) {
        serverLog("session:auto:reuse", { active_session_id });
        return;
      }

      try {
        const selectedPersona = getSelectedPersona();

        // キャラクターが選択されている場合
        if (
          selectedCharacterId &&
          characters.has(selectedCharacterId) &&
          selectedPersona
        ) {
          const selectedCharacter = characters.get(selectedCharacterId);
          if (selectedCharacter) {
            serverLog("session:auto:create:selected", { character: selectedCharacter.name });
            await createSession(selectedCharacter, selectedPersona);
            return;
          }
        }

        // フォールバック：最初のキャラクターを使用
        const firstCharacter = characters.values().next().value;
        if (firstCharacter && selectedPersona) {
          serverLog("session:auto:create:first", { character: firstCharacter.name });
          await createSession(firstCharacter, selectedPersona);
          setSelectedCharacterId(firstCharacter.id);
        }
      } catch (error) {
        serverLog("session:auto:error", String(error));
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
    personas,
    getSelectedPersona,
    createSession,
    setSelectedCharacterId,
  ]);

  return <AppearanceProvider>{children}</AppearanceProvider>;
};

export default AppInitializer;
