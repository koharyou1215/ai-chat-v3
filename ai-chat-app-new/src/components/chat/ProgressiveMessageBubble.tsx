/**
 * Progressive Message Bubble Component
 * 3段階プログレッシブ応答の表示コンポーネント
 */

import React, { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ProgressiveMessage } from "@/types/progressive-message.types";
import { messageTransitionService } from "@/services/message-transition.service";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Image from "next/image";
import { RotateCcw, Play, Copy, MoreHorizontal } from "lucide-react";
import { useAppStore } from "@/store";

interface ProgressiveMessageBubbleProps {
  message: ProgressiveMessage;
  isLatest?: boolean;
}

export const ProgressiveMessageBubble: React.FC<
  ProgressiveMessageBubbleProps
> = ({ message, isLatest = false }) => {
  const [displayContent, setDisplayContent] = useState("");
  const [previousContent, setPreviousContent] = useState("");
  const contentRef = useRef<HTMLDivElement>(null);
  const [showDiff, setShowDiff] = useState(false); // デフォルトでHide Diff
  const [showFullActions, setShowFullActions] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Store functions
  const { 
    is_generating,
    regenerateLastMessage,
    continueLastMessage,
  } = useAppStore();

  // コンテンツ更新の監視と表示
  useEffect(() => {
    if (message.content && message.content !== previousContent) {
      setPreviousContent(displayContent);

      // アニメーション効果を適用
      if (contentRef.current && previousContent) {
        // 差分がある場合はトランジション
        const diff = messageTransitionService.detectChanges(
          previousContent,
          message.content
        );
        if (diff.changeRatio > 0.1 && isLatest) {
          // モーフィングアニメーション
          messageTransitionService.morphTransition(
            contentRef.current,
            previousContent,
            message.content,
            700
          );
        } else {
          // 即座に更新
          setDisplayContent(message.content);
        }
      } else {
        // 初回表示
        setDisplayContent(message.content);
      }

      // グロー効果
      if (
        contentRef.current &&
        isLatest &&
        message.ui.glowIntensity !== "none"
      ) {
        messageTransitionService.applyGlowEffect(
          contentRef.current,
          message.ui.glowIntensity,
          1000
        );
      }
    }
  }, [
    message.content,
    previousContent,
    displayContent,
    isLatest,
    message.ui.glowIntensity,
  ]);

  // ステージインジケーターの色を取得（赤→緑→白の順序）
  const getStageColor = (
    stage: "reflex" | "context" | "intelligence",
    isComplete: boolean
  ) => {
    if (!isComplete) return "bg-gray-600";

    switch (stage) {
      case "reflex":
        return "bg-red-500";      // 反射 = 赤（第一段階）
      case "context":
        return "bg-green-500";    // 文脈 = 緑（第二段階）
      case "intelligence":
        return "bg-white border border-gray-300"; // 洞察 = 白（最終段階）
      default:
        return "bg-gray-600";
    }
  };

  // ステージラベルの取得
  const getStageLabel = (stage: "reflex" | "context" | "intelligence") => {
    switch (stage) {
      case "reflex":
        return "反射";
      case "context":
        return "文脈";
      case "intelligence":
        return "洞察";
      default:
        return "";
    }
  };

  // メニューアクション
  const handleRegenerate = useCallback(async () => {
    if (!isLatest || is_generating) return;
    try {
      await regenerateLastMessage();
    } catch (error) {
      console.error("再生成に失敗しました:", error);
    }
  }, [isLatest, is_generating, regenerateLastMessage]);

  const handleContinue = useCallback(async () => {
    if (!isLatest || is_generating) return;
    try {
      await continueLastMessage();
    } catch (error) {
      console.error("続きの生成に失敗しました:", error);
    }
  }, [isLatest, is_generating, continueLastMessage]);

  const handleCopy = useCallback(() => {
    const textToCopy = selectedText || displayContent;
    navigator.clipboard.writeText(textToCopy);
    setSelectedText("");
    setShowFullActions(false);
  }, [selectedText, displayContent]);

  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim() || "";
    setSelectedText(selectedText);
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

  const canRegenerate = isLatest && !is_generating;
  const canContinue = isLatest && !is_generating;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`progressive-message-bubble relative ${
        message.ui.isUpdating ? "updating" : ""
      }`}>
      {/* ステージインジケーター - 改善されたレイアウト */}
      {message.ui.showIndicator && (
        <div className="stage-indicator flex flex-wrap gap-4 mb-4 p-2 bg-gray-800/30 rounded-lg backdrop-blur-sm" data-testid="stage-indicators">
          {(["reflex", "context", "intelligence"] as const).map((stage, index) => (
            <div key={stage} className="stage-item flex items-center gap-2 min-w-0 flex-1">
              <motion.div
                className={`stage-dot w-4 h-4 rounded-full transition-all duration-300 flex-shrink-0 ${getStageColor(
                  stage,
                  !!message.stages[stage]
                )}`}
                animate={{
                  scale: message.currentStage === stage ? [1, 1.3, 1] : 1,
                }}
                transition={{
                  duration: 0.6,
                  repeat:
                    message.currentStage === stage && message.ui.isUpdating
                      ? Infinity
                      : 0,
                }}
                data-testid={`stage-dot-${stage}`}
              />
              <div className="stage-info flex flex-col min-w-0">
                <span className="stage-label text-sm font-medium text-gray-300">
                  {getStageLabel(stage)}
                </span>
                {message.stages[stage] && (
                  <span className="stage-tokens text-xs text-gray-500 font-mono">
                    {message.stages[stage]?.tokens}t
                    {message.stages[stage]?.timestamp && (
                      <span className="ml-1">
                        • {message.stages[stage]?.timestamp}ms
                      </span>
                    )}
                  </span>
                )}
              </div>
              {/* ステージ間の区切り線 */}
              {index < 2 && (
                <div className="stage-separator w-8 h-0.5 bg-gray-600 mx-2 flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* メッセージコンテンツ */}
      <div
        ref={contentRef}
        className={`message-content relative overflow-hidden ${
          message.ui.highlightChanges ? "highlight-changes" : ""
        }`}>
        {/* アバター */}
        {message.character_avatar && (
          <div className="absolute -left-12 top-0 w-10 h-10 rounded-full overflow-hidden">
            <Image
              src={message.character_avatar}
              alt={message.character_name}
              width={40}
              height={40}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* テキストコンテンツ */}
        <div 
          className="prose prose-invert max-w-none"
          onMouseUp={handleTextSelection}
          onTouchEnd={handleTextSelection}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {displayContent || "..."}
          </ReactMarkdown>
        </div>

        {/* メッセージメニュー */}
        <AnimatePresence>
          {(showFullActions || isLatest) && (
            <motion.div
              ref={menuRef}
              className="message-menu absolute top-2 right-2 flex items-center gap-1 bg-gray-800 rounded-lg p-1 shadow-lg"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
            >
              {/* 再生成ボタン */}
              {canRegenerate && (
                <button
                  onClick={handleRegenerate}
                  className="action-button p-2 text-gray-400 hover:text-blue-400 hover:bg-gray-700 rounded transition-colors"
                  title="再生成"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}

              {/* 続きボタン */}
              {canContinue && (
                <button
                  onClick={handleContinue}
                  className="action-button p-2 text-gray-400 hover:text-green-400 hover:bg-gray-700 rounded transition-colors"
                  title="続きを生成"
                >
                  <Play className="w-4 h-4" />
                </button>
              )}

              {/* コピーボタン */}
              <button
                onClick={handleCopy}
                className="action-button p-2 text-gray-400 hover:text-yellow-400 hover:bg-gray-700 rounded transition-colors"
                title="コピー"
              >
                <Copy className="w-4 h-4" />
              </button>

              {/* その他メニュー */}
              <button
                onClick={() => setShowFullActions(!showFullActions)}
                className="action-button p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                title="その他"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 差分表示（開発モード） */}
        {process.env.NODE_ENV === "development" &&
          showDiff &&
          message.stages.context?.diff && (
            <div className="diff-display mt-2 p-2 bg-gray-800 rounded text-xs">
              <div className="additions text-green-400">
                + {message.stages.context.diff.additions.join(" ")}
              </div>
              <div className="deletions text-red-400">
                - {message.stages.context.diff.deletions.join(" ")}
              </div>
            </div>
          )}
      </div>

      {/* 更新中インジケーター */}
      {message.ui.isUpdating && (
        <motion.div
          className="updating-indicator mt-3 flex items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}>
          <div className="loading-dots flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="dot w-2 h-2 bg-blue-400 rounded-full"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>
          <span className="text-sm text-gray-400">
            {message.currentStage === "reflex" && "記憶を検索中..."}
            {message.currentStage === "context" && "深い洞察を生成中..."}
            {message.currentStage === "intelligence" && "最終調整中..."}
          </span>
        </motion.div>
      )}

      {/* メタデータ（開発モード） - レイアウト改善 */}
      {process.env.NODE_ENV === "development" && message.metadata && (
        <div className="metadata mt-3 p-3 bg-gray-900/50 backdrop-blur-sm rounded-lg border border-gray-700 text-xs">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-gray-300">
            <div className="stat-item">
              <span className="stat-label text-gray-500 block">Total Tokens</span>
              <span className="stat-value font-mono">{message.metadata.totalTokens || 0}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label text-gray-500 block">Total Time</span>
              <span className="stat-value font-mono">{message.metadata.totalTime || 0}ms</span>
            </div>
            {message.metadata.stageTimings && (
              <>
                <div className="stat-item">
                  <span className="stat-label text-red-400 block">🔴 Reflex</span>
                  <span className="stat-value font-mono">{message.metadata.stageTimings.reflex || 0}ms</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label text-green-400 block">🟢 Context</span>
                  <span className="stat-value font-mono">{message.metadata.stageTimings.context || 0}ms</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label text-white block">⚪ Intelligence</span>
                  <span className="stat-value font-mono">{message.metadata.stageTimings.intelligence || 0}ms</span>
                </div>
              </>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-700 flex justify-between items-center">
            {process.env.NODE_ENV === "development" && (
              <button
                onClick={() => setShowDiff(!showDiff)}
                className="px-3 py-1 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 hover:text-blue-300 rounded-md transition-colors"
                data-testid="diff-toggle-button">
                {showDiff ? "Hide Diff" : "Show Diff"}
              </button>
            )}
            <span className="text-gray-500 text-xs">
              Stage: {message.currentStage || 'unknown'}
            </span>
          </div>
        </div>
      )}

      {/* 波紋エフェクトのオーバーレイ */}
      <AnimatePresence>
        {message.ui.isUpdating && message.currentStage === "context" && (
          <motion.div
            className="ripple-overlay absolute inset-0 pointer-events-none"
            initial={{ scale: 0, opacity: 0.5 }}
            animate={{ scale: 2, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            style={{
              background:
                "radial-gradient(circle, rgba(100,200,255,0.3) 0%, transparent 70%)",
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ProgressiveMessageBubble;
