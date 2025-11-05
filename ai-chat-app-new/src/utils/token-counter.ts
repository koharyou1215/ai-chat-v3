/**
 * Token Counter Utility
 * 正確なトークン数推定とプロンプト制限処理を提供
 */

/**
 * テキストのトークン数を推定
 * GPT系モデル向けの簡易推定（日本語と英語を考慮）
 *
 * 推定ルール:
 * - 英数字・記号: 1文字 ≈ 0.25トークン（4文字で1トークン）
 * - 日本語（ひらがな・カタカナ・漢字）: 1文字 ≈ 0.8-1トークン
 * - 空白・改行: 0.5トークン
 */
export function estimateTokenCount(text: string): number {
  if (!text) return 0;

  // 英数字・記号の文字数
  const asciiChars = (text.match(/[a-zA-Z0-9.,;:!?'"()\[\]{}<>\/\\|@#$%^&*_+=`~-]/g) || []).length;

  // 日本語文字数（ひらがな・カタカナ・漢字）
  const japaneseChars = (text.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g) || []).length;

  // 空白・改行の数
  const whitespaceChars = (text.match(/[\s\n\r\t]/g) || []).length;

  // その他の文字（絵文字など）
  const otherChars = text.length - asciiChars - japaneseChars - whitespaceChars;

  // トークン数を推定
  const tokens =
    asciiChars * 0.25 +           // 英数字は4文字で1トークン
    japaneseChars * 0.85 +         // 日本語は1文字約0.85トークン
    whitespaceChars * 0.5 +        // 空白は0.5トークン
    otherChars * 1;                // その他は1文字1トークン

  return Math.ceil(tokens);
}

/**
 * トークン制限オプション
 */
export interface TokenLimitOptions {
  /** 最大トークン数 */
  maxTokens: number;
  /** 保持する優先セクション（これらは削除しない） */
  essentialSections?: string[];
  /** 削減対象セクション（優先度順） */
  reducibleSections?: Array<{
    name: string;
    content: string;
    priority: number; // 低い値ほど優先度高（削減しにくい）
  }>;
}

/**
 * テキストを指定トークン数以下に制限
 * 優先度に基づいて削減対象を選択
 */
export function limitTokens(
  text: string,
  options: TokenLimitOptions
): { limitedText: string; wasLimited: boolean; originalTokens: number; finalTokens: number } {
  const originalTokens = estimateTokenCount(text);

  // 制限不要な場合
  if (originalTokens <= options.maxTokens) {
    return {
      limitedText: text,
      wasLimited: false,
      originalTokens,
      finalTokens: originalTokens,
    };
  }

  console.warn(`⚠️ プロンプトが制限を超過: ${originalTokens} > ${options.maxTokens}トークン`);

  // 削減可能セクションがない場合は単純な文字数ベース切り捨て
  if (!options.reducibleSections || options.reducibleSections.length === 0) {
    const maxChars = Math.floor(options.maxTokens * 3.5); // 1トークン ≈ 3.5文字（平均）
    const limitedText = text.substring(0, maxChars) + '\n... [制限により短縮] ...';
    const finalTokens = estimateTokenCount(limitedText);

    console.log(`✅ プロンプトを${finalTokens}トークンに短縮（${originalTokens} → ${finalTokens}）`);

    return {
      limitedText,
      wasLimited: true,
      originalTokens,
      finalTokens,
    };
  }

  // 優先度順にソート（priority が高い順 = 削減優先）
  const sortedSections = [...options.reducibleSections].sort(
    (a, b) => b.priority - a.priority
  );

  let currentText = text;
  let currentTokens = originalTokens;
  const targetTokens = options.maxTokens;

  // 優先度の低いセクションから削減
  for (const section of sortedSections) {
    if (currentTokens <= targetTokens) break;

    // セクションを短縮または削除
    const sectionTokens = estimateTokenCount(section.content);
    const reductionNeeded = currentTokens - targetTokens;

    if (sectionTokens <= reductionNeeded) {
      // セクション全体を削除
      currentText = currentText.replace(section.content, `\n... [${section.name}を短縮] ...\n`);
    } else {
      // セクションを部分的に短縮
      const keepRatio = (sectionTokens - reductionNeeded) / sectionTokens;
      const keepChars = Math.floor(section.content.length * keepRatio);
      const truncatedContent = section.content.substring(0, keepChars) + `\n... [${section.name}の一部を短縮] ...`;
      currentText = currentText.replace(section.content, truncatedContent);
    }

    currentTokens = estimateTokenCount(currentText);
  }

  const finalTokens = estimateTokenCount(currentText);
  console.log(`✅ プロンプトを${finalTokens}トークンに短縮（${originalTokens} → ${finalTokens}）`);

  return {
    limitedText: currentText,
    wasLimited: true,
    originalTokens,
    finalTokens,
  };
}

/**
 * セクション別にトークン数を計測
 */
export function analyzeTokensBySection(sections: Record<string, string>): Record<string, number> {
  const result: Record<string, number> = {};

  for (const [name, content] of Object.entries(sections)) {
    result[name] = estimateTokenCount(content);
  }

  return result;
}

/**
 * 会話履歴を指定トークン数以下に制限
 * 最新メッセージを優先して保持
 */
export function limitConversationHistory(
  messages: Array<{ role: string; content: string }>,
  maxTokens: number
): Array<{ role: string; content: string }> {
  let totalTokens = 0;
  const result: Array<{ role: string; content: string }> = [];

  // 最新メッセージから逆順で処理
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    const msgTokens = estimateTokenCount(msg.content);

    if (totalTokens + msgTokens <= maxTokens) {
      result.unshift(msg); // 先頭に追加（順序を保持）
      totalTokens += msgTokens;
    } else {
      // トークン制限に達したら終了
      break;
    }
  }

  if (result.length < messages.length) {
    console.log(`📊 会話履歴を短縮: ${messages.length}件 → ${result.length}件（${totalTokens}トークン）`);
  }

  return result;
}
