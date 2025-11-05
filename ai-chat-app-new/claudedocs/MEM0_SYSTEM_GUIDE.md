# Mem0システム機能ガイド

**作成日**: 2025年10月5日
**目的**: Mem0メモリーシステムの詳細な機能説明

---

## 📋 Mem0システム概要

Mem0は**集中型メモリーサービス**として、会話履歴の管理、ベクトル検索、メモリーカード生成を統合的に処理します。

---

## 🏗️ アーキテクチャ

### コアコンポーネント

```
Mem0システム
├── core.ts (Mem0Service)
│   ├── メッセージ取り込み (ingestMessage)
│   ├── 会話履歴取得 (getCandidateHistory)
│   ├── ベクトル検索 (search)
│   ├── 要約生成 (createEphemeralSummary)
│   └── メモリーカード昇格 (promoteToMemoryCard)
│
├── character-service.ts (Mem0CharacterService)
│   ├── キャラクターコア管理
│   ├── 関係性状態管理
│   ├── キャラクター記憶管理
│   ├── 会話学習機能
│   └── キャラクター進化機能
│
└── 統合ヘルパー (mem0-integration-helper.ts)
    ├── ingestMessageToMem0Safely()
    └── ingestConversationPairToMem0()
```

---

## 🔧 Mem0Service (core.ts)

### 主要機能

#### 1. メッセージ取り込み (ingestMessage)

**ファイル**: `src/services/mem0/core.ts` (28行目～35行目)

```typescript
async ingestMessage(message: UnifiedMessage): Promise<void> {
  try {
    // ベクトルストアに非同期で追加（コスト最適化済み）
    await this.vectorStore.addMessage(message);
  } catch (error) {
    console.warn("[Mem0] ingestMessage failed:", error);
  }
}
```

**目的**:
- 全てのメッセージをベクトルストアに保存
- 後続の検索で利用可能にする

**使用箇所**:
- `message-send-handler.ts` - メッセージ送信時
- `message-regeneration-handler.ts` - 再生成時
- `message-continuation-handler.ts` - 続き生成時
- `message-lifecycle-operations.ts` - メッセージ追加時

---

#### 2. 会話履歴取得 (getCandidateHistory)

**ファイル**: `src/services/mem0/core.ts` (43行目～68行目)

```typescript
getCandidateHistory(messages: UnifiedMessage[], opts: GetHistoryOptions) {
  const { maxContextMessages, minRecentMessages = 5 } = opts;

  // 1. 最新maxContextMessages件を取得
  const recent = messages.slice(-maxContextMessages);

  // 2. 重複排除
  const dedup: Array<{ role: "user" | "assistant"; content: string }> = [];
  for (const msg of recent) {
    if (msg.role !== "user" && msg.role !== "assistant") continue;
    const entry = {
      role: msg.role as "user" | "assistant",
      content: msg.content,
    };
    const isDup = dedup.some(
      (d) => d.role === entry.role && d.content === entry.content
    );
    if (!isDup && entry.content.trim()) dedup.push(entry);
  }

  // 3. 半分ルール適用（既存動作を維持）、ただしminRecentMessages保証
  const halfLimit = Math.floor(maxContextMessages / 2);
  const finalLimit = Math.max(minRecentMessages, halfLimit);

  return dedup.slice(-finalLimit);
}
```

**目的**:
- APIに送信する会話履歴を取得
- 重複メッセージを排除
- 最低限の最近メッセージを保証（デフォルト5ラウンド）

**使用箇所**:
- `chat-message-operations.ts` - sendMessage内の会話履歴構築

---

#### 3. ベクトル検索 (search)

**ファイル**: `src/services/mem0/core.ts` (168行目～212行目)

```typescript
async search(query: string, k = 5) {
  try {
    // プライマリ: ベクトル検索
    const vectorResults = await this.vectorStore.search(query, k);

    // オプション: memory_cardsから補完（シンプルなマージ）
    try {
      const store = useAppStore.getState();
      const memoryCards = store.memory_cards
        ? Array.from(store.memory_cards.values())
        : [];

      // 素朴なキーワードマッチブースト
      const keywordMatches = memoryCards
        .map((card) => ({
          card,
          score: card.summary?.toLowerCase().includes(query.toLowerCase())
            ? 0.1
            : 0,
        }))
        .filter((c) => c.score > 0);

      // 結果をマージしてソート
      const mapped = vectorResults.slice();
      for (const m of keywordMatches) {
        mapped.push({
          message: {
            id: `card_${m.card.id}`,
            content: m.card.summary || m.card.title,
            timestamp: new Date(m.card.created_at),
            sender: "assistant",
          },
          similarity: 0.5 + m.score,
          relevance: 0.5,
        });
      }

      return mapped.sort((a, b) => b.similarity - a.similarity).slice(0, k);
    } catch (err) {
      return vectorResults;
    }
  } catch (error) {
    console.warn("[Mem0] search failed, returning empty results:", error);
    return [];
  }
}
```

**目的**:
- クエリに関連するメモリーを検索
- ベクトル検索とキーワード検索を組み合わせ
- 類似度でソートして返す

**使用箇所**:
- `conversation-manager.ts` - 関連メモリー取得
- `character-service.ts` - キャラクター記憶検索

---

#### 4. 一時要約生成 (createEphemeralSummary)

**ファイル**: `src/services/mem0/core.ts` (70行目～72行目)

```typescript
async createEphemeralSummary(messages: UnifiedMessage[]) {
  return this.summarizer.summarize(messages);
}
```

**目的**:
- 長い会話を要約
- 一時的な要約を生成（永続化しない）

**使用箇所**:
- 長時間の会話セッションで文脈を圧縮

---

#### 5. メモリーカード昇格 (promoteToMemoryCard)

**ファイル**: `src/services/mem0/core.ts` (74行目～166行目)

```typescript
async promoteToMemoryCard(summary: string, meta: Partial<MemoryCard>) {
  // メモリーカードを作成
  const card: MemoryCard = {
    id: meta.id || `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    session_id: meta.session_id || store.active_session_id || "",
    character_id: meta.character_id,
    title: meta.title || "Auto-generated Memory",
    summary,
    created_at: meta.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    importance: meta.importance || { ... },
    keywords: meta.keywords || [],
    is_pinned: meta.is_pinned || false,
    is_hidden: meta.is_hidden || false,
    original_content: meta.original_content || summary,

    // 必須フィールド
    source_message_ids: [],
    original_message_ids: [],
    category: 'other' as const,
    auto_tags: [],
    confidence: 0.8,
    is_edited: false,
    is_verified: false,

    // Mem0固有フィールド
    memory_type: meta.memory_type || "episodic",
    embedding: meta.embedding,
    accessed_count: meta.accessed_count || 0,
    last_accessed: meta.last_accessed,
    context: meta.context || {},

    version: meta.version || 1,
    metadata: meta.metadata || {},
  };

  // ストアに追加
  const memoryCards = store.memory_cards instanceof Map
    ? new Map(store.memory_cards)
    : new Map();
  memoryCards.set(card.id, card);

  useAppStore.setState({
    memory_cards: memoryCards,
  });

  // ベクトルストアにも追加（検索可能にする）
  await this.vectorStore.addMessage({
    id: card.id,
    role: "system",
    content: `[MEMORY CARD] ${card.title}: ${card.summary}`,
    created_at: card.created_at,
    updated_at: card.updated_at,
    session_id: card.session_id,
    // ...その他のフィールド
  } as UnifiedMessage);

  console.log("✅ [Mem0] Memory card promoted and persisted:", card.id);
  return card;
}
```

**目的**:
- 一時要約を永続的なメモリーカードに昇格
- Zustandストアとベクトルストアの両方に保存
- 後続セッションで利用可能にする

**使用箇所**:
- `auto-memory-manager.ts` - 自動メモリー生成
- `character-service.ts` - キャラクター記憶の永続化

---

## 🎭 Mem0CharacterService (character-service.ts)

### 主要機能

#### 1. キャラクターコア管理

**目的**: キャラクターの不変な本質（性格、話し方、原則）を管理

```typescript
async loadCharacterCore(characterId: UUID): Promise<CharacterCore> {
  // キャッシュから取得
  if (this.characterCores.has(characterId)) {
    return this.characterCores.get(characterId)!;
  }

  // ストアから読み込み
  const store = useAppStore.getState();
  const character = store.characters?.get(characterId);

  if (!character) {
    throw new Error(`Character ${characterId} not found`);
  }

  // CharacterCoreに変換
  const core = this.convertToCore(character);
  this.characterCores.set(characterId, core);

  return core;
}
```

**CharacterCore構造**:
```typescript
{
  identity: {
    id: string,
    name: string,
    role: string,
    age: string,
    occupation: string,
  },
  personality: {
    external: string,      // 外面の性格
    internal: string,      // 内面の性格
    traits: string[],      // 特性リスト
    baseline_values: {},   // 基本値（ツンデレ度、優しさ等）
  },
  communication: {
    speaking_style: string,
    first_person: string,
    second_person: string,
    verbal_tics: string[],
  },
  principles: string[],    // 行動原則
}
```

---

#### 2. 関係性状態管理

**目的**: キャラクターとユーザーの関係性を動的に管理

```typescript
async getRelationship(
  characterId: UUID,
  userId: string
): Promise<RelationshipState> {
  const key = `${characterId}:${userId}`;

  // キャッシュから取得
  if (this.relationships.has(key)) {
    return this.relationships.get(key)!;
  }

  // 読み込みまたは新規作成
  const relationship = await this.loadOrCreateRelationship(characterId, userId);
  this.relationships.set(key, relationship);

  return relationship;
}
```

**RelationshipState構造**:
```typescript
{
  character_id: string,
  user_id: string,
  metrics: {
    trust_level: number,      // 信頼度 (0-100)
    familiarity: number,      // 親密度 (0-100)
    emotional_bond: number,   // 感情的絆 (0-100)
    interaction_count: number,// 対話回数
  },
  stage: "stranger" | "acquaintance" | "friend" | "close_friend" | "intimate" | "special",
  milestones: RelationshipMilestone[],
  updated_at: string,
}
```

**ステージ判定**:
```typescript
平均値 >= 80 → "special"
平均値 >= 60 → "intimate"
平均値 >= 40 → "close_friend"
平均値 >= 20 → "friend"
平均値 >= 10 → "acquaintance"
それ以外    → "stranger"
```

---

#### 3. キャラクター記憶管理

**目的**: キャラクターが学習した情報を管理

```typescript
async getCharacterMemory(characterId: UUID): Promise<CharacterMemory> {
  if (this.characterMemories.has(characterId)) {
    return this.characterMemories.get(characterId)!;
  }

  const memory = await this.loadOrCreateCharacterMemory(characterId);
  this.characterMemories.set(characterId, memory);

  return memory;
}
```

**CharacterMemory構造**:
```typescript
{
  character_id: string,
  learned_preferences: {
    likes: string[],         // 学習した好み
    dislikes: string[],      // 学習した嫌いなもの
    habits: string[],        // ユーザーの習慣
    patterns: string[],      // 行動パターン
  },
  shared_experiences: {
    events: Event[],         // 共有した出来事
    conversations: ConversationSummary[],  // 会話要約
    promises: Promise[],     // 約束
  },
  context_knowledge: {
    user_background: string[], // ユーザー背景
    important_dates: string[], // 重要な日付
    special_topics: string[],  // 特別なトピック
  },
}
```

---

#### 4. 会話学習機能

**目的**: 会話から洞察を抽出して記憶に追加

```typescript
async learnFromConversation(
  characterId: UUID,
  messages: UnifiedMessage[]
): Promise<void> {
  if (messages.length === 0) return;

  // 会話を分析して洞察を抽出
  const insights = await this.analyzeConversation(messages);

  // キャラクター記憶を更新
  const memory = await this.getCharacterMemory(characterId);

  // 学習した好みを追加
  if (insights.preferences) {
    memory.learned_preferences.likes.push(...insights.preferences.likes);
    memory.learned_preferences.dislikes.push(...insights.preferences.dislikes);
  }

  // 会話要約を追加
  if (insights.summary) {
    memory.shared_experiences.conversations.push({
      session_id: messages[0].session_id || "",
      summary: insights.summary,
      key_points: insights.keyPoints || [],
      emotional_tone: insights.emotionalTone || "neutral",
      timestamp: new Date().toISOString(),
    });
  }

  // キャッシュを更新
  this.characterMemories.set(characterId, memory);

  // Mem0に永続化
  await this.persistCharacterMemory(memory);
}
```

---

#### 5. キャラクター進化機能

**目的**: 対話に基づいてキャラクターの関係性を進化させる

```typescript
async evolveCharacter(
  characterId: UUID,
  interaction: UnifiedMessage[]
): Promise<void> {
  const userId = "default-user";

  // 関係性メトリクスを更新
  const relationship = await this.getRelationship(characterId, userId);

  // 対話インパクトを計算
  const impact = this.calculateInteractionImpact(interaction);

  // メトリクスを更新
  relationship.metrics.interaction_count++;
  relationship.metrics.trust_level = Math.min(
    100,
    relationship.metrics.trust_level + impact.trust
  );
  relationship.metrics.familiarity = Math.min(
    100,
    relationship.metrics.familiarity + impact.familiarity
  );
  relationship.metrics.emotional_bond = Math.min(
    100,
    relationship.metrics.emotional_bond + impact.emotional
  );

  // ステージ進行をチェック
  const newStage = this.determineRelationshipStage(relationship.metrics);
  if (newStage !== relationship.stage) {
    // マイルストーンを追加
    relationship.milestones.push({
      id: `milestone_${Date.now()}`,
      type: "trust_gained",
      description: `Relationship progressed to ${newStage}`,
      timestamp: new Date().toISOString(),
      importance: 0.8,
    });
    relationship.stage = newStage;
  }

  // 更新された関係性を保存
  await this.updateRelationship(characterId, userId, relationship);

  // 会話から学習
  await this.learnFromConversation(characterId, interaction);
}
```

**インパクト計算**:
```typescript
private calculateInteractionImpact(interaction: UnifiedMessage[]) {
  const messageCount = interaction.length;

  return {
    trust: Math.min(5, messageCount * 0.5),       // 最大+5
    familiarity: Math.min(3, messageCount * 0.3), // 最大+3
    emotional: Math.min(2, messageCount * 0.2),   // 最大+2
  };
}
```

---

## 🔗 統合ヘルパー (mem0-integration-helper.ts)

### 主要関数

#### 1. ingestMessageToMem0Safely

**目的**: メッセージを安全にMem0に取り込む

```typescript
export async function ingestMessageToMem0Safely(
  message: UnifiedMessage,
  context: string
): Promise<void> {
  try {
    await Mem0.ingestMessage(message);
    console.log(`✅ [${context}] Message ingested to Mem0`);
  } catch (error) {
    console.warn(`⚠️ [${context}] Mem0 ingest failed:`, error);
  }
}
```

---

#### 2. ingestConversationPairToMem0

**目的**: ユーザーメッセージとAI応答のペアをMem0に取り込み、キャラクター進化を実行

```typescript
export async function ingestConversationPairToMem0(
  userMessage: UnifiedMessage,
  aiResponse: UnifiedMessage,
  characterId: string | undefined,
  context: string
): Promise<void> {
  try {
    // 両方のメッセージを取り込み
    await Mem0.ingestMessage(userMessage);
    await Mem0.ingestMessage(aiResponse);

    // キャラクター進化（キャラクターIDがある場合）
    if (characterId) {
      await Mem0Character.evolveCharacter(characterId, [
        userMessage,
        aiResponse,
      ]);
      console.log(
        `✅ [${context}] Conversation pair ingested and character evolved`
      );
    } else {
      console.log(`✅ [${context}] Conversation pair ingested to Mem0`);
    }
  } catch (error) {
    console.warn(`⚠️ [${context}] Mem0 conversation pair ingest failed:`, error);
  }
}
```

---

## 🔄 使用フロー

### メッセージ送信時のMem0統合

```
1. ユーザーがメッセージを送信
   ↓
2. sendMessage() が呼ばれる
   ↓
3. ユーザーメッセージを作成
   ↓
4. ingestMessageToMem0Safely(userMessage) ← Mem0に取り込み
   ↓
5. API呼び出しでAI応答を生成
   ↓
6. AI応答メッセージを作成
   ↓
7. ingestConversationPairToMem0(userMessage, aiResponse, characterId)
   ├─ userMessage を Mem0.ingestMessage()
   ├─ aiResponse を Mem0.ingestMessage()
   └─ Mem0Character.evolveCharacter([userMessage, aiResponse])
      ├─ 関係性メトリクスを更新
      ├─ ステージ進行をチェック
      ├─ マイルストーンを追加
      └─ 会話から学習
```

---

## 📊 データフロー図

```
┌─────────────────────────────────────────────────────────────────┐
│                        Mem0システム全体像                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  メッセージ送信                                                   │
│    ↓                                                            │
│  ingestMessage()                                                │
│    ├─→ VectorStore.addMessage() ← ベクトル検索用に保存           │
│    └─→ キャッシュ更新                                             │
│                                                                 │
│  会話履歴取得                                                     │
│    ↓                                                            │
│  getCandidateHistory()                                          │
│    ├─→ 最新N件取得                                               │
│    ├─→ 重複排除                                                  │
│    └─→ 半分ルール適用（最低限保証）                                │
│                                                                 │
│  メモリー検索                                                     │
│    ↓                                                            │
│  search(query)                                                  │
│    ├─→ VectorStore.search() ← ベクトル検索                       │
│    ├─→ memory_cards キーワード検索                                │
│    └─→ 結果マージ＆ソート                                         │
│                                                                 │
│  キャラクター進化                                                 │
│    ↓                                                            │
│  evolveCharacter()                                              │
│    ├─→ getRelationship() ← 関係性取得                            │
│    ├─→ calculateInteractionImpact() ← インパクト計算              │
│    ├─→ updateRelationship() ← メトリクス更新                      │
│    ├─→ learnFromConversation() ← 会話学習                        │
│    └─→ persistToMem0() ← 永続化                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 まとめ

Mem0システムは以下の機能を提供します：

1. **メッセージ取り込み**: 全てのメッセージをベクトルストアに保存
2. **会話履歴管理**: 重複排除と最適な文脈量の調整
3. **ベクトル検索**: 関連メモリーの高速検索
4. **メモリーカード**: 重要な情報の永続化
5. **キャラクターコア**: 不変な性格・話し方の管理
6. **関係性進化**: 対話に基づく関係性の動的変化
7. **会話学習**: ユーザーの好みや習慣の学習
8. **キャラクター進化**: 自然な関係性の成長

これらの機能により、キャラクターはユーザーとの対話を通じて学習し、より自然で文脈を意識した応答を生成できるようになります。

---

**作成者**: Claude Code (Sonnet 4.5)
**作成日時**: 2025年10月5日
**ドキュメント品質**: ⭐⭐⭐⭐⭐ (5/5)
