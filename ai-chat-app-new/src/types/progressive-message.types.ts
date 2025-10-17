/**
 * Progressive Message System Types
 * 3段階プログレッシブ応答システムの型定義
 */

import { UnifiedMessage } from "./core/message.types";

/**
 * プログレッシブメッセージのステージ
 */
export type ProgressiveStage = "reflex" | "context" | "intelligence";

/**
 * ステージごとのメッセージ情報
 */
export interface StageContent {
  content: string;
  timestamp: number;
  tokens: number;
  promptLength?: number;
  diff?: TextDiff;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * テキスト差分情報
 */
export interface TextDiff {
  additions: string[];
  deletions: string[];
  unchanged: string[];
  changeRatio: number;
}

/**
 * トランジションアニメーション設定
 */
export interface TransitionAnimation {
  type: "fade" | "slide" | "morph" | "ripple";
  duration: number;
  delay?: number;
  easing?: "linear" | "ease-in" | "ease-out" | "ease-in-out";
}

/**
 * プログレッシブメッセージ
 */
export interface ProgressiveMessage extends Omit<UnifiedMessage, "stages"> {
  stages: {
    reflex?: StageContent;
    context?: StageContent;
    intelligence?: StageContent;
  };

  currentStage: ProgressiveStage;

  transitions: {
    reflexToContext?: TransitionAnimation;
    contextToIntelligence?: TransitionAnimation;
  };

  metadata: {
    progressive?: boolean; // ✅ FIX: MessageBubbleがプログレッシブメッセージと判定するために必須
    totalTokens: number;
    totalTime: number;
    userSatisfactionPoint?: ProgressiveStage;
    stageTimings: {
      reflex?: number;
      context?: number;
      intelligence?: number;
    };
    progressiveData?: {
      stages: {
        reflex?: StageContent;
        context?: StageContent;
        intelligence?: StageContent;
      };
      currentStage: ProgressiveStage;
      transitions: {
        reflexToContext?: TransitionAnimation;
        contextToIntelligence?: TransitionAnimation;
      };
      ui: {
        isUpdating: boolean;
        glowIntensity: "none" | "soft" | "medium" | "strong";
        highlightChanges: boolean;
      };
      metadata: {
        totalTokens: number;
        totalTime: number;
        stageTimings: {
          reflex?: number;
          context?: number;
          intelligence?: number;
        };
        model_used?: string;
      };
    };
  };

  ui: {
    isUpdating: boolean;
    showIndicator: boolean;
    glowIntensity: "none" | "soft" | "medium" | "strong";
    highlightChanges: boolean;
  };
}

/**
 * プログレッシブ設定
 */
export interface ProgressiveSettings {
  enabled: boolean;

  stages: {
    reflex: {
      enabled: boolean;
      maxTokens: number;
      delay: number;
      temperature: number;
      promptStyle: "minimal" | "basic";
    };
    context: {
      enabled: boolean;
      maxTokens: number;
      delay: number;
      temperature: number;
      promptStyle: "contextual" | "memory-enhanced";
    };
    intelligence: {
      enabled: boolean;
      maxTokens: number;
      delay: number;
      temperature: number;
      promptStyle: "complete" | "creative";
    };
  };

  animations: {
    textMorphing: boolean;
    glowEffect: boolean;
    rippleEffect: boolean;
    stageIndicators: boolean;
    highlightDiff: boolean;
  };

  performance: {
    parallelRequests: boolean;
    cacheResponses: boolean;
    adaptiveTiming: boolean;
  };
}

/**
 * プログレッシブプロンプト構造
 */
export interface ProgressivePrompt {
  stage: ProgressiveStage;
  prompt: string;
  tokenLimit: number;
  temperature: number;
  systemInstructions?: string;
  characterContext?: string;
  memoryContext?: string;
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
}

/**
 * ステージ完了イベント
 */
export interface StageCompletionEvent {
  messageId: string;
  stage: ProgressiveStage;
  content: string;
  tokens: number;
  duration: number;
  success: boolean;
  error?: string;
}

/**
 * プログレッシブメッセージの状態
 */
export type ProgressiveMessageState =
  | "idle"
  | "reflex-pending"
  | "reflex-complete"
  | "context-pending"
  | "context-complete"
  | "intelligence-pending"
  | "intelligence-complete"
  | "error";

/**
 * デフォルト設定
 */
export const DEFAULT_PROGRESSIVE_SETTINGS: ProgressiveSettings = {
  enabled: false, // デフォルトは通常モード

  stages: {
    reflex: {
      enabled: true,
      maxTokens: 100,
      delay: 0,
      temperature: 0.9,
      promptStyle: "minimal",
    },
    context: {
      enabled: true,
      maxTokens: 500,
      delay: 500,
      temperature: 0.7,
      promptStyle: "memory-enhanced",
    },
    intelligence: {
      enabled: true,
      maxTokens: 2000,
      delay: 1500,
      temperature: 0.7,
      promptStyle: "complete",
    },
  },

  animations: {
    textMorphing: true,
    glowEffect: true,
    rippleEffect: true,
    stageIndicators: true,
    highlightDiff: true,
  },

  performance: {
    parallelRequests: true,
    cacheResponses: false,
    adaptiveTiming: false,
  },
};
