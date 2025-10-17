"use client";
import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  Suspense,
} from "react";
// シンプルなスピナー
const Spinner: React.FC<{ label?: string }> = ({ label }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 20,
      pointerEvents: "none",
    }}>
    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-400" />
    {label && (
      <span className="ml-3 text-white/80 text-xs bg-black/40 px-2 py-1 rounded">
        {label}
      </span>
    )}
  </div>
);
import { motion, AnimatePresence, TargetAndTransition } from "framer-motion";
import {
  RefreshCw,
  Copy,
  Volume2,
  VolumeX,
  Pause,
  Edit,
  CornerUpLeft,
  X,
  MoreHorizontal,
  ChevronRight,
  Image as IconImage,
  MessageSquare,
  Trash2,
  RotateCcw,
} from "lucide-react";
import NextImage from "next/image";
import { UnifiedMessage } from "@/types";
import { useAppStore } from "@/store";
import { cn } from "@/lib/utils";
import {
  replaceVariablesInMessage,
  getVariableContext,
} from "@/utils/variable-replacer";
import { RichMessage } from "./RichMessage";
import { ProgressiveMessageBubble } from "./ProgressiveMessageBubble";
import { AdvancedEffects } from "./AdvancedEffects";

// Lazy imports for heavy effect components
import {
  HologramMessage,
  ParticleText,
  MessageEffects,
  EmotionDisplay,
  EffectLoadingFallback,
} from "../lazy/LazyEffects";

import { EmotionReactions } from "@/components/emotion/EmotionDisplay";
import { EmotionResult } from "@/services/emotion/EmotionAnalyzer";
import { useAudioPlayback } from "@/hooks/useAudioPlayback";
import { useImageGeneration } from "@/hooks/useImageGeneration";
import { useMessageEffects } from "@/hooks/useMessageEffects";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MessageBubbleProps {
  message: UnifiedMessage;
  previousMessage?: UnifiedMessage;
  isLastMessage?: boolean;
  onRegenerate?: (messageId: string) => void;
  onContinue?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onEdit?: (messageId: string, newContent: string) => void;
  showActions?: boolean;
  className?: string;
  isLatest: boolean;
  isGroupChat?: boolean;
}

const MessageBubbleComponent: React.FC<MessageBubbleProps> = ({
  message,
  previousMessage: _previousMessage,
  isLatest,
  isGroupChat = false,
}) => {
  // ローディング・再生状態
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const { isSpeaking, handleSpeak } = useAudioPlayback({ message, isLatest });
  const { generateImage } = useImageGeneration();

  // **安全な個別セレクター（無限ループ回避）**
  const characters = useAppStore((state) => state.characters);
  const getSelectedPersona = useAppStore((state) => state.getSelectedPersona);

  // 共通エフェクトフック
  const {
    effects,
    calculateFontEffects,
    isEffectEnabled,
    settings: effectSettings,
  } = useMessageEffects();

  // フォントエフェクトのスタイル計算（共通フック使用）
  const fontEffectStyles = useMemo(() => {
    return calculateFontEffects();
  }, [calculateFontEffects]);
  const _deleteMessage = useAppStore((state) => state.deleteMessage);
  const regenerateLastMessage = useAppStore(
    (state) => state.regenerateLastMessage
  );
  const is_generating = useAppStore((state) => state.is_generating);
  const group_generating = useAppStore((state) => state.group_generating);
  const trackerManagers = useAppStore((state) => state.trackerManagers);
  const activeSessionId = useAppStore((state) => state.active_session_id);
  const rollbackSession = useAppStore((state) => state.rollbackSession);
  const rollbackGroupSession = useAppStore(
    (state) => state.rollbackGroupSession
  );
  const deleteMessage = useAppStore((state) => state.deleteMessage);
  const continueLastMessage = useAppStore((state) => state.continueLastMessage);
  const getSelectedCharacter = useAppStore(
    (state) => state.getSelectedCharacter
  );
  const addMessage = useAppStore((state) => (state as any).addMessage);
  const sessions = useAppStore((state) => state.sessions);
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
    }
  };
  const appearanceSettings = useAppStore((state) => state.appearanceSettings);
  const chatSettings = useAppStore((state) => state.chat);
  const voice = useAppStore((state) => state.voice);

  // グループチャット用のセレクター
  const is_group_mode = useAppStore((state) => state.is_group_mode);
  const active_group_session_id = useAppStore(
    (state) => state.active_group_session_id
  );
  const groupSessions = useAppStore((state) => state.groupSessions);
  const regenerateLastGroupMessage = useAppStore(
    (state) => state.regenerateLastGroupMessage
  );
  const continueLastGroupMessage = useAppStore(
    (state) => state.continueLastGroupMessage
  );

  const emotionAnalysisEnabled = useAppStore(
    (state) => state.unifiedSettings.emotionalIntelligence.enabled &&
               state.unifiedSettings.emotionalIntelligence.analysis.basic
  );

  // マージンと要素選択のキャッシュ
  const menuRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedTextSelection, setSelectedTextSelection] =
    useState<Selection | null>(null);
  const [selectedText, setSelectedText] = useState<string>("");
  const [showFullActions, setShowFullActions] = useState(false);
  // 通常動作: メニューはデフォルト非表示
  const [showMenu, setShowMenu] = useState(false);

  const menuTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const menuOpeningRef = useRef<NodeJS.Timeout | null>(null);
  const menuContentSelector = '[data-slot="dropdown-menu-content"]';

  const isAssistant = message.role === "assistant";
  const isUser = message.role === "user";

  // キャラクター情報の取得
  const character = useMemo(() => {
    if (
      isGroupChat &&
      message.metadata?.character_id &&
      typeof message.metadata.character_id === "string"
    ) {
      return characters.get(message.metadata.character_id);
    }
    return getSelectedCharacter();
  }, [
    characters,
    message.metadata?.character_id,
    isGroupChat,
    getSelectedCharacter,
  ]);

  // メッセージ内容の処理（変数置換）
  const processedContent = useMemo(() => {
    try {
      const persona = getSelectedPersona();
      const variableContext = {
        user: persona ?? undefined,
        character: character ?? undefined,
      };
      const processed = replaceVariablesInMessage(
        message.content,
        variableContext
      );
      return processed;
    } catch (error) {
      console.error("Error processing message content:", error);
      return message.content; // フォールバック
    }
  }, [message.content, character, getSelectedPersona]);

  // Ref for bubble element
  const bubbleRef = useRef<HTMLDivElement>(null);

  // ホバー状態の管理（改善版）
  const handleMouseEnter = useCallback(() => {
    // 既存のタイマーをクリア（hover による自動オープンは行わない）
    if (menuTimeoutRef.current) {
      clearTimeout(menuTimeoutRef.current);
      menuTimeoutRef.current = null;
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    // 既存のタイマーをクリアするだけ。バブル離脱時は即閉じない。
    if (menuTimeoutRef.current) {
      clearTimeout(menuTimeoutRef.current);
      menuTimeoutRef.current = null;
    }
    // メニューがちょうど開いて配置調整中は閉じない
    if (menuOpeningRef.current) return;
  }, []);

  // 感情分析結果の解析
  const emotionResult = useMemo((): EmotionResult | null => {
    const messageWithEmotion = message as any;
    if (!emotionAnalysisEnabled || !messageWithEmotion.emotion_analysis)
      return null;

    try {
      const emotionData = message.expression?.emotion;
      if (typeof emotionData === "string") {
        return JSON.parse(emotionData);
      }
      return (emotionData as unknown as EmotionResult) || null;
    } catch (error) {
      console.error("Failed to parse emotion analysis:", error);
      return null;
    }
  }, [message, emotionAnalysisEnabled]);

  // メッセージアクション: 再生成
  const handleRegenerate = useCallback(async () => {
    if (!isLatest || !isAssistant) return;

    setIsRegenerating(true);
    try {
      if (isGroupChat && active_group_session_id) {
        await regenerateLastGroupMessage();
      } else {
        await regenerateLastMessage();
      }
    } catch (error) {
      console.error("再生成に失敗しました:", error);
    } finally {
      setIsRegenerating(false);
    }
  }, [
    isLatest,
    isAssistant,
    isGroupChat,
    active_group_session_id,
    regenerateLastGroupMessage,
    regenerateLastMessage,
  ]);

  // メッセージアクション: 続きを生成
  const handleContinue = useCallback(async () => {
    if (!isLatest || !isAssistant) return;

    setIsContinuing(true);
    try {
      if (isGroupChat && active_group_session_id) {
        await continueLastGroupMessage();
      } else {
        await continueLastMessage();
      }
    } catch (error) {
      console.error("続きの生成に失敗しました:", error);
    } finally {
      setIsContinuing(false);
    }
  }, [
    isLatest,
    isAssistant,
    isGroupChat,
    active_group_session_id,
    continueLastGroupMessage,
    continueLastMessage,
  ]);

  // メッセージアクション: 画像生成
  const handleGenerateImage = useCallback(async () => {
    if (!isAssistant) return;

    setIsGeneratingImage(true);
    try {
      // 現在のキャラクターを取得
      const character = getSelectedCharacter();
      if (!character) {
        console.error("キャラクターが選択されていません");
        alert("キャラクターが選択されていません");
        return;
      }

      // 現在のセッションのメッセージを取得
      const sessions = useAppStore.getState().sessions;
      const currentSession = sessions.get(activeSessionId || "");
      if (!currentSession) {
        console.error("セッションが見つかりません");
        alert("セッションが見つかりません");
        return;
      }

      // トラッカーの値を取得
      const trackerManager = trackerManagers.get(activeSessionId || "");
      const trackers = [];
      if (trackerManager && character.trackers) {
        const trackerSet = trackerManager.getTrackerSet(character.id);
        if (trackerSet) {
          for (const trackerDef of character.trackers) {
            const tracker = trackerSet.trackers.get(trackerDef.name);
            if (tracker) {
              // configのtypeを使用し、composite型は除外
              const trackerType = trackerDef.config?.type;
              if (trackerType && trackerType !== "composite") {
                trackers.push({
                  name: trackerDef.name,
                  value: tracker.current_value,
                  type: trackerType as "numeric" | "state" | "boolean" | "text",
                });
              }
            }
          }
        }
      }

      // 画像を生成
      const imageUrl = await generateImage(
        character,
        currentSession.messages,
        trackers
      );

      console.log("🖼️ Generated image URL:", imageUrl?.substring(0, 100));

      // 生成された画像をメッセージとして追加
      if (imageUrl) {
        // addMessageが存在するか確認
        if (addMessage) {
          console.log("📨 Adding image message to chat");
          const newMessage = {
            id: Date.now().toString(),
            content: `![Generated Image](${imageUrl})`,
            role: "assistant" as const,
            timestamp: Date.now(),
            character_id: character.id,
            metadata: {
              type: "image",
              generated: true,
            },
          };
          console.log("📝 New message:", newMessage);
          addMessage(newMessage);
        } else {
          console.error("❌ addMessage function not found");
          // 代替案：アラートで画像を表示
          alert("画像生成に成功しましたが、チャットに追加できませんでした。");
        }
      } else {
        console.error("❌ No image URL returned from generateImage");
      }
    } catch (error) {
      console.error("画像生成に失敗しました:", error);
      const errorMessage =
        error instanceof Error ? error.message : "画像生成に失敗しました";
      alert(`画像生成エラー: ${errorMessage}`);
    } finally {
      setIsGeneratingImage(false);
    }
  }, [
    isAssistant,
    getSelectedCharacter,
    activeSessionId,
    trackerManagers,
    generateImage,
    addMessage,
  ]);

  // メッセージアクション: 削除
  const handleDelete = useCallback(async () => {
    if (!confirm("このメッセージを削除しますか？")) return;

    try {
      if (isGroupChat && active_group_session_id) {
        console.warn("Group message deletion not implemented");
      } else {
        deleteMessage(message.id);
      }
    } catch (error) {
      console.error("メッセージの削除に失敗しました:", error);
    }
  }, [isGroupChat, active_group_session_id, deleteMessage, message.id]);

  // メッセージアクション: ロールバック
  const handleRollback = useCallback(async () => {
    if (
      !window.confirm(
        "この地点まで会話をロールバックしますか？これより後のメッセージは全て削除されます。"
      )
    ) {
      return;
    }

    try {
      console.log("🔄 Rollback initiated", {
        messageId: message.id,
        sessionId: (message as any).session_id,
        isGroupChat,
        active_group_session_id,
      });

      if (isGroupChat && (message as any).session_id) {
        console.log("📥 Using group rollback for message:", message.id);
        rollbackGroupSession(message.id);
      } else if (!isGroupChat && typeof activeSessionId === "string") {
        console.log("👤 Using solo rollback for message:", message.id);
        rollbackSession(message.id);
      } else {
        console.warn("⚠️ Ambiguous session context, attempting detection...");
        if (
          (message as any).session_id &&
          groupSessions.has((message as any).session_id)
        ) {
          console.log("🔍 Detected group session, using group rollback");
          rollbackGroupSession(message.id);
        } else if (typeof activeSessionId === "string") {
          console.log("🔍 Fallback to solo rollback");
          rollbackSession(message.id);
        } else {
          throw new Error("Unable to determine session context for rollback");
        }
      }
    } catch (error) {
      console.error("❌ Rollback failed:", error);
      alert(
        `ロールバックに失敗しました: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }, [
    message,
    rollbackSession,
    rollbackGroupSession,
    isGroupChat,
    active_group_session_id,
    activeSessionId,
    groupSessions,
  ]);

  // テキスト選択イベント
  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim() || "";
    setSelectedText(selectedText);
    setSelectedTextSelection(selection);
    setShowFullActions(selectedText.length > 0);
  }, []);

  // メニューの外側クリックでの閉じる処理
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowFullActions(false);
        setSelectedText("");
      }
    };

    if (showFullActions) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showFullActions]);

  // タイマーのクリーンアップ
  useEffect(() => {
    return () => {
      if (menuTimeoutRef.current) {
        clearTimeout(menuTimeoutRef.current);
      }
    };
  }, []);

  // 外側クリックでメニューを閉じる（クリックで開いた場合にのみ挙動）
  useEffect(() => {
    if (!showMenu) return;

    const handleDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      // メニュー本体またはバブル内のクリックは無視
      if (
        menuRef.current &&
        (menuRef.current.contains(target) ||
          bubbleRef.current?.contains(target))
      ) {
        return;
      }
      setShowMenu(false);
    };

    document.addEventListener("mousedown", handleDocClick);
    return () => document.removeEventListener("mousedown", handleDocClick);
  }, [showMenu]);

  const generateIsActive = is_generating || group_generating;
  const isCurrentlyGenerating = generateIsActive && isLatest;

  // 音声再生状態（isSpeakingを使用）
  const isPlaying = isSpeaking;

  // メッセージ間の時間差計算
  const timeSincePrevious = useMemo(() => {
    if (!_previousMessage) return null;
    const current = new Date(message.created_at || Date.now());
    const previous = new Date(_previousMessage.created_at || Date.now());
    const diffMinutes =
      Math.abs(current.getTime() - previous.getTime()) / (1000 * 60);
    return diffMinutes > 5 ? diffMinutes : null; // 5分以上の場合のみ表示
  }, [message, _previousMessage]);

  // グループチャットでの発言者名表示判定
  const shouldShowSpeakerName =
    isGroupChat &&
    isAssistant &&
    character &&
    (!_previousMessage ||
      _previousMessage.role !== "assistant" ||
      _previousMessage.metadata?.character_id !==
        message.metadata?.character_id ||
      (timeSincePrevious && timeSincePrevious > 5));

  // プログレッシブメッセージかどうかをチェック
  const isProgressiveMessage = message.metadata?.progressive === true;

  // 再生成・続き生成の可否判定（条件付きレンダリングの前に定義）
  const canRegenerate = isAssistant && isLatest && !generateIsActive;
  const canContinue = isAssistant && isLatest && !generateIsActive;

  // アニメーション設定の最適化
  const bubbleAnimation: TargetAndTransition = useMemo(
    () => ({
      scale: [0.95, 1],
      opacity: [0, 1],
      y: [20, 0],
    }),
    []
  );

  const bubbleTransition = useMemo(
    () => ({
      duration: 0.3,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    }),
    []
  );

  // クリップボードコピー
  const handleCopy = useCallback(async () => {
    try {
      const textToCopy = selectedText || processedContent;
      await copyToClipboard(textToCopy);
    } catch (error) {
      console.error("コピーに失敗しました:", error);
    }
  }, [selectedText, processedContent]);

  // 編集状態の管理
  const editingMessageId = useAppStore((state) => state.editingMessageId);
  const editingContent = useAppStore((state) => state.editingContent);
  const startEditingMessage = useAppStore((state) => state.startEditingMessage);
  const cancelEditingMessage = useAppStore((state) => state.cancelEditingMessage);
  const updateEditingContent = useAppStore((state) => state.updateEditingContent);
  const sendMessage = useAppStore((state) => state.sendMessage);

  const isEditing = editingMessageId === message.id;

  // メッセージの編集開始
  const handleEdit = useCallback(() => {
    startEditingMessage(message.id, processedContent);
  }, [message.id, processedContent, startEditingMessage]);

  // 編集の保存（ロールバック→再生成）
  const handleSaveEdit = useCallback(async () => {
    if (!editingContent.trim()) return;

    try {
      // 1. このメッセージまでロールバック
      rollbackSession(message.id);

      // 2. 編集した内容で新しいメッセージを送信（再生成）
      await sendMessage(editingContent);

      // 3. 編集モードを終了
      cancelEditingMessage();
    } catch (error) {
      console.error("メッセージの編集に失敗しました:", error);
      alert("編集に失敗しました。もう一度お試しください。");
    }
  }, [
    editingContent,
    message.id,
    rollbackSession,
    sendMessage,
    cancelEditingMessage,
  ]);

  // 編集のキャンセル
  const handleCancelEdit = useCallback(() => {
    cancelEditingMessage();
  }, [cancelEditingMessage]);

  // 選択範囲へのアクション適用
  const handleApplyToSelection = useCallback(
    async (action: string) => {
      if (!selectedTextSelection || !selectedText) return;

      try {
        const character = getSelectedCharacter();
        const systemPrompt = `あなたは選択されたテキストに対して${
          action === "enhance"
            ? "強化・改善"
            : action === "translate"
            ? "翻訳"
            : action === "explain"
            ? "詳細説明"
            : action
        }を行うアシスタントです。`;

        let userPrompt = "";
        switch (action) {
          case "enhance":
            userPrompt = `次のテキストをより良く改善してください：\n\n"${selectedText}"`;
            break;
          case "translate":
            userPrompt = `次のテキストを自然な日本語に翻訳してください：\n\n"${selectedText}"`;
            break;
          case "explain":
            userPrompt = `次のテキストについて詳しく説明してください：\n\n"${selectedText}"`;
            break;
        }

        const response = await fetch("/api/chat/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: userPrompt,
            characterId: character?.id,
            systemPrompt,
          }),
        });

        if (response.ok) {
          const result = await response.text();
          if (addMessage)
            addMessage({
              id: Date.now().toString(),
              content: result,
              role: "assistant",
              timestamp: Date.now(),
              character_id: character?.id,
            });
        }
      } catch (error) {
        console.error(`Failed to apply ${action}:`, error);
      } finally {
        setSelectedText("");
        setShowFullActions(false);
      }
    },
    [selectedTextSelection, selectedText, getSelectedCharacter, addMessage]
  );

  // プログレッシブメッセージの場合は専用コンポーネントを使用
  // metadata.progressiveまたはmetadata.progressiveDataをチェック
  const hasProgressiveMetadata =
    message.metadata &&
    ("progressive" in message.metadata ||
      "progressiveData" in message.metadata);

  if (isProgressiveMessage && hasProgressiveMetadata) {
    // ProgressiveMessageBubbleに渡すために完全なProgressiveMessage構造を作成
    const progressiveData =
      (message.metadata as any).progressiveData || message.metadata;

    // デバッグログ
    console.log("🔄 MessageBubble: Rendering progressive message", {
      messageId: message.id,
      currentStage: progressiveData?.currentStage,
      hasStages: !!progressiveData?.stages,
    });
    // progressiveDataが正しく取得できているか確認
    console.log("🔍 MessageBubble: Progressive data check", {
      hasProgressiveData: !!progressiveData,
      stages: progressiveData?.stages,
      currentStage: progressiveData?.currentStage,
      messageContent: message.content?.substring(0, 50),
    });

    const progressiveMessage = {
      ...message,
      stages: progressiveData?.stages || {}, // 空のオブジェクトに変更
      currentStage: progressiveData?.currentStage || "reflex",
      transitions: progressiveData?.transitions || [],
      ui: progressiveData?.ui || {
        isUpdating: false,
        glowIntensity: "none",
        highlightChanges: false,
        showIndicator: true,
      },
      metadata: progressiveData?.metadata || message.metadata,
      content: message.content, // message.contentを確実に渡す
      // キャラクター情報を正しく設定
      character_name: character?.name,
    };

    return (
      <ProgressiveMessageBubble
        message={progressiveMessage}
        isLatest={isLatest}
      />
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        ref={bubbleRef}
        initial={bubbleAnimation as any}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={bubbleTransition}
        className={cn(
          "group relative flex items-start gap-3 mb-2 max-w-[85%] md:max-w-[75%]",
          isUser ? "ml-auto flex-row-reverse" : "mr-auto",
          "overflow-visible" // メニューがはみ出すことを許可
        )}
        onMouseUp={handleTextSelection}
        onTouchEnd={handleTextSelection}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}>
        {/* プロフィール画像（アシスタントのみ、条件付き表示） */}
        {!isUser && (
          <div className="flex-shrink-0 relative w-14 h-14 md:w-16 md:h-16 rounded-full overflow-hidden border-2 border-purple-400/30">
            {character && character.avatar_url ? (
              <NextImage
                src={character.avatar_url}
                alt={character?.name || "character avatar"}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                {character?.name?.[0] || "AI"}
              </div>
            )}
          </div>
        )}

        <div
          className={cn(
            "flex flex-col min-w-0",
            isUser ? "items-end" : "items-start flex-1",
            "overflow-visible" // メニューがはみ出すことを許可
          )}>
          {/* 発言者名とタイムスタンプ（グループチャット用） */}
          {shouldShowSpeakerName && (
            <div className="flex items-center gap-2 mb-1 text-xs text-white/60">
              <span className="font-medium text-purple-300">
                {character?.name || "AI"}
              </span>
              {timeSincePrevious && timeSincePrevious > 5 && (
                <span className="text-white/40">
                  {Math.round(timeSincePrevious)}分前
                </span>
              )}
            </div>
          )}

          {/* メッセージバブル本体 */}
          <div
            ref={menuRef}
            className={cn(
              "relative px-4 pt-3 pb-1.5 rounded-2xl shadow-lg transition-all duration-200",
              // User messages: Dynamic transparency with backdrop blur
              isUser
                ? effectSettings.bubbleBlur
                  ? "message-bubble-user-transparent"
                  : "bg-gradient-to-br from-blue-600/90 to-blue-700/90 text-white border border-blue-400/40 shadow-blue-500/20"
                : // Character messages: Purple theme with effects consideration
                effectSettings.colorfulBubbles
                ? effectSettings.bubbleBlur
                  ? "message-bubble-character-transparent"
                  : "bg-gradient-to-br from-purple-500/25 via-blue-500/20 to-teal-500/20 text-white border border-purple-400/40 shadow-purple-500/20"
                : effectSettings.bubbleBlur
                ? "message-bubble-character-transparent"
                : "bg-gradient-to-br from-purple-600/90 to-purple-700/90 text-white border border-purple-400/40 shadow-purple-500/20",
              "hover:shadow-xl group-hover:scale-[1.02]",
              selectedText ? "ring-2 ring-yellow-400/50" : "",
              "overflow-visible" // メニューがはみ出すことを許可
            )}
            style={
              {
                // CSS custom properties for dynamic transparency and blur
                "--user-bubble-opacity": isUser
                  ? (effectSettings.bubbleOpacity || 85) / 100
                  : 0.9,
                "--character-bubble-opacity": !isUser
                  ? effectSettings.colorfulBubbles
                    ? (effectSettings.bubbleOpacity || 85) / 100
                    : (effectSettings.bubbleOpacity || 85) / 100
                  : 0.9,
                // 🔧 FIX: Fixed blur value (8px) - no longer dependent on backgroundBlur
                "--user-bubble-blur": effectSettings.bubbleBlur
                  ? "blur(8px)"
                  : "none",
                "--character-bubble-blur": effectSettings.bubbleBlur
                  ? "blur(8px)"
                  : "none",
                // Additional background for colorful bubbles effect
                ...(effectSettings.colorfulBubbles &&
                  !effectSettings.bubbleBlur && {
                    backgroundColor: `rgba(147, 51, 234, ${
                      effectSettings.bubbleOpacity
                        ? effectSettings.bubbleOpacity / 100
                        : 0.25
                    })`,
                  }),
              } as React.CSSProperties
            }>
            {/* リッチメッセージ表示 or 編集モード */}
            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={editingContent}
                  onChange={(e) => updateEditingContent(e.target.value)}
                  className="w-full min-h-[100px] p-3 bg-white/10 text-white rounded-lg border border-white/20 focus:outline-none focus:border-purple-400 resize-y"
                  autoFocus
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={handleCancelEdit}
                    className="px-4 py-2 rounded-lg bg-gray-600/50 hover:bg-gray-600/70 text-white transition-colors">
                    キャンセル
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors">
                    保存して再生成
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {/* ✅ 常にRichMessageを使用（個別文字色付けとグラデーションを維持） */}
                <RichMessage
                  content={processedContent}
                  role={
                    message.role === "user" || message.role === "assistant"
                      ? message.role
                      : "assistant"
                  }
                  isExpanded={isExpanded}
                  onToggleExpanded={() => setIsExpanded(!isExpanded)}
                  isLatest={isLatest}
                />
              </div>
            )}

            {/* 感情表示（lazily loaded） */}
            {emotionResult && isEffectEnabled("realtimeEmotion") && (
              <Suspense fallback={<EffectLoadingFallback />}>
                <div className="mt-2">
                  <EmotionDisplay message={processedContent} />
                </div>
              </Suspense>
            )}

            {/* ホログラムエフェクト（lazily loaded） */}
            {isEffectEnabled("hologram") && (
              <Suspense fallback={<EffectLoadingFallback />}>
                <div className="mt-2">
                  <HologramMessage text={processedContent} />
                </div>
              </Suspense>
            )}

            {/* パーティクルエフェクト（lazily loaded） */}
            {isEffectEnabled("particles") && (
              <Suspense fallback={<EffectLoadingFallback />}>
                <ParticleText text={processedContent} trigger={isLatest} />
              </Suspense>
            )}

            {/* メッセージエフェクト（lazily loaded） */}
            {isEffectEnabled("typewriter") && (
              <Suspense fallback={<EffectLoadingFallback />}>
                <MessageEffects
                  trigger={processedContent}
                  position={{ x: 0, y: 0 }}
                  emotion={emotionResult || undefined}
                />
              </Suspense>
            )}

            {/* ローディングオーバーレイ */}
            {(isRegenerating || isContinuing || isCurrentlyGenerating) && (
              <Spinner
                label={
                  isRegenerating
                    ? "再生成中..."
                    : isContinuing
                    ? "続きを生成中..."
                    : "生成中..."
                }
              />
            )}

            {/* メインアクションメニュー - DropdownMenu形式 */}
            <div
              className={cn(
                "absolute bottom-2 z-[9999] pointer-events-auto",
                // 常に右下に表示する（視認性優先）
                "right-2",
                !showMenu && isLatest
                  ? "opacity-60 hover:opacity-100 transition-opacity"
                  : ""
              )}>
              <DropdownMenu
                open={showMenu}
                onOpenChange={(v) => {
                  // 開くときは閉じるタイマーをクリアして確実に開く
                  if (v && menuTimeoutRef.current) {
                    clearTimeout(menuTimeoutRef.current);
                    menuTimeoutRef.current = null;
                  }
                  // 保護タイマー: メニューが描画・配置されるまで短時間閉じない
                  if (v) {
                    if (menuOpeningRef.current) {
                      clearTimeout(menuOpeningRef.current);
                    }
                    menuOpeningRef.current = setTimeout(() => {
                      if (menuOpeningRef.current) {
                        clearTimeout(menuOpeningRef.current);
                        menuOpeningRef.current = null;
                      }
                    }, 250);
                  }
                  setShowMenu(v);
                }}>
                <DropdownMenuTrigger asChild>
                  <button
                    className="p-1.5 rounded-md hover:bg-white/10 text-white/70 hover:text-white transition-all duration-200"
                    onMouseDown={(e) => {
                      // ネイティブイベントで propagation を止め、document の mousedown ハンドラが先に走るのを防ぐ
                      try {
                        // stopImmediatePropagation を呼んで他のハンドラをブロック
                        (e.nativeEvent as Event).stopImmediatePropagation();
                      } catch (err) {
                        // ignore
                      }
                      e.stopPropagation();
                      // 既存の閉じるタイマーをクリア
                      if (menuTimeoutRef.current) {
                        clearTimeout(menuTimeoutRef.current);
                        menuTimeoutRef.current = null;
                      }
                      // 設置保護タイマー
                      if (menuOpeningRef.current) {
                        clearTimeout(menuOpeningRef.current);
                      }
                      menuOpeningRef.current = setTimeout(() => {
                        if (menuOpeningRef.current) {
                          clearTimeout(menuOpeningRef.current);
                          menuOpeningRef.current = null;
                        }
                      }, 300);
                      setShowMenu((s) => !s);
                    }}>
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  side="top"
                  className={cn(
                    "min-w-[180px] z-[9999]",
                    "bg-gray-900/95 border-gray-700",
                    "backdrop-blur-sm shadow-2xl",
                    "animate-in slide-in-from-top-2 fade-in-0 duration-200"
                  )}
                  sideOffset={8}
                  avoidCollisions={false}
                  collisionPadding={0}>
                  {/* アシスタントメッセージ用メニュー */}
                  {isAssistant && (
                    <>
                      <DropdownMenuItem onClick={handleRollback}>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        ロールバック
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={handleContinue}
                        disabled={isContinuing}>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        続きを生成
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={handleRegenerate}
                        disabled={isRegenerating}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        再生成
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleCopy()}>
                        <Copy className="h-4 w-4 mr-2" />
                        コピー
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={handleGenerateImage}
                        disabled={isGeneratingImage}>
                        <IconImage
                          className={cn(
                            "h-4 w-4 mr-2",
                            isGeneratingImage && "animate-pulse"
                          )}
                        />
                        {isGeneratingImage ? "画像生成中..." : "画像を生成"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={handleSpeak}
                        disabled={
                          !message.content || !message.content.trim()
                        }>
                        <Volume2
                          className={cn(
                            "h-4 w-4 mr-2",
                            isSpeaking && "animate-pulse text-blue-500"
                          )}
                        />
                        {isSpeaking ? "読み上げ中..." : "読み上げ"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={handleDelete}
                        className="text-red-600">
                        <Trash2 className="h-4 w-4 mr-2" />
                        削除
                      </DropdownMenuItem>
                    </>
                  )}

                  {/* ユーザーメッセージ用メニュー */}
                  {isUser && (
                    <>
                      <DropdownMenuItem onClick={() => handleCopy()}>
                        <Copy className="h-4 w-4 mr-2" />
                        コピー
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleEdit}>
                        <Edit className="h-4 w-4 mr-2" />
                        編集
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={handleDelete}
                        className="text-red-600">
                        <Trash2 className="h-4 w-4 mr-2" />
                        削除
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* 感情リアクション（lazily loaded） */}
          {emotionResult && isEffectEnabled("autoReactions") && (
            <Suspense fallback={<EffectLoadingFallback />}>
              <EmotionReactions emotion={emotionResult} />
            </Suspense>
          )}
        </div>

        {/* 選択テキスト用のフローティングメニュー - 一時的に無効化 */}
        {false && selectedText && showFullActions && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed z-50 bg-slate-900/95 backdrop-blur-md border border-white/20 rounded-lg p-2 shadow-xl"
            style={{
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-white/60">選択テキスト:</span>
              <span className="text-xs text-white/80 max-w-32 truncate">
                {selectedText}
              </span>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => handleApplyToSelection("enhance")}
                className="px-3 py-1 text-xs bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded transition-colors">
                強化
              </button>
              <button
                onClick={() => handleApplyToSelection("translate")}
                className="px-3 py-1 text-xs bg-green-600/20 hover:bg-green-600/30 text-green-300 rounded transition-colors">
                翻訳
              </button>
              <button
                onClick={() => handleApplyToSelection("explain")}
                className="px-3 py-1 text-xs bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-300 rounded transition-colors">
                説明
              </button>
              <button
                onClick={handleCopy}
                className="px-3 py-1 text-xs bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded transition-colors">
                コピー
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

MessageBubbleComponent.displayName = "MessageBubble";

export const MessageBubble = React.memo(MessageBubbleComponent);
