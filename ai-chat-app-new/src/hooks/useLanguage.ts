import { useAppStore } from '@/store';
import { useMemo } from 'react';

export const useLanguage = () => {
  const { languageSettings } = useAppStore();
  
  const formatters = useMemo(() => {
    const locale = languageSettings?.language === 'ja' ? 'ja-JP' :
                  languageSettings?.language === 'zh' ? 'zh-CN' :
                  languageSettings?.language === 'ko' ? 'ko-KR' : 'en-US';
    
    const timezone = languageSettings?.timezone || 'Asia/Tokyo';
    const timeFormat = languageSettings?.timeFormat || '24';
    
    return {
      // 時刻フォーマット
      formatTime: (date: Date | string) => {
        const dateObj = new Date(date);
        return dateObj.toLocaleTimeString(locale, {
          hour: '2-digit',
          minute: '2-digit',
          hour12: timeFormat === '12',
          timeZone: timezone,
        });
      },
      
      // 日付フォーマット
      formatDate: (date: Date | string) => {
        const dateObj = new Date(date);
        return dateObj.toLocaleDateString(locale, {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          timeZone: timezone,
        });
      },
      
      // 日付時刻フォーマット
      formatDateTime: (date: Date | string) => {
        const dateObj = new Date(date);
        return dateObj.toLocaleString(locale, {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: timeFormat === '12',
          timeZone: timezone,
        });
      },
      
      // 相対時間フォーマット（～前）
      formatRelativeTime: (date: Date | string) => {
        const dateObj = new Date(date);
        const now = new Date();
        const diffMs = now.getTime() - dateObj.getTime();
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (languageSettings?.language === 'ja') {
          if (diffMinutes < 1) return 'たった今';
          if (diffMinutes < 60) return `${diffMinutes}分前`;
          if (diffHours < 24) return `${diffHours}時間前`;
          if (diffDays < 30) return `${diffDays}日前`;
          return formatters.formatDate(date);
        } else {
          if (diffMinutes < 1) return 'Just now';
          if (diffMinutes < 60) return `${diffMinutes}m ago`;
          if (diffHours < 24) return `${diffHours}h ago`;
          if (diffDays < 30) return `${diffDays}d ago`;
          return formatters.formatDate(date);
        }
      },
      
      // 数値フォーマット
      formatNumber: (num: number) => {
        return num.toLocaleString(locale);
      },
      
      // 通貨フォーマット
      formatCurrency: (amount: number) => {
        const currency = languageSettings?.currency || 'JPY';
        return new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: currency,
        }).format(amount);
      },
      
      // 現在のロケール情報
      locale,
      timezone,
      timeFormat,
      language: languageSettings?.language || 'ja',
    };
  }, [languageSettings]);
  
  return formatters;
};

// 言語設定によるテキスト取得
export const useTranslation = () => {
  const { languageSettings } = useAppStore();
  
  const t = (translations: Record<string, string>) => {
    const lang = languageSettings?.language || 'ja';
    return translations[lang] || translations['ja'] || translations['en'] || Object.values(translations)[0];
  };
  
  return { t, currentLanguage: languageSettings?.language || 'ja' };
};

// 共通の翻訳テキスト
export const commonTexts = {
  // 時間関連
  justNow: { ja: 'たった今', en: 'Just now', zh: '刚刚', ko: '방금' },
  minutesAgo: { ja: '分前', en: 'minutes ago', zh: '分钟前', ko: '분 전' },
  hoursAgo: { ja: '時間前', en: 'hours ago', zh: '小时前', ko: '시간 전' },
  daysAgo: { ja: '日前', en: 'days ago', zh: '天前', ko: '일 전' },
  
  // UI要素
  save: { ja: '保存', en: 'Save', zh: '保存', ko: '저장' },
  cancel: { ja: 'キャンセル', en: 'Cancel', zh: '取消', ko: '취소' },
  close: { ja: '閉じる', en: 'Close', zh: '关闭', ko: '닫기' },
  settings: { ja: '設定', en: 'Settings', zh: '设置', ko: '설정' },
  
  // チャット関連
  thinking: { ja: 'AIが考え中...', en: 'AI is thinking...', zh: 'AI思考中...', ko: 'AI가 생각중...' },
  typing: { ja: '入力中...', en: 'Typing...', zh: '输入中...', ko: '입력중...' },
  
  // メッセージ
  messageCount: { 
    ja: (count: number) => `${count}件のメッセージ`,
    en: (count: number) => `${count} messages`,
    zh: (count: number) => `${count}条消息`,
    ko: (count: number) => `${count}개 메시지`
  },
};