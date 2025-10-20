/**
 * StageSelector Component
 *
 * プログレッシブメッセージのステージ選択UI
 * reflex（直感）、context（文脈）、intelligence（知性）の3ステージを切り替え
 *
 * @module StageSelector
 */

"use client";

import React from "react";
import { cn } from "@/lib/utils";

/**
 * ステージ情報
 */
export interface Stage {
  content?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

/**
 * ステージコレクション
 */
export interface Stages {
  reflex?: Stage;
  context?: Stage;
  intelligence?: Stage;
}

/**
 * StageSelectorProps
 */
export interface StageSelectorProps {
  /**
   * 利用可能なステージ
   */
  stages: Stages;

  /**
   * 現在選択されているステージ
   */
  selectedStage: string | null;

  /**
   * ステージ選択時のコールバック
   */
  onSelectStage: (stage: string | null) => void;

  /**
   * カスタムクラス名
   */
  className?: string;
}

/**
 * ステージ表示ラベルを取得
 */
function getStageLabel(stage: string): string {
  switch (stage) {
    case "reflex":
      return "直感 ⚡";
    case "context":
      return "文脈 ❤️";
    case "intelligence":
      return "知性";
    default:
      return stage;
  }
}

/**
 * StageSelector Component
 *
 * プログレッシブメッセージの異なるステージを選択するためのUIコンポーネント
 *
 * @example
 * ```tsx
 * <StageSelector
 *   stages={message.stages}
 *   selectedStage={selectedStage}
 *   onSelectStage={setSelectedStage}
 * />
 * ```
 */
export const StageSelector: React.FC<StageSelectorProps> = ({
  stages,
  selectedStage,
  onSelectStage,
  className,
}) => {
  // 利用可能なステージがない場合は何も表示しない
  const hasAnyStage =
    stages.reflex?.content ||
    stages.context?.content ||
    stages.intelligence?.content;

  if (!hasAnyStage) {
    return null;
  }

  return (
    <div className={cn("flex gap-2 mb-3", className)}>
      {/* Reflex（直感）ステージ */}
      {stages.reflex?.content && (
        <button
          onClick={() =>
            onSelectStage(selectedStage === "reflex" ? null : "reflex")
          }
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
            selectedStage === "reflex"
              ? "bg-green-500 text-white shadow-lg shadow-green-500/30"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          )}
          title="直感ステージ - 即座の応答">
          Stage 1: {getStageLabel("reflex")}
        </button>
      )}

      {/* Context（文脈）ステージ */}
      {stages.context?.content && (
        <button
          onClick={() =>
            onSelectStage(selectedStage === "context" ? null : "context")
          }
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
            selectedStage === "context"
              ? "bg-pink-500 text-white shadow-lg shadow-pink-500/30"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          )}
          title="文脈ステージ - 文脈を考慮した応答">
          Stage 2: {getStageLabel("context")}
        </button>
      )}

      {/* Intelligence（知性）ステージ */}
      {stages.intelligence?.content && (
        <button
          onClick={() =>
            onSelectStage(
              selectedStage === "intelligence" ? null : "intelligence"
            )
          }
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
            selectedStage === "intelligence"
              ? "bg-purple-500 text-white shadow-lg shadow-purple-500/30"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          )}
          title="知性ステージ - 深い思考による応答">
          Stage 3: {getStageLabel("intelligence")}
        </button>
      )}

      {/* 最新ボタン（ステージ選択解除） */}
      {selectedStage && (
        <button
          onClick={() => onSelectStage(null)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-700 text-gray-300 hover:bg-gray-600 transition-all"
          title="最新の内容を表示">
          最新
        </button>
      )}
    </div>
  );
};
