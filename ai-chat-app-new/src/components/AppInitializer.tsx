"use client";

import { useEffect, useState, ReactNode } from "react";
import { useAppStore } from "@/store";
import { StorageManager } from "@/utils/storage";
import { StorageAnalyzer } from "@/utils/storage-analyzer";
import { AppearanceProvider } from "@/components/providers/AppearanceProvider";
import { PreloadStrategies, BundleAnalysis } from "@/utils/dynamic-imports";
import { clearCharacterCache } from "@/utils/clear-character-cache";
import { settingsManager } from "@/services/settings-manager";

// ===== WINDOW API EXTENSION =====
interface WindowExtended extends Window {
  useAppStore?: typeof useAppStore;
}

interface AppInitializerProps {
  children: ReactNode;
}

const AppInitializer: React.FC<AppInitializerProps> = ({ children }) => {
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isMounted, setIsMounted] = useState(false);

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

  // 🔧 Hydration fix: Set mounted state on client-side only
  useEffect(() => {
    setIsMounted(true);

    // 🧪 E2Eテスト用: ブラウザコンソール/Playwrightからアクセス可能にする
    // ⚠️ HYDRATION FIX: useEffect内で実行してSSR/CSRの一貫性を保つ
    if (typeof window !== 'undefined') {
      const { useAppStore } = require('@/store');
      (window as WindowExtended).useAppStore = useAppStore;

      // 🔍 API診断ツールを初期化
      import('@/utils/api-diagnostics').then(({ printAPIDiagnostics }) => {
        console.log('\n🔍 Running API Configuration Diagnostics...');
        printAPIDiagnostics();
      }).catch(err => {
        console.error('Failed to load API diagnostics:', err);
      });
    }
  }, []);

  // ✅ FIX: settingsManager初期化を分離（無限ループ防止）
  useEffect(() => {
    // 初回のみ実行：設定の永続化を確保
    settingsManager.ensurePersistence();
  }, []); // 依存配列を空にして初回のみ実行

  useEffect(() => {
    const loadData = async () => {
      try {
        const loadStartTime = performance.now();

        const storageInfo = StorageManager.getStorageInfo();

        if (process.env.NODE_ENV === "development") {
          StorageAnalyzer.printAnalysis();
          StorageAnalyzer.analyzeMessages();
        }

        if (StorageManager.isStorageNearLimit()) {
          StorageManager.cleanupLocalStorage();
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
    effectSettings,
  ]);

  useEffect(() => {
    const createInitialSession = async () => {
      if (!isCharactersLoaded || !isPersonasLoaded) return;

      // 🆕 セッションデータの読み込み状況をログ出力（本番環境デバッグ用）
      console.log("📊 Session data check:", {
        active_session_id,
        sessionsType: sessions?.constructor?.name,
        sessionsSize: sessions instanceof Map ? sessions.size : Object.keys(sessions || {}).length,
        hasSessions: sessions && (sessions instanceof Map ? sessions.size > 0 : Object.keys(sessions).length > 0),
      });

      const hasActiveSession =
        active_session_id &&
        (sessions instanceof Map
          ? sessions.has(active_session_id)
          : sessions &&
            typeof sessions === "object" &&
            active_session_id in sessions);

      if (active_session_id && hasActiveSession) {
        console.log("?? 既存のアクティブセッションを使用:", active_session_id);
        return;
      }

      // 🆕 セッションが存在するのにアクティブセッションがない場合の警告
      if (!active_session_id && sessions instanceof Map && sessions.size > 0) {
        console.warn("⚠️ セッションは存在するが、アクティブセッションIDがありません");
        console.warn("⚠️ LocalStorageからの読み込みに問題がある可能性があります");
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
    selectedCharacterId,
    characters,
    sessions,
    getSelectedPersona,
    createSession,
    setSelectedCharacterId,
  ]);

  // エラー状態の表示
  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'transparent' }}>
        <div className="text-center max-w-md mx-auto p-6 bg-slate-800/90 backdrop-blur-md rounded-lg border border-purple-400/20">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-white mb-4">
            エラーが発生しました
          </h1>
          <p className="text-white/80 mb-6">{errorMessage}</p>
          <button
            onClick={() => {
              setHasError(false);
              setErrorMessage("");
              window.location.reload();
            }}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors">
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  // 🔧 HYDRATION FIX: Only check data loading states, not isMounted
  // isMounted check removed to ensure SSR/CSR consistency
  // Data loading states (isCharactersLoaded, isPersonasLoaded) are consistent on both server and client
  if (!isCharactersLoaded || !isPersonasLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'transparent' }}>
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
