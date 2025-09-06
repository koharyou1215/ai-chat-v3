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
        parts.push(renderInlineMarkdown(beforeText, parts.length));
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
      parts.push(renderInlineMarkdown(remainingText, parts.length));
    }

    return parts;
  };

  const renderInlineMarkdown = (text: string, keyPrefix: number): React.ReactNode => {
    // Handle inline code first
    let result: React.ReactNode = text;
    
    // Inline code: `code`
    result = processInlinePattern(
      result as string,
      /`([^`]+)`/g,
      (match, index) => (
        <code key={`inline-code-${keyPrefix}-${index}`} className="bg-slate-700/50 px-1 py-0.5 rounded text-sm text-cyan-300">
          {match[1]}
        </code>
      )
    );

    // Bold: **text** or __text__
    result = processInlinePattern(
      result as string,
      /\*\*([^*]+)\*\*|__([^_]+)__/g,
      (match, index) => (
        <strong key={`bold-${keyPrefix}-${index}`} className="font-bold text-white">
          {match[1] || match[2]}
        </strong>
      )
    );

    // Italic: *text* or _text_
    result = processInlinePattern(
      result as string,
      /\*([^*]+)\*|_([^_]+)_/g,
      (match, index) => (
        <em key={`italic-${keyPrefix}-${index}`} className="italic text-white/90">
          {match[1] || match[2]}
        </em>
      )
    );

    // Links: [text](url)
    result = processInlinePattern(
      result as string,
      /\[([^\]]+)\]\(([^)]+)\)/g,
      (match, index) => (
        <a
          key={`link-${keyPrefix}-${index}`}
          href={match[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-300 hover:text-blue-200 underline underline-offset-2"
        >
          {match[1]}
        </a>
      )
    );

    // Auto-detect URLs not in markdown format
    result = processInlinePattern(
      result as string,
      /(https?:\/\/[^\s]+)/g,
      (match, index) => (
        <a
          key={`auto-link-${keyPrefix}-${index}`}
          href={match[1]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-300 hover:text-blue-200 underline underline-offset-2"
        >
          {match[1]}
        </a>
      )
    );

    return result;
  };

  const processInlinePattern = (
    text: string,
    regex: RegExp,
    replacer: (match: RegExpExecArray, index: number) => React.ReactNode
  ): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;
    let index = 0;
    let keyIndex = 0;

    while ((match = regex.exec(text)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        parts.push(<React.Fragment key={`text-${keyIndex++}`}>{text.slice(lastIndex, match.index)}</React.Fragment>);
      }

      // Add replacement with key
      parts.push(<React.Fragment key={`match-${keyIndex++}`}>{replacer(match, index++)}</React.Fragment>);

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(<React.Fragment key={`text-${keyIndex++}`}>{text.slice(lastIndex)}</React.Fragment>);
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