/**
 * useTypewriter Hook
 *
 * タイプライター効果を提供する統合フック
 * 既存の重複実装を統一し、一貫したタイプライター動作を実現
 *
 * @module useTypewriter
 */

import { useEffect, useState, useRef } from "react";

/**
 * タイプライターオプション
 */
export interface TypewriterOptions {
  /**
   * タイプライター効果を有効化するか
   */
  enabled: boolean;

  /**
   * 1文字あたりの表示速度（ミリ秒）
   * @default 50
   */
  speed?: number;

  /**
   * タイプライター完了時のコールバック
   */
  onComplete?: () => void;

  /**
   * タイプライター開始時のコールバック
   */
  onStart?: () => void;
}

/**
 * タイプライター効果の戻り値
 */
export interface TypewriterResult {
  /**
   * 現在表示されているコンテンツ
   */
  displayedContent: string;

  /**
   * タイピング中かどうか
   */
  isTyping: boolean;

  /**
   * タイプライターをスキップ
   */
  skipTyping: () => void;

  /**
   * タイプライターをリセット
   */
  resetTyping: () => void;
}

/**
 * タイプライター効果フック
 *
 * @param content - 表示するコンテンツ
 * @param options - タイプライターオプション
 * @returns タイプライター効果の状態と制御関数
 *
 * @example
 * ```typescript
 * const { displayedContent, isTyping, skipTyping } = useTypewriter(message.content, {
 *   enabled: isEffectEnabled('typewriter'),
 *   speed: Math.max(10, 100 - effectSettings.typewriterIntensity),
 *   onComplete: () => console.log('Typing completed'),
 * });
 * ```
 */
export function useTypewriter(
  content: string,
  options: TypewriterOptions
): TypewriterResult {
  const [displayedContent, setDisplayedContent] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const cancelledRef = useRef(false);
  const timeoutIdsRef = useRef<NodeJS.Timeout[]>([]);
  const rafIdRef = useRef<number | null>(null);
  const currentTextRef = useRef("");

  // タイプライターをスキップ
  const skipTyping = () => {
    cancelledRef.current = true;
    // すべてのタイムアウトとRAFをクリア
    timeoutIdsRef.current.forEach(clearTimeout);
    timeoutIdsRef.current = [];
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    setDisplayedContent(content);
    setIsTyping(false);
  };

  // タイプライターをリセット
  const resetTyping = () => {
    cancelledRef.current = true;
    timeoutIdsRef.current.forEach(clearTimeout);
    timeoutIdsRef.current = [];
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    currentTextRef.current = "";
    setDisplayedContent("");
    setIsTyping(false);
  };

  useEffect(() => {
    // エフェクトが無効、またはコンテンツが空の場合
    if (!options.enabled || !content) {
      setDisplayedContent(content);
      setIsTyping(false);
      return;
    }

    // リセット
    cancelledRef.current = false;
    timeoutIdsRef.current = [];
    currentTextRef.current = "";

    const speed = options.speed || 50;
    setIsTyping(true);
    setDisplayedContent("");

    // onStartコールバック
    options.onStart?.();

    // requestAnimationFrameによる最適化されたレンダリング
    let lastUpdateTime = 0;
    const updateDisplay = () => {
      const now = performance.now();
      // 最低16ms（60fps相当）の間隔でレンダリング
      if (now - lastUpdateTime >= 16) {
        setDisplayedContent(currentTextRef.current);
        lastUpdateTime = now;
      }

      if (!cancelledRef.current && currentTextRef.current.length < content.length) {
        rafIdRef.current = requestAnimationFrame(updateDisplay);
      }
    };

    const typeText = async () => {
      const characters = content.split("");

      // RAFループ開始
      rafIdRef.current = requestAnimationFrame(updateDisplay);

      for (let i = 0; i < characters.length; i++) {
        if (cancelledRef.current) {
          break;
        }

        currentTextRef.current += characters[i];

        // 最後の文字でない場合のみwait
        if (i < characters.length - 1) {
          await new Promise<void>((resolve) => {
            const timeoutId = setTimeout(() => {
              resolve();
            }, speed);
            timeoutIdsRef.current.push(timeoutId);
          });
        }
      }

      // 最終更新を保証
      if (!cancelledRef.current) {
        setDisplayedContent(currentTextRef.current);
      }

      if (!cancelledRef.current) {
        setIsTyping(false);
        options.onComplete?.();
      }
    };

    typeText();

    // クリーンアップ
    return () => {
      cancelledRef.current = true;
      timeoutIdsRef.current.forEach(clearTimeout);
      timeoutIdsRef.current = [];
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [content, options.enabled, options.speed]);

  return {
    displayedContent,
    isTyping,
    skipTyping,
    resetTyping,
  };
}
