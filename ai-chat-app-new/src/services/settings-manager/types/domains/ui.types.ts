/**
 * UI/外観設定型定義
 * UI/Appearance Settings Type Definitions
 *
 * テーマ、フォント、レイアウト、カラー、背景に関する型定義
 *
 * @module UITypes
 * @version Phase 2.2
 */

// ═══════════════════════════════════════════════════════════════════
// UI/外観設定型
// ═══════════════════════════════════════════════════════════════════

/**
 * テーマの種類
 */
export type Theme = 'light' | 'dark' | 'auto' | 'midnight' | 'cosmic' | 'sunset' | 'custom';

/**
 * 言語設定
 */
export type Language = 'ja' | 'en' | 'zh' | 'ko';

/**
 * フォントサイズ
 */
export type FontSize = 'small' | 'medium' | 'large' | 'x-large';

/**
 * フォント太さ
 */
export type FontWeight = 'light' | 'normal' | 'medium' | 'bold';

/**
 * 行間設定
 */
export type LineHeight = 'compact' | 'normal' | 'relaxed';

/**
 * レイアウト密度
 */
export type LayoutDensity = 'compact' | 'comfortable' | 'spacious';

/**
 * メッセージ間隔
 */
export type MessageSpacing = 'compact' | 'normal' | 'relaxed';

/**
 * メッセージ角丸設定
 */
export type MessageBorderRadius = 'none' | 'small' | 'medium' | 'large' | 'x-large';

/**
 * チャット最大幅
 */
export type ChatMaxWidth = 'narrow' | 'normal' | 'wide' | 'full';

/**
 * サイドバー幅
 */
export type SidebarWidth = 'compact' | 'normal' | 'wide';

/**
 * 背景種類
 */
export type BackgroundType = 'color' | 'gradient' | 'image' | 'animated';

/**
 * トランジション速度
 */
export type TransitionDuration = 'instant' | 'fast' | 'normal' | 'slow';

/**
 * 時刻形式
 */
export type TimeFormat = '12' | '24';

/**
 * UI/外観設定
 *
 * テーマ、フォント、レイアウト、カラー、背景など
 * すべての見た目に関する設定を管理
 */
export interface UISettings {
  // ═══════════════════════════════════
  // テーマとローカライゼーション
  // ═══════════════════════════════════

  /** テーマ設定 */
  theme: Theme;

  /** 言語設定 */
  language: Language;

  // ═══════════════════════════════════
  // タイポグラフィ
  // ═══════════════════════════════════

  /** フォントサイズ */
  fontSize: FontSize;

  /** フォント太さ */
  fontWeight: FontWeight;

  /** フォントファミリー - カスタムフォント指定可能 */
  fontFamily: string;

  /** 行間設定 */
  lineHeight: LineHeight;

  // ═══════════════════════════════════
  // レイアウト
  // ═══════════════════════════════════

  /** レイアウト密度 - 全体的な余白の広さ */
  layoutDensity: LayoutDensity;

  /** メッセージ間隔 */
  messageSpacing: MessageSpacing;

  /** メッセージ角丸の大きさ */
  messageBorderRadius: MessageBorderRadius;

  /** チャット表示領域の最大幅 */
  chatMaxWidth: ChatMaxWidth;

  /** サイドバーの幅 */
  sidebarWidth: SidebarWidth;

  // ═══════════════════════════════════
  // カラーパレット
  // ═══════════════════════════════════

  /** プライマリカラー - メインの強調色 */
  primaryColor: string;

  /** アクセントカラー - 補助的な強調色 */
  accentColor: string;

  /** 背景色 */
  backgroundColor: string;

  /** サーフェス色 - カード等の表面色 */
  surfaceColor: string;

  /** テキスト色 - 主要テキスト */
  textColor: string;

  /** セカンダリテキスト色 - 補助的なテキスト */
  secondaryTextColor: string;

  /** ボーダー色 - 境界線 */
  borderColor: string;

  /** シャドウ色 - 影の色 */
  shadowColor: string;

  // ═══════════════════════════════════
  // 背景設定
  // ═══════════════════════════════════

  /** 背景の種類 */
  backgroundType: BackgroundType;

  /** グラデーション設定 (CSS gradient文法) */
  backgroundGradient?: string;

  /** 背景画像URL */
  backgroundImage?: string;

  /** 背景ぼかし強度 (0-100) */
  backgroundBlur: number;

  /** 背景ぼかし有効化フラグ */
  backgroundBlurEnabled: boolean;

  /** 背景不透明度 (0-100) */
  backgroundOpacity: number;

  /** 背景パターン (CSS pattern) */
  backgroundPattern?: string;

  /** 背景パターン不透明度 (0-100) */
  backgroundPatternOpacity?: number;

  // ═══════════════════════════════════
  // アニメーション/エフェクト
  // ═══════════════════════════════════

  /** アニメーション有効化フラグ */
  enableAnimations: boolean;

  /** トランジション速度 */
  transitionDuration: TransitionDuration;

  /** アニメーション速度係数 (0-2) */
  animationSpeed: number;

  /** グラスモーフィズム有効化 - ガラス質なUI */
  glassmorphism: boolean;

  /** グラスモーフィズム強度 (0-100) */
  glassmorphismIntensity: number;

  // ═══════════════════════════════════
  // 地域設定
  // ═══════════════════════════════════

  /** タイムゾーン (IANA形式) */
  timezone: string;

  /** 日付形式 */
  dateFormat: string;

  /** 時刻形式 */
  timeFormat: TimeFormat;

  /** 通貨設定 (ISO 4217形式) */
  currency: string;

  // ═══════════════════════════════════
  // Favicon設定 (既存コードとの互換性)
  // ═══════════════════════════════════

  /** Faviconパス */
  faviconPath?: string;

  /** Favicon SVG */
  faviconSvg?: string;

  /** Apple Touch Icon */
  appleTouchIcon?: string;

  /** カスタムCSS - 追加のスタイル定義 */
  customCSS?: string;
}
