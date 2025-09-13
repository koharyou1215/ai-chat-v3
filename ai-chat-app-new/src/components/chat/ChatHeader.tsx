"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  PanelLeft,
  UserCircle,
  Bot,
  Phone,
  Users,
  Brain,
  Settings,
  ChevronDown,
  Sliders,
} from "lucide-react";
import { useAppStore } from "@/store";
import { cn } from "@/lib/utils";
import { GroupChatMode as _GroupChatMode } from "@/types/core/group-chat.types";
import { VoiceCallInterface } from "../voice/VoiceCallInterface";
import { VoiceCallModal } from "../voice/VoiceCallModal";
import { useTranslation, commonTexts } from "@/hooks/useLanguage";
import { ClientOnlyProvider } from "../ClientOnlyProvider";
import { QuickSettingsPanel } from "../settings/QuickSettingsPanel";

// モデル名を短縮表示する関数
const getModelDisplayName = (modelId: string): string => {
  if (!modelId) return "Unknown";

  // プロバイダー別の短縮表示
  if (modelId.startsWith("google/")) {
    const modelName = modelId.replace("google/", "");
    if (modelName.includes("gemini-2.5-pro")) return "Gemini 2.5 Pro";
    if (modelName.includes("gemini-2.5-flash-light"))
      return "Gemini 2.5 Flash Light";
    if (modelName.includes("gemini-2.5-flash")) return "Gemini 2.5 Flash";
    return "Gemini";
  }

  if (modelId.startsWith("anthropic/")) {
    const modelName = modelId.replace("anthropic/", "");
    if (modelName.includes("claude-opus")) return "Claude Opus";
    if (modelName.includes("claude-sonnet")) return "Claude Sonnet";
    return "Claude";
  }

  // Gemini直接指定の場合（プレフィックスなし）
  if (modelId.includes("gemini-2.5-pro")) return "Gemini 2.5 Pro";
  if (modelId.includes("gemini-2.5-flash-light"))
    return "Gemini 2.5 Flash Light";
  if (modelId.includes("gemini-2.5-flash")) return "Gemini 2.5 Flash";

  if (modelId.startsWith("x-ai/")) {
    if (modelId.includes("grok-code-fast-1")) return "Grok Code";
    return "Grok-4";
  }
  if (modelId.startsWith("openai/")) return "GPT-5";
  if (modelId.startsWith("deepseek/")) return "DeepSeek";
  if (modelId.startsWith("mistralai/")) return "Mistral";
  if (modelId.startsWith("meta-llama/")) return "Llama";
  if (modelId.startsWith("qwen/")) {
    if (modelId.includes("qwen3-30b-a3b-thinking")) return "Qwen3 Think";
    return "Qwen";
  }
  if (modelId.startsWith("nousresearch/")) {
    if (modelId.includes("hermes-4-405b")) return "Hermes 4";
    return "Nous";
  }
  if (modelId.startsWith("z-ai/")) return "GLM";
  if (modelId.startsWith("moonshotai/")) return "Kimi";

  // デフォルト: 最初の部分のみ表示
  return modelId.split("/")[0] || modelId;
};

// SSR安全なヘッダーコンテンツコンポーネント
const ChatHeaderContent: React.FC = () => {
  const [isVoiceCallActive, setIsVoiceCallActive] = useState(false);
  const [isVoiceCallModalOpen, setIsVoiceCallModalOpen] = useState(false);
  const [isQuickSettingsOpen, setIsQuickSettingsOpen] = useState(false);
  const { t } = useTranslation();

  const {
    toggleLeftSidebar,
    isLeftSidebarOpen,
    toggleRightPanel,
    isRightPanelOpen,
    getActiveSession,
    setShowCharacterGallery,
    setShowPersonaGallery,
    toggleGroupMemberModal, // 追加
    getSelectedCharacter,
    getSelectedPersona,
    is_group_mode,
    active_group_session_id,
    groupSessions,
  } = useAppStore();

  const session = getActiveSession();
  const character = getSelectedCharacter();
  const persona = getSelectedPersona();
  const activeGroupSession = active_group_session_id
    ? groupSessions.get(active_group_session_id)
    : null;

  // Loading Skeleton - character/personaが読み込み中でも基本UIを表示
  // 本番環境でもヘッダーが表示されるように条件を緩和
  if (false && (!character || !persona)) {
    return (
      <div
        className="chat-header fixed top-0 left-0 right-0 z-[60] flex items-center justify-between px-2 md:px-4 py-2 md:py-4 border-b border-purple-400/20 bg-slate-900/95 backdrop-blur-md"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)", height: "68px" }}>
        <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
          {/* サイドバートグルボタン - 常に表示 */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleLeftSidebar}
            className={cn(
              "p-2 rounded-full transition-colors text-white drop-shadow-lg",
              isLeftSidebarOpen
                ? "bg-purple-500/30 text-purple-200"
                : "hover:bg-white/20 text-white drop-shadow-lg"
            )}
            title={isLeftSidebarOpen ? "Close sidebar" : "Open sidebar"}>
            <PanelLeft className="w-6 h-6 md:w-5 md:h-5" />
          </motion.button>

          {/* ローディング状態でも基本情報を表示 */}
          <div className="flex items-center gap-1 min-w-0 flex-1">
            <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex-shrink-0 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-white drop-shadow-lg text-sm md:text-base font-bold">
                AI Chat
              </h1>
              <p className="text-white/60 text-xs">Loading...</p>
            </div>
          </div>
        </div>

        {/* Right side - 基本ボタンのみ表示 */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsVoiceCallModalOpen(true)}
            className="p-1.5 md:p-2 rounded-lg transition-colors text-white drop-shadow-lg flex-shrink-0 hover:bg-white/20"
            title="音声通話">
            <Phone className="w-5 h-5 md:w-5 md:h-5" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleRightPanel}
            className={cn(
              "p-1.5 md:p-2 rounded-lg transition-colors text-white drop-shadow-lg flex-shrink-0",
              isRightPanelOpen
                ? "bg-purple-500/20 text-purple-300"
                : "hover:bg-white/20 text-white drop-shadow-lg"
            )}
            title={isRightPanelOpen ? "記憶情報を非表示" : "記憶情報を表示"}>
            <Brain className="w-5 h-5 md:w-5 md:h-5" />
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="chat-header fixed top-0 left-0 right-0 z-[60] flex items-center justify-between px-2 md:px-4 py-2 md:py-4 border-b border-purple-400/20 bg-slate-900/95 backdrop-blur-md"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)", height: "68px" }}>
      <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={toggleLeftSidebar}
          className={cn(
            "p-2 rounded-full transition-colors text-white drop-shadow-lg drop-shadow-lg",
            isLeftSidebarOpen
              ? "bg-purple-500/30 text-purple-200"
              : "hover:bg-white/20 text-white drop-shadow-lg"
          )}
          title={isLeftSidebarOpen ? "Close sidebar" : "Open sidebar"}>
          <PanelLeft className="w-6 h-6 md:w-5 md:h-5" />
        </motion.button>

        {/* Group Info または Character Info */}
        <div className="flex items-center gap-1 min-w-0 flex-1">
          {/* グループチャット情報（グループモード時のみ） */}
          {is_group_mode && activeGroupSession && (
            <>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => toggleGroupMemberModal(true)}
                className="flex items-center gap-1 md:gap-2 flex-shrink-0 cursor-pointer"
                title="グループメンバーを編集">
                <Users className="w-6 h-6 md:w-7 md:h-7 text-purple-400 flex-shrink-0" />
                <div className="min-w-0 text-left">
                  <h1 className="text-white drop-shadow-lg text-sm md:text-base font-bold truncate">
                    {activeGroupSession.name}
                  </h1>
                  <p className="text-white drop-shadow-lg/50 text-xs truncate">
                    {t({
                      ja: `${
                        activeGroupSession.active_character_ids.size
                      }人 • ${
                        typeof commonTexts.messageCount.ja === "function"
                          ? commonTexts.messageCount.ja(
                              activeGroupSession.message_count
                            )
                          : `${activeGroupSession.message_count} messages`
                      }`,
                      en: `${
                        activeGroupSession.active_character_ids.size
                      } chars • ${
                        typeof commonTexts.messageCount.en === "function"
                          ? commonTexts.messageCount.en(
                              activeGroupSession.message_count
                            )
                          : `${activeGroupSession.message_count} messages`
                      }`,
                      zh: `${
                        activeGroupSession.active_character_ids.size
                      }个 • ${
                        typeof commonTexts.messageCount.zh === "function"
                          ? commonTexts.messageCount.zh(
                              activeGroupSession.message_count
                            )
                          : `${activeGroupSession.message_count} 消息`
                      }`,
                      ko: `${
                        activeGroupSession.active_character_ids.size
                      }개 • ${
                        typeof commonTexts.messageCount.ko === "function"
                          ? commonTexts.messageCount.ko(
                              activeGroupSession.message_count
                            )
                          : `${activeGroupSession.message_count} 메시지`
                      }`,
                    })}
                  </p>
                </div>
              </motion.button>
              <div className="w-px h-6 bg-white/20 mx-1 flex-shrink-0" />
            </>
          )}

          {/* キャラクター選択ボタン（常に表示） */}
          <div
            className="flex items-center gap-1 cursor-pointer relative z-10 min-w-0 flex-shrink"
            onClick={() => {
              console.log("Character info clicked!");
              setShowCharacterGallery(true);
            }}
            style={{ pointerEvents: "auto" }}>
            <div className="w-6 h-6 md:w-7 md:h-7 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
              {character && character.avatar_url ? (
                <img
                  src={character.avatar_url}
                  alt={character.name}
                  className="w-full h-full object-cover"
                />
              ) : character ? (
                <span className="text-white font-bold text-xs">{character.name.charAt(0)}</span>
              ) : (
                <Bot className="w-4 h-4 md:w-5 md:h-5 text-white" />
              )}
            </div>
            <div className="min-w-0 hidden sm:block">
              <h1 className="text-white drop-shadow-lg text-xs md:text-sm font-medium truncate">
                {character?.name || "AI Assistant"}
              </h1>
              {!is_group_mode && session && (
                <p className="text-white drop-shadow-lg/50 text-xs truncate">
                  {t({
                    ja:
                      typeof commonTexts.messageCount.ja === "function"
                        ? commonTexts.messageCount.ja(session.message_count)
                        : `${session.message_count} メッセージ`,
                    en:
                      typeof commonTexts.messageCount.en === "function"
                        ? commonTexts.messageCount.en(session.message_count)
                        : `${session.message_count} messages`,
                    zh:
                      typeof commonTexts.messageCount.zh === "function"
                        ? commonTexts.messageCount.zh(session.message_count)
                        : `${session.message_count} 消息`,
                    ko:
                      typeof commonTexts.messageCount.ko === "function"
                        ? commonTexts.messageCount.ko(session.message_count)
                        : `${session.message_count} 메시지`,
                  })}
                </p>
              )}
            </div>
          </div>

          {/* セパレーター */}
          <div className="w-px h-6 bg-white/20 mx-1 flex-shrink-0" />

          {/* ペルソナ選択ボタン（常に表示） */}
          <div
            className="flex items-center gap-1 cursor-pointer relative z-10 min-w-0 flex-shrink"
            onClick={() => {
              console.log("Persona info clicked!");
              setShowPersonaGallery(true);
            }}
            style={{ pointerEvents: "auto" }}>
            <div className="w-5 h-5 md:w-6 md:h-6 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
              {persona && persona.avatar_path && persona.avatar_path.trim() !== "" ? (
                <img
                  src={persona.avatar_path}
                  alt={persona.name}
                  className="w-full h-full object-cover"
                />
              ) : persona ? (
                <span className="text-white font-bold text-xs">{persona.name.charAt(0)}</span>
              ) : (
                <UserCircle className="w-3 h-3 md:w-4 md:h-4 text-white" />
              )}
            </div>
            <div className="min-w-0 hidden md:block">
              <h2 className="text-white drop-shadow-lg text-xs font-medium truncate">
                {persona?.name || "User"}
              </h2>
              <p className="text-white drop-shadow-lg/50 text-xs truncate">
                Persona
              </p>
            </div>
          </div>
        </div>

        {/* ペルソナ情報は上に移動 */}
      </div>

      {/* Right side - model selector, voice call button and brain tracker */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* クイック設定ボタン */}
        <button
          onClick={() => setIsQuickSettingsOpen(!isQuickSettingsOpen)}
          className={cn(
            "p-1.5 md:p-2 rounded-lg transition-colors touch-manipulation flex-shrink-0 hover:scale-105 active:scale-95",
            isQuickSettingsOpen
              ? "bg-purple-500/20 text-purple-300"
              : "hover:bg-white/20 text-white drop-shadow-lg"
          )}
          title="クイック設定">
          <Sliders className="w-5 h-5 md:w-5 md:h-5" />
        </button>

        {/* 音声通話ボタン */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsVoiceCallModalOpen(true)}
          className="p-1.5 md:p-2 rounded-lg transition-colors touch-manipulation text-white drop-shadow-lg flex-shrink-0 hover:bg-white/20"
          title="音声通話">
          <Phone className="w-5 h-5 md:w-5 md:h-5" />
        </motion.button>

        {/* モデル選択ドロップダウン - ultra mobile optimized */}
        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              const { setShowSettingsModal } = useAppStore?.getState?.() || {};
              setShowSettingsModal(true, "ai");
            }}
            className="flex items-center gap-0.5 px-1.5 py-1 md:px-2 md:py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors border border-purple-400/30 text-xs font-medium"
            title="AI設定">
            <Settings className="w-4 h-4 md:w-3 md:h-3 text-blue-400 flex-shrink-0" />
            <span className="text-white drop-shadow-lg/90 inline max-w-[80px] md:max-w-[100px] lg:max-w-[120px] truncate text-xs md:text-sm">
              {getModelDisplayName(
                useAppStore?.getState?.()?.apiConfig?.model || ""
              )}
            </span>
            <ChevronDown className="w-2 h-2 text-white drop-shadow-lg/60 flex-shrink-0" />
          </motion.button>
        </div>

        {/* トラッカー（記憶情報）ボタン - ultra mobile optimized */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={toggleRightPanel}
          className={cn(
            "p-1.5 md:p-2 rounded-lg transition-colors touch-manipulation text-white drop-shadow-lg flex-shrink-0",
            isRightPanelOpen
              ? "bg-purple-500/20 text-purple-300"
              : "hover:bg-white/20 text-white drop-shadow-lg"
          )}
          title={isRightPanelOpen ? "記憶情報を非表示" : "記憶情報を表示"}>
          <Brain className="w-5 h-5 md:w-5 md:h-5" />
        </motion.button>
      </div>

      {/* 音声通話インターフェース - コンパクト版 */}
      {isVoiceCallActive && (
        <VoiceCallInterface
          characterId={character?.id}
          isActive={isVoiceCallActive}
          onEnd={() => setIsVoiceCallActive(false)}
        />
      )}

      {/* フル画面音声通話モーダル */}
      <VoiceCallModal
        characterId={character?.id}
        isOpen={isVoiceCallModalOpen}
        onClose={() => setIsVoiceCallModalOpen(false)}
      />

      {/* クイック設定パネル */}
      <QuickSettingsPanel
        isOpen={isQuickSettingsOpen}
        onClose={() => setIsQuickSettingsOpen(false)}
      />
    </div>
  );
};

// メインのChatHeaderコンポーネント（SSR対応）
export const ChatHeader: React.FC = () => {
  return (
    <ClientOnlyProvider
      fallback={
        <div className="chat-header fixed top-0 left-0 right-0 z-[60] p-4 border-b border-purple-400/20 h-16 bg-slate-900/95 backdrop-blur-md">
          {/* Loading placeholder */}
        </div>
      }>
      <ChatHeaderContent />
    </ClientOnlyProvider>
  );
};
