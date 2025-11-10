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
import { MoreHorizontal } from "lucide-react";
import NextImage from "next/image";
import { useAppStore } from "@/store";
import MessageEffects from "@/components/chat/MessageEffects";
import { ParticleText } from "@/components/chat/AdvancedEffects";
import { cn } from "@/lib/utils";
import TokenUsageDisplay from "@/components/ui/TokenUsageDisplay";
import { useAudioPlayback } from "@/hooks/useAudioPlayback";
import { useImageGeneration } from "@/hooks/useImageGeneration";
import { useMessageEffects } from "@/hooks/useMessageEffects";
import { useTypewriter } from "@/hooks/useTypewriter";
import { useMenuControl } from "@/hooks/useMenuControl";
import { useMessageActions } from "@/hooks/useMessageActions";
import { processEmotionalText } from "@/utils/text/emotion-text-processor";
import { StageSelector } from "@/components/chat/StageSelector";
import { MessageMenu } from "@/components/chat/MessageMenu";
import { playTypewriterStartSound } from "@/utils/sound-effects";

// メッセージメタデータの型定義
interface MessageMetadata {
  character_id?: string;
  progressiveData?: {
    stages?: unknown;
    currentStage?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

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

  // メニュー制御（統合フック使用）
  const {
    isOpen: showMenu,
    toggle: toggleMenu,
    close: closeMenu,
    menuRef,
    triggerRef,
  } = useMenuControl({
    protectionDelay: 300,
  });

  const [selectedStage, setSelectedStage] = useState<string | null>(null);
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
  const { isEffectEnabled, settings: effectSettings, calculateFontEffects } = useMessageEffects();

  // キャラクター情報（グループモード対応）
  const characters = useAppStore((state) => state.characters);
  const messageMetadata = message.metadata as MessageMetadata | undefined;
  const messageCharacterId = messageMetadata?.character_id;
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
  const bubbleRef = useRef<HTMLDivElement>(null);

  // プログレッシブデータへの安全なアクセス
  const progressiveData = messageMetadata?.progressiveData || message;
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

  // メニュートグル処理（useMenuControlフックに統合済み）
  const handleMenuToggle = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      toggleMenu();
    },
    [toggleMenu]
  );

  // メニューアイテムクリック時の共通処理
  const handleMenuItemClick = useCallback(
    (action: () => void | Promise<void>) => {
      return async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        closeMenu(); // メニューを閉じる
        await action(); // アクションを実行
      };
    },
    [closeMenu]
  );

  // 初期化時に利用可能な最新のステージを自動選択
  useEffect(() => {
    if (!selectedStage) {
      if (stages.intelligence?.content) {
        setSelectedStage("intelligence");
      } else if (stages.context?.content) {
        setSelectedStage("context");
      } else if (stages.reflex?.content) {
        setSelectedStage("reflex");
      }
    }
  }, [selectedStage, stages]);

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

  // タイプライター効果の適用
  const currentStageContent = getCurrentStageContent();
  const { displayedContent, isTyping: isTypewriterActive } = useTypewriter(
    currentStageContent,
    {
      enabled:
        isEffectEnabled("typewriter") &&
        message.role !== "user" &&
        isLatest,
      speed: Math.max(10, 100 - effectSettings.typewriterIntensity),
      onStart: () => {
        // タイプライター開始時に効果音を再生
        if (effectSettings.typewriterSound) {
          const volume = (effectSettings.typewriterSoundVolume || 30) / 100;
          playTypewriterStartSound(volume);
        }
      },
    }
  );

  // タイプライター中の自動スクロール追尾（最新メッセージのみ）
  useEffect(() => {
    if (!isTypewriterActive || !bubbleRef.current || !isLatest) return;

    const scrollInterval = setInterval(() => {
      if (bubbleRef.current && isLatest) {
        bubbleRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'end',
        });
      }
    }, 1000); // 1秒ごとにスクロール位置を調整

    return () => clearInterval(scrollInterval);
  }, [isTypewriterActive, isLatest]);

  // メッセージアクション（統合フック使用）
  const {
    isRegenerating,
    isContinuing,
    isEditing,
    handleRegenerate,
    handleContinue,
    handleCopy,
    handleDelete,
    handleRollback,
    handleEdit,
  } = useMessageActions({
    message,
    isLatest,
    isGroupChat,
    displayedContent,
  });

  // 括弧内テキストの処理（感情検出とエフェクト適用）
  // 🎨 Phase 1: 設定から感情色を取得
  const processedContent = useMemo(() => {
    return processEmotionalText(
      displayedContent || "",
      effectSettings.emotionColors
    );
  }, [displayedContent, effectSettings.emotionColors]);

  // 🎨 Phase 2: 統一されたフォントエフェクト計算を使用
  const fontEffectStyles = useMemo(() => {
    return calculateFontEffects();
  }, [calculateFontEffects]);

  // グループモード対応の生成状態チェック
  const generateIsActive = is_group_mode ? group_generating : is_generating;
  const canRegenerate = isLatest && !generateIsActive;
  const canContinue = isLatest && !generateIsActive;

  return (
    <div ref={bubbleRef} className="progressive-message-bubble w-full max-w-4xl mx-auto">
      <div className="relative group">
        {/* プロフィール画像（アシスタントのみ、条件付き表示） */}
        {!isUser && (
          <div className="flex-shrink-0 relative w-14 h-14 md:w-16 md:h-16 rounded-full overflow-hidden border-2 border-purple-400/30 absolute left-3 top-3">
            {character && character.avatar_url ? (
              <NextImage
                src={character.avatar_url}
                alt={character.name || "character avatar"}
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
        {/* メインコンテナ */}
        <div className="progressive-container bg-slate-800/50 backdrop-blur-sm rounded-lg border border-purple-400/20 overflow-visible relative">
          {/* 段階選択タブ（統合コンポーネント使用） */}
          <div className="p-3 border-b border-purple-400/20">
            <StageSelector
              stages={stages}
              selectedStage={selectedStage}
              onSelectStage={setSelectedStage}
            />
          </div>

          {/* メッセージ表示エリア */}
          <div className="message-area p-4 relative">
            <div
              ref={contentRef}
              className={cn(
                "message-content px-4 py-3 rounded-2xl shadow-lg transition-all duration-200 relative overflow-hidden",
                "message-bubble-character-transparent text-white border-purple-400/40 shadow-purple-500/20",
                ui.highlightChanges && "highlight-changes"
              )}
              style={
                {
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
                  // CSS custom properties for dynamic transparency and blur
                  "--character-bubble-opacity": (effectSettings.bubbleOpacity || 85) / 100,
                  "--character-bubble-blur": effectSettings.bubbleBlur
                    ? `blur(${effectSettings.bubbleBlurIntensity || 8}px)`
                    : "none",
                } as React.CSSProperties
              }>
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
              handleMenuToggle(e);
            }}
            aria-label="メニューを開く">
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {/* メニューコンテンツ（統合コンポーネント使用） */}
          <MessageMenu
            message={message}
            isOpen={showMenu}
            menuRef={menuRef}
            onMenuItemClick={handleMenuItemClick}
            actions={{
              handleRegenerate,
              handleContinue,
              handleCopy,
              handleDelete,
              handleRollback,
              handleEdit,
              handleSpeak,
            }}
            state={{
              isRegenerating,
              isContinuing,
              isSpeaking,
              generateIsActive,
              displayedContent,
            }}
            voice={voice}
            characterIconUrl={character?.avatar_url}
          />
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
