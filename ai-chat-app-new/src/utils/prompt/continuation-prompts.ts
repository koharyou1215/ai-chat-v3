/**
 * 続き生成・再生成用の共通プロンプト生成ユーティリティ
 */

/**
 * 続き生成用プロンプトを生成
 * AIがユーザーの行動を代弁しないよう制約を追加
 */
export const generateContinuationPrompt = (
  previousContent: string,
  characterName?: string
): string => {
  const character = characterName ? `${characterName}（キャラクター）` : 'あなた（キャラクター）';

  return `前のメッセージの続きを書いてください。

重要な制約:
- ${character}の視点と行動のみを描写してください
- ユーザーの行動、セリフ、思考を勝手に決めつけたり代弁したりしないでください
- ユーザーが何をするかは、ユーザー自身が決めます
- 「あなたは〜と言った」「あなたは〜した」のような表現は使わないでください
- ユーザーの反応を先回りして書かないでください

前のメッセージ内容:
「${previousContent}」

この続きとして、${character}側の行動や発言のみで自然に繋がる内容を生成してください。`;
};

/**
 * グループチャット用の続き生成プロンプトを生成
 * 特定のキャラクター視点で、他のキャラクターやユーザーの行動を代弁しない
 */
export const generateGroupContinuationPrompt = (
  previousContent: string,
  characterName: string,
  otherCharacters: string[],
  userName: string
): string => {
  const others = otherCharacters.length > 0
    ? `${otherCharacters.join('、')}や${userName}`
    : userName;

  return `前のメッセージの続きを書いてください。

重要な制約:
- あなたは『${characterName}』として発言してください
- ${characterName}の視点と行動のみを描写してください
- ${others}の行動、セリフ、思考を勝手に決めつけたり代弁したりしないでください
- 他のキャラクターやユーザーが何をするかは、それぞれが決めます
- 「〜は言った」「〜はした」のような他者の行動を書かないでください
- 他のメンバーの反応を先回りして書かないでください

前のメッセージ内容:
「${previousContent}」

この続きとして、${characterName}の行動や発言のみで自然に繋がる内容を生成してください。`;
};

/**
 * インスピレーション機能用の続き生成プロンプトを生成
 * 創造的な提案を続けつつ、ユーザーの行動を決めつけない
 */
export const generateInspirationContinuationPrompt = (
  previousContent: string,
  theme?: string
): string => {
  const themeContext = theme ? `（テーマ: ${theme}）` : '';

  return `前のインスピレーションの続きを書いてください${themeContext}。

重要な制約:
- アイデアや提案、可能性を示してください
- ユーザーの行動や選択を決めつけないでください
- 「あなたはこうすべき」ではなく「こんな可能性があります」という形で提案してください
- 複数の選択肢や視点を提供してください

前のインスピレーション内容:
「${previousContent}」

この続きとして、さらなるアイデアや展開の可能性を提案してください。`;
};

/**
 * 再生成時の会話履歴を準備
 * 前回のAI応答を除外して、新しい応答を生成させる
 */
export const prepareRegenerationHistory = <T extends { role: string; content: string }>(
  messages: T[],
  lastAiMessageIndex: number,
  maxContextMessages: number = 40
): T[] => {
  // 最後のAIメッセージより前の履歴のみを使用
  return messages
    .slice(0, lastAiMessageIndex)
    .slice(-maxContextMessages);
};

/**
 * プロンプトにキャラクター性を強調する装飾を追加
 * 必要に応じて感情や状況を含める
 */
export const enhancePromptWithCharacterContext = (
  basePrompt: string,
  characterDescription?: string,
  currentEmotion?: string,
  situationContext?: string
): string => {
  let enhancedPrompt = basePrompt;

  if (characterDescription) {
    enhancedPrompt = `【キャラクター設定】\n${characterDescription}\n\n${enhancedPrompt}`;
  }

  if (currentEmotion) {
    enhancedPrompt = `【現在の感情: ${currentEmotion}】\n${enhancedPrompt}`;
  }

  if (situationContext) {
    enhancedPrompt = `【状況】\n${situationContext}\n\n${enhancedPrompt}`;
  }

  return enhancedPrompt;
};