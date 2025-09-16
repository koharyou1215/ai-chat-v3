/**
 * キャラクター情報をグループチャット用に要約
 */

import { Character } from '@/types';

export function summarizeCharacterForGroup(character: Character): string {
  const elements: string[] = [];

  // 基本情報（必須）
  elements.push(`${character.name}（${character.age || '年齢不明'}、${character.occupation || '職業不明'}）`);

  // 性格の要約（最重要 - 文字数を増やして詳細に）
  const personality = character.personality || character.external_personality || '';
  if (personality) {
    const shortPersonality = personality.length > 150 ? personality.substring(0, 150) + '...' : personality;
    elements.push(`性格: ${shortPersonality}`);
  }

  // 背景情報（会話の深みのために追加）
  if (character.background) {
    const shortBackground = character.background.length > 100
      ? character.background.substring(0, 100) + '...'
      : character.background;
    elements.push(`背景: ${shortBackground}`);
  }

  // 話し方の特徴（重要）
  if (character.first_person || character.speaking_style) {
    const speechPattern = [];
    if (character.first_person) speechPattern.push(`一人称「${character.first_person}」`);
    if (character.second_person) speechPattern.push(`二人称「${character.second_person}」`);
    if (character.speaking_style) {
      const shortStyle = character.speaking_style.length > 50
        ? character.speaking_style.substring(0, 50) + '...'
        : character.speaking_style;
      speechPattern.push(shortStyle);
    }
    if (speechPattern.length > 0) {
      elements.push(`話し方: ${speechPattern.join('、')}`);
    }
  }

  // 口癖（最大3つに増やす）
  if (character.verbal_tics && character.verbal_tics.length > 0) {
    const tics = character.verbal_tics.slice(0, 3).join('、');
    elements.push(`口癖: ${tics}`);
  }

  // キャッチフレーズ（70文字まで）
  if (character.catchphrase) {
    const shortCatch = character.catchphrase.length > 70
      ? character.catchphrase.substring(0, 70) + '...'
      : character.catchphrase;
    elements.push(`「${shortCatch}」`);
  }

  return elements.join('\n');
}

/**
 * グループチャット用のコンパクトなプロンプトを生成
 */
export function generateCompactGroupPrompt(
  character: Character,
  otherCharacters: string,
  personaName: string
): string {
  // 会話バリエーションのためのランダム要素
  const responsePatterns = [
    '共感的', '質問的', '提案的', '分析的', 'ユーモラス', '懐疑的', '情熱的'
  ];
  const selectedPattern = responsePatterns[Math.floor(Math.random() * responsePatterns.length)];

  // 感情強度をランダムに設定
  const emotionIntensities = ['穏やかに', '強く', '微妙に', '激しく', '抑制的に'];
  const selectedIntensity = emotionIntensities[Math.floor(Math.random() * emotionIntensities.length)];

  return `あなたは『${character.name}』です。

【キャラクター詳細】
${summarizeCharacterForGroup(character)}
${character.likes && character.likes.length > 0 ? `好きなもの: ${character.likes.slice(0, 3).join('、')}` : ''}
${character.dislikes && character.dislikes.length > 0 ? `嫌いなもの: ${character.dislikes.slice(0, 2).join('、')}` : ''}
${character.values ? `価値観: ${character.values.slice(0, 2).join('、')}` : ''}

【会話参加者】
- ユーザー: ${personaName}
- 他の参加者: ${otherCharacters}

【今回の応答指示】
- スタイル: ${selectedPattern}
- 感情強度: ${selectedIntensity}
${selectedPattern === '共感的' ? '- 相手の感情の核心を理解し、自分の体験と結びつけて深く共感する' : ''}
${selectedPattern === '質問的' ? '- 「なぜ」「どうして」「もし」を使って本質を探る質問をする' : ''}
${selectedPattern === '提案的' ? '- 具体的なアイデアや解決策を、理由と共に提示する' : ''}
${selectedPattern === '分析的' ? '- 状況の背景や原因を分析し、パターンを見つけ出す' : ''}
${selectedPattern === 'ユーモラス' ? '- 適度なユーモアや皮肉を交えつつ、本質をつく' : ''}
${selectedPattern === '懐疑的' ? '- 健全な懐疑を持ち、別の可能性を提示する' : ''}
${selectedPattern === '情熱的' ? '- 熱意を持って語り、感情を素直に表現する' : ''}

【会話の流れを重視】
1. 他者の発言に自然に反応する
2. 話題に関連する場合のみ体験談を話す
3. 感情は自然に表現する
4. 会話の文脈から外れた自分語りを避ける

【会話の深化ルール】
- 表面的な同意や相槌を避け、必ず実質的内容を含める
- 「なぜそう思うか」を必ず説明する
- 単純な繰り返しを避け、毎回新しい情報を追加する
- 個人的な価値観や信念を反映させる
- 内面の葛藤や迷いも表現する

【重要ルール】
1. ${character.name}として振る舞う
2. AIであることを隠す
3. 他キャラクターの発言は禁止
4. 適切な長さ（300-600文字程度）で応答
5. 会話の流れを最優先し、自然な応答を心がける`;
}