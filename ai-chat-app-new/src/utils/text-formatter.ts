/**
 * テキスト整形ユーティリティ
 * チャットメッセージの可読性を向上させるためのテキスト処理機能
 */

export interface TextFormattingOptions {
  /** 段落間に空行を追加 */
  addParagraphBreaks?: boolean;
  /** 文の終わりで改行を追加 */
  addSentenceBreaks?: boolean;
  /** リストの前後に空行を追加 */
  addListBreaks?: boolean;
  /** 長すぎる段落を分割 */
  breakLongParagraphs?: boolean;
  /** 分割する段落の最大文字数 */
  maxParagraphLength?: number;
}

const DEFAULT_OPTIONS: TextFormattingOptions = {
  addParagraphBreaks: true,
  addSentenceBreaks: false,
  addListBreaks: true,
  breakLongParagraphs: true,
  maxParagraphLength: 200
};

/**
 * AIレスポンスのテキストを読みやすく整形
 */
export function formatAIResponse(text: string, options: TextFormattingOptions = {}): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let formatted = text.trim();

  // 1. 基本的な改行の正規化
  formatted = formatted.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 2. 段落の識別と整形
  if (opts.addParagraphBreaks) {
    // 連続する改行を統一
    formatted = formatted.replace(/\n{3,}/g, '\n\n');
    
    // ピリオド+スペース+大文字で始まる文を段落区切りとして認識
    formatted = formatted.replace(/\. ([A-Z])/g, '.\n\n$1');
    
    // 日本語の場合：句点+文字で段落区切り
    formatted = formatted.replace(/。([あ-んア-ンァ-ヴー一-龯])/g, '。\n\n$1');
  }

  // 3. リスト項目の整形
  if (opts.addListBreaks) {
    // 番号付きリスト (1. 2. など)
    formatted = formatted.replace(/(\n|^)(\d+\.\s)/g, '\n\n$2');
    
    // 箇条書きリスト (- * • など)
    formatted = formatted.replace(/(\n|^)([-*•]\s)/g, '\n\n$2');
    
    // リスト終了後の空行
    formatted = formatted.replace(/(\n[-*•]\s[^\n]*)\n([^-*•\s\d])/g, '$1\n\n$2');
  }

  // 4. 長い段落の分割
  if (opts.breakLongParagraphs && opts.maxParagraphLength) {
    const paragraphs = formatted.split('\n\n');
    const reformattedParagraphs = paragraphs.map(para => {
      if (para.length > opts.maxParagraphLength!) {
        // 適切な分割ポイントを探す
        const sentences = para.split(/([。！？.!?][\s　])/);
        let currentPara = '';
        let result = '';
        
        for (let i = 0; i < sentences.length; i += 2) {
          const sentence = sentences[i];
          const delimiter = sentences[i + 1] || '';
          
          if (currentPara.length + sentence.length + delimiter.length > opts.maxParagraphLength!) {
            if (currentPara) {
              result += currentPara + '\n\n';
              currentPara = sentence + delimiter;
            } else {
              currentPara = sentence + delimiter;
            }
          } else {
            currentPara += sentence + delimiter;
          }
        }
        
        if (currentPara) {
          result += currentPara;
        }
        
        return result || para;
      }
      return para;
    });
    
    formatted = reformattedParagraphs.join('\n\n');
  }

  // 5. 文末での改行（オプション）
  if (opts.addSentenceBreaks) {
    // 英語の文末
    formatted = formatted.replace(/\. ([A-Z])/g, '.\n$1');
    // 日本語の文末
    formatted = formatted.replace(/。([あ-んア-ンァ-ヴー一-龯])/g, '。\n$1');
  }

  // 6. 最終的なクリーンアップ
  // 3つ以上の連続改行を2つに
  formatted = formatted.replace(/\n{3,}/g, '\n\n');
  // 先頭・末尾の余分な改行を除去
  formatted = formatted.replace(/^\n+/, '').replace(/\n+$/, '');

  return formatted;
}

/**
 * チャット表示用の設定プリセット
 */
export const FORMATTING_PRESETS = {
  /** 標準的な読みやすさ重視 */
  readable: {
    addParagraphBreaks: true,
    addSentenceBreaks: false,
    addListBreaks: true,
    breakLongParagraphs: true,
    maxParagraphLength: 150
  } as TextFormattingOptions,

  /** コンパクトな表示 */
  compact: {
    addParagraphBreaks: false,
    addSentenceBreaks: false,
    addListBreaks: false,
    breakLongParagraphs: false
  } as TextFormattingOptions,

  /** 詳細な改行あり */
  detailed: {
    addParagraphBreaks: true,
    addSentenceBreaks: true,
    addListBreaks: true,
    breakLongParagraphs: true,
    maxParagraphLength: 100
  } as TextFormattingOptions
};

/**
 * ユーザー設定に基づいてテキストを整形
 */
export function formatMessageContent(content: string, preset: keyof typeof FORMATTING_PRESETS = 'readable'): string {
  return formatAIResponse(content, FORMATTING_PRESETS[preset]);
}