"use client";

import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
  Suspense,
} from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store";
import { UnifiedMessage, MessageRole } from "@/types";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { TrackerDisplay } from "@/components/tracker/TrackerDisplay";
import { TrackerManager } from "@/services/tracker/tracker-manager";
import MessageEffects from "@/components/chat/MessageEffects";
import { ParticleText } from "@/components/chat/AdvancedEffects";
import {
  Copy,
  RefreshCw,
  Trash2,
  Heart,
  MessageSquare,
  Edit3,
  Image as ImageIcon,
  Volume2,
  MoreHorizontal,
  X,
  ChevronDown,
  RotateCcw,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useImageGeneration } from "@/hooks/useImageGeneration";
import { Character } from "@/types/core/character.types";
import { UUID } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { useAudioPlayback } from "@/hooks/useAudioPlayback";

// Type for partial UnifiedMessage
interface PartialUnifiedMessage extends Partial<UnifiedMessage> {
  id: string;
  content: string;
  role: MessageRole;
}

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
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  previousMessage,
  isLastMessage = false,
  onRegenerate,
  onContinue,
  onDelete,
  onEdit,
  showActions = true,
  className,
}) => {
  // 状態管理
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(message.content || "");
  const [showTrackers, setShowTrackers] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // ストアから状態を取得
  const {
    activeSessionId,
    sessions,
    trackerManagers,
    getSelectedPersona,
    rollbackSession,
    rollbackGroupSession,
    deleteGroupMessage,
    continueLastMessage,
    continueLastGroupMessage,
    regenerateLastMessage,
    regenerateLastGroupMessage,
    isGroupChat,
    active_group_session_id,
    effectSettings,
  } = useAppStore();

  // 現在のセッションを取得（グループチャットとソロチャットで分岐）
  const currentSession = useMemo(() => {
    if (isGroupChat && active_group_session_id) {
      // グループチャットの場合は message.session_id から取得
      return message.session_id ? sessions.get(message.session_id) : null;
    } else if (activeSessionId && typeof activeSessionId === "string") {
      // ソロチャットの場合
      return sessions.get(activeSessionId);
    }
    return null;
  }, [isGroupChat, active_group_session_id, activeSessionId, sessions, message.session_id]);

  // 画像生成フック
  const {
    generateImage,
    isGenerating,
    error: imageError,
  } = useImageGeneration();
  const isGeneratingImage = isGenerating;

  // 音声再生フック - MediaOrchestratorを使用
  const { isSpeaking, handleSpeak } = useAudioPlayback({
    message,
    isLatest: isLastMessage,
  });

  // キャラクター情報の取得
  const getSelectedCharacter = useAppStore(
    (state) => state.getSelectedCharacter
  );
  const addMessage = useAppStore((state) => state.addMessage);

  // メッセージアクション: 続きを生成
  const handleContinue = useCallback(async () => {
    if (!isLastMessage || message.role !== "assistant") return;

    try {
      if (isGroupChat && active_group_session_id) {
        await continueLastGroupMessage();
      } else {
        await continueLastMessage();
      }
    } catch (error) {
      console.error("続きの生成に失敗しました:", error);
    }
  }, [
    isLastMessage,
    message.role,
    isGroupChat,
    active_group_session_id,
    continueLastGroupMessage,
    continueLastMessage,
  ]);

  // メッセージアクション: 再生成
  const handleRegenerate = useCallback(async () => {
    if (!isLastMessage || message.role !== "assistant") return;

    try {
      if (isGroupChat && active_group_session_id) {
        await regenerateLastGroupMessage();
      } else {
        await regenerateLastMessage();
      }
    } catch (error) {
      console.error("再生成に失敗しました:", error);
    }
  }, [
    isLastMessage,
    message.role,
    isGroupChat,
    active_group_session_id,
    regenerateLastGroupMessage,
    regenerateLastMessage,
  ]);

  // メッセージアクション: 画像生成
  const handleGenerateImage = useCallback(async () => {
    if (isGeneratingImage || message.role !== "assistant") return;

    try {
      // setIsGeneratingImageは不要（isGeneratingはフック内で管理）
      console.log("🎨 Starting image generation...");

      const character = getSelectedCharacter() as Character;
      if (!character) {
        console.error("画像生成エラー: キャラクターが見つかりません");
        alert("画像生成に必要なキャラクター情報がありません。");
        return;
      }

      if (!currentSession) {
        console.error("画像生成エラー: セッションが見つかりません", {
          activeSessionId,
          isGroupChat,
          active_group_session_id,
          messageSessionId: message.session_id,
          sessionsCount: sessions.size
        });

        // セッションIDの不一致を修正する試み
        const fallbackSession = message.session_id ? sessions.get(message.session_id) : null;
        if (!fallbackSession) {
          alert(
            "画像生成に必要なセッション情報が見つかりません。チャットを選択してから再試行してください。"
          );
          return;
        }

        console.log("Using fallback session from message.session_id");
        // currentSessionの代わりにfallbackSessionを使用
        const sessionToUse = fallbackSession;

        // トラッカーの値を取得（fallbackSessionを使用）
        const trackerManager = trackerManagers.get(sessionToUse.id);
        const trackers = [];
        if (trackerManager && character.trackers) {
          const trackerSet = trackerManager.getTrackerSet(character.id);
          if (trackerSet) {
            for (const trackerDef of character.trackers) {
              const tracker = trackerSet.trackers.get(trackerDef.name);
              if (tracker) {
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

        console.log("📊 Trackers (fallback):", trackers);

        // 画像生成を実行（fallbackSessionを使用）
        const imageUrl = await generateImage(
          character,
          sessionToUse.messages,
          trackers,
          undefined
        );

        if (imageUrl) {
          console.log("🎨 Image generated successfully:", imageUrl);
          alert("画像生成が完了しました！");
        }
        return;
      }

      console.log("📝 Character:", character.name);
      console.log("📊 Messages count:", currentSession.messages.length);

      // トラッカーの値を取得
      const trackerManager = trackerManagers.get(currentSession.id);
      const trackers = [];
      if (trackerManager && character.trackers) {
        const trackerSet = trackerManager.getTrackerSet(character.id);
        if (trackerSet) {
          for (const trackerDef of character.trackers) {
            const tracker = trackerSet.trackers.get(trackerDef.name);
            if (tracker) {
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

      console.log("📊 Trackers:", trackers);

      // 画像生成を実行
      const imageUrl = await generateImage(
        character,
        currentSession.messages,
        trackers
      );

      if (imageUrl && addMessage) {
        console.log("📨 Adding image message to chat");
        const newMessage: UnifiedMessage = {
          id: Date.now().toString(),
          session_id: currentSession.id,
          content: `![Generated Image](${imageUrl})`,
          role: "assistant" as MessageRole,
          timestamp: Date.now(),

          // キャラクター情報
          character_id: character.id,
          character_name: character.name,
          character_avatar: character.avatar_url || character.background_url,

          // 記憶システム関連（デフォルト値）
          memory: {
            importance: {
              score: 0.5,
              factors: {
                emotional_weight: 0.2,
                repetition_count: 0,
                user_emphasis: 0.3,
                ai_judgment: 0.5,
              },
            },
            is_pinned: false,
            is_bookmarked: false,
            keywords: ["generated_image", "visual_content"],
          },

          // 表現システム関連（デフォルト値）
          expression: {
            emotion: {
              primary: "neutral",
              intensity: 0.5,
            },
            style: {},
            effects: [],
          },

          // 編集履歴
          edit_history: [],

          // メタデータ
          metadata: {
            type: "image",
            generated: true,
          } as any,

          // 追加の必須フィールド
          regeneration_count: 0,
          created_at: Date.now().toString(),
          updated_at: Date.now().toString(),
          version: 1,
          is_deleted: false,
        };
        console.log("📝 New message:", newMessage);
        addMessage(newMessage);
      } else {
        console.error("❌ No image URL returned from generateImage");
        alert("画像生成に失敗しました。");
      }
    } catch (error) {
      console.error("画像生成に失敗しました:", error);
      const errorMessage =
        error instanceof Error ? error.message : "画像生成に失敗しました";
      alert(`画像生成エラー: ${errorMessage}`);
    } finally {
      // setIsGeneratingImageは不要（isGeneratingはフック内で管理）
    }
  }, [
    isGeneratingImage,
    message.role,
    getSelectedCharacter,
    currentSession,
    trackerManagers,
    generateImage,
    addMessage,
  ]);

  // メッセージアクション: 削除
  const handleDelete = useCallback(async () => {
    if (window.confirm("このメッセージを削除してもよろしいですか？")) {
      if (isGroupChat && active_group_session_id) {
        // グループチャットの場合
        deleteGroupMessage(active_group_session_id, message.id);
      } else if (onDelete) {
        // ソロチャットの場合
        onDelete(message.id);
      }
    }
  }, [message.id, onDelete, isGroupChat, active_group_session_id, deleteGroupMessage]);

  // メッセージアクション: ロールバック
  const handleRollback = useCallback(async () => {
    if (
      window.confirm(
        "この地点まで会話をロールバックしますか？これより後のメッセージは全て削除されます。"
      )
    ) {
      try {
        if (isGroupChat && active_group_session_id) {
          // グループチャットの場合
          rollbackGroupSession(message.id);
          console.log("✅ Group rollback completed to message:", message.id);
        } else {
          // ソロチャットの場合
          rollbackSession(message.id);
          console.log("✅ Rollback completed to message:", message.id);
        }
      } catch (error) {
        console.error("❌ Rollback failed:", error);
        alert("ロールバックに失敗しました。");
      }
    }
  }, [message.id, rollbackSession, rollbackGroupSession, isGroupChat, active_group_session_id]);

  // メッセージアクション: 読み上げ (MediaOrchestrator経由)
  const handleReadAloud = useCallback(async () => {
    if (!message.content || !message.content.trim()) return;

    try {
      console.log("🔊 Starting audio playback for message:", message.id);
      await handleSpeak();
    } catch (error) {
      console.error("読み上げに失敗しました:", error);
      alert("読み上げに失敗しました。");
    }
  }, [message.content, message.id, handleSpeak]);

  // 編集関連のハンドリング
  const handleEdit = useCallback(() => {
    setIsEditing(true);
    setTimeout(() => {
      if (textAreaRef.current) {
        textAreaRef.current.focus();
        textAreaRef.current.setSelectionRange(
          textAreaRef.current.value.length,
          textAreaRef.current.value.length
        );
      }
    }, 0);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (editedContent.trim() !== (message.content || "") && onEdit) {
      onEdit(message.id, editedContent.trim());
    }
    setIsEditing(false);
  }, [editedContent, message.content, message.id, onEdit]);

  const handleCancelEdit = useCallback(() => {
    setEditedContent(message.content || "");
    setIsEditing(false);
  }, [message.content]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        handleSaveEdit();
      } else if (event.key === "Escape") {
        event.preventDefault();
        handleCancelEdit();
      }
    },
    [handleSaveEdit, handleCancelEdit]
  );

  // トラッカー表示
  const trackers = useMemo(() => {
    if (!currentSession || !trackerManagers.has(currentSession.id)) return [];

    const manager = trackerManagers.get(currentSession.id);
    if (!manager) return [];

    try {
      const character = getSelectedCharacter();
      const trackerSet = manager.getTrackerSet?.(character?.id || "");
      if (!trackerSet) return [];
      return Array.from(trackerSet.trackers.entries()).map(
        ([name, tracker]) => ({
          name: name,
          value: (tracker as any).current_value,
          type: (tracker as any).type,
        })
      );
    } catch (error) {
      console.error("Error getting trackers:", error);
      return [];
    }
  }, [currentSession, trackerManagers]);

  const hasTrackers = trackers.length > 0;

  // 編集時のテキストエリア自動リサイズ
  useEffect(() => {
    if (isEditing && textAreaRef.current) {
      const textarea = textAreaRef.current;
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [isEditing, editedContent]);

  // キャラクターの取得
  const character = useMemo(() => {
    if (message.role !== "assistant") return null;
    return getSelectedCharacter();
  }, [message.role, getSelectedCharacter]);

  // アバター表示の判定
  const shouldShowAvatar = message.role === "assistant" && character;

  // タイムスタンプのフォーマット
  const formattedTimestamp = useMemo(() => {
    const timestamp = message.created_at || message.timestamp;
    if (!timestamp) return "";

    try {
      const date =
        typeof timestamp === "string"
          ? new Date(timestamp)
          : new Date(timestamp);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      return "";
    }
  }, [message.created_at, message.timestamp]);

  // アバターURL
  const avatarUrl = useMemo(() => {
    if (!character) return "";
    return character.avatar_url || character.background_url || "";
  }, [character]);

  // ドロップダウンメニューの内容
  const dropdownItems = useMemo(() => {
    const items = [];

    if (message.role === "assistant") {
      // アシスタントメッセージ用メニュー項目
      // グループチャットでもソロチャットでも同じメニューを表示
      items.push(
        <DropdownMenuItem key="rollback" onClick={handleRollback}>
          <RotateCcw className="h-4 w-4 mr-2" />
          ロールバック
        </DropdownMenuItem>,
        <DropdownMenuItem key="continue" onClick={handleContinue}>
          <MessageSquare className="h-4 w-4 mr-2" />
          続きを生成
        </DropdownMenuItem>,
        <DropdownMenuItem key="regenerate" onClick={handleRegenerate}>
          <RefreshCw className="h-4 w-4 mr-2" />
          再生成
        </DropdownMenuItem>,
        <DropdownMenuItem
          key="copy"
          onClick={() => copyToClipboard(message.content || "")}>
          <Copy className="h-4 w-4 mr-2" />
          コピー
        </DropdownMenuItem>,
        <DropdownMenuItem
          key="image-generate"
          onClick={handleGenerateImage}
          disabled={isGeneratingImage}>
          <ImageIcon
            className={cn("h-4 w-4 mr-2", isGeneratingImage && "animate-pulse")}
          />
          {isGeneratingImage ? "画像生成中..." : "画像を生成"}
        </DropdownMenuItem>,
        <DropdownMenuItem
          key="read-aloud"
          onClick={handleReadAloud}
          disabled={!message.content || !message.content.trim()}>
          <Volume2
            className={cn(
              "h-4 w-4 mr-2",
              isSpeaking && "animate-pulse text-blue-500"
            )}
          />
          {isSpeaking ? "読み上げ中..." : "読み上げ"}
        </DropdownMenuItem>,
        <DropdownMenuItem
          key="delete"
          onClick={handleDelete}
          className="text-red-600">
          <Trash2 className="h-4 w-4 mr-2" />
          削除
        </DropdownMenuItem>
      );
    }

    if (message.role === "user") {
      // ユーザーメッセージ用メニュー項目
      items.push(
        <DropdownMenuItem
          key="copy"
          onClick={() => copyToClipboard(message.content || "")}>
          <Copy className="h-4 w-4 mr-2" />
          コピー
        </DropdownMenuItem>,
        <DropdownMenuItem key="edit" onClick={handleEdit}>
          <Edit3 className="h-4 w-4 mr-2" />
          編集
        </DropdownMenuItem>
      );
    }

    return items;
  }, [
    message.role,
    message.content,
    message.id,
    handleRollback,
    handleContinue,
    handleRegenerate,
    handleDelete,
    isSpeaking,
    handleGenerateImage,
    isGeneratingImage,
    handleReadAloud,
    handleEdit,
  ]);

  return (
    <div className={cn("flex gap-3 mb-4", className)}>
      {/* アバター */}
      {shouldShowAvatar && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full overflow-hidden">
            <img
              src={avatarUrl}
              alt={character?.name || "Character"}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      )}

      {/* メッセージコンテンツ */}
      <div
        className={cn(
          "flex-1 min-w-0",
          message.role === "user" ? "flex justify-end" : ""
        )}>
        <div
          className={cn(
            "max-w-[80%]",
            message.role === "user" ? "ml-auto" : ""
          )}>
          {/* メッセージバブル */}
          <div
            className={cn(
              "relative px-4 py-3 rounded-2xl shadow-lg backdrop-blur-sm transition-all duration-200",
              message.role === "user"
                ? "text-white ml-auto"
                : "text-gray-100"
            )}
            style={{
              background: message.role === "user"
                ? effectSettings?.colorfulBubbles
                  ? `linear-gradient(to bottom right,
                      rgba(59, 130, 246, ${effectSettings?.bubbleOpacity ? effectSettings.bubbleOpacity / 100 * 0.8 : 0.8}),
                      rgba(147, 51, 234, ${effectSettings?.bubbleOpacity ? effectSettings.bubbleOpacity / 100 * 0.8 : 0.8}),
                      rgba(236, 72, 153, ${effectSettings?.bubbleOpacity ? effectSettings.bubbleOpacity / 100 * 0.8 : 0.8}))`
                  : `rgba(37, 99, 235, ${effectSettings?.bubbleOpacity ? effectSettings.bubbleOpacity / 100 * 0.9 : 0.9})`
                : effectSettings?.colorfulBubbles
                  ? `linear-gradient(to bottom right,
                      rgba(147, 51, 234, ${effectSettings?.bubbleOpacity ? effectSettings.bubbleOpacity / 100 * 0.2 : 0.2}),
                      rgba(59, 130, 246, ${effectSettings?.bubbleOpacity ? effectSettings.bubbleOpacity / 100 * 0.2 : 0.2}),
                      rgba(20, 184, 166, ${effectSettings?.bubbleOpacity ? effectSettings.bubbleOpacity / 100 * 0.2 : 0.2}))`
                  : `rgba(31, 41, 55, ${effectSettings?.bubbleOpacity ? effectSettings.bubbleOpacity / 100 * 0.9 : 0.9})`,
              border: effectSettings?.colorfulBubbles
                ? message.role === "user"
                  ? "1px solid rgba(255, 255, 255, 0.2)"
                  : "1px solid rgba(147, 51, 234, 0.4)"
                : "none",
              boxShadow: effectSettings?.colorfulBubbles
                ? message.role === "user"
                  ? "0 4px 6px rgba(59, 130, 246, 0.3)"
                  : "0 4px 6px rgba(147, 51, 234, 0.2)"
                : "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
            }}>
            {isEditing ? (
              <div className="space-y-3">
                <textarea
                  ref={textAreaRef}
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full p-2 bg-gray-700/50 border border-gray-600 rounded-lg text-gray-100 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="メッセージを編集..."
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCancelEdit}
                    className="h-7 px-2 text-xs">
                    キャンセル
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveEdit}
                    className="h-7 px-2 text-xs">
                    保存
                  </Button>
                </div>
              </div>
            ) : (
              /* 通常表示 */
              <>
                <div className="prose prose-invert prose-sm max-w-none">
                  <MarkdownRenderer content={message.content || ""} />
                </div>

                {/* エフェクト統合 */}
                {effectSettings?.particleEffects && (
                  <Suspense fallback={null}>
                    <ParticleText
                      text={message.content || ""}
                      trigger={isLastMessage}
                    />
                  </Suspense>
                )}

                {(effectSettings?.particleEffects ||
                  effectSettings?.colorfulBubbles) && (
                  <Suspense fallback={null}>
                    <MessageEffects
                      trigger={message.content || ""}
                      position={{ x: 50, y: 50 }}
                    />
                  </Suspense>
                )}

                {/* 画像生成プログレス表示 */}
                {isGeneratingImage && (
                  <div className="mt-4 pt-3 border-t border-white/10">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-white/80">
                        <ImageIcon className="h-4 w-4 animate-pulse" />
                        <span>画像生成中...</span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full transition-all duration-300 ease-out animate-pulse"
                          style={{ width: "50%" }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* トラッカー表示 */}
                {hasTrackers && showTrackers && (
                  <div className="mt-4 pt-3 border-t border-white/10">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {trackers.map((tracker) => (
                        <div
                          key={tracker.name}
                          className="text-xs text-white/60">
                          <span className="font-medium">{tracker.name}:</span>
                          <span className="ml-1">{String(tracker.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* メッセージ下部のアクションメニュー */}
                {showActions && (
                  <div className="mt-3 flex justify-end">
                    <div className="flex items-center gap-1">
                      {/* トラッカー表示ボタン */}
                      {hasTrackers && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowTrackers(!showTrackers)}
                          className={cn(
                            "h-6 w-6 p-0 hover:bg-white/10 opacity-60 hover:opacity-100",
                            showTrackers && "bg-white/10 opacity-100"
                          )}>
                          <ChevronDown
                            className={cn(
                              "h-3 w-3 transition-transform duration-200",
                              showTrackers && "rotate-180"
                            )}
                          />
                        </Button>
                      )}

                      {/* メインアクションメニュー */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 hover:bg-white/10 opacity-60 hover:opacity-100 transition-all duration-200">
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          side="top"
                          className={cn(
                            "min-w-[180px] z-50",
                            "bg-gray-900/95 border-gray-700",
                            "backdrop-blur-sm shadow-2xl",
                            "animate-in slide-in-from-top-2 fade-in-0 duration-200"
                          )}
                          sideOffset={8}
                          avoidCollisions={true}
                          collisionPadding={16}>
                          {dropdownItems}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* タイムスタンプ */}
          {formattedTimestamp && (
            <div
              className={cn(
                "text-xs text-gray-500 mt-1",
                message.role === "user" ? "text-right" : "text-left"
              )}>
              {formattedTimestamp}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const copyToClipboard = async (text: string) => {
  try {
    // Check if clipboard API is available
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      console.log("✅ Text copied to clipboard");
      // TODO: Toast notification
    } else {
      // Fallback for older browsers or insecure contexts
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      try {
        document.execCommand("copy");
        console.log("✅ Fallback: Text copied to clipboard");
      } catch (err) {
        console.error("❌ Fallback copy failed:", err);
      } finally {
        document.body.removeChild(textArea);
      }
    }
  } catch (error) {
    console.error("❌ Failed to copy text:", error);
    // Fallback to prompt user to manually copy
    if (window.prompt) {
      window.prompt("コピーするには、Ctrl+C (Cmd+C) を押してください:", text);
    }
  }
};
