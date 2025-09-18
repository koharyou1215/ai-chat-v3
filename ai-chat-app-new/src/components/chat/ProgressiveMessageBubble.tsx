"use client";

import React, {
  useEffect,
  useState,
  useRef,
  Suspense,
  useMemo,
  useCallback,
} from "react";
import { ProgressiveMessage } from "@/types/progressive-message.types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  RefreshCw,
  ChevronRight,
  Copy,
  X,
  CornerUpLeft,
  Edit,
  MoreHorizontal,
  MessageSquare,
  Trash2,
  RotateCcw,
  Image,
  Volume2,
} from "lucide-react";
import NextImage from "next/image";
import { useAppStore } from "@/store";
import MessageEffects from "@/components/chat/MessageEffects";
import { ParticleText } from "@/components/chat/AdvancedEffects";
import { cn } from "@/lib/utils";
import TokenUsageDisplay from "@/components/ui/TokenUsageDisplay";
import { useAudioPlayback } from "@/hooks/useAudioPlayback";
import { useImageGeneration } from "@/hooks/useImageGeneration";
import { useMessageEffects } from "@/hooks/useMessageEffects";

interface ProgressiveMessageBubbleProps {
  message: ProgressiveMessage;
  isLatest?: boolean;
  isGroupChat?: boolean;
}

export const ProgressiveMessageBubble: React.FC<
  ProgressiveMessageBubbleProps
> = ({ message, isLatest = false, isGroupChat = false }) => {
  const isAssistant = message.role === "assistant";
  const isUser = message.role === "user";
  // 完全手動制御のメニュー状態
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // development 用ログは不要になったため削除

  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const { isSpeaking, handleSpeak } = useAudioPlayback({ message, isLatest });
  const { generateImage } = useImageGeneration();

  const {
    is_generating,
    is_group_mode,
    group_generating,
    regenerateLastMessage,
    regenerateLastGroupMessage,
    continueLastMessage,
    continueLastGroupMessage,
    deleteMessage,
    rollbackSession,
    voice,
    getSelectedCharacter,
  } = useAppStore();

  // 共通エフェクトフック
  const { isEffectEnabled, settings: effectSettings } = useMessageEffects();

  // キャラクター情報（グループモード対応）
  const characters = useAppStore((state) => state.characters);
  const messageCharacterId = (message as any).metadata?.character_id;
  const character = useMemo(() => {
    if (
      is_group_mode &&
      messageCharacterId &&
      typeof messageCharacterId === "string"
    ) {
      return characters.get(messageCharacterId);
    }
    return getSelectedCharacter ? getSelectedCharacter() : undefined;
  }, [characters, messageCharacterId, is_group_mode, getSelectedCharacter]);

  const contentRef = useRef<HTMLDivElement>(null);
  const [displayedContent, setDisplayedContent] = useState("");
  const [isTypewriterActive, setIsTypewriterActive] = useState(false);

  // プログレッシブデータへの安全なアクセス
  const progressiveData = (message as any).metadata?.progressiveData || message;
  const stages = useMemo(
    () => progressiveData.stages || {},
    [progressiveData.stages]
  );
  const currentStage = progressiveData.currentStage || "reflex";
  const ui = progressiveData.ui || {
    showIndicator: true,
    isUpdating: false,
    glowIntensity: "none",
    highlightChanges: false,
  };

  // 外部クリックでメニューを閉じる処理
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // 開き始めの保護中は外部クリックで閉じない
      if (menuOpeningRef.current) return;
      if (
        showMenu &&
        menuRef.current &&
        triggerRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      // キャプチャフェーズでリスナーを追加
      document.addEventListener("mousedown", handleClickOutside, true);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside, true);
      };
    }
  }, [showMenu]);

  // 開閉保護タイマー（メニューが開く直後に外部クリックで閉じるのを防止）
  const menuOpeningRef = useRef<NodeJS.Timeout | null>(null);

  // ESCキーでメニューを閉じる
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && showMenu) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener("keydown", handleEscKey);
      return () => {
        document.removeEventListener("keydown", handleEscKey);
      };
    }
  }, [showMenu]);

  // メニュートグル処理
  const handleMenuToggle = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMenu((prev) => !prev);
  }, []);

  // メニューアイテムクリック時の共通処理
  const handleMenuItemClick = useCallback(
    (action: () => void | Promise<void>) => {
      return async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setShowMenu(false); // メニューを閉じる
        await action(); // アクションを実行
      };
    },
    []
  );

  // 初期化時に利用可能な最新のステージを自動選択
  useEffect(() => {
    if (!selectedStage && stages && typeof stages === "object") {
      if (stages.intelligence?.content) {
        setSelectedStage("intelligence");
      } else if (stages.context?.content) {
        setSelectedStage("context");
      } else if (stages.reflex?.content) {
        setSelectedStage("reflex");
      }
    }
  }, [selectedStage, stages]);

  // ステージ表示ヘルパー
  const getStageLabel = (stage: string) => {
    switch (stage) {
      case "reflex":
        return "直感";
      case "context":
        return "文脈 ❤️";
      case "intelligence":
        return "知性";
      default:
        return stage;
    }
  };

  // 再生成処理
  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      if (is_group_mode) {
        await regenerateLastGroupMessage();
      } else {
        await regenerateLastMessage();
      }
    } catch (error) {
      console.error("再生成に失敗しました:", error);
    } finally {
      setIsRegenerating(false);
    }
  };

  // 続き生成処理
  const handleContinue = async () => {
    setIsContinuing(true);
    try {
      if (is_group_mode) {
        await continueLastGroupMessage();
      } else {
        await continueLastMessage();
      }
    } catch (error) {
      console.error("続きの生成に失敗しました:", error);
    } finally {
      setIsContinuing(false);
    }
  };

  // コピー処理
  const handleCopy = () => {
    navigator.clipboard.writeText(displayedContent || message.content);
  };

  // 削除処理
  const handleDelete = async () => {
    if (!confirm("このメッセージを削除しますか？")) return;
    try {
      deleteMessage(message.id);
    } catch (error) {
      console.error("メッセージの削除に失敗しました:", error);
    }
  };

  // ロールバック処理
  const handleRollback = async () => {
    if (!confirm("この地点まで会話をロールバックしますか？")) return;
    try {
      await rollbackSession(message.id);
    } catch (error) {
      console.error("ロールバックに失敗しました:", error);
    }
  };

  // 編集処理（プレースホルダー）
  const handleEdit = () => {
    setIsEditing(!isEditing);
    // TODO: 編集機能の実装
  };

  // 現在のステージに応じたコンテンツを取得
  const getCurrentStageContent = useCallback(() => {
    if (selectedStage && stages[selectedStage]?.content) {
      return stages[selectedStage].content;
    }

    if (!selectedStage) {
      if (stages.intelligence?.content) {
        return stages.intelligence.content;
      } else if (stages.context?.content) {
        return stages.context.content;
      } else if (stages.reflex?.content) {
        return stages.reflex.content;
      }
    }

    return "";
  }, [selectedStage, stages]);

  // タイプライター効果
  useEffect(() => {
    const currentContent = getCurrentStageContent();

    if (
      isEffectEnabled('typewriter') &&
      currentContent &&
      message.role !== "user" &&
      isLatest
    ) {
      setIsTypewriterActive(true);
      setDisplayedContent("");

      const speed = Math.max(10, 100 - effectSettings.typewriterIntensity);

      const typeText = async () => {
        const characters = currentContent.split("");
        let currentText = "";

        for (let i = 0; i < characters.length; i++) {
          currentText += characters[i];
          setDisplayedContent(currentText);
          await new Promise((resolve) => setTimeout(resolve, speed));
        }
        setIsTypewriterActive(false);
      };

      typeText();
    } else {
      setDisplayedContent(currentContent);
    }
  }, [
    getCurrentStageContent,
    isEffectEnabled,
    effectSettings.typewriterIntensity,
    message.role,
    isLatest,
  ]);

  // 括弧内テキストの処理
  const processedContent = useMemo(() => {
    if (!displayedContent) return displayedContent;

    return displayedContent.replace(/「([^」]+)」/g, (match, text) => {
      let effectClass = "";
      let effectStyle = "";

      if (
        /愛|好き|うれしい|楽しい|幸せ|最高|素晴らしい|ありがとう|嬉しい|ドキドキ|ワクワク|キラキラ/.test(
          text
        )
      ) {
        effectClass = "positive-emotion";
        effectStyle =
          "color: #ff6b9d; text-shadow: 0 0 10px rgba(255, 107, 157, 0.6); font-weight: bold;";
      } else if (
        /悲しい|寂しい|つらい|苦しい|嫌い|最悪|うざい|むかつく|怒り|泣き/.test(
          text
        )
      ) {
        effectClass = "negative-emotion";
        effectStyle =
          "color: #4a90e2; text-shadow: 0 0 10px rgba(74, 144, 226, 0.6); font-weight: bold;";
      } else if (
        /えっ|まさか|すごい|びっくり|驚き|興奮|ドキドキ|ハラハラ/.test(text)
      ) {
        effectClass = "surprise-emotion";
        effectStyle =
          "color: #f39c12; text-shadow: 0 0 10px rgba(243, 156, 18, 0.6); font-weight: bold; animation: pulse 1s infinite;";
      } else if (
        /？|\?|なんで|なぜ|どうして|どう|何|どれ|いつ|どこ|誰/.test(text)
      ) {
        effectClass = "question-emotion";
        effectStyle =
          "color: #9b59b6; text-shadow: 0 0 10px rgba(155, 89, 182, 0.6); font-style: italic;";
      } else if (/！|!|〜|ー|…|\.\.\./.test(text)) {
        effectClass = "general-emotion";
        effectStyle =
          "color: #e74c3c; text-shadow: 0 0 8px rgba(231, 76, 60, 0.5); font-weight: bold;";
      } else {
        effectClass = "default-emotion";
        effectStyle =
          "color: #95a5a6; text-shadow: 0 0 5px rgba(149, 165, 166, 0.4);";
      }

      return `<span class="${effectClass}" style="${effectStyle}">「${text}」</span>`;
    });
  }, [displayedContent]);

  // フォントエフェクトのスタイル
  const fontEffectStyles = useMemo(() => {
    if (!isEffectEnabled('font')) return {};

    const intensity = effectSettings.fontEffectsIntensity;
    return {
      background:
        intensity > 30
          ? `linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4, #feca57, #ff9ff3)`
          : "none",
      backgroundClip: intensity > 30 ? "text" : "initial",
      WebkitBackgroundClip: intensity > 30 ? "text" : "initial",
      color: intensity > 30 ? "transparent" : "inherit",
      animation:
        intensity > 50 ? "rainbow-text 3s ease-in-out infinite" : "none",
      textShadow:
        intensity > 40
          ? `0 0 5px rgba(255,255,255,0.5), 0 0 10px rgba(255,255,255,0.3), 0 0 15px rgba(255,255,255,0.1)`
          : "none",
      transform: intensity > 60 ? "perspective(100px) rotateX(5deg)" : "none",
      filter:
        intensity > 70
          ? "drop-shadow(0 0 8px rgba(255,255,255,0.6)) brightness(1.2) contrast(1.1)"
          : "none",
    };
  }, [isEffectEnabled, effectSettings.fontEffectsIntensity]);

  // グループモード対応の生成状態チェック
  const generateIsActive = is_group_mode ? group_generating : is_generating;
  const canRegenerate = isLatest && !generateIsActive;
  const canContinue = isLatest && !generateIsActive;

  return (
    <div className="progressive-message-bubble w-full max-w-4xl mx-auto">
      <div className="relative group">
        {/* プロフィール画像（アシスタントのみ、条件付き表示） */}
        {!isUser && (
          <div className="flex-shrink-0 relative w-14 h-14 md:w-16 md:h-16 rounded-full overflow-hidden border-2 border-purple-400/30 absolute left-3 top-3">
            {character && (character as any).avatar_url ? (
              <NextImage
                src={(character as any).avatar_url}
                alt={(character as any).name || "character avatar"}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                {(character as any)?.name?.[0] || "AI"}
              </div>
            )}
          </div>
        )}
        {/* メインコンテナ */}
        <div className="progressive-container bg-slate-800/50 backdrop-blur-sm rounded-lg border border-purple-400/20 overflow-visible relative">
          {/* 段階選択タブ */}
          {(stages.reflex?.content ||
            stages.context?.content ||
            stages.intelligence?.content) && (
            <div className="stage-tabs flex gap-2 p-3 border-b border-purple-400/20">
              {stages.reflex?.content && (
                <button
                  onClick={() =>
                    setSelectedStage(
                      selectedStage === "reflex" ? null : "reflex"
                    )
                  }
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                    selectedStage === "reflex"
                      ? "bg-green-500 text-white shadow-lg shadow-green-500/30"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  )}
                  title="Stage 1: 直感的な反応">
                  Stage 1: 直感
                </button>
              )}
              {stages.context?.content && (
                <button
                  onClick={() =>
                    setSelectedStage(
                      selectedStage === "context" ? null : "context"
                    )
                  }
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                    selectedStage === "context"
                      ? "bg-pink-500 text-white shadow-lg shadow-pink-500/30"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  )}
                  title="Stage 2: 文脈・心の声">
                  Stage 2: 文脈 ❤️
                </button>
              )}
              {stages.intelligence?.content && (
                <button
                  onClick={() =>
                    setSelectedStage(
                      selectedStage === "intelligence" ? null : "intelligence"
                    )
                  }
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                    selectedStage === "intelligence"
                      ? "bg-purple-500 text-white shadow-lg shadow-purple-500/30"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  )}
                  title="Stage 3: 知性・深い洞察">
                  Stage 3: 知性
                </button>
              )}
              {selectedStage && (
                <button
                  onClick={() => setSelectedStage(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-700 text-gray-300 hover:bg-gray-600 transition-all"
                  title="最新の内容を表示">
                  最新
                </button>
              )}
            </div>
          )}

          {/* メッセージ表示エリア */}
          <div className="message-area p-4 relative">
            <div
              ref={contentRef}
              className={cn(
                "message-content px-4 py-3 rounded-2xl shadow-lg backdrop-blur-sm transition-all duration-200 relative overflow-hidden",
                ui.highlightChanges && "highlight-changes",
                isEffectEnabled('colorfulBubbles')
                  ? "bg-gradient-to-br from-purple-500/20 via-blue-500/20 to-teal-500/20 border-purple-400/40 shadow-purple-500/20"
                  : "bg-slate-800/60 border-slate-600/30"
              )}
              style={{
                fontSize: isEffectEnabled('font')
                  ? `${Math.max(
                      0.75,
                      1 + (effectSettings.fontEffectsIntensity - 50) / 100
                    )}rem`
                  : undefined,
                fontWeight:
                  isEffectEnabled('font') &&
                  effectSettings.fontEffectsIntensity > 70
                    ? "bold"
                    : undefined,
                textShadow:
                  isEffectEnabled('font') &&
                  effectSettings.fontEffectsIntensity > 50
                    ? "0 0 10px rgba(255,255,255,0.3)"
                    : undefined,
                opacity: effectSettings.bubbleOpacity
                  ? effectSettings.bubbleOpacity / 100
                  : 0.85,
              }}>
              {/* メッセージ内容 */}
              <div
                className="message-text prose prose-sm prose-invert max-w-none"
                style={fontEffectStyles}>
                {displayedContent ? (
                  <>
                    <div
                      className="prose prose-sm prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: processedContent }}
                    />
                    {isEffectEnabled('typewriter') && isTypewriterActive && (
                      <span className="typewriter-cursor animate-pulse ml-1 text-purple-400">
                        |
                      </span>
                    )}
                  </>
                ) : (
                  <div className="text-gray-400 italic">
                    {currentStage === "reflex" && "直感ステージを処理中..."}
                    {currentStage === "context" && "文脈ステージを処理中..."}
                    {currentStage === "intelligence" &&
                      "知性ステージを処理中..."}
                  </div>
                )}
              </div>

              {/* エフェクト統合 */}
              {isEffectEnabled('particles') && (
                <Suspense fallback={null}>
                  <ParticleText
                    text={displayedContent}
                    trigger={isLatest && !isTypewriterActive}
                  />
                </Suspense>
              )}

              {(isEffectEnabled('particles') ||
                isEffectEnabled('colorfulBubbles')) && (
                <Suspense fallback={null}>
                  <MessageEffects
                    trigger={displayedContent}
                    position={{ x: 50, y: 50 }}
                  />
                </Suspense>
              )}

              {/* トークン使用量表示 */}
              {selectedStage &&
                stages[selectedStage as keyof typeof stages]?.usage && (
                  <TokenUsageDisplay
                    usage={stages[selectedStage as keyof typeof stages]?.usage}
                    model={
                      message.metadata?.progressiveData?.metadata?.model_used
                    }
                    isVisible={true}
                  />
                )}
            </div>
          </div>
        </div>

        {/* 完全手動制御のメニュー */}
        <div className="absolute bottom-2 right-2 z-[9999]">
          {/* トリガーボタン */}
          <button
            ref={triggerRef}
            className="menu-button p-1.5 rounded-md hover:bg-white/10 text-white/70 hover:text-white transition-all duration-200"
            onMouseDown={(e) => {
              // stopImmediatePropagationで他のキャプチャハンドラを抑止
              try {
                (e.nativeEvent as Event).stopImmediatePropagation();
              } catch (err) {}
              e.preventDefault();
              e.stopPropagation();
              // 保護タイマーをセットして描画/配置中の外部クリックを無視
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
            }}
            aria-label="メニューを開く">
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {/* メニューコンテンツ */}
          {showMenu && (
            <div
              ref={menuRef}
              className={cn(
                "menu-container absolute bottom-full right-0 mb-2",
                "min-w-[180px] z-[9999]",
                "bg-gray-900/95 border border-gray-700 rounded-md",
                "backdrop-blur-sm shadow-2xl",
                "animate-in slide-in-from-bottom-2 fade-in-0 duration-200"
              )}
              style={
                {
                  "--character-icon": `url(${
                    getSelectedCharacter()?.avatar_url || "/default-avatar.png"
                  })`,
                } as React.CSSProperties
              }>
              original_code = '''
              {/* アシスタントメッセージ用メニュー */}
              {message.role === "assistant" && (
                <>
                  <button
                    className="menu-item w-full px-3 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-2 first:rounded-t-md"
                    data-action="rollback"
                    onClick={handleMenuItemClick(handleRollback)}>
                    <RotateCcw className="menu-icon h-4 w-4" />
                    ロールバック
                  </button>
                  <button
                    className="menu-item w-full px-3 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    data-action="continue"
                    onClick={handleMenuItemClick(handleContinue)}
                    disabled={isContinuing || generateIsActive}>
                    <MessageSquare className="menu-icon h-4 w-4" />
                    続きを生成
                  </button>
                  <button
                    className="menu-item w-full px-3 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    data-action="regenerate"
                    onClick={handleMenuItemClick(handleRegenerate)}
                    disabled={isRegenerating || generateIsActive}>
                    <RefreshCw className="menu-icon h-4 w-4" />
                    再生成
                  </button>
                  <button
                    className="menu-item w-full px-3 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-2"
                    data-action="copy"
                    onClick={handleMenuItemClick(handleCopy)}>
                    <Copy className="menu-icon h-4 w-4" />
                    コピー
                  </button>
                  {voice.autoPlay && (
                    <button
                      className="menu-item w-full px-3 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      data-action="speak"
                      onClick={handleMenuItemClick(handleSpeak)}
                      disabled={!displayedContent || !displayedContent.trim()}>
                      <Volume2
                        className={cn(
                          "menu-icon h-4 w-4",
                          isSpeaking && "animate-pulse text-blue-500"
                        )}
                      />
                      {isSpeaking ? "読み上げ中..." : "読み上げ"}
                    </button>
                  )}
                  <button
                    className="menu-item w-full px-3 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-2 text-red-400 last:rounded-b-md"
                    data-action="delete"
                    onClick={handleMenuItemClick(handleDelete)}>
                    <Trash2 className="menu-icon h-4 w-4" />
                    削除
                  </button>
                </>
              )}
              user_original = '''
              {/* ユーザーメッセージ用メニュー */}
              {message.role === "user" && (
                <>
                  <button
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-2 first:rounded-t-md"
                    onClick={handleMenuItemClick(handleEdit)}>
                    <Edit className="h-4 w-4" />
                    編集
                  </button>
                  <button
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-2"
                    onClick={handleMenuItemClick(handleCopy)}>
                    <Copy className="h-4 w-4" />
                    コピー
                  </button>
                  <button
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-2 text-red-400 last:rounded-b-md"
                    onClick={handleMenuItemClick(handleDelete)}>
                    <Trash2 className="h-4 w-4" />
                    削除
                  </button>
                </>
              )}
              ''' user_modified = '''
              {/* ユーザーメッセージ用メニュー */}
              {message.role === "user" && (
                <>
                  <button
                    className="menu-item w-full px-3 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-2 first:rounded-t-md"
                    data-action="edit"
                    onClick={handleMenuItemClick(handleEdit)}>
                    <Edit className="menu-icon h-4 w-4" />
                    編集
                  </button>
                  <button
                    className="menu-item w-full px-3 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-2"
                    data-action="copy"
                    onClick={handleMenuItemClick(handleCopy)}>
                    <Copy className="menu-icon h-4 w-4" />
                    コピー
                  </button>
                  <button
                    className="menu-item w-full px-3 py-2 text-left text-sm hover:bg-gray-800 flex items-center gap-2 text-red-400 last:rounded-b-md"
                    data-action="delete"
                    onClick={handleMenuItemClick(handleDelete)}>
                    <Trash2 className="menu-icon h-4 w-4" />
                    削除
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* 生成中インジケーター */}
        {ui.isUpdating && (
          <div className="updating-indicator absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-purple-500/20 backdrop-blur-sm px-4 py-2 rounded-full">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 200}ms` }}
                />
              ))}
            </div>
            <span className="text-sm text-gray-400">
              {currentStage === "reflex" && "記憶を検索中..."}
              {currentStage === "context" && "心の声を紡いでいる... 💭"}
              {currentStage === "intelligence" && "最終調整中..."}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressiveMessageBubble;
