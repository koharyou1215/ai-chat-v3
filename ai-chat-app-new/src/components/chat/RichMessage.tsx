'use client';

import React, { useState, useMemo, Suspense, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, ExternalLink, Image as ImageIcon, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store';

// Lazy import for heavy markdown processing
const MarkdownRenderer = React.lazy(() => 
  import('./MarkdownRenderer').then(module => ({ default: module.MarkdownRenderer }))
    .catch(() => ({ default: ({ content }: { content: string }) => <div>{content}</div> }))
);

// Simple loading fallback for markdown
const MarkdownLoadingFallback: React.FC<{ content: string }> = ({ content }) => (
  <div className="text-white/90 whitespace-pre-wrap break-words leading-relaxed">
    {content.slice(0, 200)}{content.length > 200 ? '...' : ''}
  </div>
);

interface RichMessageProps {
  content: string;
  role: 'user' | 'assistant';
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
  isLatest?: boolean;
}

export const RichMessage: React.FC<RichMessageProps> = React.memo(({
  content,
  role,
  isExpanded = false,
  onToggleExpanded,
  isLatest = false
}) => {
  const [showPreview, setShowPreview] = useState(false);
  const [typewriterText, setTypewriterText] = useState('');
  const [typewriterComplete, setTypewriterComplete] = useState(false);
  const [hasStartedTyping, setHasStartedTyping] = useState(false);
  const effectSettings = useAppStore(state => state.effectSettings);
  
  // タイプライターエフェクト（改善版）
  useEffect(() => {
    if (!effectSettings.typewriterEffect || role !== 'assistant' || !isLatest) {
      setTypewriterText(content);
      setTypewriterComplete(true);
      return;
    }
    
    // 新しいメッセージが来た時のみタイプライター開始
    if (content && !hasStartedTyping) {
      setHasStartedTyping(true);
      setTypewriterText('');
      setTypewriterComplete(false);
      
      let currentIndex = 0;
      const speed = Math.max(5, 50 - (effectSettings.typewriterIntensity || 70) * 0.4); // より滑らかな速度調整
      
      const interval = setInterval(() => {
        if (currentIndex < content.length) {
          // 複数文字ずつ表示してより滑らかに
          const step = Math.min(3, content.length - currentIndex);
          setTypewriterText(content.substring(0, currentIndex + step));
          currentIndex += step;
        } else {
          setTypewriterComplete(true);
          clearInterval(interval);
        }
      }, speed);
      
      return () => clearInterval(interval);
    } else if (hasStartedTyping && content.length > typewriterText.length) {
      // コンテンツが追加された場合
      const remainingContent = content.substring(typewriterText.length);
      let currentIndex = 0;
      const speed = Math.max(5, 50 - (effectSettings.typewriterIntensity || 70) * 0.4);
      
      const interval = setInterval(() => {
        if (currentIndex < remainingContent.length) {
          const step = Math.min(3, remainingContent.length - currentIndex);
          setTypewriterText(typewriterText + remainingContent.substring(0, currentIndex + step));
          currentIndex += step;
        } else {
          setTypewriterComplete(true);
          clearInterval(interval);
        }
      }, speed);
      
      return () => clearInterval(interval);
    }
  }, [content, effectSettings.typewriterEffect, effectSettings.typewriterIntensity, role, isLatest, hasStartedTyping, typewriterText]);

  // Performance optimization: Detect content types early
  const contentAnalysis = useMemo(() => {
    const hasMarkdown = /[*_`#\[\]]/g.test(content);
    const hasUrls = /https?:\/\/[^\s]+/g.test(content);
    const hasImages = /\.(jpg|jpeg|png|gif|webp)(\?[^\s]*)?$/i.test(content);
    const hasCode = /```[\s\S]*?```|`[^`]+`/g.test(content);
    const isLong = content.length > 500;
    
    return {
      hasMarkdown,
      hasUrls,
      hasImages,
      hasCode,
      isLong,
      shouldUseMarkdown: hasMarkdown || hasCode || hasUrls
    };
  }, [content]);

  // Extract URLs for link previews
  const urls = useMemo(() => {
    const urlRegex = /https?:\/\/[^\s]+/g;
    return content.match(urlRegex) || [];
  }, [content]);

  // Extract image URLs
  const imageUrls = useMemo(() => {
    return urls.filter(url => 
      /\.(jpg|jpeg|png|gif|webp)(\?[^\s]*)?$/i.test(url)
    );
  }, [urls]);

  // Truncate content for performance if too long
  const displayContent = useMemo(() => {
    const baseContent = effectSettings.typewriterEffect && role === 'assistant' && isLatest && !typewriterComplete
      ? typewriterText
      : content;
    
    if (!isExpanded && contentAnalysis.isLong) {
      return baseContent.slice(0, 500) + '...';
    }
    return baseContent;
  }, [content, typewriterText, isExpanded, contentAnalysis.isLong, effectSettings.typewriterEffect, role, isLatest, typewriterComplete]);

  const handleImageClick = (imageUrl: string) => {
    setShowPreview(true);
    // You could implement a proper image preview modal here
    window.open(imageUrl, '_blank');
  };

  return (
    <div className="space-y-2">
      {/* Main content */}
      <div className="text-white/90 leading-relaxed">
        {contentAnalysis.shouldUseMarkdown ? (
          <Suspense fallback={<MarkdownLoadingFallback content={displayContent} />}>
            <MarkdownRenderer content={displayContent} />
          </Suspense>
        ) : (
          // typewriter 用に高さの変動を抑えるスタイルを付与
          <div className="whitespace-pre-wrap break-words">
            <div style={{ minHeight: '3rem' }} className="inline-block align-top">
              {displayContent}
              {effectSettings.typewriterEffect && role === 'assistant' && isLatest && !typewriterComplete && (
                <span className="inline-block w-2 h-5 ml-1 bg-white/70 animate-pulse" />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Expand/Collapse button for long content */}
      {contentAnalysis.isLong && onToggleExpanded && (
        <button
          onClick={onToggleExpanded}
          className="flex items-center gap-1 text-xs text-white/50 hover:text-white/70 transition-colors"
        >
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
              onClick={() => handleImageClick(imageUrl)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={`Image ${index + 1}`}
                className="w-20 h-20 object-cover rounded-lg border border-white/10 hover:border-white/30 transition-colors"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
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
      {urls.filter(url => !imageUrls.includes(url)).length > 0 && (
        <div className="space-y-1 mt-2">
          {urls
            .filter(url => !imageUrls.includes(url))
            .slice(0, 3)
            .map((url, index) => (
              <a
                key={index}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-blue-300 hover:text-blue-200 transition-colors bg-blue-900/20 rounded px-2 py-1 border border-blue-400/20"
              >
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
                <span className="truncate max-w-48">
                  {url.replace(/^https?:\/\//, '')}
                </span>
              </a>
            ))}
        </div>
      )}

      {/* Video detection and preview */}
      {urls.some(url => /\.(mp4|webm|ogg)(\?[^\s]*)?$/i.test(url)) && (
        <div className="mt-2">
          {urls
            .filter(url => /\.(mp4|webm|ogg)(\?[^\s]*)?$/i.test(url))
            .slice(0, 2)
            .map((videoUrl, index) => (
              <div key={index} className="relative group">
                <video
                  src={videoUrl}
                  className="w-full max-w-sm rounded-lg border border-white/10"
                  controls
                  preload="metadata"
                >
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
});

RichMessage.displayName = 'RichMessage';