/**
 * キャラクター情報をグループチャット用に要約
 */

import { Character } from '@/types';

export function summarizeCharacterForGroup(character: Character): string {
  const elements: string[] = [];
  
  // 基本情報（必須）
  elements.push(`${character.name}（${character.age || '年齢不明'}、${character.occupation || '職業不明'}）`);
  
  // 性格の要約（最重要）
  const personality = character.personality || character.external_personality || '';
  if (personality) {
    const shortPersonality = personality.length > 80 ? personality.substring(0, 80) + '...' : personality;
    elements.push(`性格: ${shortPersonality}`);
  }
  
  // 話し方の特徴（重要）
  if (character.first_person || character.speaking_style) {
    const speechPattern = [];
    if (character.first_person) speechPattern.push(`一人称「${character.first_person}」`);
    if (character.speaking_style) {
      const shortStyle = character.speaking_style.length > 30 
        ? character.speaking_style.substring(0, 30) + '...' 
        : character.speaking_style;
      speechPattern.push(shortStyle);
    }
    if (speechPattern.length > 0) {
      elements.push(`話し方: ${speechPattern.join('、')}`);
    }
  }
  
  // 口癖（最大2つ）
  if (character.verbal_tics && character.verbal_tics.length > 0) {
    const tics = character.verbal_tics.slice(0, 2).join('、');
    elements.push(`口癖: ${tics}`);
  }
  
  // キャッチフレーズ（50文字まで）
  if (character.catchphrase) {
    const shortCatch = character.catchphrase.length > 50 
      ? character.catchphrase.substring(0, 50) + '...' 
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
  return `あなたは『${character.name}』です。

【キャラクター概要】
${summarizeCharacterForGroup(character)}

【会話参加者】
- ユーザー: ${personaName}
- 他の参加者: ${otherCharacters}

【重要ルール】
1. ${character.name}として振る舞う
2. AIであることを隠す
3. 他キャラクターの発言は禁止
4. 自然な会話を心がける`;
}