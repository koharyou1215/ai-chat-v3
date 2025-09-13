# AIキャラクター出力指示書（完全JSON版 v2.0）

## 基本指示
以下の完全なJSONテンプレートに従ってキャラクターを作成してください。すべてのフィールドを適切に埋めて、完全なJSON形式で出力してください。

## 完全なJSONテンプレート

```json
{
  "name": "キャラクター名",
  "age": "年齢",
  "occupation": "職業",
  "catchphrase": "キャッチフレーズ",
  "personality": "性格の総合的な説明（external_personalityとinternal_personalityの要約）",
  "external_personality": "外面的性格の詳細説明",
  "internal_personality": "内面的性格の詳細説明",
  "strengths": [
    "長所1",
    "長所2",
    "長所3"
  ],
  "weaknesses": [
    "短所1",
    "短所2",
    "短所3"
  ],
  "hobbies": [
    "趣味1",
    "趣味2"
  ],
  "likes": [
    "好きなもの1",
    "好きなもの2"
  ],
  "dislikes": [
    "嫌いなもの1",
    "嫌いなもの2"
  ],
  "appearance": "外見の詳細説明（身長、髪色、服装など）",
  "avatar_url": "/uploads/images/avatar.jpg",
  "background_url": "/uploads/images/background.webp",
  "image_prompt": "AI画像生成用プロンプト（オプション）",
  "negative_prompt": "AI画像生成用ネガティブプロンプト（オプション）",
  "speaking_style": "話し方の特徴（語尾、口調など）",
  "first_person": "一人称（私、俺、僕など）",
  "second_person": "二人称（あなた、君、お前など）",
  "verbal_tics": [
    "口癖1",
    "口癖2"
  ],
  "first_message": "物語の冒頭を飾るキャラクターの個性をしっかり反映したキャラクターのセリフ200から300文字",
  "background": "背景設定の詳細",
  "scenario": "シナリオの詳細",
  "system_prompt": "システムプロンプト（AIの行動指針）",
  "tags": [
    "タグ1",
    "タグ2",
    "タグ3"
  ],
  "trackers": [
    {
      "name": "tracker_name_1",
      "display_name": "表示名1",
      "description": "トラッカーの説明",
      "config": {
        "type": "numeric",
        "initial_value": 50,
        "min_value": 0,
        "max_value": 100,
        "step": 1,
        "category": "relationship"
      }
    },
    {
      "name": "tracker_name_2",
      "display_name": "表示名2",
      "description": "トラッカーの説明",
      "config": {
        "type": "state",
        "initial_state": "初期状態",
        "possible_states": [
          {
            "id": "状態1",
            "label": "状態1"
          },
          {
            "id": "状態2",
            "label": "状態2"
          }
        ],
        "category": "condition"
      }
    },
    {
      "name": "tracker_name_3",
      "display_name": "表示名3",
      "description": "トラッカーの説明",
      "config": {
        "type": "boolean",
        "initial_value": false,
        "category": "condition"
      }
    },
    {
      "name": "tracker_name_4",
      "display_name": "表示名4",
      "description": "トラッカーの説明",
      "config": {
        "type": "text",
        "initial_value": "",
        "max_length": 500,
        "multiline": true,
        "placeholder": "プレースホルダー",
        "category": "condition"
      }
    }
  ],
  "nsfw_profile": {
    "persona": "NSFW時の性格",
    "libido_level": "欲求レベル",
    "situation": "想定状況",
    "mental_state": "精神状態",
    "kinks": [
      "嗜好1",
      "嗜好2"
    ],
    "persona_profile": "詳細な性格説明（オプション）"
  }
}
```

## トラッカー型の詳細説明

### Numeric型（数値）
```json
{
  "config": {
    "type": "numeric",
    "initial_value": 50,
    "min_value": 0,
    "max_value": 100,
    "step": 1,
    "category": "relationship"
  }
}
```

### State型（状態）
```json
{
  "config": {
    "type": "state",
    "initial_state": "初期状態",
    "possible_states": [
      {"id": "状態1", "label": "状態1"},
      {"id": "状態2", "label": "状態2"}
    ],
    "category": "condition"
  }
}
```

### Boolean型（真偽値）
```json
{
  "config": {
    "type": "boolean",
    "initial_value": false,
    "category": "condition"
  }
}
```

### Text型（テキスト）
```json
{
  "config": {
    "type": "text",
    "initial_value": "",
    "max_length": 500,
    "multiline": true,
    "placeholder": "プレースホルダー",
    "category": "condition"
  }
}
```

## 実装済み特殊トラッカーパターン

### 🔒 拘束状態管理トラッカー

**パターン1: 統合拘束状態（state型）**
```json
{
  "name": "restraint_status",
  "display_name": "拘束状態",
  "description": "現在の拘束レベルを示します。",
  "config": {
    "type": "state",
    "initial_state": "自由",
    "possible_states": [
      {"id": "自由", "label": "自由"},
      {"id": "手首拘束", "label": "手首拘束"},
      {"id": "全身拘束", "label": "全身拘束"},
      {"id": "目隠し拘束", "label": "目隠し拘束"},
      {"id": "完全拘束", "label": "完全拘束"}
    ],
    "category": "condition"
  }
}
```

**パターン2: 個別拘束管理（boolean型）**
```json
{
  "name": "hands_restrained",
  "display_name": "手拘束",
  "description": "手が拘束されているかどうか。",
  "config": {
    "type": "boolean",
    "initial_value": false,
    "category": "condition"
  }
}
```

### ⚡ バフ・デバフ管理トラッカー

**パターン1: 統合状態効果（state型）**
```json
{
  "name": "buff_status",
  "display_name": "状態効果",
  "description": "現在かかっている主要な状態効果。",
  "config": {
    "type": "state",
    "initial_state": "通常",
    "possible_states": [
      {"id": "通常", "label": "通常"},
      {"id": "興奮状態", "label": "興奮状態"},
      {"id": "疲労状態", "label": "疲労状態"},
      {"id": "混乱状態", "label": "混乱状態"},
      {"id": "催眠状態", "label": "催眠状態"}
    ],
    "category": "condition"
  }
}
```

**パターン2: 個別状態管理（boolean型）**
```json
{
  "name": "is_aroused",
  "display_name": "興奮状態",
  "description": "興奮状態にあるかどうか。感度や反応が向上。",
  "config": {
    "type": "boolean",
    "initial_value": false,
    "category": "condition"
  }
}
```

**パターン3: 数値バフ管理（numeric型）**
```json
{
  "name": "arousal_buff",
  "display_name": "興奮度バフ",
  "description": "興奮度への修正値。正の値でバフ、負の値でデバフ。",
  "config": {
    "type": "numeric",
    "initial_value": 0,
    "min_value": -50,
    "max_value": 100,
    "step": 1,
    "category": "condition"
  }
}
```

### 🎮 RPG風ステータス管理
```json
{
  "name": "health_points",
  "display_name": "HP",
  "description": "体力値。0になると気絶状態。",
  "config": {
    "type": "numeric",
    "initial_value": 100,
    "min_value": 0,
    "max_value": 100,
    "step": 1,
    "category": "status"
  }
}
```

## カテゴリ一覧
- "relationship": 関係性
- "status": ステータス
- "condition": 状態
- "emotion": 感情
- "progress": 進行度

## 重要事項
1. 必ず完全なJSON形式で出力
2. トラッカーは最低4つ作成
3. すべての必須フィールドを埋める
4. configオブジェクト構造を使用
5. 適切なカテゴリを選択
6. 初期値を適切に設定
7. personalityフィールドは必須（external_personalityとinternal_personalityの要約）
8. 画像URLは設定しない場合はnullを使用（空文字列""は禁止）
9. 画像パスは"/uploads/images/"で始まる相対パス
10. 拘束状態管理はstate型またはboolean型で実装
11. バフ・デバフはstate型、boolean型、numeric型で実装
12. 実装済みパターンを使用して矛盾を避ける

## 画像URLフィールドの扱い
- avatar_url: キャラクターアイコン画像のパス（例: "/uploads/images/character_avatar.jpg"）
- background_url: チャット背景画像のパス（例: "/uploads/images/character_bg.webp"）
- image_prompt: AI画像生成用プロンプト（オプション）
- negative_prompt: AI画像生成用ネガティブプロンプト（オプション）

画像を設定しない場合は以下のように記述：
```json
{
  "avatar_url": null,
  "background_url": null,
  "image_prompt": null,
  "negative_prompt": null
}
```

## 使用例

### 基本例
「魔法少女キャラクターを作成してください。ツンデレで、仲間を大切にする性格で、鋭敏な五感が弱点です。上記のJSONテンプレートに従って完全なJSONで出力してください。」

### 拘束状態管理例
「拘束されたキャラクターを作成してください。手首拘束から全身拘束まで段階的に変化する拘束状態トラッカーを含めてください。上記のJSONテンプレートに従って完全なJSONで出力してください。」

### バフ・デバフ例
「RPG風のキャラクターを作成してください。興奮状態、疲労状態、混乱状態などの状態効果トラッカーと、HP、MP、攻撃力などのステータストラッカーを含めてください。上記のJSONテンプレートに従って完全なJSONで出力してください。」

## 実装済み機能の活用
- 拘束状態管理: 既存の`restraint_status`パターンを使用
- バフ・デバフ: 既存の`buff_status`、`is_aroused`、`arousal_buff`パターンを使用
- RPG要素: 既存の`health_points`パターンを参考に実装
- 矛盾を避けるため、上記の実装済みパターンを優先的に使用
