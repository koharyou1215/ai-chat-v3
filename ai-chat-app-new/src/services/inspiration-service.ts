// Inspiration Service v3 - 成功例を基にした改良版
// 返信提案と文章強化機能のためのサービス

import { UnifiedMessage } from "@/types/memory";
import { simpleAPIManagerV2 } from "@/services/simple-api-manager-v2";
import { apiRequestQueue } from "@/services/api-request-queue";
import { APIConfig, Character, Persona } from "@/types";
import { replaceVariables } from "@/utils/variable-replacer";

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
      // カスタムプロンプトのプレースホルダー置換
      prompt = customPrompt
        .replace(/{{conversation}}/g, context)
        .replace(/{{user}}と{{char}}間の会話履歴/g, context)
        .replace(/会話履歴:/g, `会話履歴:\n${context}`);

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

    try {
      console.log("📤 返信提案API呼び出し開始");
      console.log(
        `📊 返信提案 max_tokens: ${
          apiConfig?.max_tokens || 2048
        } (設定値を使用)`
      );
      console.log(`🔧 返信提案: AIタブのトグルで自動判定`);

      const response = await apiRequestQueue.enqueueInspirationRequest(
        async () => {
          const result = await simpleAPIManagerV2.generateMessage(
            prompt,
            "返信提案を生成",
            [],
            {} // 複雑な設定は送らない。AIタブのトグルで自動判定
          );
          console.log(
            "📥 API応答受信（先頭200文字）:",
            result.substring(0, 200)
          );
          return result;
        }
      );

      // 成功例のパース方法を採用
      const suggestions = this.parseReplySuggestionsAdvanced(response);

      if (suggestions.length === 0) {
        console.warn("⚠️ 提案を抽出できませんでした。フォールバックを使用");
        return this.getFallbackSuggestions();
      }

      return suggestions;
    } catch (error: any) {
      console.error("❌ 返信提案生成エラー:", error);
      
      // エラーメッセージをユーザーに伝える
      if (error.message?.includes("Quota exceeded") || error.message?.includes("使用制限")) {
        console.warn("⚠️ API使用制限に達しました。しばらく待ってから再試行してください。");
      } else if (error.message?.includes("is not a valid model")) {
        console.warn("⚠️ 無効なモデルIDが検出されました。設定を確認してください。");
      } else if (error.message?.includes("APIキーが設定されていません")) {
        console.warn("⚠️ APIキーが設定されていません。設定画面で確認してください。");
      }
      
      return this.getFallbackSuggestions();
    }
  }

  /**
   * 文章強化 - 入力テキストを自然に拡張
   */
  async enhanceText(
    inputText: string,
    recentMessages: UnifiedMessage[],
    user: Persona,
    enhancePrompt?: string,
    apiConfig?: Partial<APIConfig> & { openRouterApiKey?: string },
    character?: Character
  ): Promise<string> {
    if (!inputText.trim()) {
      throw new Error("入力テキストが空です");
    }

    const context = this.buildContext(recentMessages);

    let prompt: string;
    if (enhancePrompt) {
      // カスタムプロンプトのすべての変数形式を確実に置換
      const userName = user.name || 'ユーザー';
      const charName = character?.name || 'キャラクター';
      
      prompt = enhancePrompt
        // 標準的な変数置換
        .replace(/\{\{user\}\}/g, userName)
        .replace(/\{\{char\}\}/g, charName)
        .replace(/\{\{conversation\}\}/g, context)
        .replace(/\{\{text\}\}/g, inputText)
        // ${{ }}形式の変数置換（誤った形式も対応）
        .replace(/\$\{\{\s*user\s*\}\}/g, userName)
        .replace(/\$\{\{\s*char\s*\}\}/g, charName)
        // ${ }形式の変数置換
        .replace(/\$\{inputText\}/g, inputText)
        .replace(/\$\{text\}/g, inputText)
        .replace(/\$\{user\}/g, userName)
        .replace(/\$\{char\}/g, charName);
        
      // さらにreplaceVariablesで処理
      const variableContext = { user, character };
      prompt = replaceVariables(prompt, variableContext);
    } else {
      prompt = this.buildEnhancementPrompt(inputText, context, user);
      // デフォルトプロンプトも{{user}}と{{char}}を置換
      const variableContext = { user, character };
      prompt = replaceVariables(prompt, variableContext);
    }

    try {
      console.log("📝 文章強化リクエスト:", {
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
            {} // 複雑な設定は送らない。AIタブのトグルで自動判定
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
      console.error("❌ 文章強化エラー:", {
        error: error.message || error,
        inputText,
        promptLength: prompt.length,
        apiConfig,
      });

      // より詳細なエラーメッセージを提供
      if (error.message?.includes("OpenRouter")) {
        throw new Error(
          `文章強化に失敗しました: ${error.message}。APIキーの設定を確認してください。`
        );
      } else if (error.message?.includes("Gemini")) {
        throw new Error(`文章強化に失敗しました: ${error.message}`);
      } else {
        throw new Error(
          `文章強化に失敗しました: ${error.message || "不明なエラー"}`
        );
      }
    }
  }

  /**
   * 高度な返信提案パース（成功例から移植）
   */
  private parseReplySuggestionsAdvanced(
    content: string
  ): InspirationSuggestion[] {
    // 空のコンテンツや明らかに短すぎる場合は早期リターン
    if (!content || content.trim().length < 10) {
      console.warn("⚠️ AI応答が空または短すぎます");
      return [];
    }
    
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
      .filter((text) => text.length >= 10 && text.length <= 250);

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

          if (text.length >= 10 && text.length <= 250) {
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
      .filter((line) => line.length >= 10 && line.length <= 250)
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
    // コンテキストを短縮（最新3メッセージのみ、各メッセージ最大100文字）
    const recentMessages = messages.slice(-3);

    return recentMessages
      .map((msg) => {
        const content =
          msg.content.length > 150
            ? msg.content.substring(0, 150) + "..."
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

    return `あなたは{{user}}そのものであり、感情と欲望を隠さずに{{char}}へ反応してくださ  　　い。
    


      会話履歴:
      ${context}
      ###**分析すべき要素**
      - 会話の文脈と話題の流れ
      - {{user}}の発言意図と感情状態
      - これまでの{{user}}のトーンとスタイル
      - 会話相手との関係性  
      ###生成する4つのアプローチ 
      - ${speaker}の性格を反映させること
     - 各提案頭には番号を付けて、150～300字で、濃密かつ描写的に。  
      - 言葉だけでなく、息づかい・体温・視線・匂いなど五感を織り込む。  
      - トーンは状況に没入できるよう「セリフ＋モノローグ＋仕草」を自然に混在させる。 
      ### 出力の仕様
      
      - **見出し不要:** 出力は純粋に返信文のみとする。
      - **{{user}}視点:** {{user}}視点で文章を生成すること。
      以下の4パターンを必ず出力：  
      [ 1. 共感・受容（相手を甘く包み込む） ] 

      [ 2. 探求・開発（弱点を見つけようとする） ] 

      [ 3. 挑発・逸脱（相手を翻弄・焦らす） ] 

      [ 4. 自由形（予測不能・即興的） ] 
       
      注意事項：
      - 返信は、それぞれのアプローチに応じたパターンを持つものとする。
      - 説明や見出しは不要、返信文のみ
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
    // {{user}}と{{char}}を使用したプロンプト（後で置換される）
    return `あなたは{{user}}として、以下の短い文章を感情豊かに拡張・強化してください。

会話履歴:
${context}

元の文章: "${inputText}"

強化の要件:
- {{user}}のキャラクター性と口調を完全に維持
- 元の意図を保ちながら、詳細な感情表現・仕草・内面描写を追加
- 自然で生き生きとした表現に拡張（1.5～2倍の長さ）
- 五感を活かした描写を含める
- 説明や注釈は含めず、強化された文章のみを出力

強化後の文章:`;
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
    return [
      {
        id: `fallback_${Date.now()}_0`,
        type: "empathy",
        content: "そうですね、よくわかります。",
        confidence: 0.6,
      },
      {
        id: `fallback_${Date.now()}_1`,
        type: "question",
        content: "もう少し詳しく聞かせてください。",
        confidence: 0.6,
      },
      {
        id: `fallback_${Date.now()}_2`,
        type: "topic",
        content: "とても興味深いお話ですね。",
        confidence: 0.6,
      },
    ];
  }
}
