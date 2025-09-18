"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  Suspense,
  memo,
} from "react";
import { motion, AnimatePresence, TargetAndTransition } from "framer-motion";
import {
  RefreshCw,
  Copy,
  Volume2,
  MoreHorizontal,
  Image as ImageIcon,
  MessageSquare,
  Trash2,
  RotateCcw,
  Edit,
} from "lucide-react";
import NextImage from "next/image";
import { UnifiedMessage } from "@/types";
import { useAppStore } from "@/store";
import { cn } from "@/lib/utils";
import { RichMessage } from "../chat/RichMessage";
import { ProgressiveMessageBubble } from "../chat/ProgressiveMessageBubble";
import { useAudioPlayback } from "@/hooks/useAudioPlayback";
import { useImageGeneration } from "@/hooks/useImageGeneration";
import { useMessageEffects } from "@/hooks/useMessageEffects";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ===== OPTIMIZED LAZY IMPORTS =====
import {
  HologramMessage,
  ParticleText,
  MessageEffects,
  EmotionDisplay,
  EffectLoadingFallback,
} from "../lazy/LazyEffects";

// ===== PERFORMANCE OPTIMIZED INTERFACES =====
interface OptimizedMessageBubbleProps {
  message: UnifiedMessage;
  previousMessage?: UnifiedMessage;
  isLatest: boolean;
  isGroupChat?: boolean;
  // Performance optimizations
  shouldAnimateEntry?: boolean;
  disableEffects?: boolean;
  className?: string;
}

// ===== MEMOIZED COMPONENTS =====

// Memoized avatar component to prevent unnecessary re-renders
const MemoizedAvatar = memo(({ character, isUser }: {
  character: any;
  isUser: boolean
}) => {
  if (isUser) return null;

  return (
    <div className="flex-shrink-0 relative w-14 h-14 md:w-16 md:h-16 rounded-full overflow-hidden border-2 border-purple-400/30">
      {character?.avatar_url ? (
        <NextImage
          src={character.avatar_url}
          alt={character?.name || "character avatar"}
          fill
          className="object-cover"
          priority={false} // Optimize loading
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
          {character?.name?.[0] || "AI"}
        </div>
      )}
    </div>
  );
});

MemoizedAvatar.displayName = "MemoizedAvatar";

// Memoized loading spinner
const MemoizedSpinner = memo(({ label }: { label?: string }) => (
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
));

MemoizedSpinner.displayName = "MemoizedSpinner";

// Memoized effect components with conditional rendering
const MemoizedEffects = memo(({
  effectType,
  content,
  isLatest,
  isEnabled
}: {
  effectType: string;
  content: string;
  isLatest: boolean;
  isEnabled: boolean;
}) => {
  if (!isEnabled) return null;

  return (
    <Suspense fallback={<EffectLoadingFallback />}>
      {effectType === 'hologram' && (
        <div className="mt-2">
          <HologramMessage text={content} />
        </div>
      )}
      {effectType === 'particles' && (
        <ParticleText text={content} trigger={isLatest} />
      )}
      {effectType === 'typewriter' && (
        <MessageEffects
          trigger={content}
          position={{ x: 0, y: 0 }}
        />
      )}
      {effectType === 'emotion' && (
        <div className="mt-2">
          <EmotionDisplay message={content} />
        </div>
      )}
    </Suspense>
  );
});

MemoizedEffects.displayName = "MemoizedEffects";

// ===== MAIN OPTIMIZED COMPONENT =====

const OptimizedMessageBubbleComponent: React.FC<OptimizedMessageBubbleProps> = ({
  message,
  previousMessage,
  isLatest,
  isGroupChat = false,
  shouldAnimateEntry = true,
  disableEffects = false,
  className,
}) => {
  // ===== PERFORMANCE OPTIMIZED HOOKS =====

  // Optimized selectors to prevent unnecessary re-renders
  const characters = useAppStore(useCallback((state) => state.characters, []));
  const getSelectedPersona = useAppStore(useCallback((state) => state.getSelectedPersona, []));
  const getSelectedCharacter = useAppStore(useCallback((state) => state.getSelectedCharacter, []));
  const is_generating = useAppStore(useCallback((state) => state.is_generating, []));
  const group_generating = useAppStore(useCallback((state) => state.group_generating, []));
  const voice = useAppStore(useCallback((state) => state.voice, []));

  // Memoized audio and image hooks
  const { isSpeaking, handleSpeak } = useAudioPlayback({ message, isLatest });
  const { generateImage } = useImageGeneration();

  // Optimized effects hook
  const {
    effects,
    calculateFontEffects,
    isEffectEnabled,
    settings: effectSettings
  } = useMessageEffects();

  // ===== MEMOIZED STATE AND REFS =====

  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const menuTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ===== MEMOIZED CALCULATIONS =====

  // Memoized role checks
  const { isAssistant, isUser } = useMemo(() => ({
    isAssistant: message.role === "assistant",
    isUser: message.role === "user"
  }), [message.role]);

  // Memoized character info
  const character = useMemo(() => {
    if (isGroupChat && message.metadata?.character_id && typeof message.metadata.character_id === "string") {
      return characters.get(message.metadata.character_id);
    }
    return getSelectedCharacter();
  }, [characters, message.metadata?.character_id, isGroupChat, getSelectedCharacter]);

  // Memoized processed content
  const processedContent = useMemo(() => {
    try {
      // For now, return the original content
      // TODO: Add variable replacement if needed
      return message.content;
    } catch (error) {
      console.error("Error processing message content:", error);
      return message.content;
    }
  }, [message.content]);

  // Memoized font effect styles
  const fontEffectStyles = useMemo(() => {
    if (disableEffects) return {};
    return calculateFontEffects();
  }, [calculateFontEffects, disableEffects]);

  // Memoized animation settings
  const bubbleAnimation: TargetAndTransition = useMemo(() => {
    if (!shouldAnimateEntry) return { opacity: 1, scale: 1, y: 0 };
    return {
      scale: [0.95, 1],
      opacity: [0, 1],
      y: [20, 0],
    };
  }, [shouldAnimateEntry]);

  const bubbleTransition = useMemo(() => ({
    duration: 0.3,
    ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
  }), []);

  // Memoized generation state
  const { generateIsActive, isCurrentlyGenerating, canRegenerate, canContinue } = useMemo(() => {
    const active = is_generating || group_generating;
    return {
      generateIsActive: active,
      isCurrentlyGenerating: active && isLatest,
      canRegenerate: isAssistant && isLatest && !active,
      canContinue: isAssistant && isLatest && !active,
    };
  }, [is_generating, group_generating, isLatest, isAssistant]);

  // Memoized progressive message check
  const { isProgressiveMessage, hasProgressiveMetadata } = useMemo(() => {
    const isProgressive = message.metadata?.progressive === true;
    const hasMetadata = message.metadata &&
      ("progressive" in message.metadata || "progressiveData" in message.metadata);
    return { isProgressiveMessage: isProgressive, hasProgressiveMetadata: hasMetadata };
  }, [message.metadata]);

  // ===== OPTIMIZED EVENT HANDLERS =====

  // Memoized action handlers
  const handleRegenerate = useCallback(async () => {
    if (!canRegenerate) return;

    setIsRegenerating(true);
    try {
      const { regenerateLastMessage, regenerateLastGroupMessage, active_group_session_id } = useAppStore.getState();

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
  }, [canRegenerate, isGroupChat]);

  const handleContinue = useCallback(async () => {
    if (!canContinue) return;

    setIsContinuing(true);
    try {
      const { continueLastMessage, continueLastGroupMessage, active_group_session_id } = useAppStore.getState();

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
  }, [canContinue, isGroupChat]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(processedContent);
    } catch (error) {
      console.error("コピーに失敗しました:", error);
    }
  }, [processedContent]);

  const handleDelete = useCallback(async () => {
    if (!confirm("このメッセージを削除しますか？")) return;

    try {
      const { deleteMessage, active_group_session_id } = useAppStore.getState();

      if (isGroupChat && active_group_session_id) {
        console.warn("Group message deletion not implemented");
      } else {
        deleteMessage(message.id);
      }
    } catch (error) {
      console.error("メッセージの削除に失敗しました:", error);
    }
  }, [isGroupChat, message.id]);

  // ===== CLEANUP EFFECTS =====

  useEffect(() => {
    return () => {
      if (menuTimeoutRef.current) {
        clearTimeout(menuTimeoutRef.current);
      }
    };
  }, []);

  // ===== PROGRESSIVE MESSAGE HANDLING =====

  if (isProgressiveMessage && hasProgressiveMetadata) {
    const progressiveData = (message.metadata as any).progressiveData || message.metadata;

    const progressiveMessage = {
      ...message,
      stages: progressiveData?.stages || {},
      currentStage: progressiveData?.currentStage || "reflex",
      transitions: progressiveData?.transitions || [],
      ui: progressiveData?.ui || {
        isUpdating: false,
        glowIntensity: "none",
        highlightChanges: false,
        showIndicator: true,
      },
      metadata: progressiveData?.metadata || message.metadata,
      content: message.content,
      character_name: character?.name,
    };

    return (
      <ProgressiveMessageBubble
        message={progressiveMessage}
        isLatest={isLatest}
      />
    );
  }

  // ===== RENDER MAIN COMPONENT =====

  return (
    <AnimatePresence>
      <motion.div
        ref={bubbleRef}
        initial={bubbleAnimation}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={bubbleTransition}
        className={cn(
          "group relative flex items-start gap-3 mb-4 max-w-[85%] md:max-w-[75%]",
          isUser ? "ml-auto flex-row-reverse" : "mr-auto",
          "overflow-visible",
          className
        )}>

        {/* Optimized Avatar */}
        <MemoizedAvatar character={character} isUser={isUser} />

        <div className={cn(
          "flex flex-col min-w-0",
          isUser ? "items-end" : "items-start flex-1",
          "overflow-visible"
        )}>

          {/* Message Bubble */}
          <div
            ref={menuRef}
            className={cn(
              "relative px-4 py-3 rounded-2xl shadow-lg backdrop-blur-sm transition-all duration-200",
              isUser
                ? "bg-gradient-to-br from-purple-600/80 to-blue-600/80 text-white border border-purple-400/30"
                : effects.colorfulBubbles
                ? "bg-gradient-to-br from-purple-500/20 via-blue-500/20 to-teal-500/20 text-white border border-purple-400/40 shadow-purple-500/20"
                : "bg-purple-600/20 backdrop-blur-sm text-white border border-purple-400/30",
              "hover:shadow-xl group-hover:scale-[1.02]",
              "overflow-visible"
            )}
            style={{
              backgroundColor: `rgba(${
                effects.colorfulBubbles ? "147, 51, 234" : isUser ? "147, 51, 234" : "51, 65, 85"
              }, ${effectSettings.bubbleOpacity ? effectSettings.bubbleOpacity / 100 : 0.85})`,
            }}>

            {/* Rich Message Content */}
            <div style={fontEffectStyles}>
              <RichMessage
                content={processedContent}
                role={message.role === "user" || message.role === "assistant" ? message.role : "assistant"}
                isExpanded={false}
                onToggleExpanded={() => {}}
                isLatest={isLatest}
              />
            </div>

            {/* Conditional Effects */}
            {!disableEffects && (
              <>
                {isEffectEnabled('realtimeEmotion') && (
                  <MemoizedEffects
                    effectType="emotion"
                    content={processedContent}
                    isLatest={isLatest}
                    isEnabled={true}
                  />
                )}

                {isEffectEnabled('hologram') && isAssistant && (
                  <MemoizedEffects
                    effectType="hologram"
                    content={processedContent}
                    isLatest={isLatest}
                    isEnabled={true}
                  />
                )}

                {isEffectEnabled('particles') && (
                  <MemoizedEffects
                    effectType="particles"
                    content={processedContent}
                    isLatest={isLatest}
                    isEnabled={true}
                  />
                )}

                {isEffectEnabled('typewriter') && (
                  <MemoizedEffects
                    effectType="typewriter"
                    content={processedContent}
                    isLatest={isLatest}
                    isEnabled={true}
                  />
                )}
              </>
            )}

            {/* Loading Overlays */}
            {(isRegenerating || isContinuing || isCurrentlyGenerating) && (
              <MemoizedSpinner
                label={
                  isRegenerating
                    ? "再生成中..."
                    : isContinuing
                    ? "続きを生成中..."
                    : "生成中..."
                }
              />
            )}

            {/* Optimized Action Menu */}
            <div className={cn(
              "absolute bottom-2 z-[9999] pointer-events-auto right-2",
              !showMenu && isLatest
                ? "opacity-60 hover:opacity-100 transition-opacity"
                : ""
            )}>
              <DropdownMenu open={showMenu} onOpenChange={setShowMenu}>
                <DropdownMenuTrigger asChild>
                  <button className="p-1.5 rounded-md hover:bg-white/10 text-white/70 hover:text-white transition-all duration-200">
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
                  sideOffset={8}>

                  {/* Assistant Message Actions */}
                  {isAssistant && (
                    <>
                      <DropdownMenuItem onClick={handleContinue} disabled={isContinuing}>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        続きを生成
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleRegenerate} disabled={isRegenerating}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        再生成
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleCopy}>
                        <Copy className="h-4 w-4 mr-2" />
                        コピー
                      </DropdownMenuItem>
                      {voice.autoPlay && (
                        <DropdownMenuItem
                          onClick={handleSpeak}
                          disabled={!message.content || !message.content.trim()}>
                          <Volume2 className={cn("h-4 w-4 mr-2", isSpeaking && "animate-pulse text-blue-500")} />
                          {isSpeaking ? "読み上げ中..." : "読み上げ"}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                        <Trash2 className="h-4 w-4 mr-2" />
                        削除
                      </DropdownMenuItem>
                    </>
                  )}

                  {/* User Message Actions */}
                  {isUser && (
                    <>
                      <DropdownMenuItem onClick={handleCopy}>
                        <Copy className="h-4 w-4 mr-2" />
                        コピー
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => console.log('Edit')}>
                        <Edit className="h-4 w-4 mr-2" />
                        編集
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                        <Trash2 className="h-4 w-4 mr-2" />
                        削除
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

// ===== FINAL MEMOIZATION =====

OptimizedMessageBubbleComponent.displayName = "OptimizedMessageBubble";

export const OptimizedMessageBubble = memo(OptimizedMessageBubbleComponent, (prevProps, nextProps) => {
  // Custom comparison for optimal re-rendering
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.isLatest === nextProps.isLatest &&
    prevProps.isGroupChat === nextProps.isGroupChat &&
    prevProps.disableEffects === nextProps.disableEffects
  );
});

export default OptimizedMessageBubble;