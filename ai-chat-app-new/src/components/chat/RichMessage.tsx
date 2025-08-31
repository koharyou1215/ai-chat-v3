'use client';

import React, { useState, useMemo, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, ExternalLink, Image as ImageIcon, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

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
}

export const RichMessage: React.FC<RichMessageProps> = React.memo(({
  content,
  role,
  isExpanded = false,
  onToggleExpanded
}) => {
  const [showPreview, setShowPreview] = useState(false);

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
    if (!isExpanded && contentAnalysis.isLong) {
      return content.slice(0, 500) + '...';
    }
    return content;
  }, [content, isExpanded, contentAnalysis.isLong]);

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
          <div className="whitespace-pre-wrap break-words">
            {displayContent}
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