"use client";

import React, { useEffect } from "react";
import { useAppStore } from "@/store";

export const AppearanceProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const {
    appearanceSettings,
    effectSettings,
    getSelectedCharacter,
    selectedCharacterId,
  } = useAppStore();

  // 🔧 FIX: useMemoでメモ化して無限ループを防ぐ
  // ⚠️ getSelectedCharacterを依存配列から削除（Zustand関数は毎回新しい参照になるため）
  const currentCharacter = React.useMemo(
    () => getSelectedCharacter(),
    [selectedCharacterId]
  );

  useEffect(() => {
    // favicon / apple-touch-icon を実行時に head に挿入（public/ に置くだけでも動くが、即時反映のためここで確実に設定）
    try {
      const existingLink = document.querySelector('link[rel="icon"]');
      if (!existingLink) {
        const link = document.createElement("link");
        link.rel = "icon";
        link.href = appearanceSettings.faviconPath || "/favicon.ico";
        document.head.appendChild(link);
      } else {
        (existingLink as HTMLLinkElement).href = appearanceSettings.faviconPath || "/favicon.ico";
      }

      const existingSvg = document.querySelector('link[type="image/svg+xml"]');
      if (!existingSvg) {
        const svgLink = document.createElement("link");
        svgLink.rel = "icon";
        svgLink.type = "image/svg+xml";
        svgLink.href = appearanceSettings.faviconSvg || "/favicon.svg";
        document.head.appendChild(svgLink);
      } else {
        (existingSvg as HTMLLinkElement).href = appearanceSettings.faviconSvg || "/favicon.svg";
      }

      const existingApple = document.querySelector('link[rel="apple-touch-icon"]');
      if (!existingApple) {
        const apple = document.createElement("link");
        apple.rel = "apple-touch-icon";
        apple.href = appearanceSettings.appleTouchIcon || "/apple-touch-icon.png";
        document.head.appendChild(apple);
      } else {
        (existingApple as HTMLLinkElement).href = appearanceSettings.appleTouchIcon || "/apple-touch-icon.png";
      }
    } catch (e) {
      // 実行環境で document が使えない場合は無視
    }
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
      fontSizeMap[appearanceSettings.fontSize as keyof typeof fontSizeMap]
    );
    root.style.setProperty("--font-weight", appearanceSettings.fontWeight);

    const lineHeightMap = {
      compact: "1.2",
      normal: "1.5",
      relaxed: "1.8",
    };
    root.style.setProperty(
      "--line-height",
      lineHeightMap[appearanceSettings.lineHeight as keyof typeof lineHeightMap]
    );

    // レイアウト設定を適用
    const messageSpacingMap = {
      compact: "0.5rem",
      normal: "1rem",
      spacious: "1.5rem",
    };
    root.style.setProperty(
      "--message-spacing",
      messageSpacingMap[
        appearanceSettings.messageSpacing as keyof typeof messageSpacingMap
      ]
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
      borderRadiusMap[
        appearanceSettings.messageBorderRadius as keyof typeof borderRadiusMap
      ]
    );

    const chatWidthMap = {
      narrow: "600px",
      normal: "800px",
      wide: "1000px",
      full: "100%",
    };
    root.style.setProperty(
      "--chat-max-width",
      chatWidthMap[appearanceSettings.chatMaxWidth as keyof typeof chatWidthMap]
    );

    const sidebarWidthMap = {
      narrow: "200px",
      normal: "240px",
      wide: "280px",
    };
    root.style.setProperty(
      "--sidebar-width",
      sidebarWidthMap[
        appearanceSettings.sidebarWidth as keyof typeof sidebarWidthMap
      ]
    );

    // 背景設定を適用 - bodyにdata属性も設定
    const body = document.body;

    // 背景優先度: キャラクター個別背景 > 外観設定のURL背景 > その他の背景タイプ
    if (currentCharacter?.background_url) {
      // キャラクター個別背景を最優先で適用
      root.style.setProperty(
        "--background",
        `url(${currentCharacter.background_url})`
      );
      root.style.setProperty(
        "--background-blur",
        `${appearanceSettings.backgroundBlur}px`
      );
      root.style.setProperty(
        "--background-opacity",
        `${appearanceSettings.backgroundOpacity}`
      );
      root.setAttribute("data-background-type", "character-image");
      // 背景ぼかしの有効/無効をHTML属性に反映
      if (appearanceSettings.backgroundBlurEnabled === false) {
        root.setAttribute("data-background-blur", "disabled");
      } else {
        root.setAttribute("data-background-blur", "enabled");
      }
      // body要素の背景をクリア
      body.style.setProperty("background", "transparent", "important");
    } else if (appearanceSettings.backgroundImage && appearanceSettings.backgroundImage.trim() !== "") {
      // キャラクター背景がない場合、外観設定のURL背景をデフォルトとして適用
      // backgroundTypeに関わらず、backgroundImageにURLが設定されていれば優先表示
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
      // 背景ぼかしの有効/無効をHTML属性に反映
      if (appearanceSettings.backgroundBlurEnabled === false) {
        root.setAttribute("data-background-blur", "disabled");
      } else {
        root.setAttribute("data-background-blur", "enabled");
      }
      // body要素の背景をクリア
      body.style.setProperty("background", "transparent", "important");
    } else if (appearanceSettings.backgroundType === "solid") {
      root.style.setProperty(
        "--background",
        appearanceSettings.backgroundColor
      );
      root.setAttribute("data-background-type", "solid");
      if (appearanceSettings.backgroundBlurEnabled === false) {
        root.setAttribute("data-background-blur", "disabled");
      } else {
        root.setAttribute("data-background-blur", "enabled");
      }
      body.style.setProperty("background", "transparent", "important");
    } else if (appearanceSettings.backgroundType === "gradient") {
      root.style.setProperty(
        "--background",
        appearanceSettings.backgroundGradient
      );
      root.setAttribute("data-background-type", "gradient");
      if (appearanceSettings.backgroundBlurEnabled === false) {
        root.setAttribute("data-background-blur", "disabled");
      } else {
        root.setAttribute("data-background-blur", "enabled");
      }
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
      transitionDurationMap[
        appearanceSettings.transitionDuration as keyof typeof transitionDurationMap
      ]
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

    // 背景タイプをhtml要素に適用（メインのuseEffect内で統合）
    document.documentElement.setAttribute(
      "data-background-type",
      appearanceSettings.backgroundType
    );
  }, [
    appearanceSettings,
    effectSettings,
    selectedCharacterId,
    // 🔧 FIX: currentCharacterを依存配列から削除（selectedCharacterIdで十分）
  ]);

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
        html[data-background-type="image"]::before,
        html[data-background-type="character-image"]::before {
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
          opacity: calc(var(--background-opacity) / 100);
          z-index: -1;
          pointer-events: none;
        }

        /* 単色・グラデーション背景の場合はhtml要素に直接適用 */
        html[data-background-type="solid"],
        html[data-background-type="gradient"] {
          background: var(--background) !important;
          min-height: 100vh !important;
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

  return <>{children}</>;
};
