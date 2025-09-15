'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
  content: string;
  fontEffects?: boolean;
  fontEffectsIntensity?: number;
  typewriterEffect?: boolean;
  typewriterIntensity?: number;
}

/**
 * Lightweight markdown renderer with visual effects
 */
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  fontEffects = false,
  fontEffectsIntensity = 50,
  typewriterEffect = false,
  typewriterIntensity = 70,
}) => {
  const [displayedContent, setDisplayedContent] = useState(typewriterEffect ? '' : content);
  const [currentIndex, setCurrentIndex] = useState(0);

  // タイプライターエフェクト
  useEffect(() => {
    if (!typewriterEffect) {
      setDisplayedContent(content);
      return;
    }

    if (currentIndex < content.length) {
      // スピード計算: intensityが高いほど速く（10-100ms）
      const speed = Math.max(10, 100 - typewriterIntensity);
      const timer = setTimeout(() => {
        setDisplayedContent(content.slice(0, currentIndex + 1));
        setCurrentIndex(currentIndex + 1);
      }, speed);
      return () => clearTimeout(timer);
    }
  }, [content, currentIndex, typewriterEffect, typewriterIntensity]);

  // コンテンツが変更されたらリセット
  useEffect(() => {
    if (typewriterEffect) {
      setDisplayedContent('');
      setCurrentIndex(0);
    } else {
      setDisplayedContent(content);
    }
  }, [content, typewriterEffect]);

  // フォントエフェクトのスタイル計算
  const getFontEffectStyle = () => {
    if (!fontEffects) return {};

    const intensity = fontEffectsIntensity / 100;
    return {
      textShadow: `
        0 0 ${5 * intensity}px rgba(255, 255, 255, ${0.5 * intensity}),
        0 0 ${10 * intensity}px rgba(255, 255, 255, ${0.3 * intensity}),
        0 0 ${20 * intensity}px rgba(100, 200, 255, ${0.2 * intensity})
      `,
      animation: intensity > 0.5 ? 'glow 2s ease-in-out infinite alternate' : 'none',
    };
  };

  // Convert basic markdown to JSX
  const renderMarkdown = (text: string): React.ReactNode => {
    // Split by code blocks first to handle them separately
    const codeBlockRegex = /```([\s\S]*?)```/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        const beforeText = text.slice(lastIndex, match.index);
        parts.push(
          <React.Fragment key={`text-${parts.length}`}>
            {renderInlineMarkdown(beforeText, parts.length)}
          </React.Fragment>
        );
      }

      // Add code block
      parts.push(
        <pre key={`code-${parts.length}`} className="bg-slate-900/70 border border-white/10 rounded-lg p-3 my-2 overflow-x-auto">
          <code className="text-green-300 text-sm">{match[1].trim()}</code>
        </pre>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      const remainingText = text.slice(lastIndex);
      parts.push(
        <React.Fragment key={`text-${parts.length}`}>
          {renderInlineMarkdown(remainingText, parts.length)}
        </React.Fragment>
      );
    }

    return parts;
  };

  const renderInlineMarkdown = (text: string, keyPrefix: number): React.ReactNode => {
    // Process all inline patterns in a single pass
    const patterns = [
      {
        regex: /`([^`]+)`/g,
        type: 'code'
      },
      {
        regex: /\*\*([^*]+)\*\*|__([^_]+)__/g,
        type: 'bold'
      },
      {
        regex: /\*([^*]+)\*|_([^_]+)_/g,
        type: 'italic'
      },
      {
        regex: /\[([^\]]+)\]\(([^)]+)\)/g,
        type: 'link'
      },
      {
        regex: /(https?:\/\/[^\s]+)/g,
        type: 'autolink'
      }
    ];

    const segments: Array<{ start: number; end: number; type: string; content: string; href?: string }> = [];

    // Find all matches
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.regex.exec(text)) !== null) {
        const content = match[1] || match[2] || match[0];
        const href = pattern.type === 'link' ? match[2] : undefined;

        segments.push({
          start: match.index,
          end: match.index + match[0].length,
          type: pattern.type,
          content,
          href
        });
      }
    }

    // Sort segments by start position
    segments.sort((a, b) => a.start - b.start);

    // Build the result
    const result: React.ReactNode[] = [];
    let lastEnd = 0;

    for (const segment of segments) {
      // Skip overlapping segments
      if (segment.start < lastEnd) continue;

      // Add plain text before this segment
      if (segment.start > lastEnd) {
        const plainText = text.slice(lastEnd, segment.start);
        const lines = plainText.split('\n');
        lines.forEach((line, index) => {
          if (index > 0) result.push(<br key={`br-${keyPrefix}-${result.length}`} />);
          if (line) result.push(line);
        });
      }

      // Add the formatted segment
      switch (segment.type) {
        case 'code':
          result.push(
            <code key={`code-${keyPrefix}-${result.length}`} className="px-1 py-0.5 bg-black/40 text-blue-300 rounded text-sm">
              {segment.content}
            </code>
          );
          break;
        case 'bold':
          result.push(
            <strong key={`bold-${keyPrefix}-${result.length}`} className="font-bold text-white">
              {segment.content}
            </strong>
          );
          break;
        case 'italic':
          result.push(
            <em key={`italic-${keyPrefix}-${result.length}`} className="italic">
              {segment.content}
            </em>
          );
          break;
        case 'link':
          result.push(
            <a
              key={`link-${keyPrefix}-${result.length}`}
              href={segment.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline decoration-blue-400/30 hover:decoration-blue-300/50 transition-colors"
            >
              {segment.content}
            </a>
          );
          break;
        case 'autolink':
          result.push(
            <a
              key={`autolink-${keyPrefix}-${result.length}`}
              href={segment.content}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline decoration-blue-400/30 hover:decoration-blue-300/50 transition-colors break-all"
            >
              {segment.content}
            </a>
          );
          break;
      }

      lastEnd = segment.end;
    }

    // Add remaining plain text
    if (lastEnd < text.length) {
      const remainingText = text.slice(lastEnd);
      const lines = remainingText.split('\n');
      lines.forEach((line, index) => {
        if (index > 0) result.push(<br key={`br-${keyPrefix}-${result.length}`} />);
        if (line) result.push(line);
      });
    }

    return result;
  };

  return (
    <>
      <style jsx>{`
        @keyframes glow {
          from {
            filter: brightness(1) contrast(1);
          }
          to {
            filter: brightness(1.1) contrast(1.1);
          }
        }
      `}</style>
      <div style={getFontEffectStyle()}>
        {renderMarkdown(displayedContent)}
      </div>
    </>
  );
};