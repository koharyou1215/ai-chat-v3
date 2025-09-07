"use client";

import { useEffect, useState, ReactNode } from "react";
import { useAppStore } from "@/store";
import { StorageManager } from "@/utils/storage-cleanup";
import { StorageAnalyzer } from "@/utils/storage-analyzer";
import { StorageCleaner } from "@/utils/storage-cleaner";
import { checkStorageUsage } from "@/utils/check-storage";
import { AppearanceProvider } from "@/components/providers/AppearanceProvider";
import { PreloadStrategies, BundleAnalysis } from "@/utils/dynamic-imports";

interface AppInitializerProps {
  children: ReactNode;
}

const AppInitializer: React.FC<AppInitializerProps> = ({ children }) => {
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

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
    effectSettings,
    loadStoreFromStorage,
  } = useAppStore();

  useEffect(() => {
    const loadData = async () => {
      try {
        const loadStartTime = performance.now();
        const storageInfo = StorageManager.getStorageInfo();
        console.log("?? Storage info:", storageInfo);
        checkStorageUsage();

        if (process.env.NODE_ENV === "development") {
          StorageAnalyzer.printAnalysis();
          StorageAnalyzer.analyzeMessages();
        }

        if (StorageManager.isStorageNearLimit()) {
          console.warn("?? Storage is near limit - starting cleanup");
          const cleanupResult = StorageCleaner.cleanupLocalStorage();
          console.log("?? Cleanup completed:", cleanupResult);
        }

        const [charactersResult, personasResult] = await Promise.allSettled([
          loadCharactersFromPublic(),
          loadPersonasFromPublic(),
        ]);

        if (charactersResult.status === "rejected") {
          console.error(
            "? キャラクター読み込みエラー:",
            charactersResult.reason
          );
        }
        if (personasResult.status === "rejected") {
          console.error("? ペルソナ読み込みエラー:", personasResult.reason);
        }

        const loadEndTime = performance.now();
        console.log(
          `? App initialization completed in ${(
            loadEndTime - loadStartTime
          ).toFixed(2)}ms`
        );

        PreloadStrategies.preloadCriticalComponents();
        PreloadStrategies.preloadEffects(effectSettings);

        if (process.env.NODE_ENV === "development") {
          setTimeout(() => {
            BundleAnalysis.logLoadingStatus();
          }, 5000);
        }
      } catch (error) {
        console.error("? 初期化中にエラーが発生しました:", error);
        setHasError(true);
        setErrorMessage(error instanceof Error ? error.message : String(error));
      }
    };

    loadData();
  }, [
    loadCharactersFromPublic,
    loadPersonasFromPublic,
    loadStoreFromStorage,
    effectSettings,
  ]);

  useEffect(() => {
    const createInitialSession = async () => {
      if (!isCharactersLoaded || !isPersonasLoaded) return;

      const hasActiveSession =
        sessions instanceof Map
          ? sessions.has(active_session_id)
          : sessions &&
            typeof sessions === "object" &&
            active_session_id in sessions;

      if (active_session_id && hasActiveSession) {
        console.log("?? 既存のアクティブセッションを使用:", active_session_id);
        return;
      }

      try {
        const selectedPersona = getSelectedPersona();

        const hasSelectedCharacter =
          selectedCharacterId &&
          (characters instanceof Map
            ? characters.has(selectedCharacterId)
            : characters[selectedCharacterId] !== undefined);

        if (hasSelectedCharacter && selectedPersona) {
          const selectedCharacter =
            characters instanceof Map
              ? characters.get(selectedCharacterId)
              : characters[selectedCharacterId];
          if (selectedCharacter) {
            console.log(
              "?? 選択中のキャラクターでセッション作成:",
              selectedCharacter.name
            );
            await createSession(selectedCharacter, selectedPersona);
            return;
          }
        }

        const firstCharacter = characters.values().next().value;
        if (firstCharacter && selectedPersona) {
          console.log(
            "?? フォールバック：最初のキャラクターでセッション作成:",
            firstCharacter.name
          );
          await createSession(firstCharacter, selectedPersona);
          setSelectedCharacterId(firstCharacter.id);
        }
      } catch (error) {
        console.error("? 初期セッション作成エラー:", error);
        setHasError(true);
        setErrorMessage(error instanceof Error ? error.message : String(error));
      }
    };

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
    setSelectedCharacterId,
  ]);

  // エラー状態の表示
  if (hasError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-white mb-4">エラーが発生しました</h1>
          <p className="text-white/80 mb-6">{errorMessage}</p>
          <button
            onClick={() => {
              setHasError(false);
              setErrorMessage("");
              window.location.reload();
            }}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  // ローディング状態の表示
  if (!isCharactersLoaded || !isPersonasLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p className="text-white/80">アプリケーションを読み込み中...</p>
        </div>
      </div>
    );
  }

  return <AppearanceProvider>{children}</AppearanceProvider>;
};

export default AppInitializer;
