# 🎯 AI Chat V3 - Prompt Verification Guide

## 📋 Quick Reference for Development & Deployment

This guide provides a **fast, systematic approach** to verify that all AI prompts are correctly structured and contain all required information for consistent character behavior.

---

## ⚡ Quick Verification Checklist

### **Before Every Deployment** ✅

- [ ] **Character Information**: Name, personality, speaking style are populated
- [ ] **Persona Integration**: User context is properly defined and referenced  
- [ ] **Tracker Values**: Character state reflects current session values
- [ ] **Memory System**: Pinned memories and context are accessible
- [ ] **System Instructions**: Core behavioral rules are intact

---

## 🏗️ プロンプト生成システム現状 (2025年9月リファクタリング完了)

### ⚡ ソロチャット vs グループチャット - 実装差異

**重要:** 現在のシステムは**2つの異なるプロンプト生成方式**が併存しています

```
┌─────────────────────────────────────────────────────────────────┐
│                    プロンプト生成アーキテクチャ                   │
├─────────────────────────────────────────────────────────────────┤
│ ソロチャット                │ グループチャット                   │
├─────────────────────────────┼───────────────────────────────────┤
│ 🎯 統一システム             │ 🔧 分散処理                       │
│ • PromptBuilderService      │ • 直接生成(groupChat.slice.ts)    │
│ • ConversationManager       │ • generateCompactGroupPrompt()    │
│ • /api/chat/generate        │ • simpleAPIManagerV2直接呼び出し  │
│ • ✅ リファクタリング済み    │ • グループチャット独立実装        │
│                             │                                   │
│ 🎭 プロンプト構造            │ 🎭 プロンプト構造                  │
│ • 統一8段階構成             │ • コンパクト/フル自動切替          │
│ • メモリー・トラッカー統合   │ • なりすまし防止特化               │
│ • 再生成指示統合            │ • グループダイナミクス重視         │
│                             │                                   │
│ 🚀 フロー                   │ 🚀 フロー                         │
│ 1. chat-message-operations.sendMessage │ 1. GroupChatSlice.sendMessage     │
│ 2. PromptBuilderService               │ 2. generateCharacterResponse      │
│ 3. ConversationManager                │ 3. 直接プロンプト生成             │
│ 4. /api/chat/generate                 │ 4. simpleAPIManagerV2.generateMessage │
│ 5. SimpleAPIManagerV2                 │ 5. GeminiClient                   │
│                                        │                                   │
│ 📁 分割モジュール (2025年9月):          │                                   │
│ • chat-message-operations.ts          │                                   │
│ • chat-session-management.ts          │                                   │
│ • chat-tracker-integration.ts         │                                   │
│ • chat-progressive-handler.ts         │                                   │
└─────────────────────────────┴───────────────────────────────────┘
```

### 🎨 インスピレーション機能の複雑なアーキテクチャ

**マルチモード対応システム:**
```
┌─────────────────────────────────────────────────────────────────┐
│                  InspirationService統合システム                  │
├─────────────────────────────────────────────────────────────────┤
│ ソロモード                    │ グループモード                   │
├───────────────────────────────┼─────────────────────────────────┤
│ ConversationManager経由       │ 直接GroupSession参照             │
│ メモリーカード統合            │ グループメモリー分離             │
│ 単一キャラクター文脈          │ 複数キャラクター考慮             │
│                               │                                 │
│ 共通：4タイプ提案生成システム                                   │
│ ├─ continuation (共感・受容型)                                  │
│ ├─ question (質問・探求型)                                      │
│ ├─ topic (トピック展開型)                                       │
│ └─ creative (クリエイティブ型)                                  │
│                               │                                 │
│ SuggestionSlice状態管理 → ReplySuggestions.tsx表示             │
└─────────────────────────────────────────────────────────────────┘
```

**修正済み問題 (2025年9月10日):**
- ❌ **旧:** chat.slice.ts 2239行の巨大ファイル → 保守性低下
- ✅ **新:** 4つのモジュールに分割、83行のコアファイルに最適化
- ❌ **旧:** メモリーカードが拡張プロンプトでのみ読み込み → 反映されない
- ✅ **新:** 基本プロンプトで即座に読み込むように修正
- ❌ **旧:** 会話履歴上限がハードコード → 設定値無視
- ✅ **新:** `max_context_messages`設定値を全箇所で使用
- ❌ **旧:** トラッカー管理がセッションベース → 不整合
- ✅ **新:** キャラクターIDベースに統一

**修正済み問題 (2025年8月31日):**
- ❌ **旧:** 白い画面・全機能停止 → Zustand無限ループエラー
- ✅ **新:** MessageInput.tsx・ChatSidebar.tsxでuseCallback selectors削除、直接destructuring採用
- ❌ **旧:** OpenRouter API 401エラー → 認証失敗による機能不全
- ✅ **新:** OPENROUTER_API_KEY環境変数追加、デプロイ時セキュリティロック対応
- ❌ **旧:** テキスト選択メニュー無反応 → 強化・翻訳・説明機能未実装
- ✅ **新:** 完全なAPIエンドポイント統合、関数名修正で機能復旧
- ❌ **旧:** インスピレーション機能不安定 → パース失敗・フォールバック多発
- ✅ **新:** 成功例ベースの改良版実装、複数パース方式で安定動作

**修正済み問題 (2025年8月30日):**
- ❌ **旧:** 空のuserMessage → テンプレート応答「はい、そうですね」
- ✅ **新:** 適切なメッセージ内容 → 多様で創造的な提案生成

---

## 📊 Progressive Message System (新機能)

**3段階の段階的レスポンス生成システム:**

```
┌─────────────────────────────────────────────────────────────────┐
│              Progressive Message Architecture                    │
├─────────────────────────────────────────────────────────────────┤
│ Stage 1 (1-2秒)              │ 即座の応答・確認                 │
│ • Quick acknowledgment       │ • ユーザー入力の理解確認         │
│ • Initial reaction           │ • 簡潔な初期応答                 │
├──────────────────────────────┼──────────────────────────────────┤
│ Stage 2 (2-4秒)              │ 詳細な説明・メインコンテンツ     │
│ • Core response content      │ • 完全な応答内容                 │
│ • Detailed explanation       │ • 必要な情報の提供               │
├──────────────────────────────┼──────────────────────────────────┤
│ Stage 3 (4-6秒)              │ 追加情報・提案                   │
│ • Additional insights        │ • 関連する提案                   │
│ • Follow-up suggestions      │ • 会話の継続促進                 │
└─────────────────────────────────────────────────────────────────┘
```

**実装ファイル:** `src/components/chat/ProgressiveMessageBubble.tsx`

---

## 📋 ソロチャット プロンプト構造 (統一8段階) ✅ 2025年9月リファクタリング完了

**PromptBuilderService & ConversationManager統合フロー:**

```
1. AI/User Definition          → AI= {{char}}, User={{user}}
2. System Instructions         → <system_instructions>...</system_instructions>
3. Jailbreak (有効時)          → <jailbreak>...</jailbreak>
4. Character Information       → <character_information>...</character_information>
5. Persona Information         → <persona_information>...</persona_information>
6. Relationship State          → <relationship_state>...</relationship_state> (トラッカー情報)
7. Memory Context              → <memory_context>...</memory_context> (メモリーカード)
8. Current Input               → ## Current Input\n{{user}}: [input]\n {{char}}:
```

**🔧 2025年9月修正内容:**
- ✅ メモリーカードが基本プロンプトで即座に読み込まれるように修正
- ✅ 会話履歴上限が設定値(`max_context_messages`)を使用するように修正
- ✅ ペルソナ情報の`nsfw_persona`参照を削除（存在しないプロパティ）
- ✅ トラッカー管理をキャラクターIDベースに統一

---

## 🎭 グループチャット プロンプト構造 (動的切替)

### ⚙️ 自動モード判定システム
```typescript
// groupChat.slice.ts内のロジック
const USE_COMPACT_MODE = isGemini || groupSession.characters.length > 2;
```

### 📊 コンパクトモード vs フルモード

**コンパクトモード (Gemini使用時・3人以上):**
```
1. キャラクター定義           → 簡潔な役割説明
2. 禁止事項 (最重要)          → なりすまし・地の文・AI言及禁止
3. グループ状況              → 参加者・シナリオ要約
4. 応答指示                  → セリフのみ出力指示
```
**生成:** `generateCompactGroupPrompt()` [character-summarizer.ts]

**フルモード (OpenRouter使用・2人以下):**
```
1. 【超重要・絶対厳守】ヘッダー → キャラクター宣言
2. 唯一のタスク              → セリフのみ生成指示
3. 禁止事項 (詳細)           → 300行の厳格な制約
4. キャラクター人物設定       → 性格・話し方・一人称等
5. グループチャット状況       → ユーザー・他参加者・シナリオ
6. 応答形式指示              → セリフのみ出力厳守
```
**生成:** 直接生成 [groupChat.slice.ts内 600-650行]

### 🚨 グループチャット特有の重要要素

**キャラクター境界強制システム:**
```xml
=== 禁止事項（違反厳禁） ===
- **地の文やナレーションの禁止:** 「〇〇は言った」等の三人称描写禁止
- **他キャラなりすまし禁止:** あなた以外のキャラのセリフ・行動生成禁止  
- **AI自己言及禁止:** "AI", "モデル", "システム"等の単語使用厳禁
```

**トークン配分制御:**
```typescript
// perCharacterMaxTokens計算
const baseTokens = Math.max(250, Math.floor(totalTokens / activeCharacters.length));
```

---

## 🔍 Section-by-Section Verification

### 1. **System Instructions** (Critical - Never Skip)
```xml
<system_instructions>
## Core Rules
- Character consistency enforcement
- Knowledge limitation boundaries  
- No meta-commentary about AI nature
- Natural dialogue requirements
</system_instructions>
```
**✅ Must Have**: Behavioral constraints, character boundary enforcement

### 2. **Character Information** (Essential for Personality)
```xml
<character_information>
## Basic Information
Name: [character.name]
Personality: [character.personality]
Speaking Style: [character.speaking_style]

## Communication Details
First Person: [character.first_person]
Second Person: [character.second_person]
Verbal Tics: [character.verbal_tics]

## Context
Background: [character.background]
Current Scenario: [character.scenario]

## Special Context (NSFW Profile)
Context Profile: [character.nsfw_profile.persona_profile]
Libido Level: [character.nsfw_profile.libido_level]
Preferences: [character.nsfw_profile.kinks]
</character_information>
```
**✅ Must Have**: Name, personality, speaking_style (minimum required)
**🔧 Processing**: Variable replacement applied via `replaceVariablesInCharacter()`
**🔧 Enhanced**: Now includes complete NSFW profile fields from Character Form

### 3. **Persona Information** (User Context)
```xml
<persona_information>
Name: [persona.name]
Role: [persona.role] 
Description: [persona.description]
Additional Settings: [persona.other_settings]
</persona_information>
```
**✅ Must Have**: Always present (even if default persona)
**🔧 Enhanced**: Now includes `other_settings` for additional persona customization
**⚠️ Warning Sign**: If missing, character loses user awareness

### 4. **Memory System** (Context Continuity)
```xml
<pinned_memory_cards>
[category] title: summary
Keywords: keyword1, keyword2, keyword3
</pinned_memory_cards>

<relevant_memory_cards>
[category] title: summary  
Keywords: keyword1, keyword2, keyword3
</relevant_memory_cards>
```
**✅ Must Work**: References past conversations and important events
**🔧 System**: Managed by ConversationManager

### 5. **Tracker Information** (Character State)
```xml
<character_trackers>
## [Tracker Name]
Current Value: [value] (Range: [min]-[max])
Description: [behavioral impact explanation]
</character_trackers>
```
**✅ Must Reflect**: Current session character state and development
**🔧 System**: Managed by TrackerManager

---

## 🎭 グループチャット専用検証システム

### 🚨 Critical Group Chat Verification Checklist

**必須検証項目 (グループチャット):**

#### **🎯 キャラクター境界 (最重要)**
- [ ] **単一キャラクター応答**: レスポンスが1人のキャラクターのセリフのみ
- [ ] **なりすまし防止**: 他キャラクターの名前・行動への言及なし
- [ ] **一人称一致**: 対象キャラクターの設定と一致
- [ ] **地の文排除**: ナレーション・三人称描写が完全に排除

#### **⚙️ システム動作確認**  
- [ ] **モード判定**: Gemini使用時・3人以上でコンパクトモード自動選択
- [ ] **トークン配分**: 最低250トークン/キャラ確保されている
- [ ] **再生成機能**: ソロチャットと同等に動作 (2025/8/30修正済み)
- [ ] **API統合**: フォールバック機能が正常動作

#### **🎨 シナリオ・ロール統合**
- [ ] **役割認識**: キャラクターが割り当てられた役割を理解
- [ ] **世界観反映**: グループシナリオの設定・背景を反映
- [ ] **関係性**: 他参加者との関係性が適切に表現

### 🚨 Group Chat Failure Patterns

**❌ キャラクター境界違反例:**
```
失敗: "美咲は微笑みながら「そうですね」と答えた"
正解: "そうですね"

失敗: "こんにちは！" 田中さんも「はじめまして」と挨拶した  
正解: "こんにちは！"

失敗: "*頭を掻きながら* えーっと..."
正解: "えーっと..."
```

**❌ システム動作異常例:**
```
問題: レスポンス <20文字 → トークン配分不足
問題: 再生成ボタン無反応 → APIエンドポイント不一致 (修正済み)
問題: 長い応答時間 >30秒 → コンパクトモード未適用
```

### 🛠️ Group Chat Debug Commands

**開発モード確認:**
```bash
npm run dev
# コンソールで確認すべきログ:
# ✅ 🎯 [キャラクター名] トークン配分: 250
# ✅ 🤖 [SimpleAPIManagerV2] プロンプト長さ確認  
# ✅ Group message generated successfully
# ❌ 🔄 Attempting fallback via OpenRouter (Gemini障害時)
```

**よくある問題と解決:**

| 症状 | 原因 | 解決方法 |
|------|------|----------|
| **白い画面・アプリ停止** | Zustand無限ループ | useCallback selectors削除、直接destructuring使用 (2025/8/31修正済み) |
| **テキスト選択無反応** | API統合不完全・関数名不一致 | APIエンドポイント統合、continue/regenerate関数名修正 (2025/8/31修正済み) |
| **OpenRouter認証失敗** | API key不足・デプロイロック | OPENROUTER_API_KEY環境変数追加、キー更新 (2025/8/31修正済み) |
| **デプロイ失敗・依存関係** | tw-animate-css package未インストール | package.jsonに依存関係追加 (2025/8/31修正済み) |
| **他キャラのセリフ混入** | 境界制御失敗 | システムプロンプト禁止指示強化 |
| **レスポンス短すぎる** | トークン不足 | baseTokens計算・API設定確認 |
| **シナリオ無視** | ロール統合失敗 | scenario.character_roles確認 |
| **再生成エラー** | エンドポイント不一致 | 2025/8/30修正で解決済み |

---

## 🎨 インスピレーション機能検証
inspiration-service.ts v3 - 成功例ベース改良版

### 📊 現在の成功動作パターン (2025年8月31日修正版)

**返信提案: generateReplySuggestions(...)**
- **プロンプト構造**: 明確な番号付き出力指示（1. 2. 3.）
- **パース方式**: 3段階フォールバック（番号付き→ブラケット→改行区切り）
- **成功率向上**: 旧プロジェクトの実装パターンを移植

```typescript
// 成功プロンプト例
`以下の形式で3つの返信を生成してください：

1. 相手の気持ちに寄り添い理解を示す返信（100-150文字）
2. 興味を持って質問し会話を深める返信（100-150文字）  
3. 新しい視点や話題を提供する返信（100-150文字）

注意事項：
- 各返信は番号（1. 2. 3.）で始めること
- 説明や見出しは不要、返信文のみ`
```

**パース処理: parseReplySuggestionsAdvanced()**
1. **番号付きリスト**: `/(?=\d+\.)/` で分割、クリーンアップ
2. **ブラケット形式**: `/\[([^\]]+)\]\s*([\s\S]*?)(?=\[|$)/g` で抽出
3. **改行区切り**: フォールバックとして改行分割

**カスタムプロンプト対応**: 複数のプレースホルダーパターン
- `{{conversation}}` → 会話履歴置換
- `{{user}}と {{char}}間の会話履歴` → 旧形式互換
- プレースホルダー未検出時は自動的に末尾追加
prompt-templates.ts

DEFAULT_PROMPT_TEMPLATES に返信提案系・文章強化系テンプレートが収録されている（例: friendly-suggestions, professional-suggestions, expand-detail, add-emotion, make-polite）。
各テンプレートは id, category, template と変数リストを持つ（{{context}}, {{text}} など）。
SettingsModal.tsx

UI上で編集できるプロンプトのキー:
systemPrompts.replySuggestion（返信提案プロンプトの textarea）
systemPrompts.textEnhancement（文章強化プロンプトの textarea）
また systemPrompts.system と systemPrompts.jailbreak も存在（SystemPrompts 型）。
AIPanel 内で onUpdateSystemPrompts({ ...systemPrompts, [key]: value }) により更新される流れ。
settings.types.ts

SystemPrompts 型定義:
keys: system, jailbreak, replySuggestion, textEnhancement
MessageInput.tsx

ボタン押下での呼び出しロジック:
返信提案ボタン -> handleSuggestClick() が呼ばれる。中で
if is_group_mode && active_group_session_id → groupSession から recentMessages / activeChars / user を取得して generateSuggestions(...) を呼ぶ（グループ用のコンテキスト）。
else（ソロ）→ session から recentMessages と character/user を取り generateSuggestions(...) を呼ぶ。
文章強化ボタン -> handleEnhanceClick() と同様にグループ/ソロで enhanceTextForModal(...) を呼ぶ。
つまりソロ/グループで渡す recentMessages や character/user が異なるため、生成結果が変わる。
ReplySuggestions.tsx

提案のUI表示（タイプ別ラベル: continuation, question, topic, creative） — 提案の type は getApproachType() 等で決定される。
なぜ「思った通りにならない」ことが起きやすいか（簡潔な分析）
プロンプトが複数箇所に分かれている
設定UIの systemPrompts.*、DEFAULT_PROMPT_TEMPLATES、inspiration-service 内のデフォルトテンプレートの3系統があるため、どれが使われているかで差が生じる。
テンプレート形式依存
extractApproachesFromPrompt（[...]）や parseSuggestions の解析ルールに生成フォーマットが合わないと期待どおりに分割・抽出されない。
ソロ／グループのコンテキスト差
recentMessages、character の選び方や範囲が変わることで出力が変わる（グループは複数キャラの情報を使う場合がある）。
max_tokens / API config の違い
Inspiration 用に max_tokens を大きく取る等の調整があるため、同じプロンプトでも出力長やスタイルが変わる可能性。
### 📊 Inspiration System Verification
###**返信提案**
###**理想とする動作**: **全く異なるパターンの返信を。2から3パターン生成**
**✅ 必須動作確認:**
- [ ] **ソロ・グループ対応**: 両モードで適切な提案生成
- [ ] **テンプレート排除**: 「はい、そうですね」等の汎用応答なし
- [ ] **文脈連携**: 会話履歴・キャラクター性格を反映

**❌ よくある失敗パターン:**
```
失敗: "はい、そうですね。それについて詳しく説明します。"
正解: キャラクター固有の個性的な提案

失敗: 全提案が同じようなトーン
正解: 4タイプそれぞれ異なるアプローチ

失敗: 会話文脈を無視した提案  
正解: 直前のメッセージに適切に応答する提案
```

**🔧 Debug方法:**
```bash
# ReplySuggestions表示確認
# 1. インスピレーションボタンクリック
# 2. 4タイプのアイコン・ラベル表示確認
# 3. 提案内容の多様性・適切性確認
# 4. 再生成で異なる提案生成確認
```

---

## ⚠️ Common Failure Patterns & Quick Fixes (All Modes)

| **Problem** | **Symptoms** | **Quick Fix** |
|-------------|--------------|---------------|
| **Missing Character Info** | Generic responses, no personality | Check character data loading |
| **Lost Persona Context** | AI ignores user's role/name | Verify persona selection integration |
| **Broken Trackers** | Behavior doesn't match tracker values | Ensure TrackerManager initialization |
| **Memory Not Working** | No reference to past conversations | Check ConversationManager setup |
| **Inconsistent Speaking** | Wrong first/second person usage | Verify character.speaking_style data |

---

## 🛠️ Development Testing Methods

### **Method 1: Enable Debug Logging**
```bash
# Add to .env.local
NODE_ENV="development"
```
**Expected Output**: Full prompt content in terminal during chat

### **Method 2: Check SimpleAPIManagerV2 Logs**  
Look for these log patterns:
```
🤖 ===== API Manager Generate =====
🎯 System prompt (1920 chars): AI=CharacterName, User=PersonaName...
```

### **Method 3: Response Quality Check**
- ✅ Character uses correct speaking style
- ✅ Character acknowledges user's persona/role
- ✅ Behavior reflects current tracker values  
- ✅ References relevant memories when appropriate

---

## 🚨 実践的検証フロー (2分でできる確認)

### **ソロチャット検証**
1. **新しいセッション開始**
2. **トラッカー付きキャラクター選択** 
3. **テストメッセージ送信**
4. **応答内容確認**:
   - キャラクター固有の話し方 ✅
   - ユーザーペルソナ言及 ✅ 
   - トラッカー値反映 ✅
   - メモリー参照 ✅

### **グループチャット検証 (追加)**
1. **グループセッション作成** (2-3キャラ)
2. **シナリオ設定** (推奨)
3. **各キャラクターに発言**
4. **必須確認事項**:
   - 各キャラが自分のセリフのみ ✅
   - 他キャラなりすまし・地の文なし ✅
   - シナリオ役割反映 ✅
   - 再生成ボタン動作 ✅

### **インスピレーション機能検証**
1. **ソロ・グループ両方でテスト**
2. **インスピレーションボタンクリック**
3. **4タイプ提案表示確認**:
   - 共感・受容型 (❤️) ✅
   - 質問・探求型 (🧠) ✅ 
   - トピック展開型 (⚡) ✅
   - クリエイティブ型 (⭐) ✅
4. **再生成で異なる提案** ✅

### **🚩 Critical Red Flags**

**ソロチャット:**
- 汎用的な応答 (個性なし)
- "あなた"呼び (ペルソナ名使用せず)
- トラッカー値無視
- 会話記憶なし

**グループチャット:**
- 他キャラのセリフ混入
- 「○○は言った」等の地の文
- シナリオ設定無視  
- 再生成ボタン無反応

**インスピレーション:**
- テンプレート応答「はい、そうですね」
- 4タイプ全て同じ内容
- 会話文脈無視

---

## 📁 Key Implementation Files (✅ 2025年9月リファクタリング完了)

| **Component** | **File Path** | **Responsibility** |
|---------------|---------------|-------------------|
| **Prompt Builder** | `src/services/prompt-builder.service.ts` | Main orchestration |
| **Prompt Generator** | `src/services/memory/conversation-manager.ts` | Core prompt assembly |
| **Character State** | `src/services/tracker/tracker-manager.ts` | Tracker value management |
| **Data Processing** | `src/utils/variable-replacer.ts` | Character variable replacement |
| **Chat Core** | `src/store/slices/chat.slice.ts` | Core state (83行) |
| **Message Operations** | `src/store/slices/chat/chat-message-operations.ts` | メッセージ送信・再生成 |
| **Session Management** | `src/store/slices/chat/chat-session-management.ts` | セッション管理 |
| **Tracker Integration** | `src/store/slices/chat/chat-tracker-integration.ts` | トラッカー統合 |
| **Progressive Handler** | `src/store/slices/chat/chat-progressive-handler.ts` | プログレッシブ応答 |
| **API Communication** | `src/services/simple-api-manager-v2.ts` | Final prompt delivery |

---

## 💡 Quick Debugging Commands

```bash
# Check current prompt structure (if logging enabled)
npm run dev
# Then send a chat message and check terminal output

# Verify character data integrity
# Look for: character.json files in public/characters/

# Check persona integration  
# Look for: persona selection in chat interface

# Validate tracker functionality
# Look for: tracker values in right panel of chat interface
```

---

## ✅ Success Indicators

**🎯 Perfect Integration**:
- Character responds with unique personality traits
- User is addressed by persona name/role
- Character behavior aligns with tracker states
- Conversation context is maintained across sessions
- No generic AI-like responses

**⚡ Quick Test Message**: `"How do you feel about our current situation?"`
- Should trigger personality, tracker state, and context references

---

This guide ensures **rapid verification** that all prompt systems are working correctly without needing complex debugging tools or extensive code changes.