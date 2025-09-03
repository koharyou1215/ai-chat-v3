/**
 * 会話履歴を英文に変換するユーティリティ
 * トークン削減とAIモデルの理解度向上を目的とする
 */

export interface ConversationEntry {
  role: "user" | "assistant";
  content: string;
}

/**
 * 会話履歴を英文に変換
 * 日本語の会話を英文に変換してトークンを削減
 */
export function translateConversationToEnglish(
  conversationHistory: ConversationEntry[]
): ConversationEntry[] {
  return conversationHistory.map((entry) => ({
    ...entry,
    content: translateMessageToEnglish(entry.content, entry.role),
  }));
}

/**
 * 個別メッセージを英文に変換
 */
function translateMessageToEnglish(
  content: string,
  role: "user" | "assistant"
): string {
  // 基本的な日本語→英文変換パターン
  const translations: Record<string, string> = {
    // 挨拶
    こんにちは: "Hello",
    こんばんは: "Good evening",
    おはよう: "Good morning",
    お疲れ様: "Good work",
    ありがとう: "Thank you",
    どういたしまして: "You're welcome",
    すみません: "Sorry",
    ごめんなさい: "I'm sorry",

    // 感情表現
    嬉しい: "happy",
    悲しい: "sad",
    怒っている: "angry",
    怖い: "scared",
    驚いた: "surprised",
    疲れた: "tired",
    元気: "fine/good",
    大丈夫: "okay",

    // 基本的な質問
    どうですか: "How is it?",
    何をしていますか: "What are you doing?",
    どこにいますか: "Where are you?",
    いつ: "When",
    なぜ: "Why",
    どのように: "How",
    誰: "Who",
    何: "What",

    // 基本的な応答
    はい: "Yes",
    いいえ: "No",
    分かりました: "I understand",
    分からない: "I don't understand",
    知りません: "I don't know",
    そうですね: "That's right",
    そうですか: "I see",

    // 時間表現
    今日: "today",
    昨日: "yesterday",
    明日: "tomorrow",
    今: "now",
    後で: "later",
    早く: "early",
    遅く: "late",

    // 場所表現
    ここ: "here",
    そこ: "there",
    どこ: "where",
    家: "home",
    学校: "school",
    会社: "office",
    病院: "hospital",

    // 基本的な動詞
    行く: "go",
    来る: "come",
    見る: "see",
    聞く: "hear",
    話す: "speak",
    食べる: "eat",
    飲む: "drink",
    寝る: "sleep",
    起きる: "wake up",
    勉強する: "study",
    働く: "work",
    遊ぶ: "play",

    // 基本的な形容詞
    大きい: "big",
    小さい: "small",
    高い: "high/expensive",
    低い: "low",
    長い: "long",
    短い: "short",
    新しい: "new",
    古い: "old",
    美しい: "beautiful",
    可愛い: "cute",
    面白い: "interesting",
    楽しい: "fun",
    難しい: "difficult",
    簡単: "easy",
    熱い: "hot",
    寒い: "cold",
    暖かい: "warm",
    涼しい: "cool",
  };

  // 単純な置換処理
  let translated = content;

  // 辞書に基づく置換
  for (const [japanese, english] of Object.entries(translations)) {
    const regex = new RegExp(japanese, "g");
    translated = translated.replace(regex, english);
  }

  // より高度な変換（必要に応じて）
  translated = translateAdvancedPatterns(translated, role);

  return translated;
}

/**
 * より高度なパターン変換
 */
function translateAdvancedPatterns(
  content: string,
  role: "user" | "assistant"
): string {
  let translated = content;

  // 疑問文の変換
  translated = translated.replace(/〜ですか\?/g, "?");
  translated = translated.replace(/〜でしょうか\?/g, "?");
  translated = translated.replace(/〜ますか\?/g, "?");

  // 感嘆文の変換
  translated = translated.replace(/〜ですね！/g, "!");
  translated = translated.replace(/〜です！/g, "!");
  translated = translated.replace(/〜ます！/g, "!");

  // 敬語の簡略化
  translated = translated.replace(/〜です/g, "");
  translated = translated.replace(/〜ます/g, "");
  translated = translated.replace(/〜でした/g, "");
  translated = translated.replace(/〜ました/g, "");

  // 助詞の簡略化
  translated = translated.replace(/は/g, " ");
  translated = translated.replace(/が/g, " ");
  translated = translated.replace(/を/g, " ");
  translated = translated.replace(/に/g, " ");
  translated = translated.replace(/で/g, " ");
  translated = translated.replace(/と/g, " and ");
  translated = translated.replace(/や/g, " and ");

  // 余分な空白を整理
  translated = translated.replace(/\s+/g, " ").trim();

  return translated;
}

/**
 * 会話履歴の要約を英文で生成
 */
export function generateEnglishConversationSummary(
  conversationHistory: ConversationEntry[]
): string {
  if (conversationHistory.length === 0) {
    return "No previous conversation.";
  }

  const recentMessages = conversationHistory.slice(-5);
  const summary = recentMessages
    .map((msg, index) => {
      const speaker = msg.role === "user" ? "User" : "AI";
      const content = translateMessageToEnglish(msg.content, msg.role);
      return `${speaker}: ${content}`;
    })
    .join("\n");

  return `Recent conversation:\n${summary}`;
}

/**
 * メモリーカードの内容を英文に変換
 */
export function translateMemoryCardToEnglish(memoryContent: string): string {
  return translateMessageToEnglish(memoryContent, "assistant");
}

/**
 * トラッカーの内容を英文に変換
 */
export function translateTrackerToEnglish(trackerContent: string): string {
  let translated = trackerContent;

  // トラッカー特有の変換
  const trackerTranslations: Record<string, string> = {
    好感度: "Affection",
    信頼度: "Trust",
    親密度: "Intimacy",
    恋愛度: "Romance",
    友情: "Friendship",
    気分: "Mood",
    機嫌: "Mood",
    満足度: "Satisfaction",
    興味: "Interest",
    関心: "Interest",
    緊張: "Tension",
    リラックス: "Relaxed",
    興奮: "Excitement",
    不安: "Anxiety",
    恐怖: "Fear",
    怒り: "Anger",
    悲しみ: "Sadness",
    喜び: "Joy",
    驚き: "Surprise",
    嫌悪: "Disgust",
  };

  for (const [japanese, english] of Object.entries(trackerTranslations)) {
    const regex = new RegExp(japanese, "g");
    translated = translated.replace(regex, english);
  }

  return translated;
}
