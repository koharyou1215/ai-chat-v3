import { NextResponse } from "next/server";
import { simpleAPIManagerV2 } from "@/services/simple-api-manager-v2";
import { debugLog } from "@/utils/debug-logger"; // debugLogをインポート
// Removed unused import: import type { APIConfig } from '@/types';

export async function POST(request: Request) {
  // 🔥 Performance Measurement: リクエスト開始時刻を記録
  const requestStartTime = Date.now();

  debugLog("#### API Route: /api/chat/generate called (to file) ####"); // ファイルにログ出力
  console.log("#### API Route: /api/chat/generate called (to console) ####"); // コンソールにも一応出力

  // 変数をトップレベルで宣言（catch文からもアクセス可能にする）
  let apiConfig: any;

  try {
    const body = await request.json();
    const {
      systemPrompt,
      userMessage,
      conversationHistory,
      apiConfig: requestApiConfig,
      textFormatting = "readable",
      characterId, // 🔥 Prompt Caching: キャッシュキー生成用
      personaId, // 🔥 Prompt Caching: キャッシュキー生成用
    } = body;

    // apiConfigを代入
    apiConfig = requestApiConfig;

    if (!userMessage) {
      return NextResponse.json(
        { error: "userMessage is required" },
        { status: 400 }
      );
    }

    // API設定（モデル名のみ表示）

    // モデル名からプロバイダーを判定
    const model = apiConfig.model || "gemini-2.5-flash";
    let effectiveProvider = apiConfig.provider;

    const wantsGeminiModel =
      model.includes("gemini") || model.includes("google/");

    // If the model is a Gemini model but the request (or persisted config)
    // does not allow direct Gemini usage, route Gemini-model requests
    // through OpenRouter instead. This prevents the route from requiring
    // a Gemini API key when `useDirectGeminiAPI` is disabled.
    if (wantsGeminiModel) {
      const wantsDirectGemini =
        !!apiConfig?.useDirectGeminiAPI ||
        !!requestApiConfig?.useDirectGeminiAPI;
      if (wantsDirectGemini) {
        effectiveProvider = "gemini";
      } else {
        effectiveProvider = "openrouter";
        console.log(
          "⚠️ Gemini model detected but direct Gemini use is disabled; routing via OpenRouter"
        );
      }
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

    // プロバイダー判定（非表示）

    // 環境変数から API キーを取得
    const effectiveApiConfig = {
      ...apiConfig,
      provider: effectiveProvider,
      // 🔥 Prompt Caching: キャッシュキー生成用のIDを追加
      characterId,
      personaId,
    };

    if (effectiveProvider === "gemini") {
      // フロントエンドから送られてくる API キーを最優先で使用
      if (apiConfig.geminiApiKey) {
        effectiveApiConfig.geminiApiKey = apiConfig.geminiApiKey;
        // APIキー確認（ログ非表示）
      } else {
        // フォールバック: 環境変数から読み込み
        const geminiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        if (geminiKey) {
          effectiveApiConfig.geminiApiKey = geminiKey;
          // 環境変数からのAPIキー読み込み（ログ非表示）
        } else {
          console.error("❌ No Gemini API key found (client or environment)");
          throw new Error("Gemini API キーが設定されていません");
        }
      }
    } else if (effectiveProvider === "openrouter") {
      // OpenRouter の場合、フロントエンドから送られてくる API キーを使用
      if (apiConfig.openRouterApiKey) {
        effectiveApiConfig.openRouterApiKey = apiConfig.openRouterApiKey;
        console.log("✅ OpenRouter API key provided from client");
      } else {
        // フォールバック: 環境変数から読み込み
        const openRouterKey =
          process.env.OPENROUTER_API_KEY ||
          process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
        if (openRouterKey) {
          effectiveApiConfig.openRouterApiKey = openRouterKey;
          console.log("✅ OpenRouter API key loaded from environment");
        } else {
          console.error(
            "❌ OpenRouter API key not provided (client or environment)"
          );
          // エラーにせず、simpleAPIManagerV2のデフォルト処理に任せる
          console.log(
            "⚠️ Proceeding without explicit OpenRouter API key - will use manager's default"
          );
        }
      }
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
        conversationHistory
          .slice(-3)
          .forEach(
            (
              msg: { role: "user" | "assistant"; content: string },
              idx: number
            ) => {
              const preview = msg.content.substring(0, 200);
              console.log(
                `${msg.role}: ${preview}${
                  msg.content.length > 200 ? "..." : ""
                }`
              );
            }
          );
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
      // 🔥 Performance Measurement: API呼び出し前の計測
      const apiCallStartTime = Date.now();
      const systemPromptLength = systemPrompt.length;

      // シンプル化されたログ: APIに送信される完全なプロンプトのみ表示
      console.log("\n" + "=".repeat(80));
      console.log("📤 APIリクエスト - 送信プロンプト全文");
      console.log("=".repeat(80));
      console.log("🚀 モデル:", effectiveApiConfig.model);
      console.log("📏 文字数:", systemPromptLength, "文字");
      console.log("-".repeat(80));
      console.log(systemPrompt);
      console.log("=".repeat(80) + "\n");

      // APIリクエスト送信
      aiResponseContent = await simpleAPIManagerV2.generateMessage(
        systemPrompt,
        userMessage,
        conversationHistory,
        { ...effectiveApiConfig, textFormatting } // 環境変数とテキスト整形設定を渡す
      );

      // 🔥 Performance Measurement: API呼び出し後の計測
      const apiCallEndTime = Date.now();
      const apiCallDuration = apiCallEndTime - apiCallStartTime;

      console.log("✅ API生成成功");
      console.log(`⏱️ [Performance] API呼び出し時間: ${apiCallDuration}ms`);
    } catch (error) {
      console.error("❌ API生成エラー:", error);
      throw error;
    }

    // レスポンスログ（シンプル化）
    console.log("=".repeat(80));
    console.log("📥 AI応答");
    console.log("=".repeat(80));
    console.log("📏 文字数:", aiResponseContent.length, "文字");
    console.log("-".repeat(80));
    console.log(aiResponseContent);
    console.log("=".repeat(80) + "\n");

    // 🔥 Performance Measurement: 全体の処理時間を記録
    const requestEndTime = Date.now();
    const totalDuration = requestEndTime - requestStartTime;

    console.log("📊 [Performance Summary]");
    console.log(`  - Total Request Time: ${totalDuration}ms`);
    console.log(`  - Model: ${effectiveApiConfig.model}`);
    console.log(`  - Provider: ${effectiveApiConfig.provider}`);
    if (characterId) console.log(`  - Character ID: ${characterId}`);
    if (personaId) console.log(`  - Persona ID: ${personaId}`);

    return NextResponse.json({ response: aiResponseContent });
  } catch (error) {
    console.error("❌❌❌ Critical Error in /api/chat/generate:", error);
    console.error("🔍 Error type:", typeof error);
    console.error("🔍 Error message:", (error as Error).message);
    console.error("🔍 Error stack:", (error as Error).stack);

    // APIキーの状態を確認（apiConfigが利用可能になった）
    console.error("🔑 API Key Status:");
    console.error(
      "  - OpenRouter key provided:",
      !!apiConfig?.openRouterApiKey
    );
    console.error("  - Gemini key provided:", !!apiConfig?.geminiApiKey);
    console.error("  - Use Direct Gemini:", apiConfig?.useDirectGeminiAPI);
    console.error("  - Model:", apiConfig?.model);
    console.error("  - Provider:", apiConfig?.provider);

    return NextResponse.json(
      {
        error: "Failed to generate AI response",
        details: (error as Error).message,
        debugInfo: {
          hasOpenRouterKey: !!apiConfig?.openRouterApiKey,
          hasGeminiKey: !!apiConfig?.geminiApiKey,
          model: apiConfig?.model,
          provider: apiConfig?.provider,
        },
      },
      { status: 500 }
    );
  }
}
