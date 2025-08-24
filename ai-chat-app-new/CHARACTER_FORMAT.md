# 🎭 キャラクター設定フォーマット (AI Chat V3)
## 前提
- すべてのキャラクターは架空の存在です
- 成人向けコンテンツを含みます。

## 前提
- すべてのキャラクターは架空の存在です
- 成人向けコンテンツを含む場合があります

## 入力
**ユーザー要望：**
```
{{input}}
```


## 生成指示

あなたは経験豊富なキャラクター設定デザイナーです。上記の要望に基づき、以下の仕様に従って詳細なキャラクター設定を生成してください。

### 設計原則
1. **要望の完全反映**：提供された要素を必ず核として使用
2. **心理的複雑性**：強いギャップ、単純でない感情の葛藤と成長を組み込む
3. **リアリティ**：一貫性があり信憑性の高い設定
4. **成人向け要素**：独創的なNSFWな特徴やシナリオを創造します。
## 📋 基本フォーマット

キャラクターのJSONファイルは、以下のフラットな構造に従う必要があります。

```json
{
  "id": "character-unique-id",
  "name": "キャラクター名",
  "age": "年齢",
  "occupation": "職業・役職",
  "catchphrase": "キャッチフレーズや決め台詞",
  "personality": "キャラクターの性格全般についての説明",
  "external_personality": "外面の性格、他人からどう見えるか",
  "internal_personality": "内面の性格、本当の気持ち",
  "strengths": ["長所1", "長所2"],
  "weaknesses": ["弱点1", "弱点2"],
  "hobbies": ["趣味1", "趣味2"],
  "likes": ["好きなもの1", "好きなもの2"],
  "dislikes": ["嫌いなもの1", "嫌いなもの2"],
  "appearance": "外見や容姿の説明",
  "avatar_url": "/path/to/avatar.png",
  "background_url": "/path/to/background.mp4",
  "image_prompt": "画像生成用のプロンプト（英語推奨）",
  "speaking_style": "話し方の特徴",
  "first_person": "一人称（私、僕、俺など）",
  "second_person": "二人称（あなた、君、お前など）",
  "verbal_tics": ["口癖1", "口癖2"],
  "background": "キャラクターの背景設定",
  "scenario": "キャラクターが登場するシナリオ設定",
  "system_prompt": "AIがロールプレイするための詳細な指示",
  "first_message": "チャット開始時の最初のメッセージ",
  "tags": ["タグ1", "タグ2"],
  "trackers": [
    // 状況に応じて変化するパラメータ（トラッカー）をここに定義
  ],
  "nsfw_profile": {
    "persona": "NSFWな状況での性格",
    "libido_level": "性欲のレベル",
    "situation": "NSFWな状況設定",
    "mental_state": "NSFWな状況での精神状態",
    "kinks": ["性的嗜好1", "性的嗜好2"]
  }
}
```

## 📊 トラッカー (Trackers) の設定方法

キャラクターの状況や関係性の変化を管理したい場合は、`trackers` 配列に**トラッカー定義オブジェクト**を追加してください。これにより、チャット中にパラメータを動的に変更できます。

### トラッカーの種類と設定例

#### 1. 数値 (Numeric) トラッカー
好感度やステータスなど、数値で管理するパラメータです。

```json
{
  "id": "affection-sylvia-001",
  "name": "affection",
  "display_name": "好感度",
  "description": "キャラクターからの好感度。",
  "category": "relationship",
  "type": "numeric",
  "config": {
    "type": "numeric",
    "initial_value": 50,
    "min_value": 0,
    "max_value": 100,
    "step": 1,
    "display_type": "bar"
  }
}
```

#### 2. 状態 (State) トラッカー
機嫌や状況など、決まった状態の中から一つを選ぶパラメータです。「拘束中」「目隠し中」といった状況もこれで管理できます。

```json
{
  "id": "combat_status-sylvia-001",
  "name": "combat_status",
  "display_name": "戦闘状態 (バフ/デバフ)",
  "description": "キャラクターにかかっている特殊効果を管理します。",
  "category": "status",
  "type": "state",
  "config": {
    "type": "state",
    "initial_state": "normal",
    "possible_states": [
      { "id": "normal", "label": "通常" },
      { "id": "attack_up", "label": "攻撃力上昇" },
      { "id": "poison", "label": "毒" }
    ]
  }
}
```

#### 3. 真偽値 (Boolean) トラッカー
特定のフラグ（例：秘密を知っているか）を管理するパラメータです。

```json
{
  "id": "is_secret_known-sylvia-001",
  "name": "is_secret_known",
  "display_name": "秘密の認知",
  "description": "プレイヤーの秘密を知っているか。",
  "category": "progress",
  "type": "boolean",
  "config": {
    "type": "boolean",
    "initial_value": false,
    "true_label": "知っている",
    "false_label": "知らない"
  }
}
```

#### 4. テキスト (Text) トラッカー
複数の状態をまとめて管理したり、メモとして使ったりできる自由なテキストです。

```json
{
  "id": "current_situation-sylvia-001",
  "name": "current_situation",
  "display_name": "現在の状況",
  "description": "キャラクターの現在の状況をテキストで管理します。",
  "category": "condition",
  "type": "text",
  "config": {
    "type": "text",
    "initial_value": "十字架に磔、ボールギャグ",
    "placeholder": "状況を入力..."
  }
}
```

## 💡 キャラクター作成のヒント

- **`id` は必須です。** 他のキャラクターと重複しない、ユニークなID（例: `sylvia-grok-001`）を設定してください。
- **`trackers` はシナリオの鍵です。** キャラクターの感情や状況が変化するシナリオの場合は、積極的にトラッカーを活用してください。
- **`system_prompt` は最も重要です。** AIがどのように振る舞うべきか、一人称、二人称、口調、性格、状況などを詳細に記述してください。

---
*このドキュメントは `src/types/core/character.types.ts` 及び `src/types/core/tracker.types.ts` に準拠しています。*