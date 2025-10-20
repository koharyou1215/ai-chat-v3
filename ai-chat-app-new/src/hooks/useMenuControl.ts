/**
 * useMenuControl Hook
 *
 * メニュー制御ロジックを統合
 * 外部クリック検出、ESCキー処理、開閉保護タイマーを一元管理
 *
 * @module useMenuControl
 */

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * メニュー制御オプション
 */
export interface MenuControlOptions {
  /**
   * メニュー開閉時の保護タイマー時間（ミリ秒）
   * 開いた直後に外部クリックで閉じるのを防ぐ
   * @default 300
   */
  protectionDelay?: number;

  /**
   * 外部クリック時のコールバック
   */
  onOutsideClick?: () => void;

  /**
   * ESCキー押下時のコールバック
   */
  onEscapeKey?: () => void;

  /**
   * メニューを開いた時のコールバック
   */
  onOpen?: () => void;

  /**
   * メニューを閉じた時のコールバック
   */
  onClose?: () => void;
}

/**
 * メニュー制御の戻り値
 */
export interface MenuControlResult {
  /**
   * メニューが開いているか
   */
  isOpen: boolean;

  /**
   * メニューを開く
   */
  open: () => void;

  /**
   * メニューを閉じる
   */
  close: () => void;

  /**
   * メニューをトグル
   */
  toggle: () => void;

  /**
   * メニュー要素へのref
   */
  menuRef: React.RefObject<HTMLDivElement>;

  /**
   * トリガー要素へのref
   */
  triggerRef: React.RefObject<HTMLButtonElement>;
}

/**
 * メニュー制御フック
 *
 * @param options - メニュー制御オプション
 * @returns メニュー制御の状態と関数
 *
 * @example
 * ```typescript
 * const { isOpen, toggle, menuRef, triggerRef } = useMenuControl({
 *   protectionDelay: 300,
 *   onOpen: () => console.log('Menu opened'),
 *   onClose: () => console.log('Menu closed'),
 * });
 *
 * return (
 *   <>
 *     <button ref={triggerRef} onClick={toggle}>Menu</button>
 *     {isOpen && (
 *       <div ref={menuRef}>
 *         <MenuItem>Item 1</MenuItem>
 *         <MenuItem>Item 2</MenuItem>
 *       </div>
 *     )}
 *   </>
 * );
 * ```
 */
export function useMenuControl(
  options?: MenuControlOptions
): MenuControlResult {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const protectionTimerRef = useRef<NodeJS.Timeout | null>(null);

  // メニューを開く
  const open = useCallback(() => {
    setIsOpen(true);
    options?.onOpen?.();

    // 保護タイマー設定
    if (protectionTimerRef.current) {
      clearTimeout(protectionTimerRef.current);
    }

    protectionTimerRef.current = setTimeout(() => {
      protectionTimerRef.current = null;
    }, options?.protectionDelay || 300);
  }, [options]);

  // メニューを閉じる
  const close = useCallback(() => {
    setIsOpen(false);
    options?.onClose?.();
  }, [options]);

  // メニューをトグル
  const toggle = useCallback(() => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }, [isOpen, open, close]);

  // 外部クリック検出
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      // 保護タイマー中は外部クリックを無視
      if (protectionTimerRef.current) return;

      const target = event.target as Node;

      if (
        menuRef.current &&
        triggerRef.current &&
        !menuRef.current.contains(target) &&
        !triggerRef.current.contains(target)
      ) {
        options?.onOutsideClick?.();
        close();
      }
    };

    // キャプチャフェーズでリスナーを追加
    document.addEventListener("mousedown", handleClickOutside, true);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
    };
  }, [isOpen, close, options]);

  // ESCキー検出
  useEffect(() => {
    if (!isOpen) return;

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        options?.onEscapeKey?.();
        close();
      }
    };

    document.addEventListener("keydown", handleEscapeKey);

    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [isOpen, close, options]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (protectionTimerRef.current) {
        clearTimeout(protectionTimerRef.current);
      }
    };
  }, []);

  return {
    isOpen,
    open,
    close,
    toggle,
    menuRef,
    triggerRef,
  };
}
