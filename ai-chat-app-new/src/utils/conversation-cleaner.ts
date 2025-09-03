/**
 * 会話履歴のクリーニングユーティリティ
 * 英語の混入を防ぐために会話履歴をクリーニング
 */

/**
 * 会話履歴から不要な英語混じりのテキストをクリーニング
 */
export function cleanConversationHistory(
  history: Array<{ role: "user" | "assistant"; content: string }>
): Array<{ role: "user" | "assistant"; content: string }> {
  return history.map(msg => ({
    ...msg,
    content: cleanMessageContent(msg.content)
  }));
}

/**
 * メッセージ内容から英語の混入をクリーニング
 */
export function cleanMessageContent(content: string): string {
  // 一般的な英語接続詞や単語の置換マップ
  const replacements: Record<string, string> = {
    // 接続詞
    ' and ': 'と',
    ' but ': 'しかし',
    ' or ': 'または',
    ' so ': 'だから',
    ' because ': 'なぜなら',
    ' therefore ': 'したがって',
    ' however ': 'しかしながら',
    ' although ': 'にもかかわらず',
    ' though ': 'けれども',
    ' yet ': 'しかし',
    ' then ': 'そして',
    ' thus ': 'このように',
    ' hence ': 'ゆえに',
    ' moreover ': 'さらに',
    ' furthermore ': 'その上',
    ' meanwhile ': 'その間',
    ' otherwise ': 'そうでなければ',
    ' instead ': '代わりに',
    ' nevertheless ': 'それでも',
    ' nonetheless ': 'それにもかかわらず',
    
    // よく混入する単語
    'What': '何',
    'Where': 'どこ',
    'When': 'いつ',
    'Why': 'なぜ',
    'How': 'どう',
    'Who': '誰',
    'Which': 'どちら',
    
    // 文末に来やすい表現
    ' anyway': 'とにかく',
    ' somehow': 'どうにか',
    ' maybe': 'たぶん',
    ' perhaps': 'おそらく',
    ' probably': 'たぶん',
    ' definitely': '確実に',
    ' absolutely': '絶対に',
    ' certainly': '確かに',
    ' surely': 'きっと',
    ' really': '本当に',
    ' actually': '実際に',
    ' basically': '基本的に',
    ' literally': '文字通り',
    ' obviously': '明らかに',
    ' apparently': 'どうやら',
    ' supposedly': 'おそらく',
    
    // 頻出する英語フレーズ
    'I think': '思う',
    'I mean': 'つまり',
    'You know': 'ね',
    'By the way': 'ところで',
    'In fact': '実は',
    'Of course': 'もちろん',
    'For example': '例えば',
    'In other words': '言い換えれば',
    'On the other hand': '一方で',
    'As a result': '結果として',
    'In conclusion': '結論として',
    'First of all': 'まず',
    'After all': '結局',
    'At least': '少なくとも',
    'At most': 'せいぜい',
    'More or less': 'だいたい',
    'Kind of': 'ある種の',
    'Sort of': 'ある意味',
    
    // 誤って混入しやすいパターン
    'there ': 'そこ',
    'here ': 'ここ',
    'now ': '今',
    'well ': 'えっと',
  };

  let cleanedContent = content;
  
  // 大文字小文字を区別せずに置換（単語境界を考慮）
  Object.entries(replacements).forEach(([eng, jpn]) => {
    // 単語境界を考慮した正規表現パターン
    const pattern = new RegExp(`\\b${eng.trim()}\\b`, 'gi');
    cleanedContent = cleanedContent.replace(pattern, jpn);
  });
  
  // 残った独立した英単語を検出して削除（ただし固有名詞は除外）
  // 2文字以上の英単語で、全角文字に囲まれているものを対象
  cleanedContent = cleanedContent.replace(
    /([ぁ-んァ-ヶ一-龥々〇〻\u3040-\u309F\u30A0-\u30FF])\s*\b([a-zA-Z]{2,})\b\s*([ぁ-んァ-ヶ一-龥々〇〻\u3040-\u309F\u30A0-\u30FF])/g,
    (match, before, word, after) => {
      // 固有名詞っぽいもの（最初が大文字）は残す
      if (word[0] === word[0].toUpperCase() && word.length <= 10) {
        return match;
      }
      // それ以外の英単語は削除
      return before + after;
    }
  );
  
  // 文頭の英単語も処理
  cleanedContent = cleanedContent.replace(
    /^\s*\b([a-zA-Z]{2,})\b\s*([ぁ-んァ-ヶ一-龥々〇〻\u3040-\u309F\u30A0-\u30FF])/g,
    (match, word, after) => {
      // 固有名詞っぽいもの（最初が大文字）は残す
      if (word[0] === word[0].toUpperCase() && word.length <= 10) {
        return match;
      }
      return after;
    }
  );
  
  // 連続したスペースを1つに
  cleanedContent = cleanedContent.replace(/\s+/g, ' ');
  
  // 日本語の句読点の前後の不要なスペースを削除
  cleanedContent = cleanedContent.replace(/\s+([。、！？])/g, '$1');
  cleanedContent = cleanedContent.replace(/([。、！？])\s+/g, '$1');
  
  return cleanedContent.trim();
}

/**
 * システムプロンプトに言語ルールを強化
 */
export function enhanceLanguageRule(systemPrompt: string): string {
  const languageEnforcement = `
## CRITICAL LANGUAGE ENFORCEMENT
- **ABSOLUTE RULE**: Output MUST be 100% in Japanese. 
- **NO ENGLISH MIXING**: Never use English words like "and", "but", "so", "because", "What", etc.
- **IGNORE ENGLISH IN HISTORY**: Even if the conversation history contains English, respond only in pure Japanese.
- **TRANSLATION REQUIRED**: If you need to express English concepts, translate them to Japanese completely.
- **EXCEPTION**: Only proper nouns (names, places, brands) may remain in original form.

`;
  
  // システムプロンプトの最初に言語ルールを挿入
  return languageEnforcement + systemPrompt;
}