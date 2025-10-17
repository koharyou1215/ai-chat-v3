"use client";

import React, { useState, useMemo, Suspense, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Image as ImageIcon,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMessageEffects } from "@/hooks/useMessageEffects";

// Lazy import for heavy markdown processing
const MarkdownRenderer = React.lazy(() =>
  import("./MarkdownRenderer")
    .then((module) => ({ default: module.MarkdownRenderer }))
    .catch(() => ({
      default: ({ content }: { content: string }) => <div>{content}</div>,
    }))
);

// Simple loading fallback for markdown
const MarkdownLoadingFallback: React.FC<{ content: string }> = ({
  content,
}) => (
  <div className="text-white/90 whitespace-pre-wrap break-words leading-relaxed">
    {content.slice(0, 200)}
    {content.length > 200 ? "..." : ""}
  </div>
);

interface RichMessageProps {
  content: string;
  role: "user" | "assistant";
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
  isLatest?: boolean;
}

export const RichMessage: React.FC<RichMessageProps> = React.memo(
  ({
    content,
    role,
    isExpanded = false,
    onToggleExpanded,
    isLatest = false,
  }) => {
    const [showPreview, setShowPreview] = useState(false);
    const [displayedContent, setDisplayedContent] = useState(content);
    const [isTyping, setIsTyping] = useState(false);
    const { isEffectEnabled, settings: effectSettings } = useMessageEffects();

    // タイプライター効果（最新メッセージのみ）
    useEffect(() => {
      if (!isEffectEnabled("typewriter") || role === "user" || !isLatest) {
        setDisplayedContent(content);
        setIsTyping(false);
        return;
      }

      const speed = Math.max(10, 100 - effectSettings.typewriterIntensity);
      setIsTyping(true);
      setDisplayedContent("");

      const typeText = async () => {
        const characters = content.split("");
        let currentText = "";

        for (let i = 0; i < characters.length; i++) {
          currentText += characters[i];
          setDisplayedContent(currentText);
          await new Promise((resolve) => setTimeout(resolve, speed));
        }
        setIsTyping(false);
      };

      typeText();
    }, [
      content,
      isEffectEnabled,
      effectSettings.typewriterIntensity,
      role,
      isLatest,
    ]);

    // Performance optimization: Detect content types early
    const contentAnalysis = useMemo(() => {
      const hasMarkdown = /[*_`#\[\]]/g.test(content);
      const hasUrls = /https?:\/\/[^\s]+/g.test(content);
      const hasImages = /\.(jpg|jpeg|png|gif|webp)(\?[^\s]*)?$/i.test(content);
      const hasCode = /```[\s\S]*?```|`[^`]+`/g.test(content);
      const isLong = content.length > 500;
      // Data URL画像の検出（SD API生成画像用）
      const hasDataUrlImage = /!\[.*?\]\(data:image\/[^)]+\)/g.test(content);
      const hasGeneratedImage =
        hasDataUrlImage || /!\[Generated Image\]/i.test(content);

      return {
        hasMarkdown,
        hasUrls,
        hasImages,
        hasCode,
        isLong,
        hasGeneratedImage,
        hasDataUrlImage,
        // 🔧 FIX: 感情エフェクトのHTML表示を優先するため、MarkdownRendererの使用を最小限に
        // コードブロックと画像のみMarkdownRendererを使用、それ以外はdangerouslySetInnerHTMLで表示
        shouldUseMarkdown: hasCode || hasGeneratedImage,
      };
    }, [content]);

    // Extract URLs for link previews
    const urls = useMemo(() => {
      const urlRegex = /https?:\/\/[^\s]+/g;
      return content.match(urlRegex) || [];
    }, [content]);

    // Extract image URLs and Data URLs
    const imageUrls = useMemo(() => {
      const normalImages = urls.filter((url) =>
        /\.(jpg|jpeg|png|gif|webp)(\?[^\s]*)?$/i.test(url)
      );

      // Data URL画像を抽出
      const dataUrlMatch = content.match(/!\[.*?\]\((data:image\/[^)]+)\)/g);
      const dataUrls: string[] = [];
      if (dataUrlMatch) {
        dataUrlMatch.forEach((match) => {
          const urlMatch = match.match(/!\[.*?\]\((data:image\/[^)]+)\)/);
          if (urlMatch && urlMatch[1]) {
            dataUrls.push(urlMatch[1]);
          }
        });
      }

      return [...normalImages, ...dataUrls];
    }, [urls, content]);

    // Truncate content for performance if too long
    const displayContent = useMemo(() => {
      const baseContent =
        isEffectEnabled("typewriter") && role !== "user"
          ? displayedContent
          : content;
      if (!isExpanded && contentAnalysis.isLong) {
        return baseContent.slice(0, 500) + "...";
      }
      return baseContent;
    }, [
      content,
      displayedContent,
      isExpanded,
      contentAnalysis.isLong,
      isEffectEnabled,
      role,
    ]);

    // 括弧内テキストの検出とエフェクト適用、重要な単語にグラデーション適用
    const processedContent = useMemo(() => {
      if (!displayContent) return displayContent;

      let processed = displayContent;

      // フォントエフェクトが有効な場合のみ感情色付けを適用
      if (isEffectEnabled("font") && effectSettings.fontEffectsIntensity > 0) {
        // 「」内のテキストを検出して特別なエフェクトを適用
        processed = processed.replace(/「([^」]+)」/g, (match, text) => {
          // 感情に応じたエフェクトを決定
          let effectClass = "";
          let effectStyle = "";

          // ポジティブな感情
          if (
            /愛|好き|うれしい|楽しい|幸せ|最高|素晴らしい|ありがとう|嬉しい|ドキドキ|ワクワク|キラキラ/.test(
              text
            )
          ) {
            effectClass = "positive-emotion";
            effectStyle =
              "color: #ff6b9d; text-shadow: 0 0 10px rgba(255, 107, 157, 0.6); font-weight: bold;";
          }
          // ネガティブな感情
          else if (
            /悲しい|寂しい|つらい|苦しい|嫌い|最悪|うざい|むかつく|怒り|泣き/.test(
              text
            )
          ) {
            effectClass = "negative-emotion";
            effectStyle =
              "color: #4a90e2; text-shadow: 0 0 10px rgba(74, 144, 226, 0.6); font-weight: bold;";
          }
          // 驚き・興奮
          else if (
            /えっ|まさか|すごい|びっくり|驚き|興奮|ドキドキ|ハラハラ/.test(text)
          ) {
            effectClass = "surprise-emotion";
            effectStyle =
              "color: #f39c12; text-shadow: 0 0 10px rgba(243, 156, 18, 0.6); font-weight: bold; animation: pulse 1s infinite;";
          }
          // 疑問・困惑
          else if (
            /？|\?|なんで|なぜ|どうして|どう|何|どれ|いつ|どこ|誰/.test(text)
          ) {
            effectClass = "question-emotion";
            effectStyle =
              "color: #9b59b6; text-shadow: 0 0 10px rgba(155, 89, 182, 0.6); font-style: italic;";
          }
          // その他の感情表現
          else if (/！|!|〜|ー|…|\.\.\./.test(text)) {
            effectClass = "general-emotion";
            effectStyle =
              "color: #e74c3c; text-shadow: 0 0 8px rgba(231, 76, 60, 0.5); font-weight: bold;";
          }
          // デフォルト（感情が検出されない場合）
          else {
            effectClass = "default-emotion";
            effectStyle =
              "color: #e8e8e8; text-shadow: 0 0 5px rgba(232, 232, 232, 0.4);";
          }

          return `<span class="${effectClass}" style="${effectStyle}">「${text}」</span>`;
        });
      }

      // フォントエフェクトが有効な場合、特定の重要な単語だけにグラデーションを適用
      if (isEffectEnabled("font") && effectSettings.fontEffectsIntensity > 30) {
        // 重要な感情表現や強調語にだけグラデーションを適用
        const importantWords =
          /(愛してる|大好き|最高|素晴らしい|完璧|美しい|キラキラ|ドキドキ|ワクワク|！|♡|♥|★|☆)/g;
        processed = processed.replace(importantWords, (match) => {
          const gradientStyle = `background: linear-gradient(45deg, #ff6b6b, #4ecdc4, #45b7d1, #96ceb4, #feca57, #ff9ff3); 
            background-clip: text; 
            -webkit-background-clip: text; 
            color: transparent; 
            font-weight: bold; 
            text-shadow: none;`;
          return `<span style="${gradientStyle}">${match}</span>`;
        });
      }

      return processed;
    }, [displayContent, isEffectEnabled, effectSettings.fontEffectsIntensity]);

    // フォントエフェクトのスタイル計算（全体の装飾効果、グラデーションは除外）
    const fontEffectStyles = useMemo(() => {
      if (!isEffectEnabled("font")) return {};

      const intensity = effectSettings.fontEffectsIntensity;
      return {
        // グラデーションは個別の単語に適用するため、ここでは適用しない

        // アニメーション効果（全体に適用）
        animation:
          intensity > 70 ? "subtle-glow 4s ease-in-out infinite" : "none",

        // 微細なテキストシャドウ（全体の読みやすさ向上）
        textShadow:
          intensity > 40
            ? `0 1px 2px rgba(0,0,0,0.3), 0 0 8px rgba(255,255,255,0.1)`
            : "none",

        // 変形効果（高強度時のみ）
        transform:
          intensity > 80 ? "perspective(1000px) rotateX(2deg)" : "none",

        // フィルター効果（控えめに）
        filter:
          intensity > 60
            ? "drop-shadow(0 0 2px rgba(255,255,255,0.2)) brightness(1.05)"
            : "none",
      };
    }, [isEffectEnabled, effectSettings.fontEffectsIntensity]);

    const handleImageClick = (imageUrl: string) => {
      setShowPreview(true);
      // You could implement a proper image preview modal here
      window.open(imageUrl, "_blank");
    };

    return (
      <div className="space-y-1">
        {/* Main content */}
        <div className="text-white/90 leading-relaxed" style={fontEffectStyles}>
          {contentAnalysis.shouldUseMarkdown ? (
            <Suspense
              fallback={<MarkdownLoadingFallback content={processedContent} />}>
              <MarkdownRenderer content={processedContent} />
            </Suspense>
          ) : (
            <div
              className="whitespace-pre-wrap break-words"
              dangerouslySetInnerHTML={{ __html: processedContent }}
            />
          )}
          {isEffectEnabled("typewriter") && isTyping && (
            <span className="typewriter-cursor animate-pulse ml-1 text-purple-400">
              |
            </span>
          )}
        </div>

        {/* Expand/Collapse button for long content */}
        {contentAnalysis.isLong && onToggleExpanded && (
          <button
            onClick={onToggleExpanded}
            className="flex items-center gap-1 text-xs text-white/50 hover:text-white/70 transition-colors">
            {isExpanded ? (
              <>
                <ChevronUp className="w-3 h-3" />
                折りたたむ
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3" />
                続きを読む
              </>
            )}
          </button>
        )}

        {/* Image previews (lazy loaded) */}
        {imageUrls.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {imageUrls.slice(0, 4).map((imageUrl, index) => (
              <div
                key={index}
                className="relative group cursor-pointer"
                onClick={() => handleImageClick(imageUrl)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt={`Image ${index + 1}`}
                  className="w-20 h-20 object-cover rounded-lg border border-white/10 hover:border-white/30 transition-colors"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-white" />
                </div>
              </div>
            ))}
            {imageUrls.length > 4 && (
              <div className="w-20 h-20 rounded-lg border border-white/10 flex items-center justify-center text-white/50 text-xs">
                +{imageUrls.length - 4}
              </div>
            )}
          </div>
        )}

        {/* URL previews (non-image links) */}
        {urls.filter((url) => !imageUrls.includes(url)).length > 0 && (
          <div className="space-y-1 mt-2">
            {urls
              .filter((url) => !imageUrls.includes(url))
              .slice(0, 3)
              .map((url, index) => (
                <a
                  key={index}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-blue-300 hover:text-blue-200 transition-colors bg-blue-900/20 rounded px-2 py-1 border border-blue-400/20">
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate max-w-48">
                    {url.replace(/^https?:\/\//, "")}
                  </span>
                </a>
              ))}
          </div>
        )}

        {/* Video detection and preview */}
        {urls.some((url) => /\.(mp4|webm|ogg)(\?[^\s]*)?$/i.test(url)) && (
          <div className="mt-2">
            {urls
              .filter((url) => /\.(mp4|webm|ogg)(\?[^\s]*)?$/i.test(url))
              .slice(0, 2)
              .map((videoUrl, index) => (
                <div key={index} className="relative group">
                  <video
                    src={videoUrl}
                    className="w-full max-w-sm rounded-lg border border-white/10"
                    controls
                    preload="metadata">
                    <source src={videoUrl} />
                    お使いのブラウザは動画の再生に対応していません。
                  </video>
                  <div className="absolute top-2 right-2 bg-black/50 rounded px-2 py-1 text-xs text-white">
                    <Play className="w-3 h-3 inline mr-1" />
                    動画
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    );
  }
);

RichMessage.displayName = "RichMessage";
