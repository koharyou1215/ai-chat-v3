"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Character, UnifiedMessage, Persona, UUID } from "@/types";
import { useAppStore } from "@/store";
import { MessageBubble } from "./MessageBubble";
import { MessageInput } from "./MessageInput";
import { ChatHeader } from "./ChatHeader";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, User } from "lucide-react";
// 一時対処: トラッカーUIが操作を阻害するため、読み込みを停止

interface ChatInterfaceProps {
  onBack?: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ onBack }) => {
  const {
    sessions,
    active_session_id,
    selectedCharacterId,
    addMessage,
    updateMessage,
    getSelectedPersona,
    groupSessions,
    active_group_session_id,
    is_group_mode,
    setSelectedCharacterId,
    characters,
    personas,
    isCharactersLoaded,
    isPersonasLoaded,
    createSession,
    setActiveSession,
  } = useAppStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initializationAttempts, setInitializationAttempts] = useState(0);
  const maxInitializationAttempts = 3; // Reduce attempts to prevent infinite loop

  // フェイルセーフ: 即時セッション作成（UIボタン用）
  const quickStart = useCallback(async () => {
    try {
      const safeCharacters = characters instanceof Map ? characters : new Map();
      const safePersonas = personas instanceof Map ? personas : new Map();
      const persona = getSelectedPersona();
      const firstCharacter = safeCharacters.values().next().value as
        | Character
        | undefined;
      if (!firstCharacter || !persona) {
        console.error("❌ QuickStart失敗: データ不足", {
          hasChar: !!firstCharacter,
          hasPersona: !!persona,
          chars: safeCharacters.size,
          pers: safePersonas.size,
        });
        return;
      }
      const sid = await createSession(firstCharacter, persona);
      if (sid) {
        setSelectedCharacterId(firstCharacter.id);
        setIsInitialized(true);
      }
    } catch (e) {
      console.error("❌ QuickStartエラー", e);
    }
  }, [
    characters,
    personas,
    getSelectedPersona,
    createSession,
    setSelectedCharacterId,
  ]);

  // ローカルストレージ修復（キー削除→再読み込み）
  const repairStorageAndReload = useCallback(() => {
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
        } catch (_) {}
      });
      window.location.reload();
    } catch (e) {
      console.error("❌ ストレージ修復失敗", e);
    }
  }, []);

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  // 🔧 **Map型安全確保 - personas.keys エラー修正**
  const getPersonasList = useCallback(() => {
    try {
      if (!personas) return [];

      // personasがMapインスタンスかチェック
      if (personas instanceof Map) {
        return Array.from(personas.keys()).slice(0, 3);
      }

      // オブジェクト形式の場合
      if (typeof personas === "object" && personas !== null) {
        return Object.keys(personas).slice(0, 3);
      }

      return [];
    } catch (error) {
      console.error("🚨 personas.keys エラーをキャッチ:", error);
      return [];
    }
  }, [personas]);

  // セッション自動初期化ロジック（エラー処理強化版）
  useEffect(() => {
    const initializeSessionSafely = async () => {
      // 初期化試行回数制限
      if (initializationAttempts >= maxInitializationAttempts) {
        console.warn("⚠️ セッション初期化を最大試行回数に達したため強制初期化");
        setIsInitialized(true); // Force initialization to stop infinite loop
        return;
      }

      // 既に初期化済みの場合はスキップ
      if (isInitialized) {
        return;
      }

      try {
        // データ読み込み確認（安全性チェック付き）
        const safeCharactersSize =
          characters instanceof Map ? characters.size : 0;
        const safePersonasSize = personas instanceof Map ? personas.size : 0;

        if (
          !isCharactersLoaded ||
          !isPersonasLoaded ||
          safeCharactersSize === 0 ||
          safePersonasSize === 0
        ) {
          console.log("⏳ データ読み込み未完了 - 次の機会に初期化を試行");
          setInitializationAttempts((prev) => prev + 1);
          return;
        }

        // セッション存在確認（型安全）
        const safeSessions = sessions instanceof Map ? sessions : new Map();
        if (active_session_id && safeSessions.has(active_session_id)) {
          console.log("✅ 既存セッション確認完了");
          setIsInitialized(true);
          return;
        }

        // グループモードのセッション確認（型安全）
        const safeGroupSessions =
          groupSessions instanceof Map ? groupSessions : new Map();
        if (
          is_group_mode &&
          active_group_session_id &&
          safeGroupSessions.has(active_group_session_id)
        ) {
          console.log("✅ 既存グループセッション確認完了");
          setIsInitialized(true);
          return;
        }

        // セッション作成のためのデータ準備
        console.log("🔍 セッション作成準備中...");

        let targetCharacter: Character | null = null;

        // 選択されたキャラクターを取得
        if (
          selectedCharacterId &&
          characters instanceof Map &&
          characters.has(selectedCharacterId)
        ) {
          targetCharacter = characters.get(selectedCharacterId) || null;
        }

        // フォールバック：最初のキャラクターを使用
        if (
          !targetCharacter &&
          characters instanceof Map &&
          characters.size > 0
        ) {
          targetCharacter = characters.values().next().value || null;
        }

        // ペルソナを取得
        const selectedPersona = getSelectedPersona();

        if (!targetCharacter || !selectedPersona) {
          console.error("❌ セッション作成に必要なデータが不足:", {
            hasCharacter: !!targetCharacter,
            hasPersona: !!selectedPersona,
            charactersSize: safeCharactersSize,
            personasSize: safePersonasSize,
          });
          setInitializationAttempts((prev) => prev + 1);
          return;
        }

        // セッション作成実行
        console.log("🎯 セッション作成実行:", targetCharacter.name);
        const sessionId = await createSession(targetCharacter, selectedPersona);

        // 成功時の処理
        if (sessionId) {
          setSelectedCharacterId(targetCharacter.id);
          console.log("✅ セッション初期化完了:", sessionId);
          setIsInitialized(true);
        } else {
          console.warn("⚠️ セッション作成が失敗");
          setInitializationAttempts((prev) => prev + 1);
        }
      } catch (error) {
        console.error("❌ セッション初期化エラー:", error);
        setInitializationAttempts((prev) => prev + 1);
      }
    };

    // Debounce to prevent excessive calls
    const timeoutId = setTimeout(initializeSessionSafely, 200);
    return () => clearTimeout(timeoutId);
  }, [
    isCharactersLoaded,
    isPersonasLoaded,
    active_session_id,
    active_group_session_id,
    is_group_mode,
    selectedCharacterId,
    characters,
    personas,
    sessions,
    groupSessions,
    getSelectedPersona,
    createSession,
    setSelectedCharacterId,
    isInitialized,
    initializationAttempts,
  ]);

  const currentSession = is_group_mode
    ? groupSessions instanceof Map
      ? groupSessions.get(active_group_session_id || "")
      : undefined
    : sessions instanceof Map
    ? sessions.get(active_session_id || "")
    : undefined;

  // メッセージ履歴を安全に取得
  const messages: UnifiedMessage[] = currentSession?.messages || [];

  // 選択されたキャラクター情報を安全に取得
  const selectedCharacter =
    selectedCharacterId && characters instanceof Map
      ? characters.get(selectedCharacterId)
      : null;

  if (!currentSession || !selectedCharacter) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-400">
            {!isCharactersLoaded || !isPersonasLoaded
              ? "データを読み込み中..."
              : "セッションを初期化中..."}
          </p>
          <p className="text-sm text-gray-500">
            試行 {initializationAttempts + 1}/{maxInitializationAttempts}
          </p>
          {/* フェイルセーフ操作 */}
          <div className="flex items-center justify-center gap-2">
            <Button onClick={quickStart} variant="default" size="sm">
              クイックスタート
            </Button>
            <Button
              onClick={repairStorageAndReload}
              variant="outline"
              size="sm">
              修復して再読み込み
            </Button>
          </div>

          {initializationAttempts >= maxInitializationAttempts - 1 && (
            <div className="space-y-2">
              <p className="text-red-500 text-sm">
                初期化に時間がかかっています
              </p>
              <div className="space-x-2">
                <Button
                  onClick={() => {
                    setInitializationAttempts(0);
                    setIsInitialized(false);
                  }}
                  variant="outline"
                  size="sm">
                  再試行
                </Button>
                <Button
                  onClick={() => {
                    setIsInitialized(true);
                  }}
                  variant="default"
                  size="sm">
                  スキップ
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full relative">
      {/* Header */}
      <ChatHeader
        character={selectedCharacter}
        onBack={onBack}
        showModeSwitch={true}
        isGroupMode={is_group_mode}
        onModeSwitch={(isGroup: boolean) => {
          if (isGroup) {
            // Switch to group mode logic
            console.log("Switching to group mode");
          } else {
            // Switch to solo mode logic
            console.log("Switching to solo mode");
          }
        }}
      />

      {/* Tracker Display は一時的に無効化 */}

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((message, index) => (
          <MessageBubble
            key={`${message.id || index}-${message.timestamp || Date.now()}`}
            message={message}
            selectedCharacter={selectedCharacter}
            isGroupMode={is_group_mode}
            isLatest={index === messages.length - 1}
            isGroupChat={is_group_mode}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t border-gray-200 dark:border-gray-700">
        <MessageInput
          sessionId={currentSession.id}
          character={selectedCharacter}
          isGroupMode={is_group_mode}
        />
      </div>
    </div>
  );
};

export default ChatInterface;
