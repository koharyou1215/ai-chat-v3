"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import NextImage from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Mic,
  Sparkles,
  Lightbulb,
  Plus,
  User,
  Settings,
  Bot as _Bot,
  Shield,
  History,
  Image as ImageIcon,
  Paperclip,
  Code as _Code,
  X,
  Cpu,
  Phone,
  Users,
} from "lucide-react";
import { useAppStore } from "@/store";
import { cn } from "@/lib/utils";
import { shallow } from "zustand/shallow";
// import imageCompression from 'browser-image-compression'; // 静的インポートを削除

export const MessageInput: React.FC = React.memo(() => {
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fixed Zustand selectors to prevent infinite loops
  const {
    is_generating,
    currentInputText,
    isEnhancingText,
    isGeneratingSuggestions,
    showEnhancementModal,
    is_group_mode,
    active_group_session_id,
    groupSessions,
    systemPrompts,
    sendMessage,
    sendProgressiveMessage,
    setCurrentInputText,
    setShowCharacterGallery,
    setShowPersonaGallery,
    setShowHistoryModal,
    setShowSettingsModal,
    setShowVoiceSettingsModal,
    setShowSuggestionModal,
    generateSuggestions,
    enhanceText,
    setShowEnhancementModal,
    enhanceTextForModal,
    getActiveSession,
    toggleGroupMemberModal,
    chat,
  } = useAppStore();

  const hasMessage = currentInputText.trim().length > 0;
  const hasContent = hasMessage || selectedImage;

  const handleSuggestClick = async () => {
    console.log("💡 Suggest button clicked!");

    setShowSuggestionModal(true);

    const customPrompt =
      systemPrompts.replySuggestion &&
      systemPrompts.replySuggestion.trim() !== ""
        ? systemPrompts.replySuggestion
        : undefined;

    // グループチャットモードの場合
    if (is_group_mode && active_group_session_id) {
      const groupSession = groupSessions.get(active_group_session_id);
      if (!groupSession) return;

      const recentMessages = groupSession.messages.slice(-10); // より多くの会話履歴を参照

      // グループチャット用: 最初のアクティブキャラを使用
      const activeChars = Array.from(groupSession.active_character_ids)
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
      ); // グループモード
    } else {
      // ソロモード
      const session = getActiveSession();
      if (!session) return;

      const recentMessages = session.messages.slice(-10); // より多くの会話履歴を参照
      const character = session.participants.characters[0];
      const user = session.participants.user;

      await generateSuggestions(
        recentMessages,
        character,
        user,
        customPrompt,
        false
      ); // ソロモード
    }
  };

  const handleEnhanceClick = async () => {
    console.log("✨ Enhance button clicked!");
    if (!hasMessage) return;

    setShowEnhancementModal(true);

    const customPrompt =
      systemPrompts.textEnhancement &&
      systemPrompts.textEnhancement.trim() !== ""
        ? systemPrompts.textEnhancement
        : undefined;

    // グループチャットモードの場合
    if (is_group_mode && active_group_session_id) {
      const groupSession = groupSessions.get(active_group_session_id);
      if (!groupSession) return;

      const recentMessages = groupSession.messages.slice(-10); // より多くの会話履歴を参照
      const user = groupSession.persona;

      await enhanceTextForModal(
        currentInputText,
        recentMessages,
        user,
        customPrompt
      );
    } else {
      // ソロモード
      const session = getActiveSession();
      if (!session) {
        alert("セッションが見つかりません。ページをリロードしてみてください。");
        return;
      }

      const recentMessages = session.messages.slice(-10); // より多くの会話履歴を参照
      const user = session.participants.user;

      await enhanceTextForModal(
        currentInputText,
        recentMessages,
        user,
        customPrompt
      );
    }
  };

  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if ((!hasMessage && !selectedImage) || is_generating || isSending) return;

    setIsSending(true);
    try {
      // プログレッシブモードが有効な場合は sendProgressiveMessage を使用
      console.log("🔍 Progressive Mode Check:", {
        enabled: chat?.progressiveMode?.enabled,
        is_group_mode,
        should_use_progressive:
          chat?.progressiveMode?.enabled && !is_group_mode,
      });

      if (chat?.progressiveMode?.enabled && !is_group_mode) {
        console.log("🚀 Using Progressive Message Generation");
        await sendProgressiveMessage(
          currentInputText,
          selectedImage || undefined
        );
      } else {
        console.log("📝 Using Normal Message Generation");
        await sendMessage(currentInputText, selectedImage || undefined);
      }
      setCurrentInputText("");
      setSelectedImage(null);
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleImageUpload = () => {
    // モバイル環境でのタッチ操作を最適化
    if (fileInputRef.current) {
      if ("ontouchstart" in window) {
        setTimeout(() => {
          fileInputRef.current?.click();
        }, 100);
      } else {
        fileInputRef.current.click();
      }
    }
  };

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    console.log("🔄 File upload started:", {
      name: file.name,
      size: file.size,
      type: file.type,
    });

    setIsUploading(true);
    try {
      let processedFile = file;
      // 画像ファイルサイズ制限チェック（圧縮なしで安全な実装）
      if (file.type.startsWith("image/")) {
        const maxSize = 5 * 1024 * 1024; // 5MB制限
        if (file.size > maxSize) {
          console.warn("⚠️ Image too large, uploading without compression");
          alert(
            "画像サイズが大きいため、アップロードに時間がかかる場合があります。"
          );
        }
        processedFile = file;
      }

      const formData = new FormData();
      formData.append("file", processedFile);

      const response = await fetch("/api/upload/image", {
        method: "POST",
        body: formData,
      });

      // Safe JSON parsing with proper error handling
      let result;
      try {
        // Check if response has content-type header for JSON
        const contentType = response.headers.get("content-type");

        if (!response.ok) {
          // Try to get error text even if not JSON
          const errorText = await response.text();
          throw new Error(
            `アップロードに失敗しました (${response.status}): ${
              errorText || response.statusText
            }`
          );
        }

        if (!contentType?.includes("application/json")) {
          const errorText = await response.text();
          throw new Error(
            `サーバーがJSON以外のレスポンスを返しました: ${errorText}`
          );
        }

        result = await response.json();
      } catch (parseError) {
        console.error("📤 Upload response parse error:", parseError);
        if (parseError instanceof SyntaxError) {
          throw new Error(
            "サーバーレスポンスの解析に失敗しました。サーバーエラーの可能性があります。"
          );
        }
        throw parseError;
      }

      console.log("📤 Upload response:", result);

      if (result && result.success) {
        setSelectedImage(result.url);
        console.log("✅ Image uploaded successfully:", result.url);

        // Success notification (could be implemented as toast)
        if (typeof window !== "undefined") {
          console.log("🎉 Upload success notification");
        }
      } else {
        console.error("❌ Upload failed:", result.error);

        // Error notification with safe property access
        const errorMessage =
          result?.error || "アップロードに失敗しました（詳細不明）";
        alert(`アップロードに失敗しました:\n${errorMessage}`);
      }
    } catch (error) {
      console.error("💥 Upload error:", error);

      // Network error notification
      alert(
        "ネットワークエラーが発生しました。\nインターネット接続を確認してください。"
      );
    } finally {
      setIsUploading(false);
      console.log("🔄 Upload process completed");
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleClearImage = () => {
    setSelectedImage(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !is_generating) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const maxHeight = 120; // max-h-[120px] in pixels
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(
        scrollHeight,
        maxHeight
      )}px`;
    }
  }, [currentInputText]);

  return (
    <div
      className="fixed bottom-0 left-0 right-0 p-3 md:p-4 border-t border-purple-400/20 bg-slate-900/95 backdrop-blur-lg z-[41]"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 8px)" }}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleFileInputChange}
        className="hidden"
      />

      <AnimatePresence>
        {showActionMenu && (
          <ActionMenu
            onClose={() => setShowActionMenu(false)}
            onCharacterClick={() => setShowCharacterGallery(true)}
            onPersonaClick={() => setShowPersonaGallery(true)}
            onModelClick={() => {
              console.log(
                "AI設定クリック: setShowSettingsModal(true, 'ai') を呼び出します"
              );
              setShowSettingsModal(true, "ai");
            }}
            onVoiceClick={() => setShowVoiceSettingsModal(true)}
            onImageClick={handleImageUpload}
            onHistoryClick={() => setShowHistoryModal(true)}
            onChatSettingsClick={() => setShowSettingsModal(true, "chat")}
          />
        )}
      </AnimatePresence>

      {/* 画像プレビューエリア */}
      {selectedImage && (
        <div className="mb-3 p-3 bg-white/5 rounded-xl border border-purple-400/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/70">添付画像:</span>
            <button
              onClick={handleClearImage}
              className="text-red-400 hover:text-red-300 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="relative" style={{ maxHeight: "8rem" }}>
            <NextImage
              src={selectedImage}
              alt="Uploaded preview"
              width={400}
              height={128}
              className="rounded-lg object-contain"
              style={{
                width: "auto",
                height: "auto",
                maxHeight: "8rem",
                maxWidth: "100%",
              }}
              unoptimized
            />
          </div>
        </div>
      )}

      <div className="relative flex items-end gap-2 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/10 p-2 md:p-3">
        {/* 左側ボタンエリア */}
        <div className="flex gap-1">
          <VoiceCallButton />
          <GroupModeButton />
          <AnimatePresence>
            {is_group_mode && <GroupMemberButton />}
          </AnimatePresence>
        </div>

        <textarea
          ref={textareaRef}
          value={currentInputText || ""}
          onChange={(e) => setCurrentInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="メッセージを入力..."
          className="flex-1 bg-transparent text-white/90 placeholder-white/30 resize-none outline-none max-h-[120px]"
          rows={1}
        />

        <div className="flex gap-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={hasMessage ? "enhance" : "suggest"}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}>
              {hasMessage ? (
                <InputButton
                  icon={Sparkles}
                  onClick={handleEnhanceClick}
                  tooltip="文章強化"
                  isLoading={isEnhancingText} // ★ isLoadingプロパティを追加
                />
              ) : (
                <InputButton
                  icon={Lightbulb}
                  onClick={handleSuggestClick}
                  tooltip="返信提案"
                />
              )}
            </motion.div>
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.div
              key={hasContent ? "send" : "menu"}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}>
              {hasContent ? (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSend}
                  disabled={isSending} // 🔧 修正: 送信中は無効化
                  className="p-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                  {is_generating ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </motion.button>
              ) : (
                <InputButton
                  icon={Plus}
                  onClick={() => setShowActionMenu(!showActionMenu)}
                  tooltip="メニュー"
                  active={showActionMenu}
                  rotation={showActionMenu ? 135 : 0}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
});

MessageInput.displayName = "MessageInput";

const ActionMenu = ({
  onClose,
  onCharacterClick,
  onPersonaClick,
  onModelClick,
  onVoiceClick,
  onImageClick,
  onHistoryClick,
  onChatSettingsClick,
}: {
  onClose: () => void;
  onCharacterClick: () => void;
  onPersonaClick: () => void;
  onModelClick: () => void;
  onVoiceClick: () => void;
  onImageClick: () => void;
  onHistoryClick: () => void;
  onChatSettingsClick: () => void;
}) => {
  const menuItems = [
    { icon: User, label: "キャラクター", action: onCharacterClick },
    { icon: Shield, label: "ペルソナ", action: onPersonaClick },
    { icon: Cpu, label: "AI設定", action: onModelClick },
    { icon: Mic, label: "音声", action: onVoiceClick },
    { icon: Paperclip, label: "画像添付", action: onImageClick },
    { icon: History, label: "チャット履歴", action: onHistoryClick },
    { icon: Settings, label: "チャット設定", action: onChatSettingsClick },
  ];

  const handleItemClick = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="absolute bottom-full mb-4 right-4 bg-slate-800 border border-purple-400/20 rounded-2xl shadow-lg p-2 grid grid-cols-4 gap-2">
      {menuItems.map((item) => (
        <motion.button
          key={item.label}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handleItemClick(item.action)}
          className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-white/10 transition-colors w-20 h-20">
          <item.icon className="w-6 h-6 text-white/70 mb-1" />
          <span className="text-xs text-white/60">{item.label}</span>
        </motion.button>
      ))}
    </motion.div>
  );
};

const InputButton: React.FC<{
  icon: React.ElementType;
  onClick: () => void;
  active?: boolean;
  tooltip?: string;
  rotation?: number;
  isLoading?: boolean; // ★ isLoadingプロパティを追加
}> = ({ icon: Icon, onClick, active, tooltip, rotation = 0, isLoading }) => (
  <div className="relative group">
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        "p-2 rounded-lg transition-colors",
        active
          ? "bg-purple-500/20 text-purple-400"
          : "hover:bg-white/10 text-white/50 hover:text-white/70"
      )}>
      <motion.div
        animate={{ rotate: rotation }}
        transition={{ duration: 0.3, ease: "easeInOut" }}>
        <Icon className="w-5 h-5" />
      </motion.div>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}
    </motion.button>
    {tooltip && (
      <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-black/70 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
        {tooltip}
      </div>
    )}
  </div>
);

// 音声通話ボタンコンポーネント
const VoiceCallButton: React.FC = () => {
  const [isVoiceCallActive, setIsVoiceCallActive] = useState(false);
  const [isVoiceCallModalOpen, setIsVoiceCallModalOpen] = useState(false);

  return (
    <InputButton
      icon={Phone}
      onClick={() => setIsVoiceCallActive(!isVoiceCallActive)}
      tooltip={isVoiceCallActive ? "音声通話を終了" : "音声通話を開始"}
      active={isVoiceCallActive}
    />
  );
};

// グループモードボタンコンポーネント
const GroupModeButton: React.FC = () => {
  const { is_group_mode, setGroupMode } = useAppStore();

  return (
    <InputButton
      icon={Users}
      onClick={() => setGroupMode(!is_group_mode)}
      tooltip={
        is_group_mode ? "個人チャットに切り替え" : "グループチャットに切り替え"
      }
      active={is_group_mode}
    />
  );
};

// グループメンバー編集ボタンコンポーネント
const GroupMemberButton: React.FC = () => {
  const { toggleGroupMemberModal } = useAppStore();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5 }}>
      <InputButton
        icon={Users}
        onClick={() => toggleGroupMemberModal(true)}
        tooltip="メンバーを編集"
      />
    </motion.div>
  );
};
