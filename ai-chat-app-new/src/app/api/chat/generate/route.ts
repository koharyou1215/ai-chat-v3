import { NextResponse } from "next/server";
import { simpleAPIManagerV2 } from "@/services/simple-api-manager-v2";
// Removed unused import: import type { APIConfig } from '@/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      systemPrompt,
      userMessage,
      conversationHistory,
      apiConfig,
      textFormatting = "readable",
    } = body;

    if (!userMessage) {
      return NextResponse.json(
        { error: "userMessage is required" },
        { status: 400 }
      );
    }

    // API Managerに設定を適用
    console.log("🔧 Applying API configuration:", apiConfig);

    // モデル名からプロバイダーを判定
    const model = apiConfig.model || "gemini-2.5-flash";
    let effectiveProvider = apiConfig.provider;

    if (model.includes("gemini") || model.includes("google/")) {
      effectiveProvider = "gemini";
    } else if (
      model.includes("claude") ||
      model.includes("gpt") ||
      model.includes("mistral") ||
      model.includes("llama") ||
      model.includes("anthropic/") ||
      model.includes("openai/") ||
      model.includes("x-ai/") ||
      model.includes("meta-llama/") ||
      model.includes("deepseek/") ||
      model.includes("qwen/") ||
      model.includes("nousresearch/") ||
      model.includes("z-ai/") ||
      model.includes("moonshotai/")
    ) {
      effectiveProvider = "openrouter";
    }

    console.log("🔍 プロバイダー判定:", {
      model: model,
      originalProvider: apiConfig.provider,
      effectiveProvider: effectiveProvider,
    });

    // 環境変数から API キーを取得
    const effectiveApiConfig = { ...apiConfig, provider: effectiveProvider };

    if (effectiveProvider === "gemini") {
      // フロントエンドから送られてくる API キーを最優先で使用
      if (apiConfig.geminiApiKey) {
        effectiveApiConfig.geminiApiKey = apiConfig.geminiApiKey;
        console.log("✅ Gemini API key provided from client");
      } else {
        // フォールバック: 環境変数から読み込み
        const geminiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        if (geminiKey) {
          effectiveApiConfig.geminiApiKey = geminiKey;
          console.log("✅ Gemini API key loaded from environment (fallback)");
        } else {
          console.error("❌ No Gemini API key found (client or environment)");
          throw new Error("Gemini API キーが設定されていません");
        }
      }
    } else if (effectiveProvider === "openrouter") {
      // OpenRouter の場合、フロントエンドから送られてくる API キーを使用
      if (!apiConfig.openRouterApiKey) {
        console.error("❌ OpenRouter API key not provided");
        throw new Error("OpenRouter API キーが設定されていません");
      }
      effectiveApiConfig.openRouterApiKey = apiConfig.openRouterApiKey;
      console.log("✅ OpenRouter API key provided from client");
    }

    // API Managerに設定を適用
    simpleAPIManagerV2.setAPIConfig(effectiveApiConfig);

    // APIキーも設定
    if (effectiveApiConfig.geminiApiKey) {
      simpleAPIManagerV2.setGeminiApiKey(effectiveApiConfig.geminiApiKey);
    }
    if (effectiveApiConfig.openRouterApiKey) {
      simpleAPIManagerV2.setOpenRouterApiKey(
        effectiveApiConfig.openRouterApiKey
      );
    }
    if (effectiveApiConfig.useDirectGeminiAPI !== undefined) {
      simpleAPIManagerV2.setUseDirectGeminiAPI(
        effectiveApiConfig.useDirectGeminiAPI
      );
    }

    // このルートは使用されていないため、ログ出力を無効化
    // 実際のAPI呼び出しはAPIManagerが処理

    if (false) {
      // 無効化: isDevelopment
      console.log("[DEV]");
      console.log("--- [API Route: /api/chat/generate] ---");
      console.log(
        `[DEV][Config] Provider: ${apiConfig.provider}, Model: ${apiConfig.model}`
      );

      // システムプロンプトの詳細表示
      if (systemPrompt) {
        console.log("[DEV]--- System Prompt ---");
        // システムプロンプト全体を表示（最初の部分）
        const lines = systemPrompt.split("\n");
        lines.slice(0, 15).forEach((line: string) => {
          console.log(line);
        });
        if (lines.length > 15) {
          console.log("...");
        }

        // キャラクター情報の抽出と表示
        const charInfoMatch = systemPrompt.match(
          /<character_information>([\s\S]*?)<\/character_information>/
        );
        if (charInfoMatch) {
          console.log("\n[DEV]--- Character Information ---");
          const charInfo = charInfoMatch[1].trim();
          const charLines = charInfo.split("\n");
          charLines.slice(0, 10).forEach((line: string) => {
            console.log(line);
          });
          if (charLines.length > 10) {
            console.log("...");
          }
        }

        // ペルソナ情報の抽出と表示
        const personaInfoMatch = systemPrompt.match(
          /<persona_information>([\s\S]*?)<\/persona_information>/
        );
        if (personaInfoMatch) {
          console.log("\n[DEV]--- Persona Information ---");
          const personaInfo = personaInfoMatch[1].trim();
          console.log(personaInfo);
        }

        // トラッカー情報の抽出と表示
        const trackerMatch = systemPrompt.match(
          /<character_trackers>([\s\S]*?)<\/character_trackers>/
        );
        if (trackerMatch) {
          console.log("\n[DEV]--- Tracker Information ---");
          const trackerInfo = trackerMatch[1].trim();
          const trackerLines = trackerInfo.split("\n");
          trackerLines.slice(0, 20).forEach((line: string) => {
            console.log(line);
          });
          if (trackerLines.length > 20) {
            console.log("...");
          }
        }
      }

      // 会話履歴の詳細表示
      console.log(
        `\n[DEV]--- Conversation History (${conversationHistory.length} messages) ---`
      );
      if (conversationHistory && conversationHistory.length > 0) {
        conversationHistory.slice(-3).forEach((msg: any, idx: number) => {
          const preview = msg.content.substring(0, 200);
          console.log(
            `${msg.role}: ${preview}${msg.content.length > 200 ? "..." : ""}`
          );
        });
        if (conversationHistory.length > 3) {
          console.log(`[... ${conversationHistory.length - 3} older messages]`);
        }
      }

      // ユーザーメッセージ
      console.log(`\n[DEV]--- User Message ---`);
      console.log(userMessage);

      console.log("=====================================\n");
    }

    let aiResponseContent: string;

    try {
      console.log("🚀 API生成開始:", {
        model: effectiveApiConfig.model,
        provider: effectiveApiConfig.provider,
        hasOpenRouterKey: !!effectiveApiConfig.openRouterApiKey,
        hasGeminiKey: !!effectiveApiConfig.geminiApiKey,
        useDirectGeminiAPI: effectiveApiConfig.useDirectGeminiAPI,
      });

      aiResponseContent = await simpleAPIManagerV2.generateMessage(
        systemPrompt,
        userMessage,
        conversationHistory,
        { ...effectiveApiConfig, textFormatting } // 環境変数とテキスト整形設定を渡す
      );

      console.log("✅ API生成成功");
    } catch (error) {
      console.error("❌ API生成エラー:", error);
      throw error;
    }

    // レスポンスログ（開発環境での確認用）
    const isDevelopment = process.env.NODE_ENV === "development";
    if (isDevelopment) {
      console.log(`\n[DEV]--- AI Response Generated ---`);
      console.log(`[DEV][Response Length] ${aiResponseContent.length} chars`);
      const preview = aiResponseContent.substring(0, 200);
      console.log(
        `[DEV][Response Preview] ${preview}${
          aiResponseContent.length > 200 ? "..." : ""
        }`
      );
      console.log("=====================================\n");
    }

    return NextResponse.json({ response: aiResponseContent });
  } catch (error) {
    console.error("Error in /api/chat/generate:", error);
    return NextResponse.json(
      {
        error: "Failed to generate AI response",
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
