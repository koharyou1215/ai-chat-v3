"use client";

import React, { useEffect, useState } from "react";
import { useAppStore } from "@/store";
import { selectBackgroundImageURL, selectBackgroundVideoURL } from "@/utils/device-detection";

export const AppearanceProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const {
    appearanceSettings,
    effectSettings,
    getSelectedCharacter,
    selectedCharacterId,
  } = useAppStore();

  // 🎬 動画背景のstate管理
  const [videoBackgroundUrl, setVideoBackgroundUrl] = useState<string>('');
  const [videoSettings, setVideoSettings] = useState({
    loop: true,
    muted: true,
    autoplay: true,
    playbackRate: 1.0,
    opacity: 100,
  });

  // 🔧 FIX: useMemoでメモ化して無限ループを防ぐ
  // ⚠️ getSelectedCharacterを依存配列から削除（Zustand関数は毎回新しい参照になるため）
  const currentCharacter = React.useMemo(
    () => getSelectedCharacter(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    // 🆕 Phase 3: 階層構造から読み取り（フォールバック付き）
    const backgroundType = appearanceSettings.background?.type || appearanceSettings.backgroundType || 'gradient';

    // 🆕 デバイス別背景画像URL選択
    const baseUrl = appearanceSettings.background?.image?.url || appearanceSettings.backgroundImage || '';
    const desktopUrl = appearanceSettings.background?.image?.desktop || '';
    const mobileUrl = appearanceSettings.background?.image?.mobile || '';
    console.log('⚙️ [AppearanceProvider] Appearance Background URLs:', {
      baseUrl,
      desktopUrl,
      mobileUrl,
    });
    const backgroundImage = selectBackgroundImageURL(baseUrl, desktopUrl, mobileUrl);
    console.log('✅ [AppearanceProvider] Selected Appearance Background URL:', backgroundImage);

    const backgroundBlur = appearanceSettings.background?.image?.blur ?? appearanceSettings.backgroundBlur ?? 10;
    const backgroundBlurEnabled = appearanceSettings.background?.image?.blurEnabled ?? appearanceSettings.backgroundBlurEnabled ?? false;
    const backgroundOpacity = appearanceSettings.background?.image?.opacity ?? appearanceSettings.backgroundOpacity ?? 100;
    const backgroundGradient = appearanceSettings.background?.gradient?.value || appearanceSettings.backgroundGradient || '';

    // カラー設定を適用
    root.style.setProperty("--primary-color", appearanceSettings.primaryColor || '');
    root.style.setProperty("--accent-color", appearanceSettings.accentColor || '');
    root.style.setProperty(
      "--background-color",
      appearanceSettings.backgroundColor || ''
    );
    root.style.setProperty("--surface-color", appearanceSettings.surfaceColor || '');
    root.style.setProperty("--text-color", appearanceSettings.textColor || '');
    root.style.setProperty(
      "--secondary-text-color",
      appearanceSettings.secondaryTextColor || ''
    );
    root.style.setProperty("--border-color", appearanceSettings.borderColor || '');
    root.style.setProperty("--shadow-color", appearanceSettings.shadowColor || '');

    // フォント設定を適用
    root.style.setProperty("--font-family", appearanceSettings.fontFamily || '');

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
    root.style.setProperty("--font-weight", appearanceSettings.fontWeight?.toString() || '');

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

    // 🆕 キャラクター背景画像のデバイス別URL選択
    let characterBackgroundUrl = '';
    let characterVideoUrl = '';
    if (currentCharacter) {
      // 画像URL選択
      const charBaseUrl = currentCharacter.background_url || '';
      const charDesktopUrl = currentCharacter.background_url_desktop || '';
      const charMobileUrl = currentCharacter.background_url_mobile || '';
      console.log('🎭 [AppearanceProvider] Character Background URLs:', {
        characterName: currentCharacter.name,
        baseUrl: charBaseUrl,
        desktopUrl: charDesktopUrl,
        mobileUrl: charMobileUrl,
      });
      characterBackgroundUrl = selectBackgroundImageURL(charBaseUrl, charDesktopUrl, charMobileUrl);
      console.log('✅ [AppearanceProvider] Selected Character Background URL:', characterBackgroundUrl);

      // 🎬 動画URL選択
      const charVideoBase = currentCharacter.background_video_url || '';
      const charVideoDesktop = currentCharacter.background_video_url_desktop || '';
      const charVideoMobile = currentCharacter.background_video_url_mobile || '';
      if (charVideoBase || charVideoDesktop || charVideoMobile) {
        console.log('🎬 [AppearanceProvider] Character Video URLs:', {
          characterName: currentCharacter.name,
          baseUrl: charVideoBase,
          desktopUrl: charVideoDesktop,
          mobileUrl: charVideoMobile,
        });
        characterVideoUrl = selectBackgroundVideoURL(charVideoBase, charVideoDesktop, charVideoMobile);
        console.log('✅ [AppearanceProvider] Selected Character Video URL:', characterVideoUrl);
      }
    }

    // 🎬 外観設定の動画URL選択
    const appearanceVideoBase = appearanceSettings.background?.video?.url || '';
    const appearanceVideoDesktop = appearanceSettings.background?.video?.desktop || '';
    const appearanceVideoMobile = appearanceSettings.background?.video?.mobile || '';
    let appearanceVideoUrl = '';
    if (appearanceVideoBase || appearanceVideoDesktop || appearanceVideoMobile) {
      console.log('🎬 [AppearanceProvider] Appearance Video URLs:', {
        baseUrl: appearanceVideoBase,
        desktopUrl: appearanceVideoDesktop,
        mobileUrl: appearanceVideoMobile,
      });
      appearanceVideoUrl = selectBackgroundVideoURL(appearanceVideoBase, appearanceVideoDesktop, appearanceVideoMobile);
      console.log('✅ [AppearanceProvider] Selected Appearance Video URL:', appearanceVideoUrl);
    }

    // 🎬 動画背景の優先度判定と設定
    // 優先度: キャラクター動画 > キャラクター画像 > 外観設定動画 > 外観設定画像 > その他
    const finalVideoUrl = characterVideoUrl || appearanceVideoUrl;
    const videoOpacity = appearanceSettings.background?.video?.opacity ?? 100;
    const videoLoop = appearanceSettings.background?.video?.loop ?? true;
    const videoMuted = appearanceSettings.background?.video?.muted ?? true;
    const videoAutoplay = appearanceSettings.background?.video?.autoplay ?? true;
    const videoPlaybackRate = appearanceSettings.background?.video?.playbackRate ?? 1.0;

    if (finalVideoUrl && finalVideoUrl.trim() !== '') {
      // 🎬 動画背景を適用
      setVideoBackgroundUrl(finalVideoUrl);
      setVideoSettings({
        loop: videoLoop,
        muted: videoMuted,
        autoplay: videoAutoplay,
        playbackRate: videoPlaybackRate,
        opacity: videoOpacity,
      });
      root.setAttribute("data-background-type", characterVideoUrl ? "character-video" : "video");
      // body要素の背景をクリア
      body.style.setProperty("background", "transparent", "important");
      console.log('🎬 [AppearanceProvider] Video background applied:', {
        url: finalVideoUrl,
        settings: { loop: videoLoop, muted: videoMuted, autoplay: videoAutoplay, opacity: videoOpacity },
      });
    } else if (characterBackgroundUrl) {
      // 動画がない場合、キャラクター個別画像背景を適用
      setVideoBackgroundUrl(''); // 動画背景をクリア
      root.style.setProperty(
        "--background",
        `url(${characterBackgroundUrl})`
      );
      root.style.setProperty(
        "--background-blur",
        `${backgroundBlur}px`
      );
      root.style.setProperty(
        "--background-opacity",
        `${backgroundOpacity}`
      );
      root.setAttribute("data-background-type", "character-image");
      // 🖼️ 画像背景のぼかし有効/無効をHTML属性に反映（独立制御）
      if (backgroundBlurEnabled === false) {
        root.setAttribute("data-image-background-blur", "disabled");
      } else {
        root.setAttribute("data-image-background-blur", "enabled");
      }
      // body要素の背景をクリア
      body.style.setProperty("background", "transparent", "important");
    } else if (backgroundImage && backgroundImage.trim() !== "") {
      // 動画もキャラクター背景もない場合、外観設定の画像背景を適用
      setVideoBackgroundUrl(''); // 動画背景をクリア
      // キャラクター背景がない場合、外観設定のURL背景をデフォルトとして適用
      // backgroundTypeに関わらず、backgroundImageにURLが設定されていれば優先表示
      root.style.setProperty(
        "--background",
        `url(${backgroundImage})`
      );
      root.style.setProperty(
        "--background-blur",
        `${backgroundBlur}px`
      );
      root.style.setProperty(
        "--background-opacity",
        `${backgroundOpacity}`
      );
      root.setAttribute("data-background-type", "image");
      // 🖼️ 画像背景のぼかし有効/無効をHTML属性に反映（独立制御）
      if (backgroundBlurEnabled === false) {
        root.setAttribute("data-image-background-blur", "disabled");
      } else {
        root.setAttribute("data-image-background-blur", "enabled");
      }
      // body要素の背景をクリア
      body.style.setProperty("background", "transparent", "important");
    } else if (backgroundType === "color") {
      setVideoBackgroundUrl(''); // 動画背景をクリア
      root.style.setProperty(
        "--background",
        appearanceSettings.backgroundColor || ''
      );
      root.setAttribute("data-background-type", "solid");
      if (backgroundBlurEnabled === false) {
        root.setAttribute("data-background-blur", "disabled");
      } else {
        root.setAttribute("data-background-blur", "enabled");
      }
      body.style.setProperty("background", "transparent", "important");
    } else if (backgroundType === "gradient") {
      setVideoBackgroundUrl(''); // 動画背景をクリア
      root.style.setProperty(
        "--background",
        backgroundGradient
      );
      root.setAttribute("data-background-type", "gradient");
      if (backgroundBlurEnabled === false) {
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

    // 🔧 FIX: data-background-type は背景優先度ロジック内で設定済み（169-240行目）
    // ここでの再設定は不要（上書きしてしまうため削除）
    // 🔧 FIX: currentCharacterを依存配列から削除（selectedCharacterIdで十分）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    appearanceSettings,
    effectSettings,
    selectedCharacterId,
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
          background-image: var(--background) !important;
          background-position: center !important;
          background-repeat: no-repeat !important;
          background-size: cover !important;
          opacity: calc(var(--background-opacity) / 100);
          z-index: -1;
          pointer-events: none;
        }

        /* 🖼️ 画像背景のぼかし効果の適用（独立制御） */
        html[data-image-background-blur="enabled"][data-background-type="image"]::before,
        html[data-image-background-blur="enabled"][data-background-type="character-image"]::before {
          filter: blur(var(--background-blur));
        }

        /* 🖼️ 画像背景のぼかし効果の無効化（独立制御） */
        html[data-image-background-blur="disabled"][data-background-type="image"]::before,
        html[data-image-background-blur="disabled"][data-background-type="character-image"]::before {
          filter: none;
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

  // 💬 吹き出しぼかし効果のHTML属性制御（独立制御）
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const root = document.documentElement;

      // effectSettings.bubbleBlurの値に基づいて属性を設定
      if (effectSettings.bubbleBlur) {
        root.setAttribute("data-bubble-blur", "enabled");
      } else {
        root.setAttribute("data-bubble-blur", "disabled");
      }
    }
  }, [effectSettings.bubbleBlur]);

  return (
    <>
      {/* 🎬 動画背景レンダリング */}
      {videoBackgroundUrl && (
        <video
          key={videoBackgroundUrl} // URLが変わったら再マウント
          autoPlay={videoSettings.autoplay}
          loop={videoSettings.loop}
          muted={videoSettings.muted}
          playsInline
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            objectFit: 'cover',
            zIndex: -1,
            opacity: videoSettings.opacity / 100,
            pointerEvents: 'none',
          }}
          onLoadedMetadata={(e) => {
            const video = e.currentTarget;
            video.playbackRate = videoSettings.playbackRate;
            console.log('🎬 [AppearanceProvider] Video loaded and playing:', {
              url: videoBackgroundUrl,
              duration: video.duration,
              playbackRate: video.playbackRate,
            });
          }}
          onError={(e) => {
            console.error('🎬 [AppearanceProvider] Video loading error:', {
              url: videoBackgroundUrl,
              error: e.currentTarget.error,
            });
          }}
        >
          <source src={videoBackgroundUrl} type="video/mp4" />
          <source src={videoBackgroundUrl} type="video/webm" />
          Your browser does not support the video tag.
        </video>
      )}
      {children}
    </>
  );
};
