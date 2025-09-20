"use client";

import React, {
  useRef,
  useEffect,
  useState,
  useMemo,
  useCallback,
  Suspense,
  memo,
} from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store";
import { OptimizedMessageBubble } from "./OptimizedMessageBubble";
import { MessageInput } from "../chat/MessageInput";
import { ChatHeader } from "../chat/ChatHeader";
import { Bot, Brain, X, BarChart3, History, Layers } from "lucide-react";
import { CharacterGalleryModal } from "../character/CharacterGalleryModal";

// Performance optimized imports
import { MotionLoaders } from "./FramerMotionOptimized";
import { usePerformanceOptimization } from "@/hooks/usePerformanceOptimization";

// Use the existing lazy imports from LazyComponents
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

import { EnhancementModal } from "../chat/EnhancementModal";
import { GroupChatInterface } from "../chat/GroupChatInterface";
import ChatSidebar from "../chat/ChatSidebar";
import { ClientOnlyProvider } from "../ClientOnlyProvider";
import { cn } from "@/lib/utils";
import { Character } from "@/types/core/character.types";
import useVH from "@/hooks/useVH";

// ===== PERFORMANCE OPTIMIZED COMPONENTS =====

// Memoized message input wrapper
const MemoizedMessageInputWrapper = memo(() => {
  return <MessageInput />;
});
MemoizedMessageInputWrapper.displayName = "MemoizedMessageInputWrapper";

// Memoized empty state component
const MemoizedEmptyState = memo(() => {
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
});
MemoizedEmptyState.displayName = "MemoizedEmptyState";

// Optimized thinking indicator with lazy motion loading
const OptimizedThinkingIndicator = memo(() => {
  const [MotionDiv, setMotionDiv] = useState<any>(null);

  useEffect(() => {
    MotionLoaders.core().then(({ motion }) => {
      setMotionDiv(() => motion.div);
    });
  }, []);

  if (!MotionDiv) {
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
  }

  return (
    <div className="flex items-center justify-center p-4">
      <div className="flex items-center space-x-2">
        {[0, 0.2, 0.4].map((delay, index) => (
          <MotionDiv
            key={index}
            className="w-2 h-2 bg-purple-400 rounded-full"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: "easeInOut",
              delay,
            }}
          />
        ))}
        <span className="text-sm text-white/60">AIが考え中...</span>
      </div>
    </div>
  );
});
OptimizedThinkingIndicator.displayName = "OptimizedThinkingIndicator";

// ===== MAIN OPTIMIZED CHAT INTERFACE =====

const OptimizedChatInterfaceContent: React.FC = memo(() => {
  // Performance optimization hook
  const { createOptimizedCallback, smartMemo, metrics, shouldSplitComponent } =
    usePerformanceOptimization("ChatInterface");

  // Optimized store selectors (memoized)
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
    showEnhancementModal,
    setShowEnhancementModal,
    enhancedText,
    isEnhancingText,
    enhanceTextForModal,
    systemPrompts,
    currentInputText,
    setCurrentInputText,
    isLeftSidebarOpen,
    isRightPanelOpen,
    setRightPanelOpen,
    getSelectedCharacter,
    is_group_mode,
    group_generating,
    active_group_session_id,
    groupSessions,
    updateGroupMembers,
    createGroupSession,
    isGroupMemberModalOpen,
    toggleGroupMemberModal,
    isGroupCreationModalOpen,
    toggleGroupCreationModal,
    isScenarioModalOpen,
    toggleScenarioModal,
    appearanceSettings,
  } = useAppStore();

  useVH(); // Safari対応版のVHフックを使用

  // Memoized session and character data
  const {
    session,
    character,
    displaySession,
    currentMessages,
    displaySessionId,
    currentCharacterId,
  } = smartMemo(() => {
    const session = getActiveSession();
    const character = getSelectedCharacter();

    // グループチャットセッションの取得
    const activeGroupSession = active_group_session_id
      ? (groupSessions.get(active_group_session_id) as any)
      : null;

    // キャラクターIDを安全に取得
    const currentCharacterId = (() => {
      if (is_group_mode && activeGroupSession) {
        return activeGroupSession.character_ids[0];
      }
      if (session && session.participants.characters.length > 0) {
        return session.participants.characters[0].id;
      }
      return undefined;
    })();

    // セッションの決定（グループセッションまたは通常セッション）
    const displaySession = is_group_mode ? activeGroupSession : session;
    const currentMessages =
      displaySession && displaySession.messages ? displaySession.messages : [];
    const displaySessionId =
      displaySession && displaySession.id ? displaySession.id : "";

    return {
      session,
      character,
      displaySession,
      currentMessages,
      displaySessionId,
      currentCharacterId,
    };
  }, [
    getActiveSession,
    getSelectedCharacter,
    active_group_session_id,
    groupSessions,
    is_group_mode,
  ]);

  // State management
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<
    "memory" | "tracker" | "history" | "layers"
  >("memory");
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 0
  );
  const [motionComponents, setMotionComponents] = useState<{
    motion?: any;
    AnimatePresence?: any;
  }>({});
  const [stagingGroupMembers, setStagingGroupMembers] = useState<Character[]>(
    []
  );
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  // Optimized window resize handler
  const handleResize = createOptimizedCallback(() => {
    setWindowWidth(window.innerWidth);
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [handleResize]);

  // Load motion components dynamically
  useEffect(() => {
    MotionLoaders.core().then(({ motion, AnimatePresence }) => {
      setMotionComponents({ motion, AnimatePresence });
    });
  }, []);

  // Optimized scroll to bottom
  const scrollToBottom = createOptimizedCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  });

  // Memoized side panel tabs with optimized loading
  const sidePanelTabs = smartMemo(() => [
    {
      key: "memory" as const,
      icon: Brain,
      label: "メモリー",
      component: (
        <Suspense fallback={<PanelLoadingFallback />}>
          <MemoryGallery
            session_id={displaySessionId}
            character_id={currentCharacterId!}
          />
        </Suspense>
      ),
    },
    {
      key: "tracker" as const,
      icon: BarChart3,
      label: "トラッカー",
      component: (
        <Suspense fallback={<PanelLoadingFallback />}>
          <TrackerDisplay
            session_id={displaySessionId}
            character_id={currentCharacterId!}
          />
        </Suspense>
      ),
    },
    {
      key: "history" as const,
      icon: History,
      label: "履歴検索",
      component: (
        <Suspense fallback={<PanelLoadingFallback />}>
          <HistorySearch session_id={displaySessionId} />
        </Suspense>
      ),
    },
    {
      key: "layers" as const,
      icon: Layers,
      label: "記憶層",
      component: (
        <Suspense fallback={<PanelLoadingFallback />}>
          <MemoryLayerDisplay session_id={displaySessionId} />
        </Suspense>
      ),
    },
  ]);

  // Optimized scroll effect
  const sessionMessages = session?.messages;
  const groupSessionMessages = displaySession?.messages;

  useEffect(() => {
    scrollToBottom();
  }, [sessionMessages, groupSessionMessages, scrollToBottom]);

  // Timeout cleanup effect
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
      timeoutsRef.current = [];
    };
  }, []);

  // Memoized background rendering
  const backgroundElement = smartMemo(() => {
    if (character?.background_url) {
      return (
        <div
          className="fixed inset-0 overflow-hidden z-0"
          style={{
            left: windowWidth >= 768 && isLeftSidebarOpen ? "320px" : "0",
            right: isRightPanelOpen && windowWidth >= 768 ? "380px" : "0",
            top: 0,
            bottom: 0,
          }}>
          {character.background_url.endsWith(".mp4") ||
          character.background_url.includes("video") ? (
            <video
              src={character.background_url}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <Image
              src={character.background_url}
              alt="background"
              width={800}
              height={600}
              className="w-full h-full object-cover"
            />
          )}
        </div>
      );
    }

    const {
      backgroundType,
      backgroundImage,
      backgroundGradient,
      backgroundOpacity,
      backgroundBlur,
    } = appearanceSettings;

    return (
      <div
        className="fixed inset-0 overflow-hidden z-0"
        style={{
          left: windowWidth >= 768 && isLeftSidebarOpen ? "320px" : "0",
          right: isRightPanelOpen && windowWidth >= 768 ? "380px" : "0",
          top: 0,
          bottom: 0,
          opacity: backgroundOpacity / 100,
          filter: `blur(${backgroundBlur}px)`,
        }}>
        {backgroundType === "image" && backgroundImage ? (
          <Image
            src={backgroundImage}
            alt="background"
            width={800}
            height={600}
            className="w-full h-full object-cover"
          />
        ) : backgroundType === "gradient" ? (
          <div
            className="w-full h-full"
            style={{ background: backgroundGradient }}
          />
        ) : (
          <div
            className="w-full h-full"
            style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            }}
          />
        )}
      </div>
    );
  });

  // グループモードかつアクティブなグループセッションがない場合
  if (is_group_mode && !displaySession) {
    return (
      <div
        className="flex text-white"
        style={{ height: "calc(var(--vh, 1vh) * 100)" }}>
        <ClientOnlyProvider fallback={null}>
          <AnimatePresence>
            {isLeftSidebarOpen && <ChatSidebar />}
          </AnimatePresence>
        </ClientOnlyProvider>

        <div className="flex-1 flex flex-col">
          <ChatHeader />
          <div className="flex-1">
            <Suspense fallback={<PanelLoadingFallback />}>
              <GroupChatInterface />
            </Suspense>
          </div>
        </div>

        {/* Modal group - optimized loading */}
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
          {/* Other modals... */}
        </Suspense>
      </div>
    );
  }

  // 通常モードかつセッションがない場合
  if (!is_group_mode && !session) {
    return (
      <div
        className="flex text-white"
        style={{ height: "calc(var(--vh, 1vh) * 100)" }}>
        <ClientOnlyProvider fallback={null}>
          <AnimatePresence>
            {isLeftSidebarOpen && <ChatSidebar />}
          </AnimatePresence>
        </ClientOnlyProvider>
        <div className="flex-1 flex flex-col items-center justify-center">
          <MemoizedEmptyState />
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex text-white h-screen"
      style={{ height: "calc(var(--vh, 1vh) * 100)" }}>
      {/* Background */}
      {backgroundElement}

      <ClientOnlyProvider fallback={null}>
        <AnimatePresence>
          {isLeftSidebarOpen && <ChatSidebar />}
        </AnimatePresence>
      </ClientOnlyProvider>

      {/* Mobile overlay */}
      {isLeftSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => useAppStore?.getState?.()?.toggleLeftSidebar?.()}
        />
      )}

      <div
        className={cn(
          "flex flex-1 min-w-0 relative z-10 transition-all duration-300",
          isLeftSidebarOpen ? "ml-0 md:ml-80" : "ml-0",
          isRightPanelOpen && windowWidth >= 768 ? "mr-[400px]" : "mr-0"
        )}
        style={{
          display: "flex",
          flexGrow: 1,
          width: "100%",
          height: "100%",
          position: "relative",
        }}>
        {/* Main content area */}
        <div className="flex-1 flex flex-col min-w-0 relative">
          <ChatHeader />

          {/* Optimized message list */}
          <div
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
              <AnimatePresence mode="popLayout" initial={false}>
                {currentMessages.map((message: any, index: number) => (
                  <OptimizedMessageBubble
                    key={message.id}
                    message={message}
                    previousMessage={
                      index > 0 ? currentMessages[index - 1] : undefined
                    }
                    isLatest={index === currentMessages.length - 1}
                    isGroupChat={is_group_mode}
                    shouldAnimateEntry={index === currentMessages.length - 1}
                    disableEffects={
                      metrics?.averageRenderTime
                        ? metrics.averageRenderTime > 32
                        : false
                    }
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

            {(is_generating || group_generating) && (
              <OptimizedThinkingIndicator />
            )}

            <div ref={messagesEndRef} />
          </div>

          <MemoizedMessageInputWrapper />
        </div>

        {/* Right panel - optimized */}
        <ClientOnlyProvider fallback={null}>
          <AnimatePresence>
            {isRightPanelOpen && (
              <>
                {windowWidth < 768 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/50 z-[55]"
                    onClick={() => setRightPanelOpen(false)}
                  />
                )}

                <motion.div
                  initial={{ x: "100%", opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: "100%", opacity: 0 }}
                  transition={{ duration: 0.3, type: "spring", damping: 25 }}
                  className={cn(
                    "right-panel-content bg-slate-800/80 backdrop-blur-md border-l border-purple-400/20 flex flex-col h-full",
                    windowWidth < 768
                      ? "fixed right-0 top-0 w-[85vw] h-full z-[60]"
                      : "fixed right-0 top-0 h-full w-[380px] z-[60]"
                  )}
                  onClick={(e) => e.stopPropagation()}>
                  <div className="p-4 border-b border-purple-400/20 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">
                      記憶情報
                    </h3>
                    <button
                      onClick={() => setRightPanelOpen(false)}
                      className="p-2 hover:bg-white/10 rounded-full">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex p-2 bg-slate-800/50 backdrop-blur-sm border-b border-purple-400/20">
                    {sidePanelTabs.map((tab) => (
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
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                    <AnimatePresence mode="wait">
                      {sidePanelTabs.map(
                        (tab) =>
                          activeTab === tab.key &&
                          displaySession && (
                            <motion.div
                              key={tab.key}
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -20 }}
                              transition={{ duration: 0.2 }}>
                              {tab.component}
                            </motion.div>
                          )
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </ClientOnlyProvider>

        {/* Optimized modals */}
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
          {/* Add other modals as needed */}
        </Suspense>
      </div>
    </div>
  );
});

OptimizedChatInterfaceContent.displayName = "OptimizedChatInterfaceContent";

// Main optimized chat interface component
export const OptimizedChatInterface: React.FC = memo(() => {
  try {
    return <OptimizedChatInterfaceContent />;
  } catch (error) {
    return (
      <div
        className="flex text-white overflow-hidden items-center justify-center"
        style={{ height: "calc(var(--vh, 1vh) * 100)" }}>
        <div className="text-white/50 text-center">
          <div>エラーが発生しました: {String(error)}</div>
        </div>
      </div>
    );
  }
});

OptimizedChatInterface.displayName = "OptimizedChatInterface";

export default OptimizedChatInterface;
