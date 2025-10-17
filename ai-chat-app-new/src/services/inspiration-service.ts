// Inspiration Service v3 - 成功例を基にした改良版
// 返信提案と文章強化機能のためのサービス

import { UnifiedMessage } from "@/types/memory";
import { simpleAPIManagerV2 } from "@/services/simple-api-manager-v2";
import { apiRequestQueue } from "@/services/api-request-queue";
import { APIConfig, Character, Persona } from "@/types";

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
    const context = this.buildContext(recentMessages, isGroupMode);

    let prompt: string;
    if (customPrompt) {
      // 🔧 FIX: プレースホルダーの完全な置換
      prompt = customPrompt
        .replace(/{{conversation}}/g, context)
        .replace(/{{user}}と{{char}}間の会話履歴/g, context)
        .replace(/会話履歴:/g, `会話履歴:\n${context}`)
        // 🔧 追加: {{user}}と{{char}}を実際の名前に置換
        .replace(/{{user}}/g, user?.name || "ユーザー")
        .replace(/{{char}}/g, character?.name || "キャラクター");

      // プレースホルダーが見つからない場合は末尾に追加
      if (prompt === customPrompt) {
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

    // 🔧 リトライロジックの追加
    const maxRetries = 3;
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📤 返信提案API呼び出し開始 (試行 ${attempt}/${maxRetries})`);
        console.log(
          `📊 返信提案 max_tokens: ${
            apiConfig?.max_tokens || 2048
          } (設定値を使用)`
        );
        console.log(`🔧 返信提案: AIタブのトグルで自動判定`);

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
              console.log(
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
              console.error(`❌ インスピレーションAPI呼び出しエラー (試行 ${attempt}):`, {
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
          console.error("❌ パース失敗: 返信提案を抽出できませんでした");
          console.error("📄 API応答全文:", response);
          console.error("📏 応答長:", response.length, "文字");

          // 応答が期待形式でなかった場合は明示的にエラーにして、
          // 呼び出し元でエラーハンドリング（例: 表示）を行えるようにする
          throw new Error("返信提案を抽出できませんでした（応答のパースに失敗）");
        }

        // 🔧 FIX: 品質検証と改善を追加
        const validatedSuggestions = this.validateAndFixSuggestions(suggestions, 3);

        if (validatedSuggestions.length < 3) {
          console.warn(`⚠️ 有効な提案が${validatedSuggestions.length}件のみ（3件必要）`);
          // 3件未満の場合はエラーにして再試行を促す
          throw new Error(`有効な提案が不足しています（${validatedSuggestions.length}/3件）`);
        }

        return validatedSuggestions;
      } catch (error: any) {
        lastError = error;

        // 🔧 Internal Server Error の場合は待機してリトライ
        if (attempt < maxRetries && error?.message?.includes("Internal Server Error")) {
          console.log(`⏳ ${2 * attempt}秒待機してリトライします...`);
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
          continue;
        }

        // それ以外のエラーは即座に終了
        break;
      }
    }

    // すべての試行が失敗した場合
    console.error("❌ 返信提案生成エラー（すべての試行が失敗）:", lastError);

    // 🔧 エラーメッセージを改善
    let errorMessage = "返信提案の生成に失敗しました";

    if (lastError?.message?.includes("Internal Server Error")) {
      errorMessage = "APIサーバーで一時的な問題が発生しています。しばらく時間をおいて再度お試しください。";
    } else if (lastError?.message?.includes("API error")) {
      errorMessage = "API接続エラーが発生しました。設定を確認するか、しばらくお待ちください。";
    } else if (lastError?.message) {
      errorMessage = `返信提案の生成中にエラーが発生しました: ${lastError.message}`;
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
      prompt = enhancePrompt
        .replace(/{{conversation}}/g, context)
        .replace(/{{user}}/g, inputText)
        .replace(/{{text}}/g, inputText);
    } else {
      prompt = this.buildEnhancementPrompt(inputText, context, user);
    }

    // 🔧 リトライロジックの追加
    const maxRetries = 3;
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📝 文章強化リクエスト (試行 ${attempt}/${maxRetries}):`, {
          inputTextLength: inputText.length,
          contextLength: context.length,
          promptLength: prompt.length,
          apiConfig,
        });

        // 設定のmax_tokensを使用（デフォルトは2048）
        const maxTokens = apiConfig?.max_tokens || 2048;
        console.log(`📊 文章強化 max_tokens: ${maxTokens} (設定値を使用)`);

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
        console.log("✅ 文章強化成功:", {
          originalLength: inputText.length,
          enhancedLength: enhancedText.length,
        });

        return enhancedText;
      } catch (error: any) {
        lastError = error;

        console.error(`❌ 文章強化エラー (試行 ${attempt}):`, {
          error: error.message || error,
          inputText,
          promptLength: prompt.length,
          apiConfig,
        });

        // 🔧 Internal Server Error の場合は待機してリトライ
        if (attempt < maxRetries && error?.message?.includes("Internal Server Error")) {
          console.log(`⏳ ${2 * attempt}秒待機してリトライします...`);
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

    if (lastError?.message?.includes("Internal Server Error")) {
      errorMessage = "APIサーバーで一時的な問題が発生しています。しばらく時間をおいて再度お試しください。";
    } else if (lastError?.message?.includes("OpenRouter")) {
      errorMessage = `文章強化に失敗しました: ${lastError.message}。APIキーの設定を確認してください。`;
    } else if (lastError?.message?.includes("Gemini")) {
      errorMessage = `文章強化に失敗しました: ${lastError.message}`;
    } else if (lastError?.message) {
      errorMessage = `文章強化中にエラーが発生しました: ${lastError.message}`;
    }

    throw new Error(errorMessage);
  }

  /**
   * 高度な返信提案パース（成功例から移植）
   */
  private parseReplySuggestionsAdvanced(
    content: string
  ): InspirationSuggestion[] {
    console.log(
      "🔍 AI応答をパース中（先頭200文字）:",
      content.substring(0, 200)
    );

    const suggestions: InspirationSuggestion[] = [];
    const types: ("empathy" | "question" | "topic")[] = [
      "empathy",
      "question",
      "topic",
    ];

    // 🔧 NEW: [ 1. ... ] 形式のパース（プロンプトの要求形式）
    const bracketNumberedPattern = /\[\s*\d+\.\s*([^\]]+)\]/g;
    const bracketNumberedMatches = Array.from(content.matchAll(bracketNumberedPattern));

    if (bracketNumberedMatches.length > 0) {
      console.log(`✅ ブラケット番号形式を検出: ${bracketNumberedMatches.length}件`);

      bracketNumberedMatches.forEach((match, index) => {
        if (index < 3) {
          const text = match[1].trim()
            .replace(/^【[^】]+】\s*/, "")
            .replace(/^（[^）]+）\s*/, ""); // テーマ説明を削除

          if (text.length >= 10 && text.length <= 400) {
            suggestions.push({
              id: `suggestion_${Date.now()}_${index}`,
              type: types[index],
              content: text,
              confidence: 0.95,
            });
          }
        }
      });

      if (suggestions.length > 0) {
        return suggestions;
      }
    }

    // 1. まず番号付きリスト（1. 2. 3.）で分割を試行
    const numberedSections = content.split(/(?=\d+\.)/);
    const validNumberedSections = numberedSections
      .filter((section) => section.trim().match(/^\d+\./))
      .map((section) => {
        // 番号と改行を削除してクリーンなテキストを取得
        return section
          .replace(/^\d+\.\s*/, "")
          .replace(/^【[^】]+】\s*/, "")
          .replace(/^[\[「『]/, "")
          .replace(/[\]」』]$/, "")
          .trim();
      })
      .filter((text) => text.length >= 10 && text.length <= 400); // 🔧 FIX: 250 → 400

    if (validNumberedSections.length > 0) {
      console.log(`✅ 番号付きリストを検出: ${validNumberedSections.length}件`);

      validNumberedSections.forEach((text, index) => {
        if (index < 3) {
          suggestions.push({
            id: `suggestion_${Date.now()}_${index}`,
            type: types[index],
            content: text,
            confidence: 0.9,
          });
        }
      });

      return suggestions;
    }

    // 2. 番号がない場合、［タイトル］形式で抽出
    const bracketPattern = /\[([^\]]+)\]\s*([\s\S]*?)(?=\[|$)/g;
    const bracketMatches = Array.from(content.matchAll(bracketPattern));

    if (bracketMatches.length > 0) {
      console.log(`✅ ブラケット形式を検出: ${bracketMatches.length}件`);

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
    const lines = content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length >= 10 && line.length <= 400) // 🔧 FIX: 250 → 400
      .filter((line) => !line.includes("：") && !line.includes(":"));

    if (lines.length > 0) {
      console.log(`✅ 改行区切りで検出: ${lines.length}件`);

      lines.slice(0, 3).forEach((text, index) => {
        suggestions.push({
          id: `suggestion_${Date.now()}_${index}`,
          type: types[index],
          content: text,
          confidence: 0.7,
        });
      });
    }

    // 🔧 NEW: 4. より寛容なフォールバック（番号なしでも検出）
    if (suggestions.length === 0) {
      console.log("⚠️ 標準パターンで検出できず、寛容モードで再試行");

      // 長い文を抽出（10文字以上400文字以下）
      const allLines = content
        .split(/[。！？\n]/)
        .map(line => line.trim())
        .filter(line => line.length >= 10 && line.length <= 400);

      if (allLines.length > 0) {
        console.log(`✅ 寛容モードで検出: ${allLines.length}件`);

        allLines.slice(0, 3).forEach((text, index) => {
          suggestions.push({
            id: `suggestion_${Date.now()}_${index}`,
            type: types[index],
            content: text,
            confidence: 0.5,
          });
        });
      }
    }

    console.log(`📊 最終的に${suggestions.length}個の提案を抽出`);
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
          const speaker =
            msg.role === "user"
              ? (msg.metadata as any)?.user_name || "ユーザー"
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

    return `あなたは**{{user}}(男性)**として、**{{user}}(男性)**と{{char}}(女性)との会話履歴:${context}に続くあなたの返答を3つのアプローチで生成してください。
    ###生成する3つのアプローチ：
       1. 共感・受容（相手の感情や状況に寄り添い、褒めて安心させ共感する）
       2. 言葉責め型（相手を巧みな話術でペースを乱し揺さぶったり、相手の羞恥心を煽ったりする）
       3. 分析・観察型（相手の仕草・空気感を観察し・内心を読み取りそれに合わせたりつついたりする）
      
      ###**厳守事項**
      - 返信は、**必ず一人称は"俺""私"を使用する男性{{user}}として**で返信すること。
      - 返信は、150～300字で返信すること。
      - 返信は、言葉に動作を織り込んで濃密かつ描写的に返信すること。      
      - 返信は、${context}から、二人の状況と関係性を分析し、その状況を反映させること。     

     ### 出力の仕様：
      - ${speaker}の性格を反映させること
      - 各提案頭には番号を付けて、150～300字で、濃密かつ描写的に。  
      - **見出し不要:** 出力は純粋に返信文のみとする。
     ### 出力の形式：  
      [ 1. 共感・受容（相手の感情や状況に寄り添い、褒めて安心させ共感する150～300字で返信） ] 

      [ 2. 言葉責め型（相手を巧みな話術でペースを乱し揺さぶったり、相手の羞恥心を煽ったりする150～300字で返信） ] 

      [ 3. 分析・観察型（相手の仕草・空気感を観察し・内心を読み取りそれに合わせたりつついたりする150～300字で返信） ] 
       
      ###注意事項：
      - 必ず男性{{user}}として返信すること。
      
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
    // プロンプトを大幅に短縮
    return `あなたは表現力増強師です。
      以下の"${inputText}"を、{{user}}らしくキャラクターを保持したまま、元の意味を保持して強化し拡張してください
      
      条件:
      会話履歴:
      ${context}
      
      ###**分析すべき要素**
      - 会話履歴から会話の文脈と話題の流れを分析すること     
      - これまでの{{user}}のトーンとスタイルを分析すること
      - {{char}}との関係性を分析すること
      ###入力文章の強化方針：      
      - 原文の意味や意図は保持すること
      - 語彙や動作表現を拡張。曖昧な表現や装飾された表現は避け、直接的で具体的な表現で強化すること。
      - 必要に応じて原文の2～3倍に拡張してよい
      - 不要な解説や注釈は含めず、強化後の文章のみを出力すること。
      ###注意事項：
      - 必ず男性側の{{user}}として返信すること。
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
   * フォールバック提案
   */
  private getFallbackSuggestions(): InspirationSuggestion[] {
    // フォールバック（テンプレート）を明示的に無効化する。
    // ユーザーがテンプレートやジェネリックな提案を望まないため、
    // 空配列を返して呼び出し元で何も表示されないようにする。
    return [];
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
        console.warn(`⚠️ 無効な提案を除外: "${suggestion.content.substring(0, 50)}..."`);
        continue;
      }

      // 2. 文字数チェック（150-300字の範囲内）
      const charCount = suggestion.content.length;
      if (charCount < 50) { // 🔧 FIX: 100 → 50（プロンプト要求との整合性）
        console.warn(`⚠️ 短すぎる提案を除外: ${charCount}文字 - "${suggestion.content.substring(0, 30)}..."`);
        continue;
      }
      if (charCount > 400) {
        console.warn(`⚠️ 長すぎる提案を短縮: ${charCount}文字 → 400文字`);
        suggestion.content = suggestion.content.substring(0, 400) + "..."; // 🔧 FIX: 300 → 400
      }

      // 3. 重複チェック
      const isDuplicate = validSuggestions.some(
        (existing) => this.calculateSimilarity(existing.content, suggestion.content) > 0.8
      );
      if (isDuplicate) {
        console.warn(`⚠️ 重複した提案を除外: "${suggestion.content.substring(0, 30)}..."`);
        continue;
      }

      // 4. テーマ説明のみの提案を除外
      if (this.isThemeDescriptionOnly(suggestion.content)) {
        console.warn(`⚠️ テーマ説明のみの提案を除外: "${suggestion.content}"`);
        continue;
      }

      validSuggestions.push(suggestion);

      if (validSuggestions.length >= requiredCount) {
        break;
      }
    }

    console.log(`✅ 品質検証完了: ${validSuggestions.length}/${suggestions.length}件が有効`);
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
}
