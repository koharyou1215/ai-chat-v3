
#キャラクター、ユーザーペルソナ型確定版


##Character　Parameter
```json
{

  // === 必須項目 ===

  "name": "キャラクター名",

  "age": "年齢", 

  "occupation": "職業",

  "catchphrase": "キャッチフレーズ",

  

  "external_personality": "外面的性格",

  "internal_personality": "内面的性格", 

  "strengths": ["長所1", "長所2"],

  "weaknesses": ["短所1", "短所2"],

  

  "hobbies": ["趣味1", "趣味2"],

  "likes": ["好きなもの1", "好きなもの2"],

  "dislikes": ["嫌いなもの1", "嫌いなもの2"],



  "appearance": "外見説明",

  "speaking_style": "話し方",

  "first_person": "私", 

  "second_person": "あなた",

  "verbal_tics": ["口癖1", "口癖2"],

  "first_message": "物語の冒頭を飾るキャラクターの個性をしっかり反映したキャラクターのセリフ200から300文字",



  "background": "背景設定",

  "scenario": "シナリオ", 

  "system_prompt": "システムプロンプト",

  

  "tags": ["タグ1", "タグ2"],



  // === トラッカー（最低各キャラの個性を引き立てるもの4つ）===

  "trackers": [

    {

      "name": "favorability",

      "display_name": "好感度",

      "type": "numeric", 

      "initial_value": 50,

      "max_value": 100,

      "min_value": 0,

      "category": "relationship",

      "persistent": true,

      "description": "説明"

    }

  ],



  // === NSFW設定（必要ならば。）===

  "nsfw_profile": {

    "persona": "NSFW時の性格",

    "libido_level": "欲求レベル",

    "situation": "想定状況", 

    "mental_state": "精神状態",

    "kinks": ["嗜好1", "嗜好2"]

  }

}

```



---



## トラッカー定義ガイドライン



### 🔒 拘束状態管理トラッカー



**パターン1: 統合拘束状態（state型）**

```json

{

  "name": "restraint_status",

  "display_name": "拘束状態",

  "type": "state",

  "initial_state": "自由",

  "possible_states": ["自由", "手首拘束", "全身拘束", "目隠し拘束", "完全拘束"],

  "category": "condition",

  "persistent": true,

  "description": "現在の拘束レベルを示します。"

}

```



**パターン2: 個別拘束管理（boolean型）**

```json

{

  "name": "hands_restrained",

  "display_name": "手拘束", 

  "type": "boolean",

  "initial_boolean": false,

  "category": "condition",

  "persistent": true,

  "description": "手が拘束されているかどうか。"

}

```



### ⚡ バフ・デバフ管理トラッカー



**パターン1: 統合状態効果（state型）**

```json

{

  "name": "buff_status",

  "display_name": "状態効果",

  "type": "state",

  "initial_state": "通常", 

  "possible_states": ["通常", "興奮状態", "疲労状態", "混乱状態", "催眠状態"],

  "category": "condition",

  "persistent": true,

  "description": "現在かかっている主要な状態効果。"

}

```



**パターン2: 個別状態管理（boolean型）**

```json

{

  "name": "is_aroused",

  "display_name": "興奮状態",

  "type": "boolean", 

  "initial_boolean": false,

  "category": "condition",

  "persistent": true,

  "description": "興奮状態にあるかどうか。感度や反応が向上。"

}

```



**パターン3: 数値バフ管理（numeric型）**

```json

{

  "name": "arousal_buff",

  "display_name": "興奮度バフ",

  "type": "numeric",

  "initial_value": 0,

  "min_value": -50, 

  "max_value": 100,

  "category": "condition", 

  "persistent": true,

  "description": "興奮度への修正値。正の値でバフ、負の値でデバフ。"

}

```



### 🎮 RPG風ステータス管理

```json

{

  "name": "health_points",

  "display_name": "HP",

  "type": "numeric",

  "initial_value": 100,

  "min_value": 0,

  "max_value": 100, 

  "category": "status",

  "persistent": true,

  "description": "体力値。0になると気絶状態。"

}

```



### 🎯 重要なポイント

- **"type"は必須** - "numeric", "state", "boolean"のいずれか

- **初期値の命名規則**: numeric→"initial_value", state→"initial_state", boolean→"initial_boolean"

- **"possible_states"は文字列配列**で指定

- **"persistent": true** - セッション間での状態保持

```
- - - 
##ユーザーペルソナ


{
  "name": "ペルソナ名",
  "role": "ロール",
  "other_settings": "詳細情報（構造化テキスト）",
  "avatar_path": "/uploads/personas/avatar_123.png" // または null
}