"use client";

import React, {
  useRef,
  useEffect,
  useState,
  useMemo,
  useCallback,
  Suspense,
} from "react";
import { MotionLoaders } from "@/components/optimized/FramerMotionOptimized";
import { useAppStore } from "@/store";
import { MessageBubble } from "./MessageBubble";
import { MessageInput } from "./MessageInput";
import { ChatHeader } from "./ChatHeader";
import { Bot, Brain, X, BarChart3, History, Layers } from "lucide-react";
import { CharacterGalleryModal } from "../character/CharacterGalleryModal"; // Keep non-lazy for critical path

// Lazy imports with centralized loading fallbacks
import {
  PersonaGalleryModal,
  SettingsModal,
  ChatHistoryModal,
  VoiceSettingsModal,
  CharacterForm,
  SuggestionModal,
  ScenarioSetupModal,
  MemoryGallery,
  TrackerDisplay,
  HistorySearch,
  MemoryLayerDisplay,
  ModalLoadingFallback,
  PanelLoadingFallback,
} from "../lazy/LazyComponents";
import { EnhancementModal } from "./EnhancementModal";

import { GroupChatInterface } from "./GroupChatInterface";
import ChatSidebar from "./ChatSidebar";
import { ClientOnlyProvider } from "@/components/providers/ClientOnlyProvider";
import { cn } from "@/lib/utils";
import { Character } from "@/types/core/character.types";
import { UnifiedMessage } from "@/types/core/message.types";
import { GroupChatSession } from "@/types/core/group-chat.types";
import useVH from "@/hooks/useVH";
import { SDTestButton } from "../debug/SDTestButton";
import { selectBackgroundImageURL } from "@/utils/device-detection";
import type { AnimatePresence as AnimatePresenceType } from 'framer-motion';

// メッセージ入力欄ラッパーコンポーネント
const MessageInputWrapper: React.FC = () => {
  return <MessageInput />;
};

const EmptyState = () => {
  const {
    characters,
    personas,
    createSession,
    getSelectedPersona,
    toggleLeftSidebar,
    isCharactersLoaded,
    isPersonasLoaded,
  } = useAppStore();

  const handleQuickStart = useCallback(async () => {
    // 最初のキャラクターとアクティブなペルソナを取得
    const firstCharacter = characters.values().next().value;
    const activePersona = getSelectedPersona();

    if (firstCharacter && activePersona) {
      try {
        await createSession(firstCharacter, activePersona);
        console.log("✅ セッションを自動作成しました");
      } catch (error) {
        console.error("❌ セッション作成エラー:", error);
        alert("セッションの作成に失敗しました。ページをリロードしてください。");
      }
    } else {
      console.warn("⚠️ キャラクターまたはペルソナが見つかりません");
      alert(
        "キャラクターまたはペルソナが読み込まれていません。サイドバーから選択してください。"
      );
      toggleLeftSidebar();
    }
  }, [characters, getSelectedPersona, createSession, toggleLeftSidebar]);

  return (
    <div
      className="flex flex-col items-center justify-center h-full text-center text-white/50 space-y-6"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        width: "100%",
        color: "rgba(255, 255, 255, 0.5)",
        // 背景色を削除 - 背景画像を透けて見せる
      }}>
      <Bot size={48} className="mb-4" />
      <h2
        className="text-xl font-semibold"
        style={{ fontSize: "1.25rem", fontWeight: 600 }}>
        セッションがありません
      </h2>
      <p>キャラクターを選択して会話を始めましょう。</p>

      <div className="flex flex-col sm:flex-row gap-4 mt-6">
        <button
          onClick={() => toggleLeftSidebar()}
          className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2">
          <Bot size={20} />
          キャラクターを選択
        </button>

        {isCharactersLoaded && isPersonasLoaded && characters.size > 0 && (
          <button
            onClick={handleQuickStart}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2">
            ⚡ クイックスタート
          </button>
        )}
      </div>

      {(!isCharactersLoaded || !isPersonasLoaded) && (
        <p className="text-sm text-white/30 mt-4">データを読み込み中...</p>
      )}
    </div>
  );
};

// Optimized ThinkingIndicator with lazy motion loading
const ThinkingIndicator = () => {
  const [MotionDiv, setMotionDiv] = useState<any>(null);

  useEffect(() => {
    MotionLoaders.core().then(({ motion }) => {
      setMotionDiv(() => motion.div);
    });
  }, []);

  if (!MotionDiv)
    return (
      <div className="flex items-center justify-center p-4">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
          <div
            className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"
            style={{ animationDelay: "0.2s" }}
          />
          <div
            className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"
            style={{ animationDelay: "0.4s" }}
          />
          <span className="text-sm text-white/60">AIが考え中...</span>
        </div>
      </div>
    );

  return (
    <div className="flex items-center justify-center p-4">
      <div className="flex items-center space-x-2">
        <MotionDiv
          className="w-2 h-2 bg-purple-400 rounded-full"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <MotionDiv
          className="w-2 h-2 bg-purple-400 rounded-full"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.2,
          }}
        />
        <MotionDiv
          className="w-2 h-2 bg-purple-400 rounded-full"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.4,
          }}
        />
        <span className="text-sm text-white/60">AIが考え中...</span>
      </div>
    </div>
  );
};

// 🚀 Static tab definitions (outside component for performance)
const TAB_DEFINITIONS = [
  { key: "memory" as const, icon: Brain, label: "メモリー" },
  { key: "tracker" as const, icon: BarChart3, label: "トラッカー" },
  { key: "history" as const, icon: History, label: "履歴検索" },
  { key: "layers" as const, icon: Layers, label: "記憶層" },
] as const;

type TabKey = typeof TAB_DEFINITIONS[number]["key"];

// 🚀 Optimized tab content component (React.memo to prevent unnecessary re-renders)
interface TabContentProps {
  activeTab: TabKey;
  displaySessionId: string;
  currentCharacterId: string | undefined;
}

const TabContent = React.memo<TabContentProps>(({ activeTab, displaySessionId, currentCharacterId }) => {
  switch (activeTab) {
    case "memory":
      return (
        <Suspense fallback={<PanelLoadingFallback />}>
          <MemoryGallery
            session_id={displaySessionId}
            character_id={currentCharacterId!}
          />
        </Suspense>
      );
    case "tracker":
      return (
        <Suspense fallback={<PanelLoadingFallback />}>
          <TrackerDisplay
            session_id={displaySessionId}
            character_id={currentCharacterId!}
          />
        </Suspense>
      );
    case "history":
      return (
        <Suspense fallback={<PanelLoadingFallback />}>
          <HistorySearch session_id={displaySessionId} />
        </Suspense>
      );
    case "layers":
      return (
        <Suspense fallback={<PanelLoadingFallback />}>
          <MemoryLayerDisplay session_id={displaySessionId} />
        </Suspense>
      );
    default:
      return null;
  }
});

TabContent.displayName = "TabContent";

// SSR安全なチャットインターフェースコンテンツ
const ChatInterfaceContent: React.FC = () => {
  // keyboard hook removed for simplicity
  const {
    getActiveSession,
    is_generating,
    showSettingsModal,
    setShowSettingsModal,
    initialSettingsTab,
    showCharacterForm,
    editingCharacter,
    closeCharacterForm,
    saveCharacter,
    showSuggestionModal,
    setShowSuggestionModal,
    suggestions,
    isGeneratingSuggestions,
    generateSuggestions,
    // Text enhancement modal
    showEnhancementModal,
    setShowEnhancementModal,
    enhancedText,
    isEnhancingText,
    enhanceTextForModal,
    systemPrompts,
    currentInputText,
    setCurrentInputText,
    isLeftSidebarOpen, // isLeftSidebarOpen をストアから取得
    isRightPanelOpen, // isRightPanelOpen をストアから取得
    setRightPanelOpen, // setRightPanelOpen をストアから取得
    getSelectedCharacter, // getSelectedCharacter をストアから取得
    is_group_mode,
    group_generating,
    active_group_session_id,
    groupSessions,
    updateGroupMembers, // 追加
    createGroupSession, // createGroupSession をストアから取得
    isGroupMemberModalOpen, // 追加
    toggleGroupMemberModal, // 追加
    isGroupCreationModalOpen, // 新規作成用モーダル状態を取得
    toggleGroupCreationModal, // 新規作成用アクションを取得
    isScenarioModalOpen, // 追加
    toggleScenarioModal, // 追加
    appearanceSettings, // 背景設定の競合を解決するために追加
    resetGeneratingState, // 生成状態リセット関数を追加
  } = useAppStore();
  useVH(); // Safari対応版のVHフックを使用
  const session = getActiveSession();
  const character = getSelectedCharacter(); // character を取得

  // デバッグ用ログ
  console.log("🔍 ChatInterface Debug:", {
    session: session?.id,
    character: character?.name,
    characterId: character?.id,
    avatarUrl: character?.avatar_url,
    backgroundUrl: character?.background_url
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("memory");
  // 🔧 Hydration fix: Initialize to 0 for consistent SSR/client rendering
  const [windowWidth, setWindowWidth] = useState(0);
  const [userScrolled, setUserScrolled] = useState(false);
  const lastMessageCountRef = useRef(0);
  const savedScrollPositionRef = useRef<number>(0);
  const isRegeneratingRef = useRef(false);
  // Motion components lazy loading
  const [motionComponents, setMotionComponents] = useState<{
    motion?: typeof import('framer-motion').motion;
    AnimatePresence?: typeof AnimatePresenceType;
  }>({});
  const [stagingGroupMembers, setStagingGroupMembers] = useState<Character[]>(
    []
  );
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const generatingStartTimeRef = useRef<number | null>(null);
  const [showResetNotification, setShowResetNotification] = useState(false);

  // AnimatePresenceコンポーネントを取得
  const AnimatePresence = motionComponents.AnimatePresence || (({ children }: React.PropsWithChildren) => children);

  // 🔧 FIX: 背景設定をコンポーネントのトップレベルでメモ化（無限ループ防止）
  const backgroundSettings = React.useMemo(() => {
    return {
      backgroundType: appearanceSettings.backgroundType,
      backgroundImage: appearanceSettings.backgroundImage,
      backgroundGradient: appearanceSettings.backgroundGradient,
      backgroundOpacity: appearanceSettings.backgroundOpacity,
      backgroundBlur: appearanceSettings.backgroundBlur,
      backgroundColor: appearanceSettings.backgroundColor,
    };
  }, [appearanceSettings]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // 🔧 Hydration fix: Set initial width after mount
    setWindowWidth(window.innerWidth);
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Load motion components dynamically
  useEffect(() => {
    MotionLoaders.core().then(({ motion, AnimatePresence }) => {
      setMotionComponents({ motion, AnimatePresence });
    });
  }, []);

  // Timeout cleanup effect
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
      timeoutsRef.current = [];
    };
  }, []);

  // 🔧 FIX: 生成状態の自動リセット（30秒タイマー）
  useEffect(() => {
    const isGenerating = is_generating || group_generating;

    if (isGenerating) {
      // 生成開始時刻を記録
      if (generatingStartTimeRef.current === null) {
        generatingStartTimeRef.current = Date.now();
        console.log('⏱️ 生成状態開始:', new Date().toLocaleTimeString());
      }

      // 30秒後に自動リセット
      const resetTimer = setTimeout(() => {
        const elapsedTime = Date.now() - (generatingStartTimeRef.current || 0);
        console.warn('⚠️ 生成状態が30秒以上継続しているため、自動的にリセットします。経過時間:', elapsedTime / 1000, '秒');

        if (resetGeneratingState) {
          resetGeneratingState();
          generatingStartTimeRef.current = null;

          // 通知を表示
          setShowResetNotification(true);
          setTimeout(() => setShowResetNotification(false), 3000);
        }
      }, 30000); // 30秒

      return () => clearTimeout(resetTimer);
    } else {
      // 生成完了時にタイマーをリセット
      if (generatingStartTimeRef.current !== null) {
        const elapsedTime = Date.now() - generatingStartTimeRef.current;
        console.log('✅ 生成完了。経過時間:', elapsedTime / 1000, '秒');
        generatingStartTimeRef.current = null;
      }
    }
  }, [is_generating, group_generating, resetGeneratingState]);

  // グループチャットセッションの取得
  const activeGroupSession: GroupChatSession | null | undefined = active_group_session_id
    ? groupSessions.get(active_group_session_id)
    : null;

  // キャラクターIDを安全に取得（修正版：グループセッションでも一貫性のある取得方法）
  const currentCharacterId = useMemo(() => {
    if (is_group_mode && activeGroupSession) {
      // グループセッションの場合、characters配列の最初のキャラクターのIDを使用
      if (activeGroupSession.characters && activeGroupSession.characters.length > 0) {
        return activeGroupSession.characters[0].id;
      }
      // フォールバック：character_idsが利用可能な場合
      if (activeGroupSession.character_ids && activeGroupSession.character_ids.length > 0) {
        return activeGroupSession.character_ids[0];
      }
    }
    if (session && session.participants.characters.length > 0) {
      return session.participants.characters[0].id;
    }
    return undefined;
  }, [is_group_mode, activeGroupSession, session]);

  // セッションの決定（グループセッションまたは通常セッション）
  const displaySession = is_group_mode ? activeGroupSession : session;
  const currentMessages =
    displaySession && displaySession.messages ? displaySession.messages : [];
  const displaySessionId =
    displaySession && displaySession.id ? displaySession.id : "";

  // 🚀 Performance optimization: Static tab definitions (no components)
  // Components are rendered only for the active tab to prevent unnecessary re-renders

  const scrollToBottom = useCallback((force = false) => {
    if (messagesEndRef.current && (!userScrolled || force)) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      setUserScrolled(false);
    }
  }, [userScrolled]);

  // 🔧 FIX: メッセージエリアのダブルクリックで生成状態をリセット
  const handleMessagesDoubleClick = useCallback(() => {
    if (is_generating || group_generating) {
      console.log('🖱️ ダブルクリックによる生成状態のリセット');
      if (resetGeneratingState) {
        resetGeneratingState();
        generatingStartTimeRef.current = null;

        // 通知を表示
        setShowResetNotification(true);
        setTimeout(() => setShowResetNotification(false), 3000);
      }
    }
  }, [is_generating, group_generating, resetGeneratingState]);

  // スクロールイベント監視
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setUserScrolled(!isNearBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // メッセージ追加時のみ自動スクロール（再生成時は除外）
  useEffect(() => {
    const currentMessageCount = currentMessages.length;
    const container = messagesContainerRef.current;

    // 新しいメッセージが追加された場合のみスクロール
    if (currentMessageCount > lastMessageCountRef.current) {
      console.log('📜 新しいメッセージ追加: スクロールダウン実行');
      isRegeneratingRef.current = false;
      scrollToBottom(true);
    } else if (currentMessageCount === lastMessageCountRef.current && currentMessageCount > 0) {
      // メッセージ数が同じ = 再生成の可能性
      // スクロール位置を保存
      if (container && !isRegeneratingRef.current) {
        savedScrollPositionRef.current = container.scrollTop;
        isRegeneratingRef.current = true;
        console.log('🔄 メッセージ再生成検出: スクロール位置保存', savedScrollPositionRef.current);
      }
    }

    lastMessageCountRef.current = currentMessageCount;
  }, [currentMessages.length, scrollToBottom]);

  // 再生成時のスクロール位置復元
  useEffect(() => {
    const container = messagesContainerRef.current;

    if (isRegeneratingRef.current && container && savedScrollPositionRef.current > 0) {
      // 次のフレームでスクロール位置を復元
      requestAnimationFrame(() => {
        if (container && savedScrollPositionRef.current > 0) {
          container.scrollTop = savedScrollPositionRef.current;
          console.log('✅ スクロール位置復元:', savedScrollPositionRef.current);

          // 復元後、フラグをリセット
          setTimeout(() => {
            isRegeneratingRef.current = false;
            savedScrollPositionRef.current = 0;
          }, 100);
        }
      });
    }
  }, [currentMessages]);

  // グループモードかつアクティブなグループセッションがない場合
  if (is_group_mode && !activeGroupSession) {
    return (
      <div
        className="flex  text-white"
        style={{ height: "calc(var(--vh, 1vh) * 100)" }}>
        <ClientOnlyProvider fallback={null}>
          <AnimatePresence>
            {isLeftSidebarOpen && <ChatSidebar />}
          </AnimatePresence>
        </ClientOnlyProvider>

        {/* グループチャット設定画面 */}
        <div className="flex-1 flex flex-col">
          <ChatHeader />
          <div className="flex-1">
            <Suspense fallback={<PanelLoadingFallback />}>
              <GroupChatInterface />
            </Suspense>
          </div>
        </div>

        {/* モーダル群 */}
        <Suspense fallback={<ModalLoadingFallback />}>
          <CharacterGalleryModal />
          <PersonaGalleryModal />
          <SettingsModal
            isOpen={showSettingsModal}
            onClose={() => setShowSettingsModal(false)}
            initialTab={initialSettingsTab}
          />
          <ChatHistoryModal />
          <VoiceSettingsModal />
          <SuggestionModal
            isOpen={showSuggestionModal}
            onClose={() => setShowSuggestionModal(false)}
            suggestions={suggestions}
            isLoading={isGeneratingSuggestions}
            onSelect={(suggestion) => {
              setCurrentInputText(suggestion);
            }}
            onRegenerate={async () => {
              console.log("🔄 Regeneration triggered", {
                is_group_mode,
                active_group_session_id,
              });

              // FIXED: 正しいセッション判定 - is_group_mode も考慮
              if (is_group_mode && active_group_session_id) {
                console.log("📥 Using GROUP session for regeneration");
                const groupSession = groupSessions.get(active_group_session_id);
                if (!groupSession) {
                  console.warn("Group session not found for regeneration");
                  return;
                }

                const recentMessages = groupSession.messages.slice(-10); // より多くの会話履歴を参照
                const customPrompt =
                  systemPrompts.replySuggestion &&
                  systemPrompts.replySuggestion.trim() !== ""
                    ? systemPrompts.replySuggestion
                    : undefined;

                const activeChars = Array.from(
                  groupSession.active_character_ids
                )
                  .map((id) => groupSession.characters.find((c) => c.id === id))
                  .filter((c) => c !== undefined);
                const character = activeChars[0] || groupSession.characters[0];
                const user = groupSession.persona;

                await generateSuggestions(
                  recentMessages,
                  character,
                  user,
                  customPrompt,
                  true
                ); // グループモード再生成
              } else {
                console.log("👤 Using SOLO session for regeneration");
                const session = getActiveSession();
                if (!session) {
                  console.warn("Solo session not found for regeneration");
                  return;
                }

                const recentMessages = session.messages.slice(-10); // より多くの会話履歴を参照
                const customPrompt =
                  systemPrompts.replySuggestion &&
                  systemPrompts.replySuggestion.trim() !== ""
                    ? systemPrompts.replySuggestion
                    : undefined;

                const character = session.participants.characters[0];
                const user = session.participants.user;

                await generateSuggestions(
                  recentMessages,
                  character,
                  user,
                  customPrompt,
                  false
                ); // ソロモード再生成
              }
            }}
          />
          <EnhancementModal
            isOpen={showEnhancementModal}
            onClose={() => setShowEnhancementModal(false)}
            originalText={currentInputText}
            enhancedText={enhancedText}
            isLoading={isEnhancingText}
            onSelect={(enhanced) => {
              setCurrentInputText(enhanced);
              setShowEnhancementModal(false);
            }}
          />
          {showCharacterForm &&
            editingCharacter &&
            "age" in editingCharacter && (
              <CharacterForm
                isOpen={showCharacterForm}
                onClose={closeCharacterForm}
                character={editingCharacter as Character}
                persona={null}
                onSave={(data) => saveCharacter(data as Character)}
                mode="character"
              />
            )}
        </Suspense>
        <AnimatePresence>
          {isGroupMemberModalOpen && activeGroupSession && (
            <CharacterGalleryModal
              isGroupEditingMode={true}
              activeGroupMembers={(activeGroupSession as GroupChatSession)?.characters || []}
              onUpdateGroupMembers={(newCharacters) => {
                if (active_group_session_id) {
                  updateGroupMembers(active_group_session_id, newCharacters);
                }
                toggleGroupMemberModal(false);
              }}
              onClose={() => toggleGroupMemberModal(false)}
            />
          )}
          {isGroupCreationModalOpen && (
            <CharacterGalleryModal
              isGroupCreationMode={true}
              onCreateGroup={(newMembers) => {
                setStagingGroupMembers(newMembers);
                toggleGroupCreationModal(false);
                toggleScenarioModal(true); // シナリオモーダルを開く
              }}
              onClose={() => toggleGroupCreationModal(false)}
            />
          )}
          {isScenarioModalOpen && (
            <Suspense fallback={<ModalLoadingFallback />}>
              <ScenarioSetupModal
                isOpen={isScenarioModalOpen}
                onClose={() => toggleScenarioModal(false)}
                onSubmit={async (scenario) => {
                  const persona =
                    useAppStore?.getState?.()?.getSelectedPersona?.() || null;
                  if (persona && stagingGroupMembers.length >= 2) {
                    const groupName =
                      scenario.title !== "スキップ"
                        ? scenario.title
                        : `${stagingGroupMembers
                            .map((c) => c.name)
                            .join("、")}とのチャット`;

                    await createGroupSession(
                      stagingGroupMembers,
                      persona,
                      "sequential",
                      groupName,
                      scenario
                    );

                    // 状態更新がUIに反映されるのを待つために少し遅延させる
                    const timeoutId = setTimeout(() => {
                      toggleScenarioModal(false);
                      setStagingGroupMembers([]); // ステージングメンバーをクリア
                    }, 100);
                    timeoutsRef.current.push(timeoutId);
                  } else {
                    alert(
                      "ペルソナが選択されていないか、メンバーが2人未満です。"
                    );
                  }
                }}
                members={stagingGroupMembers}
              />
            </Suspense>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // 通常モードかつセッションがない場合
  if (!is_group_mode && !session) {
    return (
      <div
        className="flex  text-white"
        style={{ height: "calc(var(--vh, 1vh) * 100)" }}>
        <ClientOnlyProvider fallback={null}>
          <AnimatePresence>
            {isLeftSidebarOpen && <ChatSidebar />}
          </AnimatePresence>
        </ClientOnlyProvider>
        <div className="flex-1 flex flex-col items-center justify-center">
          <EmptyState />
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex  text-white h-screen"
      style={{
        height: "calc(var(--vh, 1vh) * 100)",
      }}>
      {/* 🎨 背景表示ロジック（優先順位: キャラクター背景 > 設定背景） */}
      {(() => {
        // キャラクター背景がある場合
        if (character && character.background_url) {
          return (
            <div
              className="fixed inset-0 overflow-hidden z-0"
              style={{
                left: windowWidth >= 768 && isLeftSidebarOpen ? "320px" : "0",
                right: isRightPanelOpen && windowWidth >= 768 ? "380px" : "0",
                top: 0,
                bottom: 0,
              }}>
              {(() => {
                // 🔧 FIX: デバイス別背景画像URLを選択
                const selectedBgUrl = selectBackgroundImageURL(
                  character.background_url || '',
                  character.background_url_desktop,
                  character.background_url_mobile
                );

                return selectedBgUrl.endsWith(".mp4") || selectedBgUrl.includes("video") ? (
                  <video
                    src={selectedBgUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full"
                    style={{
                      backgroundImage: `url(${selectedBgUrl})`,
                      backgroundSize: "contain", // 🔧 FIX: cover → contain（画像が切れないように）
                      backgroundPosition: "center",
                      backgroundRepeat: "no-repeat",
                    }}
                  />
                );
              })()}
            </div>
          );
        }

        // キャラクター背景がない場合は設定の背景を表示
        // 🔧 FIX: メモ化された背景設定を使用（無限ループ防止）
        const {
          backgroundType,
          backgroundImage,
          backgroundGradient,
          backgroundOpacity,
          backgroundBlur,
          backgroundColor,
        } = backgroundSettings;

        // 🎯 外観設定のURL背景をデフォルトとして適用
        // backgroundTypeに関わらず、backgroundImageにURLが設定されていれば優先表示
        if (backgroundImage && backgroundImage.trim() !== "") {
          // 🔧 FIX: opacityが0の場合はデフォルト値100を使用
          const imageOpacity = (backgroundOpacity ?? 100) > 0 ? (backgroundOpacity ?? 100) / 100 : 1;

          return (
            <div
              className="fixed inset-0 overflow-hidden z-0"
              style={{
                left: windowWidth >= 768 && isLeftSidebarOpen ? "320px" : "0",
                right: isRightPanelOpen && windowWidth >= 768 ? "380px" : "0",
                top: 0,
                bottom: 0,
                opacity: imageOpacity,
                filter: (backgroundBlur ?? 0) > 0 ? `blur(${backgroundBlur}px)` : "none",
              }}>
              {backgroundImage.endsWith(".mp4") ||
              backgroundImage.includes("video") ? (
                <video
                  src={backgroundImage}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={backgroundImage}
                  alt="background"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // 画像読み込み失敗時は要素を非表示
                    e.currentTarget.style.display = "none";
                  }}
                />
              )}
            </div>
          );
        }

        // URL背景がない場合、backgroundTypeに応じた背景を適用
        // 🔧 FIX: opacityが0の場合はデフォルト値100を使用
        const finalOpacity = (backgroundOpacity ?? 100) > 0 ? (backgroundOpacity ?? 100) / 100 : 1;

        return (
          <div
            className="fixed inset-0 overflow-hidden z-0"
            style={{
              left: windowWidth >= 768 && isLeftSidebarOpen ? "320px" : "0",
              right: isRightPanelOpen && windowWidth >= 768 ? "380px" : "0",
              top: 0,
              bottom: 0,
              opacity: finalOpacity,
              filter: (backgroundBlur ?? 0) > 0 ? `blur(${backgroundBlur}px)` : "none",
            }}>
            {backgroundType === "gradient" ? (
              <div
                className="w-full h-full"
                style={{
                  background: backgroundGradient,
                }}
              />
            ) : backgroundType === "color" ? (
              <div
                className="w-full h-full"
                style={{
                  background: backgroundColor,
                }}
              />
            ) : (
              <div
                className="w-full h-full"
                style={{
                  background:
                    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                }}
              />
            )}
          </div>
        );
      })()}

      <ClientOnlyProvider fallback={null}>
        <AnimatePresence>
          {isLeftSidebarOpen && <ChatSidebar />}
        </AnimatePresence>
      </ClientOnlyProvider>

      {/* モバイルでサイドバーが開いているときの背景オーバーレイ */}
      {isLeftSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => useAppStore?.getState?.()?.toggleLeftSidebar?.()}
        />
      )}

      {/* モバイルで右パネルが開いているときの背景オーバーレイ - 削除 */}

      <div
        className={cn(
          "flex flex-1 min-w-0 relative z-10 transition-all duration-300",
          // 左サイドパネルが開いている時のマージン調整
          isLeftSidebarOpen ? "ml-0 md:ml-80" : "ml-0",
          // 右サイドパネルが開いている時のマージン調整
          isRightPanelOpen && windowWidth >= 768 ? "mr-[400px]" : "mr-0"
        )}
        style={{
          // Safari用の明示的なスタイル（背景色を削除）
          display: "flex",
          flexGrow: 1,
          width: "100%",
          height: "100%",
          position: "relative",
          // backgroundColor を削除 - 透明にして背景画像を透けて見せる
        }}>
        {/* メインコンテンツエリア */}
        <div className="flex-1 flex flex-col min-w-0 relative">
          {/* ヘッダー */}
          <ChatHeader />

          {/* メッセージリスト専用コンテナ - 透明な背景でスクロール */}
          <div
            ref={messagesContainerRef}
            onDoubleClick={handleMessagesDoubleClick}
            className="flex-1 overflow-y-auto overflow-x-visible px-3 md:px-4 py-4 space-y-3 md:space-y-4 scrollbar-thin scrollbar-thumb-purple-400/20 scrollbar-track-transparent z-10 messages-container transition-all duration-300"
            style={{
              position: "fixed",
              top: 0,
              left: windowWidth >= 768 && isLeftSidebarOpen ? "320px" : "0",
              right: windowWidth >= 768 && isRightPanelOpen ? "400px" : "0",
              bottom: 0,
              paddingTop: windowWidth <= 768 ? "100px" : "90px",
              paddingBottom: windowWidth <= 768 ? "120px" : "100px",
              backgroundColor: "transparent",
            }}>
            {currentMessages.length > 0 ? (
              <AnimatePresence mode="wait" initial={false}>
                {currentMessages.map((message: UnifiedMessage, index: number) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    previousMessage={
                      index > 0 ? currentMessages[index - 1] : undefined
                    }
                    isLatest={index === currentMessages.length - 1}
                    isGroupChat={is_group_mode}
                  />
                ))}
              </AnimatePresence>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-white/50">
                <Bot size={48} className="mb-4" />
                <h2 className="text-xl font-semibold mb-2">
                  まだメッセージがありません
                </h2>
                <p>新しい会話を始めましょう</p>
              </div>
            )}

            {(is_generating || group_generating) && <ThinkingIndicator />}

            <div ref={messagesEndRef} />

            {/* 🔧 生成状態リセット通知 */}
            {showResetNotification && (
              <div
                className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[100] bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg animate-in slide-in-from-top-2 fade-in-0 duration-300"
                style={{
                  animation: 'slideInFromTop 0.3s ease-out',
                }}>
                ✅ 生成状態をリセットしました
              </div>
            )}
          </div>

          {/* メッセージ入力欄 */}
          <MessageInputWrapper />
        </div>

        {/* 右サイドパネル */}
        <ClientOnlyProvider fallback={null}>
          <AnimatePresence>
            {isRightPanelOpen && (
              <>
                {/* モバイル用の背景オーバーレイ */}
                {windowWidth < 768 && motionComponents.motion && (
                  <motionComponents.motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/50 z-[55]"
                    onClick={() => setRightPanelOpen(false)}
                  />
                )}

                {/* 右パネル本体 */}
                {motionComponents.motion ? (
                  <motionComponents.motion.div
                    initial={{ x: "100%", opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: "100%", opacity: 0 }}
                    transition={{ duration: 0.3, type: "spring", damping: 25 }}
                    className={cn(
                      "right-panel-content border-l border-purple-400/20 flex flex-col h-full",
                      "bg-slate-800/80 backdrop-blur-md",
                      windowWidth < 768
                        ? "fixed right-0 top-0 w-[85vw] h-full z-[60]"
                        : "fixed right-0 top-0 h-full w-[380px] z-[60]"
                    )}
                    style={{
                      backgroundColor: `rgba(30, 41, 59, ${(appearanceSettings.backgroundOpacity || 80) / 100})`,
                      backdropFilter: `blur(${appearanceSettings.backgroundBlur || 12}px)`,
                      WebkitBackdropFilter: `blur(${appearanceSettings.backgroundBlur || 12}px)`,
                    }}
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                <div className="p-4 border-b border-purple-400/20 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">記憶情報</h3>
                  <button
                    onClick={() => setRightPanelOpen(false)}
                    className="p-2 hover:bg-white/10 rounded-full">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex p-2 bg-slate-800/50 backdrop-blur-sm border-b border-purple-400/20">
                  {TAB_DEFINITIONS.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.key}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveTab(tab.key);
                        }}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-2 p-2 rounded-lg text-sm transition-colors",
                          activeTab === tab.key
                            ? "bg-purple-500/20 text-purple-300"
                            : "text-white/60 hover:bg-white/10"
                        )}>
                        <Icon className="w-4 h-4" />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  <AnimatePresence mode="wait">
                    {displaySession && motionComponents.motion && (
                      <motionComponents.motion.div
                        key={activeTab}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}>
                        <TabContent
                          activeTab={activeTab}
                          displaySessionId={displaySessionId}
                          currentCharacterId={currentCharacterId}
                        />
                      </motionComponents.motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motionComponents.motion.div>
                ) : (
                  <div
                    className={cn(
                      "right-panel-content border-l border-purple-400/20 flex flex-col h-full",
                      "bg-slate-800/80 backdrop-blur-md",
                      windowWidth < 768
                        ? "fixed right-0 top-0 w-[85vw] h-full z-[60]"
                        : "fixed right-0 top-0 h-full w-[380px] z-[60]"
                    )}
                    style={{
                      backgroundColor: `rgba(30, 41, 59, ${(appearanceSettings.backgroundOpacity || 80) / 100})`,
                      backdropFilter: `blur(${appearanceSettings.backgroundBlur || 12}px)`,
                      WebkitBackdropFilter: `blur(${appearanceSettings.backgroundBlur || 12}px)`,
                    }}>
                    <div className="p-4 border-b border-purple-400/20 flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-white">記憶情報</h3>
                      <button
                        onClick={() => setRightPanelOpen(false)}
                        className="p-2 hover:bg-white/10 rounded-full">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="flex p-2 bg-slate-800/50 backdrop-blur-sm border-b border-purple-400/20">
                      {TAB_DEFINITIONS.map((tab) => {
                        const Icon = tab.icon;
                        return (
                          <button
                            key={tab.key}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveTab(tab.key);
                            }}
                            className={cn(
                              "flex-1 flex items-center justify-center gap-2 p-2 rounded-lg text-sm transition-colors",
                              activeTab === tab.key
                                ? "bg-purple-500/20 text-purple-300"
                                : "text-white/60 hover:bg-white/10"
                            )}>
                            <Icon className="w-4 h-4" />
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">
                      {displaySession && (
                        <TabContent
                          activeTab={activeTab}
                          displaySessionId={displaySessionId}
                          currentCharacterId={currentCharacterId}
                        />
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </AnimatePresence>
        </ClientOnlyProvider>

        {/* モーダル群 */}
        <Suspense fallback={<ModalLoadingFallback />}>
          <CharacterGalleryModal />
          <PersonaGalleryModal />
          <SettingsModal
            isOpen={showSettingsModal}
            onClose={() => setShowSettingsModal(false)}
            initialTab={initialSettingsTab}
          />
          <ChatHistoryModal />
          <VoiceSettingsModal />
          <SuggestionModal
            isOpen={showSuggestionModal}
            onClose={() => setShowSuggestionModal(false)}
            suggestions={suggestions}
            isLoading={isGeneratingSuggestions}
            onSelect={(suggestion) => {
              setCurrentInputText(suggestion);
            }}
            onRegenerate={async () => {
              console.log("🔄 Regeneration triggered", {
                is_group_mode,
                active_group_session_id,
              });

              // FIXED: 正しいセッション判定 - is_group_mode も考慮
              if (is_group_mode && active_group_session_id) {
                console.log("📥 Using GROUP session for regeneration");
                const groupSession = groupSessions.get(active_group_session_id);
                if (!groupSession) {
                  console.warn("Group session not found for regeneration");
                  return;
                }

                const recentMessages = groupSession.messages.slice(-10); // より多くの会話履歴を参照
                const customPrompt =
                  systemPrompts.replySuggestion &&
                  systemPrompts.replySuggestion.trim() !== ""
                    ? systemPrompts.replySuggestion
                    : undefined;

                const activeChars = Array.from(
                  groupSession.active_character_ids
                )
                  .map((id) => groupSession.characters.find((c) => c.id === id))
                  .filter((c) => c !== undefined);
                const character = activeChars[0] || groupSession.characters[0];
                const user = groupSession.persona;

                await generateSuggestions(
                  recentMessages,
                  character,
                  user,
                  customPrompt,
                  true
                ); // グループモード再生成
              } else {
                console.log("👤 Using SOLO session for regeneration");
                const session = getActiveSession();
                if (!session) {
                  console.warn("Solo session not found for regeneration");
                  return;
                }

                const recentMessages = session.messages.slice(-10); // より多くの会話履歴を参照
                const customPrompt =
                  systemPrompts.replySuggestion &&
                  systemPrompts.replySuggestion.trim() !== ""
                    ? systemPrompts.replySuggestion
                    : undefined;

                const character = session.participants.characters[0];
                const user = session.participants.user;

                await generateSuggestions(
                  recentMessages,
                  character,
                  user,
                  customPrompt,
                  false
                ); // ソロモード再生成
              }
            }}
          />
          <EnhancementModal
            isOpen={showEnhancementModal}
            onClose={() => setShowEnhancementModal(false)}
            originalText={currentInputText}
            enhancedText={enhancedText}
            isLoading={isEnhancingText}
            onSelect={(enhanced) => {
              setCurrentInputText(enhanced);
              setShowEnhancementModal(false);
            }}
          />
          {showCharacterForm &&
            editingCharacter &&
            "age" in editingCharacter && (
              <CharacterForm
                isOpen={showCharacterForm}
                onClose={closeCharacterForm}
                character={editingCharacter as Character}
                persona={null}
                onSave={(data) => saveCharacter(data as Character)}
                mode="character"
              />
            )}
        </Suspense>
        <AnimatePresence>
          {isGroupMemberModalOpen && activeGroupSession && (
            <CharacterGalleryModal
              isGroupEditingMode={true}
              activeGroupMembers={(activeGroupSession as GroupChatSession)?.characters || []}
              onUpdateGroupMembers={(newCharacters) => {
                if (active_group_session_id) {
                  updateGroupMembers(active_group_session_id, newCharacters);
                }
                toggleGroupMemberModal(false);
              }}
              onClose={() => toggleGroupMemberModal(false)}
            />
          )}
          {isGroupCreationModalOpen && (
            <CharacterGalleryModal
              isGroupCreationMode={true}
              onCreateGroup={(newMembers) => {
                setStagingGroupMembers(newMembers);
                toggleGroupCreationModal(false);
                toggleScenarioModal(true); // シナリオモーダルを開く
              }}
              onClose={() => toggleGroupCreationModal(false)}
            />
          )}
          {isScenarioModalOpen && (
            <Suspense fallback={<ModalLoadingFallback />}>
              <ScenarioSetupModal
                isOpen={isScenarioModalOpen}
                onClose={() => toggleScenarioModal(false)}
                onSubmit={async (scenario) => {
                  const persona =
                    useAppStore?.getState?.()?.getSelectedPersona?.() || null;
                  if (persona && stagingGroupMembers.length >= 2) {
                    const groupName =
                      scenario.title !== "スキップ"
                        ? scenario.title
                        : `${stagingGroupMembers
                            .map((c) => c.name)
                            .join("、")}とのチャット`;

                    await createGroupSession(
                      stagingGroupMembers,
                      persona,
                      "sequential",
                      groupName,
                      scenario
                    );

                    // 状態更新がUIに反映されるのを待つために少し遅延させる
                    const timeoutId = setTimeout(() => {
                      toggleScenarioModal(false);
                      setStagingGroupMembers([]); // ステージングメンバーをクリア
                    }, 100);
                    timeoutsRef.current.push(timeoutId);
                  } else {
                    alert(
                      "ペルソナが選択されていないか、メンバーが2人未満です。"
                    );
                  }
                }}
                members={stagingGroupMembers}
              />
            </Suspense>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// メインのChatInterfaceコンポーネント（Safari対応版）
export const ChatInterface: React.FC = () => {
  try {
    return <ChatInterfaceContent />;
  } catch (error) {
    return (
      <div
        className="flex  text-white overflow-hidden items-center justify-center"
        style={{ height: "calc(var(--vh, 1vh) * 100)" }}>
        <div className="text-white/50 text-center">
          <div>エラーが発生しました: {String(error)}</div>
        </div>
      </div>
    );
  }
};
