"use client";

import React, { useCallback, useState } from "react";
import { useAppStore } from "@/store";
import { Character } from "@/types";

// どんな状態でも画面上に出る最小限の復旧ウィジェット
// - 高い z-index で常時表示
// - セッションを強制作成 / ストレージ修復+再読込
const RecoveryWidget: React.FC = () => {
  const {
    characters,
    personas,
    getSelectedPersona,
    createSession,
    setSelectedCharacterId,
    setShowSettingsModal,
  } = useAppStore();

  const [open, setOpen] = useState(false);

  const quickStart = useCallback(async () => {
    try {
      const chars = characters instanceof Map ? characters : new Map();
      const persona = getSelectedPersona();
      const firstCharacter = chars.values().next().value as
        | Character
        | undefined;
      if (!firstCharacter || !persona) {
        alert("データが読み込み中です。数秒後に再試行してください。");
        return;
      }
      const sid = await createSession(firstCharacter, persona);
      if (sid) {
        setSelectedCharacterId(firstCharacter.id);
        setOpen(false);
        // URLに quickstart=1 を付けることで初期化ガードをバイパス
        try {
          const url = new URL(window.location.href);
          url.searchParams.set("quickstart", "1");
          window.history.replaceState({}, "", url.toString());
        } catch {}
      }
    } catch (e) {
      alert(
        "クイックスタートに失敗しました。ページを再読み込みして再試行してください。"
      );
    }
  }, [characters, getSelectedPersona, createSession, setSelectedCharacterId]);

  const repairAndReload = useCallback(() => {
    try {
      const keys = [
        "ai-chat-v3-storage",
        "chat-app-settings",
        "ai-chat-sessions",
        "ai-chat-active-session",
        "ai-chat-group-sessions",
      ];
      keys.forEach((k) => {
        try {
          localStorage.removeItem(k);
        } catch {
          /* noop */
        }
      });
      location.reload();
    } catch {
      location.reload();
    }
  }, []);

  const openSettings = useCallback(() => {
    try {
      setShowSettingsModal(true, "ai");
      setOpen(false);
    } catch {}
  }, [setShowSettingsModal]);

  return (
    <div
      className="fixed bottom-4 left-4 z-[9999] select-none"
      style={{ pointerEvents: "auto" }}>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="px-3 py-2 rounded-full bg-purple-600 text-white text-xs shadow-lg hover:bg-purple-700"
          title="復旧メニューを開く">
          復旧
        </button>
      ) : (
        <div className="p-3 rounded-xl bg-slate-900/95 border border-white/10 shadow-2xl backdrop-blur-md space-y-2 w-48">
          <div className="text-xs text-white/80">緊急復旧</div>
          <button
            onClick={openSettings}
            className="w-full px-3 py-1.5 rounded-md bg-blue-600 text-white text-xs hover:bg-blue-700">
            AI設定を開く
          </button>
          <button
            onClick={quickStart}
            className="w-full px-3 py-1.5 rounded-md bg-purple-600 text-white text-xs hover:bg-purple-700">
            クイックスタート
          </button>
          <button
            onClick={repairAndReload}
            className="w-full px-3 py-1.5 rounded-md bg-slate-700 text-white text-xs hover:bg-slate-600">
            修復して再読み込み
          </button>
          <button
            onClick={() => setOpen(false)}
            className="w-full px-3 py-1.5 rounded-md bg-slate-800 text-white/80 text-xs hover:bg-slate-700">
            閉じる
          </button>
        </div>
      )}
    </div>
  );
};

export default RecoveryWidget;
