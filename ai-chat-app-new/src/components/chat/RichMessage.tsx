'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffectSettings } from '@/contexts/EffectSettingsContext';

interface RichMessageProps {
  content: string;
  role: 'user' | 'assistant';
  characterColor?: string;
  enableEffects?: boolean;
  typingSpeed?: number;
}

export const RichMessage: React.FC<RichMessageProps> = ({
  content,
  role,
  characterColor = '#8b5cf6',
  enableEffects = true,
  typingSpeed = 30
}) => {
  const { settings } = useEffectSettings();
  const [displayedContent, setDisplayedContent] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const messageRef = useRef<HTMLDivElement>(null);

  // ハートエフェクトの生成 - メモリリーク防止
  const createHeartEffect = React.useCallback(() => {
    if (!settings.particleEffects) return;
    
    const newParticle = {
      id: Date.now() + Math.random(),
      x: Math.random() * 100 - 50,
      y: Math.random() * 20
    };
    
    setParticles(prev => [...prev, newParticle]);
    
    // タイマーをクリーンアップ
    const timeoutId = setTimeout(() => {
      setParticles(prev => prev.filter(p => p.id !== newParticle.id));
    }, 2000);
    
    // コンポーネントがアンマウントされた場合にクリーンアップ
    return () => clearTimeout(timeoutId);
  }, [settings.particleEffects]);

  // タイプライター効果
  useEffect(() => {
    if (!enableEffects || !settings.typewriterEffect || typingSpeed === 0) {
      setDisplayedContent(content);
      setIsTyping(false);
      return;
    }

    // 初期状態で既にコンテンツが表示されている場合は、タイプライター効果をスキップ
    if (displayedContent === content) {
      setIsTyping(false);
      return;
    }

    let index = 0;
    const timer = setInterval(() => {
      if (index <= content.length) {
        setDisplayedContent(content.slice(0, index));
        
        // 特定の文字でエフェクトを発生
        if (settings.particleEffects && (content[index] === '♥' || content[index] === '💕')) {
          createHeartEffect();
        }
        
        index++;
      } else {
        setIsTyping(false);
        clearInterval(timer);
      }
    }, typingSpeed / settings.animationSpeed);

    return () => clearInterval(timer);
  }, [content, enableEffects, typingSpeed, settings, createHeartEffect, displayedContent]);

  // コンテンツのパース（特殊フォーマットの検出）
  const parseContent = (text: string) => {
    if (!settings.fontEffects) {
      return <span>{text}</span>;
    }

    const elements: JSX.Element[] = [];
    
    // パターンマッチング
    const patterns = [
      // 「」内の強調
      { regex: /「([^」]+)」/g, style: 'quote' },
      // 『』内の特別強調
      { regex: /『([^』]+)』/g, style: 'special-quote' },
      // ※注釈
      { regex: /※([^※\n]+)/g, style: 'annotation' },
      // ...省略記法
      { regex: /\.{3,}/g, style: 'ellipsis' },
      // 感情表現（！や？の連続）
      { regex: /[！!？?]{2,}/g, style: 'emotion' },
      // カスタムタグ [color:text]
      { regex: /\[(\w+):([^\]]+)\]/g, style: 'custom' }
    ];

    let lastIndex = 0;
    const matches: Array<{ start: number; end: number; text: string; style: string; fullMatch: string }> = [];

    // すべてのマッチを収集
    patterns.forEach(({ regex, style }) => {
      let match;
      while ((match = regex.exec(text)) !== null) {
        matches.push({
          start: match.index,
          end: match.index + match[0].length,
          text: match[1] || match[0],
          style,
          fullMatch: match[0]
        });
      }
    });

    // マッチを位置でソート
    matches.sort((a, b) => a.start - b.start);

    // JSX要素を構築
    matches.forEach((match, index) => {
      // マッチ前のテキスト
      if (lastIndex < match.start) {
        elements.push(
          <span key={`text-${index}`}>
            {text.slice(lastIndex, match.start)}
          </span>
        );
      }

      // マッチした部分をスタイル付きで追加
      elements.push(
        <StyledText
          key={`styled-${index}`}
          text={match.text}
          style={match.style}
          color={characterColor}
        />
      );

      lastIndex = match.end;
    });

    // 残りのテキスト
    if (lastIndex < text.length) {
      elements.push(
        <span key="text-final">{text.slice(lastIndex)}</span>
      );
    }

    return elements.length > 0 ? elements : <span>{text}</span>;
  };

  // 感情に基づく色の決定
  const getEmotionColor = (content: string) => {
    if (!settings.emotionBasedStyling) return characterColor;

    const emotionMap: Record<string, string> = {
      'love': '#ff69b4',
      'joy': '#ffd700',
      'excited': '#ff4500',
      'sad': '#4169e1',
      'angry': '#dc143c',
      'mysterious': '#800080'
    };

    // 感情キーワードを検出
    const emotions = {
      love: ['愛', '好き', '大切', '💕', '❤️'],
      joy: ['嬉しい', '楽しい', 'わーい', '😊', '😄'],
      excited: ['すごい', '最高', '！！', 'わお'],
      sad: ['悲しい', '辛い', '😢', '涙'],
      angry: ['怒', '腹立', '💢', '😠'],
      mysterious: ['...', '謎', '秘密']
    };

    for (const [emotion, keywords] of Object.entries(emotions)) {
      if (keywords.some(keyword => content.includes(keyword))) {
        return emotionMap[emotion];
      }
    }

    return characterColor;
  };

  const currentColor = getEmotionColor(content);

  return (
    <div className="relative">
      {/* メッセージバブル */}
      <div
        ref={messageRef}
        className={cn(
          'relative px-4 py-3 rounded-2xl max-w-lg transition-all duration-300',
          settings.colorfulBubbles ? 
            'backdrop-blur-sm' : 
            'bg-gray-800',
          role === 'assistant' ? 
            (settings.colorfulBubbles ? 
              'bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-400/30' :
              'bg-gray-700') :
            (settings.colorfulBubbles ? 
              'bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-400/30' :
              'bg-gray-600')
        )}
        style={{
          boxShadow: settings.colorfulBubbles ? `0 0 20px ${currentColor}20` : 'none',
        }}
      >
        {/* タイピングインジケーター */}
        {isTyping && settings.typewriterEffect && (
          <motion.span
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1 / settings.animationSpeed, repeat: Infinity }}
            className="absolute -right-2 -bottom-2"
          >
            ✨
          </motion.span>
        )}

        {/* メッセージ内容 */}
        <div className="relative z-10 text-white">
          {parseContent(displayedContent)}
        </div>

        {/* パーティクルエフェクト */}
        <AnimatePresence>
          {particles.map(particle => (
            <motion.div
              key={particle.id}
              initial={{ 
                x: 0, 
                y: 0, 
                scale: 0,
                opacity: 1 
              }}
              animate={{ 
                x: particle.x,
                y: particle.y - 50,
                scale: [0, 1.5, 0.5],
                opacity: 0
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2 / settings.animationSpeed, ease: 'easeOut' }}
              className="absolute top-1/2 left-1/2 pointer-events-none"
              style={{ zIndex: 100 }}
            >
              <Heart className="w-4 h-4 text-pink-400 fill-pink-400" />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

// スタイル付きテキストコンポーネント
const StyledText: React.FC<{
  text: string;
  style: string;
  color: string;
}> = ({ text, style }) => {
  const getStyleClass = () => {
    switch (style) {
      case 'quote':
        return 'text-yellow-300 font-bold px-1 bg-yellow-500/20 rounded';
      case 'special-quote':
        return 'text-cyan-300 font-bold text-lg px-1 animate-pulse bg-cyan-500/20 rounded';
      case 'annotation':
        return 'text-gray-400 text-sm italic';
      case 'ellipsis':
        return 'text-gray-500 tracking-widest';
      case 'emotion':
        return 'text-red-400 font-bold text-xl animate-bounce';
      case 'custom':
        return 'font-bold';
      default:
        return '';
    }
  };

  if (style === 'custom') {
    // カスタムカラーの処理
    const colorMap: Record<string, string> = {
      red: '#ef4444',
      blue: '#3b82f6',
      green: '#10b981',
      yellow: '#eab308',
      purple: '#8b5cf6',
      pink: '#ec4899',
      orange: '#f97316',
      cyan: '#06b6d4',
      emerald: '#059669',
      lime: '#65a30d',
      indigo: '#4f46e5'
    };
    
    const parts = text.split(':');
    if (parts.length === 2) {
      const [colorName, content] = parts;
      return (
        <span 
          style={{ color: colorMap[colorName] || colorName }}
          className="font-bold"
        >
          {content}
        </span>
      );
    }
  }

  return <span className={getStyleClass()}>{text}</span>;
};

export default RichMessage;