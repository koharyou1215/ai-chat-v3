// Inspiration Service v3 - 成功例を基にした改良版
// 返信提案と文章強化機能のためのサービス

import { UnifiedMessage } from "@/types/memory";
import { simpleAPIManagerV2 } from "@/services/simple-api-manager-v2";
import { apiRequestQueue } from "@/services/api-request-queue";
import { APIConfig, Character, Persona } from "@/types";
import { logger } from "@/utils/logger";

export interface InspirationSuggestion {
  id: string;
  type: "empathy" | "question" | "topic";
  content: string;
  confidence: number;
}

export class InspirationService {
  /**
   * 返信提案生成 - 3つのアプローチで150文字程度
   */
  async generateReplySuggestions(
    recentMessages: UnifiedMessage[],
    character: Character,
    user: Persona,
    customPrompt?: string,
    isGroupMode: boolean = false,
    apiConfig?: Partial<APIConfig> & { openRouterApiKey?: string }
  ): Promise<InspirationSuggestion[]> {
    // 🔍 デバッグ: 渡されたメッセージ情報を確認
    logger.debug("🔍 [InspirationService] generateReplySuggestions called with:", {
      characterName: character?.name,
      userName: user?.name,
      messageCount: recentMessages?.length || 0,
      isGroupMode,
    });

    // 🔍 デバッグ: 全メッセージの詳細を表示
    logger.debug("📋 [InspirationService] 全メッセージ内容:");
    recentMessages?.forEach((msg, index) => {
      logger.debug(`  [${index + 1}] ${msg.role === "user" ? "👤ユーザー" : "🤖" + (msg.character_name || "キャラ")}:`, {
        content: msg.content?.substring(0, 100) || "(空)",
        fullLength: msg.content?.length || 0,
        character_name: msg.character_name,
        timestamp: msg.timestamp,
      });
    });

    const context = this.buildContext(recentMessages, isGroupMode);

    // 🔍 デバッグ: 構築されたコンテキストを表示
    logger.debug("📝 [InspirationService] 構築された会話コンテキスト:");
    logger.debug(context);
    logger.debug("📏 コンテキスト長:", context.length, "文字");

    let prompt: string;
    if (customPrompt) {
      // 🔧 FIX: ${} 形式と {{}} 形式の両方をサポート
      const userName = user?.name || "ユーザー";
      const charName = character?.name || "キャラクター";

      logger.debug("🔧 [InspirationService] カスタムプロンプトの変数置換:");
      logger.debug(`  - userName: ${userName}`);
      logger.debug(`  - charName: ${charName}`);
      logger.debug(`  - context length: ${context.length}文字`);
      logger.debug(`  - 置換前プロンプト（先頭200文字）: ${customPrompt.substring(0, 200)}`);

      prompt = customPrompt
        // ${} 形式の変数を置換
        .replace(/\$\{context\}/g, context)
        .replace(/\$\{userName\}/g, userName)
        .replace(/\$\{charName\}/g, charName)
        // {{}} 形式の変数も置換（後方互換性のため）
        .replace(/\{\{conversation\}\}/g, context)
        .replace(/\{\{user\}\}と\{\{char\}\}間の会話履歴/g, context)
        .replace(/会話履歴:/g, `会話履歴:\n${context}`)
        .replace(/\{\{user\}\}/g, userName)
        .replace(/\{\{char\}\}/g, charName)
        .replace(/\{\{context\}\}/g, context);

      logger.debug(`  - 置換後プロンプト（先頭200文字）: ${prompt.substring(0, 200)}`);

      // プレースホルダーが見つからない場合は末尾に追加
      if (prompt === customPrompt) {
        logger.warn("⚠️ [InspirationService] プレースホルダーが見つかりませんでした。末尾に会話履歴を追加します。");
        prompt = `${customPrompt}\n\n会話履歴:\n${context}`;
      }
    } else {
      prompt = this.buildReplySuggestionPrompt(
        context,
        character,
        user,
        isGroupMode
      );
    }

    // 🔍 デバッグ: 生成されたプロンプトの一部を表示
    logger.debug("📤 [InspirationService] 生成されたプロンプト（先頭1000文字）:");
    logger.debug(prompt.substring(0, 1000));
    logger.debug("📏 プロンプト全体の長さ:", prompt.length, "文字");

    // 🔧 リトライロジックの追加
    // 🔧 OPTIMIZATION: リトライ回数を削減（3→2）してRPM制限への影響を軽減
    const maxRetries = 2;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`📤 返信提案API呼び出し開始 (試行 ${attempt}/${maxRetries})`);
        logger.debug(
          `📊 返信提案 max_tokens: ${
            apiConfig?.max_tokens || 2048
          } (設定値を使用)`
        );
        logger.debug(`🔧 返信提案: AIタブのトグルで自動判定`);

        const response = await apiRequestQueue.enqueueInspirationRequest(
          async () => {
            try {
              // APIキーとモデル設定を適切に渡す
              const result = await simpleAPIManagerV2.generateMessage(
                prompt,
                "返信提案を生成",
                [],
                {
                  model: apiConfig?.model,
                  provider: apiConfig?.provider,
                  openRouterApiKey: apiConfig?.openRouterApiKey,
                  geminiApiKey: apiConfig?.geminiApiKey,
                  useDirectGeminiAPI: apiConfig?.useDirectGeminiAPI,
                  temperature: apiConfig?.temperature || 0.7,
                  max_tokens: apiConfig?.max_tokens || 4096, // 🔧 2048→4096に増加
                  top_p: apiConfig?.top_p || 0.9,
                  enableCache: false, // 🔥 インスピレーションは毎回異なる提案が必要なためキャッシュ無効
                }
              );
              logger.debug(
                "📥 API応答受信（先頭200文字）:",
                result.substring(0, 200)
              );

              // 🔧 空の応答を検出
              if (!result || result.trim().length === 0) {
                throw new Error("APIから空の応答が返されました");
              }

              return result;
            } catch (error) {
              // 🔧 より詳細なエラーログ（model、provider情報を含む）
              logger.error(`❌ インスピレーションAPI呼び出しエラー (試行 ${attempt}):`, {
                error: error instanceof Error ? error.message : String(error),
                model: apiConfig?.model,
                provider: apiConfig?.provider,
                useDirectGeminiAPI: apiConfig?.useDirectGeminiAPI,
              });
              throw error;
            }
          }
        );

        // 成功例のパース方法を採用
        const suggestions = this.parseReplySuggestionsAdvanced(response);

        if (suggestions.length === 0) {
          // 🔧 デバッグ: 実際の応答内容を確認
          logger.error("❌ パース失敗: 返信提案を抽出できませんでした");
          logger.error("📄 API応答全文:", response);
          logger.error("📏 応答長:", response.length, "文字");

          // 応答が期待形式でなかった場合は明示的にエラーにして、
          // 呼び出し元でエラーハンドリング（例: 表示）を行えるようにする
          throw new Error("返信提案を抽出できませんでした（応答のパースに失敗）");
        }

        // 🔧 FIX: 品質検証と改善を追加
        const validatedSuggestions = this.validateAndFixSuggestions(suggestions, 3);

        if (validatedSuggestions.length < 3 && attempt < maxRetries) {
          logger.warn(`⚠️ 有効な提案が${validatedSuggestions.length}件のみ（3件必要）、リトライします`);
          // 3件未満の場合は次の試行へ
          lastError = new Error(`有効な提案が不足しています（${validatedSuggestions.length}/3件）`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }

        // 3件揃ったか、最終試行で1件以上あれば返す
        if (validatedSuggestions.length >= 3 || (attempt === maxRetries && validatedSuggestions.length > 0)) {
          if (validatedSuggestions.length < 3) {
            logger.warn(`⚠️ 最終試行: ${validatedSuggestions.length}件のみですが返却します`);
          }
          return validatedSuggestions;
        }

        // 0件の場合は次の試行へ
        lastError = new Error(`有効な提案が抽出できませんでした（0件）`);
        continue;
      } catch (error: unknown) {
        lastError = error;

        // 🔧 Internal Server Error の場合は待機してリトライ
        if (attempt < maxRetries && error instanceof Error && error.message?.includes("Internal Server Error")) {
          logger.info(`⏳ ${2 * attempt}秒待機してリトライします...`);
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
          continue;
        }

        // それ以外のエラーは次の試行へ
        logger.warn(`⚠️ 試行${attempt}でエラー: ${error instanceof Error ? error.message : String(error)}`);
        continue;
      }
    }

    // すべての試行が失敗した場合
    logger.error("❌ 返信提案生成エラー（すべての試行が失敗）:", lastError);

    // 🔧 エラーメッセージを改善
    let errorMessage = "返信提案の生成に失敗しました";

    if (lastError instanceof Error) {
      if (lastError.message?.includes("Internal Server Error")) {
        errorMessage = "APIサーバーで一時的な問題が発生しています。しばらく時間をおいて再度お試しください。";
      } else if (lastError.message?.includes("API error")) {
        errorMessage = "API接続エラーが発生しました。設定を確認するか、しばらくお待ちください。";
      } else if (lastError.message) {
        errorMessage = `返信提案の生成中にエラーが発生しました: ${lastError.message}`;
      }
    }

    throw new Error(errorMessage);
  }

  /**
   * 文章強化 - 入力テキストを自然に拡張
   */
  async enhanceText(
    inputText: string,
    recentMessages: UnifiedMessage[],
    user: Persona,
    enhancePrompt?: string,
    apiConfig?: Partial<APIConfig> & { openRouterApiKey?: string }
  ): Promise<string> {
    if (!inputText.trim()) {
      throw new Error("入力テキストが空です");
    }

    const context = this.buildContext(recentMessages);

    let prompt: string;
    if (enhancePrompt) {
      // 🔧 FIX: ${} 形式と {{}} 形式の両方をサポート
      const userName = user?.name || "ユーザー";

      logger.debug("🔧 [InspirationService] 文章強化カスタムプロンプトの変数置換:");
      logger.debug(`  - inputText: ${inputText.substring(0, 50)}${inputText.length > 50 ? '...' : ''}`);
      logger.debug(`  - userName: ${userName}`);
      logger.debug(`  - context length: ${context.length}文字`);
      logger.debug(`  - 置換前プロンプト（先頭200文字）: ${enhancePrompt.substring(0, 200)}`);

      prompt = enhancePrompt
        // ${} 形式の変数を置換
        .replace(/\$\{inputText\}/g, inputText)
        .replace(/\$\{userName\}/g, userName)
        .replace(/\$\{context\}/g, context)
        // {{}} 形式の変数も置換（後方互換性のため）
        .replace(/\{\{conversation\}\}/g, context)
        .replace(/\{\{user\}\}/g, inputText)
        .replace(/\{\{text\}\}/g, inputText)
        .replace(/\{\{userName\}\}/g, userName)
        .replace(/\{\{context\}\}/g, context);

      logger.debug(`  - 置換後プロンプト（先頭200文字）: ${prompt.substring(0, 200)}`);
    } else {
      prompt = this.buildEnhancementPrompt(inputText, context, user);
    }

    // 🔧 リトライロジックの追加
    // 🔧 OPTIMIZATION: リトライ回数を削減（3→2）してRPM制限への影響を軽減
    const maxRetries = 2;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`📝 文章強化リクエスト (試行 ${attempt}/${maxRetries}):`, {
          inputTextLength: inputText.length,
          contextLength: context.length,
          promptLength: prompt.length,
          apiConfig,
        });

        // 設定のmax_tokensを使用（デフォルトは2048）
        const maxTokens = apiConfig?.max_tokens || 2048;
        logger.debug(`📊 文章強化 max_tokens: ${maxTokens} (設定値を使用)`);

        // プロンプトは入力が長い場合のみ短縮
        const truncatedPrompt =
          prompt.length > 4000
            ? prompt.substring(0, 4000) + '...\n\n強化対象: "' + inputText + '"'
            : prompt;

        const response = await apiRequestQueue.enqueueInspirationRequest(
          async () => {
            return simpleAPIManagerV2.generateMessage(
              truncatedPrompt,
              "文章を強化",
              [],
              {
                model: apiConfig?.model,
                provider: apiConfig?.provider,
                openRouterApiKey: apiConfig?.openRouterApiKey,
                geminiApiKey: apiConfig?.geminiApiKey,
                useDirectGeminiAPI: apiConfig?.useDirectGeminiAPI,
                temperature: apiConfig?.temperature || 0.7,
                max_tokens: apiConfig?.max_tokens || 2048,
                top_p: apiConfig?.top_p || 0.9,
                enableCache: false, // 🔥 文章強化も毎回異なる結果が必要なためキャッシュ無効
              }
            );
          }
        );

        const enhancedText = this.parseEnhancedText(response, inputText);
        logger.info("✅ 文章強化成功:", {
          originalLength: inputText.length,
          enhancedLength: enhancedText.length,
        });

        return enhancedText;
      } catch (error: any) {
        lastError = error;

        logger.error(`❌ 文章強化エラー (試行 ${attempt}):`, {
          error: error.message || error,
          inputText,
          promptLength: prompt.length,
          apiConfig,
        });

        // 🔧 Internal Server Error の場合は待機してリトライ
        if (attempt < maxRetries && error?.message?.includes("Internal Server Error")) {
          logger.info(`⏳ ${2 * attempt}秒待機してリトライします...`);
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
          continue;
        }

        // それ以外のエラーは即座に終了
        break;
      }
    }

    // すべての試行が失敗した場合
    // 🔧 エラーメッセージを改善
    let errorMessage = "文章強化に失敗しました";

    if (lastError instanceof Error) {
      if (lastError.message?.includes("Internal Server Error")) {
        errorMessage = "APIサーバーで一時的な問題が発生しています。しばらく時間をおいて再度お試しください。";
      } else if (lastError.message?.includes("OpenRouter")) {
        errorMessage = `文章強化に失敗しました: ${lastError.message}。APIキーの設定を確認してください。`;
      } else if (lastError.message?.includes("Gemini")) {
        errorMessage = `文章強化に失敗しました: ${lastError.message}`;
      } else if (lastError.message) {
        errorMessage = `文章強化中にエラーが発生しました: ${lastError.message}`;
      }
    }

    throw new Error(errorMessage);
  }

  /**
   * 高度な返信提案パース（成功例から移植）
   */
  private parseReplySuggestionsAdvanced(
    content: string
  ): InspirationSuggestion[] {
    logger.debug("🔍 AI応答をパース中");
    logger.debug("📏 応答文字数:", content.length);
    logger.debug("📄 応答の先頭500文字:", content.substring(0, 500));

    const suggestions: InspirationSuggestion[] = [];
    const types: ("empathy" | "question" | "topic")[] = [
      "empathy",
      "question",
      "topic",
    ];

    // 🔧 STRATEGY 1: 番号付きリスト（1. 2. 3.）で分割を試行
    const numberedSuggestions = this.parseNumberedList(content, types);
    if (numberedSuggestions.length >= 3) {
      logger.debug(`✅ 番号付きリスト形式で${numberedSuggestions.length}件の提案を抽出`);
      return numberedSuggestions.slice(0, 3);
    }

    logger.debug(`⚠️ 番号付きリスト形式での抽出失敗（${numberedSuggestions.length}件のみ）`);

    // 2. 番号がない場合、［タイトル］形式で抽出
    const bracketPattern = /\[([^\]]+)\]\s*([\s\S]*?)(?=\[|$)/g;
    const bracketMatches = Array.from(content.matchAll(bracketPattern));

    if (bracketMatches.length > 0) {
      logger.debug(`✅ ブラケット形式を検出: ${bracketMatches.length}件`);

      bracketMatches.forEach((match, index) => {
        if (index < 3) {
          const title = match[1];
          const contentAfterTitle = match[2]?.trim() || "";

          // タイトルと内容を組み合わせるか、内容のみを使用
          const text = contentAfterTitle || title;

          if (text.length >= 10 && text.length <= 400) { // 🔧 FIX: 250 → 400
            suggestions.push({
              id: `suggestion_${Date.now()}_${index}`,
              type: types[index],
              content: text,
              confidence: 0.8,
            });
          }
        }
      });

      return suggestions;
    }

    // 3. 改行で分割してパース（フォールバック）
    const fallbackLines = content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length >= 10 && line.length <= 400) // 🔧 FIX: 250 → 400
      .filter((line) => !line.includes("：") && !line.includes(":"));

    if (fallbackLines.length > 0) {
      logger.debug(`✅ 改行区切りで検出: ${fallbackLines.length}件`);

      fallbackLines.slice(0, 3).forEach((text, index) => {
        suggestions.push({
          id: `suggestion_${Date.now()}_${index}`,
          type: types[index],
          content: text,
          confidence: 0.7,
        });
      });
    }

    // 🔧 STRATEGY 4: 段落分割フォールバック（番号なしでも検出）
    if (suggestions.length === 0) {
      logger.debug("⚠️ 標準パターンで検出できず、段落分割モードで再試行");

      // 空行で段落を分割
      const paragraphs = content
        .split(/\n\s*\n/)
        .map(p => p.trim())
        .filter(p => p.length >= 30 && p.length <= 600)
        .map(p => p.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim());

      if (paragraphs.length >= 3) {
        logger.debug(`✅ 段落分割モードで${paragraphs.length}件の提案を検出`);

        paragraphs.slice(0, 3).forEach((text, index) => {
          const cleanText = this.cleanSuggestionText(text);
          suggestions.push({
            id: `suggestion_${Date.now()}_${index}`,
            type: types[index],
            content: cleanText.length > 400 ? cleanText.substring(0, 400) + "..." : cleanText,
            confidence: 0.7,
          });
        });
      }
    }

    // 🔧 STRATEGY 5: 最終フォールバック（文単位で分割）
    if (suggestions.length === 0) {
      logger.debug("⚠️ 段落分割も失敗、文単位フォールバックで再試行");

      // 長い文を抽出（30文字以上400文字以下）
      const sentences = content
        .split(/[。！？\n]/)
        .map(s => s.trim())
        .filter(s => s.length >= 30 && s.length <= 400);

      if (sentences.length > 0) {
        logger.debug(`✅ 文単位フォールバックで${sentences.length}件の文を検出`);

        sentences.slice(0, 3).forEach((text, index) => {
          suggestions.push({
            id: `suggestion_${Date.now()}_${index}`,
            type: types[index],
            content: text,
            confidence: 0.5,
          });
        });
      }
    }

    logger.debug(`📊 最終的に${suggestions.length}個の提案を抽出`);
    return suggestions;
  }

  /**
   * 会話コンテキストの構築
   */
  private buildContext(
    messages: UnifiedMessage[],
    isGroupMode?: boolean
  ): string {
    // 🔧 FIX: コンテキストを拡張（最新6メッセージ、各メッセージ最大300文字）
    const recentMessages = messages.slice(-6);

    return recentMessages
      .map((msg) => {
        const content =
          msg.content.length > 300
            ? msg.content.substring(0, 300) + "..."
            : msg.content;

        if (isGroupMode) {
          const userName = msg.metadata?.user_name;
          const speaker =
            msg.role === "user"
              ? (typeof userName === 'string' ? userName : "ユーザー")
              : msg.character_name || "キャラクター";
          return `${speaker}: ${content}`;
        } else {
          const role = msg.role === "user" ? "ユーザー" : "キャラクター";
          return `${role}: ${content}`;
        }
      })
      .join("\n");
  }

  /**
   * 返信提案プロンプトの構築
   */
  private buildReplySuggestionPrompt(
    context: string,
    character: Character,
    user: Persona,
    isGroupMode: boolean
  ): string {
    const speaker = isGroupMode ? character.name : user.name;
    const target = isGroupMode ? "グループ全体" : character.name;

    // 🔧 FIX: プレースホルダーを実際の名前に置換するための変数
    const userName = user?.name || "ユーザー";
    const charName = character?.name || "キャラクター";

    return `# ロールプレイ返信生成エージェント（3アプローチ型）

## あなたの役割
あなたは**男性キャラクター${userName}**として、女性キャラクター${charName}との対話における返信を、3つの異なる心理的アプローチで生成する専門家です。各返信は、会話の文脈・キャラクター性格・関係性を深く分析し、没入感の高い描写を提供します。

---

## 入力情報の定義

### 入力情報
- **[会話履歴]**: 直近の対話履歴（発言者名: 発言内容の形式）
- **[${userName}のペルソナ]**: 一人称（俺/私）、性格特性、口調、行動傾向
- **[${charName}のペルソナ]**: 性格、感情状態、関係性、現在の状況

---

## 生成する3つのアプローチ

### 1. 共感・受容型
**目的**: 相手の感情を肯定し、安心感と信頼関係を深める  
**特徴**: 
- 相手の言動を肯定的に受け止める
- 優しい言葉と穏やかな動作
- 相手の良い面を褒める・認める
- 心理的距離を縮める温かい表現

### 2. 言葉責め型
**目的**: 相手のペースを崩し、羞恥心や緊張感を煽る  
**特徴**:
- 挑発的・からかうような言葉選び
- 相手の反応を楽しむ余裕のある態度
- 敢えて際どい話題に触れる
- 相手を意識させる言動

### 3. 分析・観察型
**目的**: 相手の微細な変化を読み取り、内心に踏み込む  
**特徴**:
- 仕草・表情・声のトーンの観察描写
- 相手の隠れた感情を言語化
- 洞察力を示す指摘
- 相手の本音を引き出す質問

---

## 出力仕様

### 必須要件
✅ **一人称**: 「俺」または「私」（${userName}のペルソナに準拠）
✅ **文字数**: 各返信150～300字（厳守）
✅ **文体**: 地の文（動作・表情）+ セリフ（「」で囲む）の混合型
✅ **描写密度**: 5感情報・心理描写・身体的接触を含む濃密な表現
✅ **文脈整合性**: 会話履歴の流れを自然に継続
✅ **キャラ一貫性**: ${userName}の性格・口調を全アプローチで維持

### 禁止事項
❌ 見出しや説明文を含めない（純粋な返信文のみ）
❌ ${charName}の反応を先回りして書かない
❌ 一人称を「僕」「オレ」など指定外に変更しない
❌ 文字数を大幅に超過/不足させない（±20字まで許容）
❌ 不自然な敬語や過度に文学的な表現を避ける

---

## 出力フォーマット

**🚨 絶対遵守**: 以下の形式で、番号付きリストとして3つの返信を**必ず**出力してください：

1. [共感・受容型の返信文150～300字]

2. [言葉責め型の返信文150～300字]

3. [分析・観察型の返信文150～300字]

**重要な注意事項**:
- **必ず「1. 」「2. 」「3. 」で各返信を開始してください**（番号なしは不可）
- 見出し、説明文、ラベルは一切不要です
- 返信文のみを直接記述してください
- 各返信は1つの段落として記述し、番号以外の区切り記号を使わないでください

---

## 品質検証チェックリスト

生成後、以下を確認してください：

- [ ] 各返信が150～300字の範囲内
- [ ] 一人称が「俺」または「私」で統一
- [ ] 地の文とセリフが適切に混在
- [ ] 3つのアプローチが明確に区別可能
- [ ] 会話履歴の文脈と矛盾しない
- [ ] ${userName}の性格設定と一貫性がある
- [ ] ${charName}の性格を考慮した内容
- [ ] 5感描写（視覚・触覚等）が含まれる
- [ ] 見出しや説明文が含まれていない
- [ ] 自然な日本語で読みやすい

---

## 🎯 実際の会話履歴（現在のセッション）

以下は、**今まさに進行中の会話**です。この会話の流れを理解し、文脈に沿った返信を生成してください：

\`\`\`
${context}
\`\`\`

**重要**: 上記の会話履歴を必ず考慮し、話題の流れ、感情の変化、関係性の状態を反映した返信を生成してください。この実際の会話に基づいた提案を作成してください。

---

## 📝 返信生成（3つのアプローチで出力）

上記の会話履歴を踏まえて、${userName}として3つの異なるアプローチで返信を生成してください：

      `;
  }

  /**
   * 文章強化プロンプトの構築
   */
  private buildEnhancementPrompt(
    inputText: string,
    context: string,
    user: Persona
  ): string {
    // 🔧 FIX: プレースホルダーを実際の名前に置換
    const userName = user?.name || "ユーザー";

    // プロンプトを大幅に短縮
    return `あなたは表現力増強師です。
      以下の"${inputText}"を、${userName}らしくキャラクターを保持したまま、元の意味を保持して強化し拡張してください

      条件:
      会話履歴:
      ${context}

      ###**分析すべき要素**
      - 会話履歴から会話の文脈と話題の流れを分析すること
      - これまでの${userName}のトーンとスタイルを分析すること
      - 対話相手との関係性を分析すること
      ###入力文章の強化方針：
      - 原文の意味や意図は保持すること
      - 語彙や動作表現を拡張。曖昧な表現や装飾された表現は避け、直接的で具体的な表現で強化すること。
      - 必要に応じて原文の2～3倍に拡張してよい
      - 不要な解説や注釈は含めず、強化後の文章のみを出力すること。
      ###注意事項：
      - 必ず男性側の${userName}として返信すること。
      - 入力文を言葉のプロとして拡張、強化、具体化すること。


      入力文:
      ${inputText}

      出力文（強化後）:
      強化された文章のみ出力`;
  }

  /**
   * 強化テキストのパース
   */
  private parseEnhancedText(response: string, fallback: string): string {
    const cleaned = response
      .replace(/^強化された文章:\s*/, "")
      .replace(/^出力:\s*/, "")
      .trim();

    return cleaned.length > 5 ? cleaned : fallback;
  }


  /**
   * 🔧 NEW: 提案の品質検証と修正
   */
  private validateAndFixSuggestions(
    suggestions: InspirationSuggestion[],
    requiredCount: number = 3
  ): InspirationSuggestion[] {
    const validSuggestions: InspirationSuggestion[] = [];

    for (const suggestion of suggestions) {
      // 1. テーマのみ・空白・極端な短文を除外
      if (this.isInvalidSuggestion(suggestion.content)) {
        logger.warn(`⚠️ 無効な提案を除外: "${suggestion.content.substring(0, 50)}..."`);
        continue;
      }

      // 2. 文字数チェック（最低30文字、最大400文字）
      const charCount = suggestion.content.length;
      if (charCount < 30) { // 🔧 FIX: 50 → 30（より寛容に）
        logger.warn(`⚠️ 短すぎる提案を除外: ${charCount}文字 - "${suggestion.content.substring(0, 30)}..."`);
        continue;
      }
      if (charCount > 400) {
        logger.debug(`📝 長い提案を短縮: ${charCount}文字 → 400文字`);
        suggestion.content = suggestion.content.substring(0, 400) + "...";
      }

      // 3. 重複チェック（類似度90%以上のみ除外）
      const isDuplicate = validSuggestions.some(
        (existing) => this.calculateSimilarity(existing.content, suggestion.content) > 0.9
      );
      if (isDuplicate) {
        logger.warn(`⚠️ 重複した提案を除外: "${suggestion.content.substring(0, 30)}..."`);
        continue;
      }

      // 4. テーマ説明のみの提案を除外
      if (this.isThemeDescriptionOnly(suggestion.content)) {
        logger.warn(`⚠️ テーマ説明のみの提案を除外: "${suggestion.content}"`);
        continue;
      }

      validSuggestions.push(suggestion);

      if (validSuggestions.length >= requiredCount) {
        break;
      }
    }

    logger.debug(`✅ 品質検証完了: ${validSuggestions.length}/${suggestions.length}件が有効`);
    return validSuggestions;
  }

  /**
   * 🔧 NEW: 無効な提案を検出
   */
  private isInvalidSuggestion(content: string): boolean {
    const trimmed = content.trim();

    // 空白または極端に短い
    if (!trimmed || trimmed.length < 10) {
      return true;
    }

    // テーマ説明のキーワードのみ
    const themeKeywords = [
      "共感・受容",
      "質問・探求",
      "トピック展開",
      "言葉責め",
      "分析・観察",
      "共感型",
      "質問型",
      "話題提供",
    ];
    if (themeKeywords.some((keyword) => trimmed === keyword)) {
      return true;
    }

    // 「【】」や「[]」のみ
    if (/^[【\[\]】\s]+$/.test(trimmed)) {
      return true;
    }

    return false;
  }

  /**
   * 🔧 NEW: テーマ説明のみの提案を検出
   */
  private isThemeDescriptionOnly(content: string): boolean {
    // パターン1: 「共感・受容型」「質問・探求型」などのラベルのみ
    const labelOnlyPattern = /^(共感・受容|質問・探求|トピック展開|言葉責め|分析・観察)型?$/;
    if (labelOnlyPattern.test(content.trim())) {
      return true;
    }

    // パターン2: テーマ説明とほぼ同じ内容
    const descriptionPatterns = [
      /^相手の感情や状況に寄り添い/,
      /^相手を巧みな話術で/,
      /^相手の仕草・空気感を観察/,
    ];
    if (descriptionPatterns.some((pattern) => pattern.test(content))) {
      return true;
    }

    return false;
  }

  /**
   * 🔧 NEW: テキストの類似度を計算（簡易版）
   */
  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.split(/\s+/));
    const words2 = new Set(text2.split(/\s+/));

    const intersection = new Set([...words1].filter((word) => words2.has(word)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  /**
   * 🔧 NEW: 提案テキストをクリーンアップ
   */
  private cleanSuggestionText(text: string): string {
    return text
      .trim()
      .replace(/^【[^】]+】\s*/, "") // テーマラベルを削除
      .replace(/^（[^）]+）\s*/, "") // テーマ説明を削除
      .replace(/^[\[「『]/, "") // 開始括弧を削除
      .replace(/[\]」』]$/, "") // 終了括弧を削除
      .replace(/\s+/g, " ") // 連続する空白を1つに
      .trim();
  }

  /**
   * 🔧 NEW: 番号付きリストをパース
   */
  private parseNumberedList(
    content: string,
    types: ("empathy" | "question" | "topic")[]
  ): InspirationSuggestion[] {
    logger.debug("🔍 [parseNumberedList] 番号付きリスト解析開始");
    const suggestions: InspirationSuggestion[] = [];
    const lines = content.split('\n');
    let currentSuggestion = '';
    let suggestionIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // 番号で始まる行を検出（複数パターン対応）
      const numberMatch = trimmedLine.match(/^(\d+)[.。)）]\s*(.+)/) ||
                         trimmedLine.match(/^【(\d+)】\s*(.+)/);

      if (numberMatch) {
        // 前の提案を保存
        if (suggestionIndex >= 0 && currentSuggestion.trim()) {
          const cleanText = this.cleanSuggestionText(currentSuggestion);
          logger.debug(`✅ [parseNumberedList] 提案${suggestionIndex + 1}を保存: "${cleanText.substring(0, 50)}..." (${cleanText.length}文字)`);
          if (cleanText.length >= 10) {
            suggestions.push({
              id: `suggestion_${Date.now()}_${suggestionIndex}`,
              type: types[suggestionIndex] || types[0],
              content: cleanText.length > 400 ? cleanText.substring(0, 400) + "..." : cleanText,
              confidence: 0.95,
            });
          }
        }

        // 新しい提案を開始
        suggestionIndex = parseInt(numberMatch[1]) - 1;
        currentSuggestion = numberMatch[2];
        logger.debug(`🆕 [parseNumberedList] 提案${suggestionIndex + 1}を開始: "${numberMatch[2].substring(0, 30)}..."`);
      } else if (suggestionIndex >= 0 && trimmedLine && !trimmedLine.match(/^(#|##|###|\*\*)/)) {
        // 継続行を追加（見出しマークダウンは除外）
        logger.debug(`➕ [parseNumberedList] 提案${suggestionIndex + 1}に継続行を追加: "${trimmedLine.substring(0, 30)}..."`);
        currentSuggestion += ' ' + trimmedLine;
      }
    }

    // 最後の提案を保存
    if (suggestionIndex >= 0 && currentSuggestion.trim()) {
      const cleanText = this.cleanSuggestionText(currentSuggestion);
      logger.debug(`✅ [parseNumberedList] 最後の提案${suggestionIndex + 1}を保存: "${cleanText.substring(0, 50)}..." (${cleanText.length}文字)`);
      if (cleanText.length >= 10) {
        suggestions.push({
          id: `suggestion_${Date.now()}_${suggestionIndex}`,
          type: types[suggestionIndex] || types[0],
          content: cleanText.length > 400 ? cleanText.substring(0, 400) + "..." : cleanText,
          confidence: 0.95,
        });
      }
    }

    logger.debug(`📊 [parseNumberedList] 合計${suggestions.length}件の提案を抽出`);
    return suggestions;
  }
}
