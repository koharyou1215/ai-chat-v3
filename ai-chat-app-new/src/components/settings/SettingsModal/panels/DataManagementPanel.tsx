"use client";

import React, { useState, useEffect } from "react";
import { Database, Sparkles, X } from "lucide-react";
import { StorageManager } from "@/utils/storage";
import { useAppStore } from "@/store";

const DataManagementPanel: React.FC = () => {
  const [storageInfo, setStorageInfo] = useState<{
    totalSize: number;
    sizeInMB: number;
    itemCount: number;
    mainStorageSize: number;
  }>({ totalSize: 0, sizeInMB: 0, itemCount: 0, mainStorageSize: 0 });

  const [isCleaningUp, setIsCleaningUp] = useState(false);

  useEffect(() => {
    const updateStorageInfo = () => {
      const info = StorageManager.getStorageInfo();
      setStorageInfo(info);
    };

    updateStorageInfo();
    // 定期的に更新
    const interval = setInterval(updateStorageInfo, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleCleanup = async () => {
    if (
      !confirm(
        "古いチャット履歴とメモリーカードを削除してストレージを最適化します。続行しますか？"
      )
    ) {
      return;
    }

    setIsCleaningUp(true);
    try {
      const success = StorageManager.cleanupOldData();
      if (success) {
        // 情報を更新
        const info = StorageManager.getStorageInfo();
        setStorageInfo(info);
        alert("ストレージのクリーンアップが完了しました。");
      } else {
        alert("クリーンアップに失敗しました。");
      }
    } catch (error) {
      console.error("Cleanup error:", error);
      alert("クリーンアップ中にエラーが発生しました。");
    } finally {
      setIsCleaningUp(false);
    }
  };

  const handleClearAll = async () => {
    if (
      !confirm(
        "⚠️ 警告: すべてのチャット履歴、設定、データが完全に削除されます。\n\nこの操作は取り消せません。続行しますか？"
      )
    ) {
      return;
    }

    if (!confirm("本当によろしいですか？すべてのデータが失われます。")) {
      return;
    }

    try {
      const success = StorageManager.clearAllData();
      if (success) {
        alert("すべてのデータが削除されました。ページが再読み込みされます。");
        window.location.reload();
      } else {
        alert("データの削除に失敗しました。");
      }
    } catch (error) {
      console.error("Clear all error:", error);
      alert("データ削除中にエラーが発生しました。");
    }
  };

  const isNearLimit = StorageManager.isStorageNearLimit();
  const usagePercentage = Math.min((storageInfo.sizeInMB / 5) * 100, 100); // 5MBを100%として計算

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <Database className="w-6 h-6 text-blue-400" />
        <h3 className="text-xl font-semibold text-white">ストレージ管理</h3>
      </div>

      {/* ストレージ使用量表示 */}
      <div className="bg-slate-800/50 p-4 rounded-lg border border-gray-600">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-300">ストレージ使用量</span>
          <span
            className={`text-sm font-mono ${
              isNearLimit ? "text-yellow-400" : "text-gray-400"
            }`}>
            {storageInfo.sizeInMB.toFixed(2)} MB
          </span>
        </div>

        <div className="w-full bg-gray-700 rounded-full h-2 mb-3">
          <div
            className={`h-2 rounded-full transition-all ${
              usagePercentage > 80
                ? "bg-red-500"
                : usagePercentage > 60
                ? "bg-yellow-500"
                : "bg-blue-500"
            }`}
            style={{ width: `${usagePercentage}%` }}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">アプリデータ:</span>
            <span className="ml-2 text-white font-mono">
              {(storageInfo.mainStorageSize / (1024 * 1024)).toFixed(2)} MB
            </span>
          </div>
          <div>
            <span className="text-gray-400">項目数:</span>
            <span className="ml-2 text-white font-mono">
              {storageInfo.itemCount}
            </span>
          </div>
        </div>

        {isNearLimit && (
          <div className="mt-3 p-2 bg-yellow-900/30 border border-yellow-600/50 rounded text-sm text-yellow-200">
            ⚠️
            ストレージ使用量が上限に近づいています。クリーンアップをお勧めします。
          </div>
        )}
      </div>

      {/* 個別削除機能 */}
      <div className="space-y-4">
        <h4 className="text-lg font-medium text-white">個別データ削除</h4>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => {
              if (confirm("すべてのチャット履歴を削除しますか？")) {
                const store = useAppStore.getState();
                store.sessions.clear();
                store.active_session_id = null;
                alert("チャット履歴を削除しました");
                window.location.reload();
              }
            }}
            className="px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm transition-colors">
            チャット履歴を削除
          </button>

          <button
            onClick={() => {
              if (confirm("すべてのメモリーカードを削除しますか？")) {
                const store = useAppStore.getState();
                if (store.memoryCards) {
                  store.memoryCards = [];
                }
                if (store.memories) {
                  store.memories = [];
                }
                alert("メモリーカードを削除しました");
                window.location.reload();
              }
            }}
            className="px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm transition-colors">
            メモリーカードを削除
          </button>
        </div>

        <div className="w-full">
          <button
            onClick={() => {
              if (
                confirm(
                  "アップロードされた画像をすべて削除しますか？大幅に容量を節約できます。"
                )
              ) {
                let deletedCount = 0;
                let savedMB = 0;
                for (let i = localStorage.length - 1; i >= 0; i--) {
                  const key = localStorage.key(i);
                  if (key) {
                    const value = localStorage.getItem(key) || "";
                    if (
                      key.includes("image") ||
                      key.includes("upload") ||
                      value.startsWith("data:image")
                    ) {
                      const sizeMB = new Blob([value]).size / (1024 * 1024);
                      localStorage.removeItem(key);
                      deletedCount++;
                      savedMB += sizeMB;
                    }
                  }
                }
                alert(
                  `画像${deletedCount}個を削除し、${savedMB.toFixed(
                    2
                  )}MBを節約しました`
                );
                window.location.reload();
              }
            }}
            className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors">
            🌇 アップロード画像を削除（大幅に容量削減）
          </button>
        </div>
      </div>

      {/* クリーンアップオプション */}
      <div className="space-y-4">
        <h4 className="text-lg font-medium text-white">データ管理</h4>

        <div className="space-y-3">
          <button
            onClick={handleCleanup}
            disabled={isCleaningUp}
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2">
            {isCleaningUp ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                クリーンアップ中...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                ストレージを最適化
              </>
            )}
          </button>
          <p className="text-xs text-gray-400 text-center">
            古いチャット履歴とメモリーカードを削除してストレージ容量を確保します
          </p>
        </div>

        <div className="border-t border-gray-600 pt-4">
          <button
            onClick={handleClearAll}
            className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2">
            <X className="w-4 h-4" />
            全データを削除
          </button>
          <p className="text-xs text-gray-400 text-center mt-2">
            ⚠️ すべてのチャット履歴、設定、データが完全に削除されます
          </p>
        </div>
      </div>

      {/* ヘルプ情報 */}
      <div className="bg-slate-900/50 p-4 rounded-lg border border-gray-700">
        <h5 className="text-sm font-medium text-white mb-2">
          💡 ストレージについて
        </h5>
        <ul className="text-xs text-gray-400 space-y-1">
          <li>• チャット履歴は最新10セッションまで自動保持</li>
          <li>• メモリーカードは最新100件まで自動保持</li>
          <li>• ストレージが満杯になると自動でクリーンアップされます</li>
          <li>• 設定とAPIキーは常に保持されます</li>
        </ul>
      </div>
    </div>
  );
};

export default DataManagementPanel;
