'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
  content: string;
}

/**
 * Lightweight markdown renderer optimized for performance
 * Supports basic markdown without heavy dependencies
 */
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
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

    // Collect all matches
    const matches: Array<{start: number, end: number, type: string, match: RegExpExecArray}> = [];
    
    for (const pattern of patterns) {
      const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
      let match;
      while ((match = regex.exec(text)) !== null) {
        matches.push({
          start: match.index,
          end: match.index + match[0].length,
          type: pattern.type,
          match: match
        });
      }
    }

    // Sort matches by position
    matches.sort((a, b) => a.start - b.start);

    // Build result
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let matchIndex = 0;

    for (const item of matches) {
      // Skip overlapping matches
      if (item.start < lastIndex) continue;

      // Add text before match
      if (item.start > lastIndex) {
        parts.push(text.slice(lastIndex, item.start));
      }

      // Add formatted match
      switch (item.type) {
        case 'code':
          parts.push(
            <code key={`inline-code-${keyPrefix}-${matchIndex++}`} className="bg-slate-700/50 px-1 py-0.5 rounded text-sm text-cyan-300">
              {item.match[1]}
            </code>
          );
          break;
        case 'bold':
          parts.push(
            <strong key={`bold-${keyPrefix}-${matchIndex++}`} className="font-bold text-white">
              {item.match[1] || item.match[2]}
            </strong>
          );
          break;
        case 'italic':
          parts.push(
            <em key={`italic-${keyPrefix}-${matchIndex++}`} className="italic text-white/90">
              {item.match[1] || item.match[2]}
            </em>
          );
          break;
        case 'link':
          parts.push(
            <a
              key={`link-${keyPrefix}-${matchIndex++}`}
              href={item.match[2]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-300 hover:text-blue-200 underline underline-offset-2"
            >
              {item.match[1]}
            </a>
          );
          break;
        case 'autolink':
          parts.push(
            <a
              key={`auto-link-${keyPrefix}-${matchIndex++}`}
              href={item.match[1]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-300 hover:text-blue-200 underline underline-offset-2"
            >
              {item.match[1]}
            </a>
          );
          break;
      }

      lastIndex = item.end;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts.length > 1 ? <>{parts}</> : text;
  };


  return (
    <div className="markdown-content leading-relaxed">
      {renderMarkdown(content)}
    </div>
  );
};

MarkdownRenderer.displayName = 'MarkdownRenderer';