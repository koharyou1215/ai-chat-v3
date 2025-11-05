# プロンプト構築最適化案

**作成日**: 2025-11-04
**対象**: ConversationManager.generatePrompt()
**目的**: AIの混乱防止と応答品質向上

---

## 🎯 最適化の目標

### 現在の問題
1. ❌ **情報過多**: 14セクション構成でAIが混乱
2. ❌ **Tracker重複**: Line 610とLine 722で2回挿入
3. ❌ **優先順位不明**: どの情報が重要か不明確
4. ❌ **トークン浪費**: 不要な情報まで含まれる
5. ❌ **一貫性欠如**: 古いメモリーと現在の文脈が矛盾

### 最適化後の目標
- ✅ セクション数: 14 → 10
- ✅ トークン数削減: 30%
- ✅ 情報の優先順位明確化
- ✅ 矛盾チェック機能追加
- ✅ AIの応答一貫性向上

---

## 📊 現在のプロンプト構造分析

### セクション一覧と問題点

```typescript
// conversation-manager.ts:364-778 (414行)

// 1. System Definitions (394行)
prompt += `AI={{char}}, User={{user}}\n\n`;
// ✅ 問題なし

// 2. System Instructions (409行)
prompt += `<system_instructions>\n${systemPromptContent}\n</system_instructions>\n\n`;
// ✅ 問題なし

// 3. Character Information (411-582行, 171行)
prompt += "<character_information>\n";
// ⚠️ 問題: 非常に長い（100行以上）
// ⚠️ 改善: 重要部のみ抽出、詳細は必要時のみ

// 4. Persona Information (585-607行)
prompt += "<persona_information>\n";
// ✅ 問題なし

// 5. Tracker Information (609-639行) ← 1回目
prompt += `<relationship_state>\n${trackerInfo}\n</relationship_state>\n\n`;
// ✅ 問題なし

// 6. Pinned Memory Cards (643-664行)
prompt += "<pinned_memory_cards>\n";
// ⚠️ 改善: 最大件数制限（現在無制限）

// 7. Relevant Memory Cards (666-695行)
prompt += "<relevant_memory_cards>\n";
// ⚠️ 改善: 最大8件→5件に削減

// 8. Pinned Messages (697-704行)
prompt += "<pinned_messages>\n";
// ⚠️ 問題: Memory Cardsと重複する可能性

// 9. Relevant Messages (706-716行)
prompt += "<relevant_messages>\n";
// ⚠️ 問題: Memory Cardsと重複する可能性

// 10. Session Summary (718-720行)
prompt += `<session_summary>\n${this.sessionSummary}\n</session_summary>\n\n`;
// ⚠️ 改善: 長さ制限（現在無制限）

// 11. Tracker Information (722-738行) ← 2回目（重複！）
prompt += `${detailedTrackerInfo}\n\n`;
// ❌ 問題: 完全に重複

// 12. Recent Conversation (740-746行)
prompt += "<recent_conversation>\n";
// ✅ 問題なし

// 13. Character System Prompt (748-751行)
prompt += `<character_system_prompt>\n${character.system_prompt}\n</character_system_prompt>\n\n`;
// ⚠️ 問題: Character Informationと重複する可能性

// 14. Jailbreak Instructions (753-762行)
prompt += `<jailbreak_instructions>\n${jailbreak}\n</jailbreak_instructions>\n\n`;
// ⚠️ 改善: System Instructionsに統合可能

// 15. Current Input (765-767行)
prompt += `User: ${userInput}\nAI: `;
// ✅ 問題なし
```

---

## ✅ 最適化案: 3層構造プロンプト

### 新しい構造（10セクション）

```
┌─────────────────────────────────────────────┐
│ Layer 1: Core Instructions（変更なし）      │
├─────────────────────────────────────────────┤
│ 1. System Instructions (統合)               │
│    ├─ AI/User Definitions                   │
│    ├─ Core Rules                            │
│    └─ Jailbreak (必要時のみ)                │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Layer 2: Character & Context（圧縮）        │
├─────────────────────────────────────────────┤
│ 2. Character Profile (簡素化)               │
│    ├─ Essential Info (名前、性格要約)       │
│    ├─ Communication Style                   │
│    └─ Character System Prompt               │
│                                              │
│ 3. Persona Information (変更なし)           │
│                                              │
│ 4. Relationship State (Tracker、1回のみ)    │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Layer 3: Memory & History（最適化）         │
├─────────────────────────────────────────────┤
│ 5. Priority Memories (統合・優先順位付け)   │
│    ├─ Pinned Memory Cards (最大3件)         │
│    ├─ Relevant Memory Cards (最大5件)       │
│    └─ High-Priority Messages (最大3件)      │
│                                              │
│ 6. Conversation Context (統合)              │
│    ├─ Session Summary (最大100文字)         │
│    └─ Recent Conversation (最大10往復)      │
│                                              │
│ 7. Current Input                            │
└─────────────────────────────────────────────┘
```

### トークン削減効果

| Layer | Before | After | 削減率 |
|-------|--------|-------|--------|
| Layer 1 | 150 tokens | 150 tokens | 0% |
| Layer 2 | 800 tokens | 400 tokens | 50% |
| Layer 3 | 1,200 tokens | 800 tokens | 33% |
| **合計** | **2,150 tokens** | **1,350 tokens** | **37%** |

---

## 🔧 具体的な最適化内容

### 最適化1: Character Profile簡素化

**Before** (171行):
```typescript
// 基本情報
prompt += `## Basic Information\n`;
prompt += `Name: ${character.name}\n`;
prompt += `Age: ${character.age}\n`;
prompt += `Occupation: ${character.occupation}\n`;
prompt += `Catchphrase: "${character.catchphrase}"\n`;
prompt += `Tags: ${character.tags.join(", ")}\n`;

// 外見
prompt += `\n## Appearance\n${character.appearance}\n`;

// 性格詳細
prompt += `\n## Personality\n`;
prompt += `Overall: ${character.personality}\n`;
prompt += `External: ${character.external_personality}\n`;
prompt += `Internal: ${character.internal_personality}\n`;

// 長所・短所
prompt += `Strengths: ${character.strengths.join(", ")}\n`;
prompt += `Weaknesses: ${character.weaknesses.join(", ")}\n`;

// 趣味・好み
prompt += `Hobbies: ${character.hobbies.join(", ")}\n`;
prompt += `Likes: ${character.likes.join(", ")}\n`;
prompt += `Dislikes: ${character.dislikes.join(", ")}\n`;

// 話し方
prompt += `\n## Communication Style\n`;
prompt += `Speaking Style: ${character.speaking_style}\n`;
prompt += `First Person: ${character.first_person}\n`;
prompt += `Second Person: ${character.second_person}\n`;
prompt += `Verbal Tics: ${character.verbal_tics.join(", ")}\n`;

// 背景
prompt += `\n## Background\n${character.background}\n`;
prompt += `\n## Scenario\n${character.scenario}\n`;

// NSFW
prompt += `\n## Special Context\n${nsfw_info}\n`;
```

**After** (約60行):
```typescript
prompt += "<character_profile>\n";

// Essential Identity（必須情報のみ）
prompt += `Name: ${character.name}\n`;
if (character.catchphrase) {
  prompt += `Catchphrase: "${character.catchphrase}"\n`;
}

// Core Personality（要約版）
const personalitySummary = this.summarizePersonality(character);
prompt += `Personality: ${personalitySummary}\n`;

// Communication Style（最重要）
prompt += `\nCommunication:\n`;
prompt += `- Style: ${character.speaking_style}\n`;
prompt += `- Pronouns: ${character.first_person} (I), ${character.second_person} (You)\n`;
if (character.verbal_tics && character.verbal_tics.length > 0) {
  prompt += `- Verbal tics: ${character.verbal_tics.slice(0, 3).join(", ")}\n`;
}

// Current Context（シナリオのみ）
if (character.scenario) {
  prompt += `\nCurrent Situation: ${character.scenario}\n`;
}

// Character System Prompt（存在する場合）
if (character.system_prompt) {
  prompt += `\nSpecial Instructions: ${character.system_prompt}\n`;
}

prompt += "</character_profile>\n\n";
```

**新メソッド**:
```typescript
private summarizePersonality(character: Character): string {
  const parts: string[] = [];

  // 外面と内面を統合
  if (character.external_personality && character.internal_personality) {
    parts.push(`${character.external_personality} (表面), ${character.internal_personality} (内面)`);
  } else if (character.personality) {
    parts.push(character.personality);
  }

  // 重要な特性のみ（最大3つ）
  if (character.strengths) {
    const strengths = Array.isArray(character.strengths)
      ? character.strengths.slice(0, 2)
      : [character.strengths];
    parts.push(`長所: ${strengths.join(", ")}`);
  }

  return parts.join(". ");
}
```

**効果**:
- 171行 → 60行（65%削減）
- トークン数: 約50%削減
- 重要情報は維持

---

### 最適化2: Tracker重複削除

**Before**:
```typescript
// Line 610: 1回目
if (this.trackerManager && character) {
  const trackerInfo = this.trackerManager.getDetailedTrackersForPrompt(character.id);
  if (trackerInfo) {
    prompt += `<relationship_state>\n${trackerInfo}\n</relationship_state>\n\n`;
  }
}

// ... 他のセクション ...

// Line 722: 2回目（重複！）
if (processedCharacter && this.trackerManager) {
  const detailedTrackerInfo = this.trackerManager.getDetailedTrackersForPrompt(character.id);
  if (detailedTrackerInfo) {
    prompt += `${detailedTrackerInfo}\n\n`;
  } else {
    const basicTrackerInfo = this.trackerManager.getTrackersForPrompt(character.id);
    if (basicTrackerInfo) {
      prompt += `${basicTrackerInfo}\n\n`;
    }
  }
}
```

**After**:
```typescript
// Layer 2に1回のみ挿入
if (this.trackerManager && character) {
  const trackerInfo = this.trackerManager.getDetailedTrackersForPrompt(character.id);
  if (trackerInfo) {
    prompt += `<relationship_state>\n${trackerInfo}\n</relationship_state>\n\n`;
  }
}

// Line 722のコードは完全削除
```

**効果**:
- 重複削除
- トークン数: 約100-200削減

---

### 最適化3: Memory統合と優先順位付け

**Before** (4セクション分散):
```typescript
// Pinned Memory Cards (無制限)
// Relevant Memory Cards (最大8件)
// Pinned Messages (無制限)
// Relevant Messages (最大5件)
```

**After** (1セクション統合):
```typescript
prompt += "<priority_memories>\n";

// 1. Pinned Memory Cards（最優先、最大3件）
const pinnedCards = (await this.getPinnedMemoryCards()).slice(0, 3);
if (pinnedCards.length > 0) {
  prompt += "## Pinned Memories\n";
  pinnedCards.forEach(card => {
    prompt += `[${card.category}] ${card.title}: ${card.summary}\n`;
  });
  prompt += "\n";
}

// 2. Relevant Memory Cards（重要度順、最大5件）
const relevantCards = (await this.getRelevantMemoryCards(userInput, character))
  .sort((a, b) => b.importance.score - a.importance.score)
  .slice(0, 5);

if (relevantCards.length > 0) {
  prompt += "## Relevant Memories\n";
  relevantCards.forEach(card => {
    prompt += `[${card.category}] ${card.title}: ${card.summary}\n`;
  });
  prompt += "\n";
}

// 3. High-Priority Messages（Pinned + 高重要度、最大3件）
const highPriorityMessages = this.getHighPriorityMessages(userInput);
if (highPriorityMessages.length > 0) {
  prompt += "## Key Previous Exchanges\n";
  highPriorityMessages.slice(0, 3).forEach(msg => {
    prompt += `${msg.role}: ${msg.content.slice(0, 100)}...\n`;
  });
}

prompt += "</priority_memories>\n\n";
```

**新メソッド**:
```typescript
private getHighPriorityMessages(userInput: string): UnifiedMessage[] {
  // 1. Pinnedメッセージ
  const pinned = this.getPinnedMessages();

  // 2. 関連性が高い重要メッセージ（Relevant Messagesから）
  const relevant = await this.searchRelevantMemories(userInput);
  const highImportance = relevant
    .filter(r => r.message.importance && r.message.importance.score >= 0.7)
    .map(r => r.message);

  // 3. 重複排除してマージ
  const combined = [...pinned, ...highImportance];
  const unique = Array.from(new Map(combined.map(m => [m.id, m])).values());

  // 4. 重要度順でソート
  return unique.sort((a, b) =>
    (b.memory?.importance?.score || 0) - (a.memory?.importance?.score || 0)
  );
}
```

**効果**:
- セクション数: 4 → 1
- 情報の優先順位明確化
- 重複削除
- トークン数: 約20%削減

---

### 最適化4: Conversation Context統合

**Before** (2セクション):
```typescript
// Session Summary（無制限）
if (this.sessionSummary) {
  prompt += `<session_summary>\n${this.sessionSummary}\n</session_summary>\n\n`;
}

// Recent Conversation（maxWorkingMemory件）
prompt += "<recent_conversation>\n";
context.recent_messages.forEach((msg) => {
  prompt += `${msg.role}: ${msg.content}\n`;
});
prompt += "</recent_conversation>\n\n";
```

**After** (1セクション、長さ制限付き):
```typescript
prompt += "<conversation_context>\n";

// Session Summary（最大100文字）
if (this.sessionSummary) {
  const truncatedSummary = this.sessionSummary.slice(0, 100) +
    (this.sessionSummary.length > 100 ? "..." : "");
  prompt += `Summary: ${truncatedSummary}\n\n`;
}

// Recent Conversation（最大10往復 = 20メッセージ）
const recentMessages = context.recent_messages.slice(-20);
prompt += "Recent Messages:\n";
recentMessages.forEach((msg) => {
  const role = msg.role === "user" ? "User" : "AI";
  prompt += `${role}: ${replaceVariables(msg.content, variableContext)}\n`;
});

prompt += "</conversation_context>\n\n";
```

**効果**:
- セクション数: 2 → 1
- Session Summaryに長さ制限
- Recent Conversationを明確化
- トークン数: 約15%削減

---

### 最適化5: System Instructions統合

**Before** (2セクション):
```typescript
// System Instructions
prompt += `<system_instructions>\n${systemPromptContent}\n</system_instructions>\n\n`;

// ... 他のセクション ...

// Jailbreak Instructions（後半）
if (enableJailbreakPrompt && jailbreak) {
  prompt += `<jailbreak_instructions>\n${jailbreak}\n</jailbreak_instructions>\n\n`;
}
```

**After** (1セクション統合):
```typescript
prompt += "<system_instructions>\n";

// Core System Prompt
prompt += systemPromptContent;

// Jailbreak（カスタムの場合のみ追加）
if (enableJailbreakPrompt && jailbreak && jailbreak !== DEFAULT_JAILBREAK_PROMPT) {
  prompt += `\n\n## Additional Instructions\n${jailbreak}`;
}

prompt += "\n</system_instructions>\n\n";
```

**効果**:
- セクション数: 2 → 1
- 重複削除
- トークン数: 微減

---

## 📐 最適化後の完全なプロンプト構造

```typescript
async generatePromptOptimized(
  userInput: string,
  character?: Character,
  persona?: Persona,
  systemSettings?: SystemSettings
): Promise<string> {
  let prompt = "";

  // ========================================
  // Layer 1: Core Instructions
  // ========================================

  // 1. System Instructions (統合)
  prompt += "<system_instructions>\n";
  prompt += `AI={{char}}, User={{user}}\n\n`;
  prompt += systemPromptContent;
  if (customJailbreak) {
    prompt += `\n\n## Additional Instructions\n${customJailbreak}`;
  }
  prompt += "</system_instructions>\n\n";

  // ========================================
  // Layer 2: Character & Context
  // ========================================

  // 2. Character Profile (簡素化)
  if (character) {
    prompt += this.buildCharacterProfile(character);
  }

  // 3. Persona Information (変更なし)
  if (persona) {
    prompt += this.buildPersonaSection(persona);
  }

  // 4. Relationship State (1回のみ)
  if (this.trackerManager && character) {
    prompt += this.buildRelationshipSection(character);
  }

  // ========================================
  // Layer 3: Memory & History
  // ========================================

  // 5. Priority Memories (統合)
  prompt += await this.buildPriorityMemoriesSection(userInput, character);

  // 6. Conversation Context (統合)
  prompt += this.buildConversationContextSection(context);

  // 7. Current Input
  prompt += `User: ${replaceVariables(userInput, variableContext)}\n`;
  prompt += `AI: `;

  return replaceVariables(prompt, variableContext);
}
```

---

## 🎨 補助メソッド

### Character Profile Builder
```typescript
private buildCharacterProfile(character: Character): string {
  let section = "<character_profile>\n";

  // Essential
  section += `Name: ${character.name}\n`;
  if (character.catchphrase) {
    section += `Catchphrase: "${character.catchphrase}"\n`;
  }

  // Personality Summary
  section += `Personality: ${this.summarizePersonality(character)}\n\n`;

  // Communication Style
  section += this.buildCommunicationStyle(character);

  // Current Scenario
  if (character.scenario) {
    section += `\nCurrent Situation: ${character.scenario}\n`;
  }

  // System Prompt
  if (character.system_prompt) {
    section += `\nSpecial Instructions: ${character.system_prompt}\n`;
  }

  section += "</character_profile>\n\n";
  return section;
}
```

### Priority Memories Builder
```typescript
private async buildPriorityMemoriesSection(
  userInput: string,
  character?: Character
): Promise<string> {
  let section = "<priority_memories>\n";

  // Pinned Cards (最大3件)
  const pinnedCards = (await this.getPinnedMemoryCards()).slice(0, 3);
  if (pinnedCards.length > 0) {
    section += "## Pinned\n";
    pinnedCards.forEach(card => {
      section += `[${card.category}] ${card.title}: ${card.summary}\n`;
    });
    section += "\n";
  }

  // Relevant Cards (最大5件)
  const relevantCards = (await this.getRelevantMemoryCards(userInput, character))
    .slice(0, 5);
  if (relevantCards.length > 0) {
    section += "## Relevant\n";
    relevantCards.forEach(card => {
      section += `[${card.category}] ${card.title}\n`;
    });
    section += "\n";
  }

  // High-Priority Messages (最大3件)
  const highPriority = this.getHighPriorityMessages(userInput).slice(0, 3);
  if (highPriority.length > 0) {
    section += "## Key Exchanges\n";
    highPriority.forEach(msg => {
      section += `${msg.role}: ${msg.content.slice(0, 80)}...\n`;
    });
  }

  section += "</priority_memories>\n\n";
  return section;
}
```

---

## 🧪 検証方法

### 1. トークン数比較テスト
```typescript
// tests/prompt-optimization/token-comparison.test.ts
describe('Prompt Optimization', () => {
  test('Token reduction: 30% or more', async () => {
    const oldPrompt = await manager.generatePrompt(...);
    const newPrompt = await manager.generatePromptOptimized(...);

    const oldTokens = estimateTokens(oldPrompt);
    const newTokens = estimateTokens(newPrompt);

    const reduction = (oldTokens - newTokens) / oldTokens;
    expect(reduction).toBeGreaterThanOrEqual(0.30);
  });
});
```

### 2. 情報完全性テスト
```typescript
test('All essential information preserved', async () => {
  const newPrompt = await manager.generatePromptOptimized(...);

  // 必須情報が含まれているか
  expect(newPrompt).toContain(character.name);
  expect(newPrompt).toContain(character.speaking_style);
  expect(newPrompt).toContain(persona.role);

  // Tracker情報が1回のみ
  const trackerMatches = newPrompt.match(/<relationship_state>/g);
  expect(trackerMatches).toHaveLength(1);
});
```

### 3. 応答品質比較テスト
```typescript
test('Chat quality maintained or improved', async () => {
  // Before/After で同じ10往復チャット
  const oldResponses = await testChat(useOldPrompt);
  const newResponses = await testChat(useNewPrompt);

  // 人間評価（手動）
  // - 一貫性
  // - キャラクター性
  // - 文脈理解
});
```

---

## 📊 期待される効果

### 定量的効果
| 指標 | Before | After | 改善 |
|------|--------|-------|------|
| セクション数 | 14 | 7 | 50%削減 |
| プロンプト行数 | 414行 | 約200行 | 52%削減 |
| トークン数 | 2,150 | 1,350 | 37%削減 |
| Character Info | 800 tokens | 400 tokens | 50%削減 |
| Memory Info | 600 tokens | 400 tokens | 33%削減 |

### 定性的効果
- ✅ **AI混乱軽減**: 情報が整理され、優先順位が明確
- ✅ **応答一貫性向上**: 矛盾する情報の削減
- ✅ **パフォーマンス向上**: トークン数削減でAPI呼び出し高速化
- ✅ **コスト削減**: トークン削減でAPI料金削減
- ✅ **メンテナンス性向上**: コードが簡潔でバグ修正容易

---

## ⚠️ リスクと緩和策

### リスク1: 情報不足によるキャラクター性喪失
**緩和策**:
- Character Profileの要約ロジックを慎重に設計
- 重要な特性（speaking_style、verbal_tics等）は必ず含める
- 人間評価で確認

### リスク2: メモリー優先順位付けの失敗
**緩和策**:
- 既存のスコアリングロジックを維持
- Pinnedは常に最優先
- ログで選択されたメモリーを確認

### リスク3: トークン削減しすぎて文脈不足
**緩和策**:
- 最小保証件数を設定（Recent Conversation: 最低5往復）
- 動的調整機能を追加
- A/Bテストで最適値を探索

---

## 🚀 実装計画

### フェーズ1: 新メソッド追加（リスク: 低）
- `generatePromptOptimized()` 追加
- 補助メソッド実装
- テスト作成

### フェーズ2: 並行稼働テスト（リスク: 低）
```typescript
if (FEATURE_FLAGS.USE_OPTIMIZED_PROMPT) {
  return await this.generatePromptOptimized(...);
} else {
  return await this.generatePrompt(...);
}
```

### フェーズ3: 比較評価（リスク: 中）
- トークン数計測
- 応答品質評価
- ユーザーフィードバック収集

### フェーズ4: 完全移行（リスク: 中）
- デフォルトをOptimized版に変更
- 旧メソッドは1ヶ月維持（ロールバック用）
- その後削除

---

## 次のステップ

1. ✅ 最適化案作成完了
2. ⏳ ユーザー承認待ち
3. ⏳ 実装開始（Phase 3として）

---

**作成者**: Claude Code (Sonnet 4.5)
**ステータス**: 最適化案完成、承認待ち
**推定実装時間**: 3-4時間（フェーズ1-2）、評価1週間（フェーズ3）
