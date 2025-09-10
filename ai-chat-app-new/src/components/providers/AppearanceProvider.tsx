"use client";

import React, { useEffect } from "react";
import { useAppStore } from "@/store";

export const AppearanceProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { appearanceSettings, effectSettings, getSelectedCharacter, selectedCharacterId } =
    useAppStore();
  const currentCharacter = getSelectedCharacter();

  useEffect(() => {
    // CSS変数を設定して、全体のスタイルを動的に変更
    const root = document.documentElement;
    const hasCharacterBackground = !!(
      currentCharacter && currentCharacter.background_url
    );

    // カラー設定を適用
    root.style.setProperty("--primary-color", appearanceSettings.primaryColor);
    root.style.setProperty("--accent-color", appearanceSettings.accentColor);
    root.style.setProperty(
      "--background-color",
      appearanceSettings.backgroundColor
    );
    root.style.setProperty("--surface-color", appearanceSettings.surfaceColor);
    root.style.setProperty("--text-color", appearanceSettings.textColor);
    root.style.setProperty(
      "--secondary-text-color",
      appearanceSettings.secondaryTextColor
    );
    root.style.setProperty("--border-color", appearanceSettings.borderColor);
    root.style.setProperty("--shadow-color", appearanceSettings.shadowColor);

    // フォント設定を適用
    root.style.setProperty("--font-family", appearanceSettings.fontFamily);

    const fontSizeMap = {
      small: "14px",
      medium: "16px",
      large: "18px",
      "x-large": "20px",
    };
    root.style.setProperty(
      "--font-size",
      fontSizeMap[appearanceSettings.fontSize]
    );
    root.style.setProperty("--font-weight", appearanceSettings.fontWeight);

    const lineHeightMap = {
      compact: "1.2",
      normal: "1.5",
      relaxed: "1.8",
    };
    root.style.setProperty(
      "--line-height",
      lineHeightMap[appearanceSettings.lineHeight]
    );

    // レイアウト設定を適用
    const messageSpacingMap = {
      compact: "0.5rem",
      normal: "1rem",
      spacious: "1.5rem",
    };
    root.style.setProperty(
      "--message-spacing",
      messageSpacingMap[appearanceSettings.messageSpacing]
    );

    const borderRadiusMap = {
      none: "0",
      small: "0.375rem",
      medium: "0.5rem",
      large: "0.75rem",
      full: "9999px",
    };
    root.style.setProperty(
      "--message-border-radius",
      borderRadiusMap[appearanceSettings.messageBorderRadius]
    );

    const chatWidthMap = {
      narrow: "600px",
      normal: "800px",
      wide: "1000px",
      full: "100%",
    };
    root.style.setProperty(
      "--chat-max-width",
      chatWidthMap[appearanceSettings.chatMaxWidth]
    );

    const sidebarWidthMap = {
      narrow: "200px",
      normal: "240px",
      wide: "280px",
    };
    root.style.setProperty(
      "--sidebar-width",
      sidebarWidthMap[appearanceSettings.sidebarWidth]
    );

    // 背景設定を適用 - bodyにdata属性も設定
    const body = document.body;

    // 背景設定を適用（キャラクター背景は優先しない）
    if (
      appearanceSettings.backgroundType === "image" &&
      appearanceSettings.backgroundImage
    ) {
      // 外観設定の画像背景を適用
      root.style.setProperty(
        "--background",
        `url(${appearanceSettings.backgroundImage})`
      );
      root.style.setProperty(
        "--background-blur",
        `${appearanceSettings.backgroundBlur}px`
      );
      root.style.setProperty(
        "--background-opacity",
        `${appearanceSettings.backgroundOpacity}`
      );
      root.setAttribute("data-background-type", "image");
      // body要素の背景をクリア
      body.style.setProperty("background", "transparent", "important");
    } else if (appearanceSettings.backgroundType === "solid") {
      root.style.setProperty(
        "--background",
        appearanceSettings.backgroundColor
      );
      root.setAttribute("data-background-type", "solid");
      body.style.setProperty("background", "transparent", "important");
    } else if (appearanceSettings.backgroundType === "gradient") {
      root.style.setProperty(
        "--background",
        appearanceSettings.backgroundGradient
      );
      root.setAttribute("data-background-type", "gradient");
      body.style.setProperty("background", "transparent", "important");
    }

    // アニメーション設定を適用
    const transitionDurationMap = {
      fast: "0.15s",
      normal: "0.3s",
      slow: "0.5s",
    };
    root.style.setProperty(
      "--transition-duration",
      transitionDurationMap[appearanceSettings.transitionDuration]
    );
    root.style.setProperty(
      "--enable-animations",
      appearanceSettings.enableAnimations ? "1" : "0"
    );


    // カスタムCSSを適用
    const existingCustomStyle = document.getElementById(
      "custom-appearance-style"
    );
    if (existingCustomStyle) {
      existingCustomStyle.remove();
    }

    if (appearanceSettings.customCSS) {
      const style = document.createElement("style");
      style.id = "custom-appearance-style";
      style.textContent = appearanceSettings.customCSS;
      document.head.appendChild(style);
    }
  }, [appearanceSettings, effectSettings, selectedCharacterId, currentCharacter]);

  // グローバルスタイルも追加
  useEffect(() => {
    const styleId = "appearance-global-styles";
    const existingStyle = document.getElementById(styleId);

    if (!existingStyle) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        /* グローバル外観スタイル */
        :root {
          --primary-color: #8b5cf6;
          --accent-color: #ec4899;
          --background-color: #0f0f23;
          --surface-color: #1e1e2e;
          --text-color: #ffffff;
          --secondary-text-color: #9ca3af;
          --border-color: #374151;
          --shadow-color: #000000;
          --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          --font-size: 16px;
          --font-weight: normal;
          --line-height: 1.5;
          --message-spacing: 1rem;
          --message-border-radius: 0.5rem;
          --chat-max-width: 800px;
          --sidebar-width: 240px;
          --transition-duration: 0.3s;
          --enable-animations: 1;
        }
        
        /* 背景適用 */
        body {
          background: var(--background-color) !important;
          color: var(--text-color) !important;
          font-family: var(--font-family) !important;
          font-size: var(--font-size) !important;
          font-weight: var(--font-weight) !important;
          line-height: var(--line-height) !important;
        }
        
        /* 画像背景の場合は固定レイヤーとして適用 */
        html[data-background-type="image"]::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: var(--background) !important;
          background-size: cover !important;
          background-position: center !important;
          background-repeat: no-repeat !important;
          z-index: -1;
          pointer-events: none;
        }
        
        /* 単色背景の場合 */
        html[data-background-type="solid"] {
          background: var(--background) !important;
          min-height: 100vh !important;
        }
        
        /* グラデーション背景の場合 */
        html[data-background-type="gradient"] {
          background: var(--background) !important;
          min-height: 100vh !important;
        }
        
        /* 背景画像のオーバーレイ効果を削除 */
        html[data-background-type="image"]::before {
          display: none !important;
        }
        
        /* チャット領域のスタイル適用 */
        .chat-container {
          max-width: var(--chat-max-width);
        }
        
        .sidebar {
          width: var(--sidebar-width);
        }
        
        /* メッセージバブルスタイル */
        .message-bubble {
          border-radius: var(--message-border-radius);
          margin-bottom: var(--message-spacing);
        }
        
        .message-bubble.ai {
          background-color: var(--surface-color);
          color: var(--text-color);
        }
        
        .message-bubble.user {
          background-color: var(--primary-color);
          color: white;
        }
        
        /* アニメーション */
        * {
          transition-duration: calc(var(--transition-duration) * var(--enable-animations));
        }
        
      `;
      document.head.appendChild(style);
    }
  }, []);

  // 背景タイプをhtml要素に適用
  useEffect(() => {
    document.documentElement.setAttribute(
      "data-background-type",
      appearanceSettings.backgroundType
    );
  }, [appearanceSettings.backgroundType]);

  return <>{children}</>;
};
