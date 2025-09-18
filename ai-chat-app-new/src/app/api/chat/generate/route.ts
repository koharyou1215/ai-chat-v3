import { NextResponse } from "next/server";
import { simpleAPIManagerV2 } from "@/services/simple-api-manager-v2";
import { debugLog } from '@/utils/debug-logger'; // debugLogをインポート
// Removed unused import: import type { APIConfig } from '@/types';

export async function POST(request: Request) {
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

    // プロバイダー判定（非表示）

    // 環境変数から API キーを取得
    const effectiveApiConfig = { ...apiConfig, provider: effectiveProvider };

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
        const openRouterKey = process.env.OPENROUTER_API_KEY || process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
        if (openRouterKey) {
          effectiveApiConfig.openRouterApiKey = openRouterKey;
          console.log("✅ OpenRouter API key loaded from environment");
        } else {
          console.error("❌ OpenRouter API key not provided (client or environment)");
          // エラーにせず、simpleAPIManagerV2のデフォルト処理に任せる
          console.log("⚠️ Proceeding without explicit OpenRouter API key - will use manager's default");
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
      // プロンプト全体をログ出力
      console.log("\n==== APIリクエスト ====");
      console.log("🚀 モデル:", effectiveApiConfig.model);

      console.log("\n📝 ユーザーメッセージ:");
      console.log(userMessage);

      // 会話履歴を表示
      console.log("\n📚 会話履歴 (" + conversationHistory.length + "件):");
      conversationHistory
        .slice(-10)
        .forEach(
          (
            msg: { role: "user" | "assistant"; content: string },
            index: number
          ) => {
            console.log(
              `  ${index + 1}. [${msg.role}]: ${msg.content.substring(0, 100)}${
                msg.content.length > 100 ? "..." : ""
              }`
            );
          }
        );

      // システムプロンプトから情報を抽出して表示（PROMPT_VERIFICATION_GUIDE.mdの順序に従う）
      console.log("\n📦 システムプロンプト構成（正しい順序）:");

      // 1. System Instructions (必須)
      const systemInstructionsMatch = systemPrompt.match(
        /<system_instructions>([\s\S]*?)<\/system_instructions>/
      );
      console.log("  1️⃣ System Instructions: " + (systemInstructionsMatch ? "✅ あり" : "❌ なし"));

      // 2. Jailbreak (オプション)
      const jailbreakMatch = systemPrompt.match(
        /<jailbreak>([\s\S]*?)<\/jailbreak>/
      );
      console.log("  2️⃣ Jailbreak: " + (jailbreakMatch ? "✅ あり" : "➖ なし（オプション）"));

      // 3. Character Information（必須）
      const charMatch = systemPrompt.match(
        /<character_information>([\s\S]*?)<\/character_information>/
      );
      if (charMatch) {
        const charInfo = charMatch[1];
        const nameMatch = charInfo.match(/Name: (.+)/);
        console.log(
          "  3️⃣ Character Information: ✅ " + (nameMatch ? nameMatch[1] : "キャラクター名不明")
        );
      } else {
        console.log("  3️⃣ Character Information: ❌ なし");
      }

      // 4. Persona Information（必須）
      const personaMatch = systemPrompt.match(
        /<persona_information>([\s\S]*?)<\/persona_information>/
      );
      if (personaMatch) {
        console.log("  4️⃣ Persona Information: ✅ あり");
        const personaInfo = personaMatch[1].substring(0, 100);
        console.log("    " + personaInfo.replace(/\n/g, ' ').substring(0, 80) + "...");
      } else {
        console.log("  4️⃣ Persona Information: ❌ なし");
      }

      // 5. Relationship State（トラッカー情報）
      const trackerMatch = systemPrompt.match(
        /<relationship_state>([\s\S]*?)<\/relationship_state>/
      );
      if (trackerMatch) {
        const trackerInfo = trackerMatch[1];
        // トラッカー名を抽出（## で始まる行を探す）
        const trackerNames = trackerInfo.match(/## [^\n]+/g) || [];
        console.log("  5️⃣ Relationship State: ✅ トラッカー" + trackerNames.length + "個");
        trackerNames.slice(0, 5).forEach((tracker: string) => {
          console.log("    - " + tracker.replace("## ", ""));
        });
        if (trackerNames.length > 5) {
          console.log("    ... 他" + (trackerNames.length - 5) + "個");
        }
      } else {
        console.log("  5️⃣ Relationship State: ➖ トラッカーなし");
      }

      // 6. Memory Context（メモリーカード）
      const memoryContextMatch = systemPrompt.match(
        /<memory_context>([\s\S]*?)<\/memory_context>/
      );

      let totalMemoryCards = 0;
      if (memoryContextMatch) {
        // 正確にカードをカウント: [category] title: のパターンを探す
        const cardPattern = /^\s*\[([^\]]+)\]\s+[^:]+:/gm;
        const cards = memoryContextMatch[1].match(cardPattern);
        totalMemoryCards = cards ? cards.length : 0;
        console.log("  6️⃣ Memory Context: " + (totalMemoryCards > 0 ? "✅ " + totalMemoryCards + "件" : "➖ なし"));
      } else {
        console.log("  6️⃣ Memory Context: ➖ なし");
      }

      // 7. Current Input（必須 - プロンプトの最後にあるはず）
      const currentInputMatch = systemPrompt.match(/## Current Input[\s\S]*$/);
      console.log("  7️⃣ Current Input: " + (currentInputMatch ? "✅ あり" : "❌ なし"));

      console.log("\n📊 プロンプト順序の検証:");
      console.log("  " + (systemInstructionsMatch && charMatch && personaMatch ? "✅ 正しい順序" : "❌ 順序に問題あり"));

      // システムプロンプトの実際の内容を表示
      console.log("\n📦 システムプロンプト (先頭1000文字):");
      console.log(systemPrompt.substring(0, 1000));
      console.log("... [" + systemPrompt.length + "文字]\n");

      // APIリクエスト送信
      console.log("\n🚀 APIリクエスト送信中...");

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

    // レスポンスログ
    console.log("\n🤖 AI応答 (先頭200文字):");
    console.log(
      aiResponseContent.substring(0, 200) +
        (aiResponseContent.length > 200 ? "..." : "")
    );
    console.log("==== リクエスト完了 ====\n");

    return NextResponse.json({ response: aiResponseContent });
  } catch (error) {
    console.error("❌❌❌ Critical Error in /api/chat/generate:", error);
    console.error("🔍 Error type:", typeof error);
    console.error("🔍 Error message:", (error as Error).message);
    console.error("🔍 Error stack:", (error as Error).stack);

    // APIキーの状態を確認（apiConfigが利用可能になった）
    console.error("🔑 API Key Status:");
    console.error("  - OpenRouter key provided:", !!apiConfig?.openRouterApiKey);
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
          provider: apiConfig?.provider
        }
      },
      { status: 500 }
    );
  }
}