import { NextResponse } from "next/server";
import { simpleAPIManagerV2 } from "@/services/simple-api-manager-v2";
import { debugLog } from "@/utils/debug-logger"; // debugLogをインポート
import { logger } from '@/utils/logger';
import type { APIConfig } from '@/types';

export async function POST(request: Request) {
  // 🔥 Performance Measurement: リクエスト開始時刻を記録
  const requestStartTime = Date.now();

  debugLog("#### API Route: /api/chat/generate called (to file) ####"); // ファイルにログ出力
  logger.info("#### API Route: /api/chat/generate called (to console) ####"); // コンソールにも一応出力

  // 変数をトップレベルで宣言（catch文からもアクセス可能にする）
  let apiConfig: Partial<APIConfig> = {};

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

    // 🔍 CRITICAL DEBUG: 受信したapiConfigを完全にログ出力
    logger.debug("🔍 [CRITICAL DEBUG] Received apiConfig:", JSON.stringify({
      provider: apiConfig?.provider,
      model: apiConfig?.model,
      useDirectGeminiAPI: apiConfig?.useDirectGeminiAPI,
      hasGeminiKey: !!apiConfig?.geminiApiKey,
      hasOpenRouterKey: !!apiConfig?.openRouterApiKey,
      // 🔧 追加: apiConfig全体のキーを確認
      allKeys: Object.keys(apiConfig || {}),
    }, null, 2));

    // 🔍 CRITICAL DEBUG: requestApiConfigも確認
    logger.debug("🔍 [CRITICAL DEBUG] requestApiConfig (body.apiConfig):", JSON.stringify({
      provider: requestApiConfig?.provider,
      model: requestApiConfig?.model,
      useDirectGeminiAPI: requestApiConfig?.useDirectGeminiAPI,
      // 🔧 追加: 全キーを確認
      allKeys: Object.keys(requestApiConfig || {}),
      // 🔧 追加: 値の型も確認
      useDirectGeminiAPIType: typeof requestApiConfig?.useDirectGeminiAPI,
    }, null, 2));

    // 🔍 CRITICAL DEBUG: body全体の構造を確認
    logger.debug("🔍 [CRITICAL DEBUG] Request body keys:", Object.keys(body));

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

    // 🔧 CRITICAL FIX: クライアント設定を最優先（本番環境対応）
    // クライアントから明示的に設定された値を確認
    const clientUseDirectGemini =
      apiConfig?.useDirectGeminiAPI !== undefined
        ? apiConfig.useDirectGeminiAPI
        : requestApiConfig?.useDirectGeminiAPI;

    const envUseDirectGemini = process.env.NEXT_PUBLIC_USE_DIRECT_GEMINI_API === 'true';

    // 🔍 DEBUG: 受信した設定値を詳細ログ出力（本番環境デバッグ用）
    logger.debug("🔍 [Provider Selection] Input values:", JSON.stringify({
      model,
      clientUseDirectGemini,
      envUseDirectGemini,
      hasGeminiKey: !!apiConfig?.geminiApiKey,
      hasOpenRouterKey: !!apiConfig?.openRouterApiKey,
    }, null, 2));

    // 🔧 FIX: モデル名から直接APIかOpenRouter経由かを判定
    const isGeminiDirectModel = model.startsWith("gemini-");  // gemini-2.5-flash等
    const isGeminiOpenRouterModel = model.startsWith("google/");  // google/gemini-*
    const wantsGeminiModel = isGeminiDirectModel || isGeminiOpenRouterModel;

    // 🔧 CRITICAL FIX: 判定優先順位を明確化
    // 1. クライアント設定が明示的にtrue → Gemini直接API
    // 2. モデル名が "gemini-*" → Gemini直接API
    // 3. モデル名が "google/*" → OpenRouter経由
    // 4. それ以外 → OpenRouter
    let wantsDirectGemini = false;

    if (wantsGeminiModel) {
      // 🔧 PRIORITY 1: クライアント設定が明示的に設定されている場合、それを最優先
      if (clientUseDirectGemini === true) {
        wantsDirectGemini = true;
        logger.info("✅ [Priority 1] Client setting: useDirectGeminiAPI=true - Using Gemini API directly");
      }
      // 🔧 PRIORITY 2: クライアント設定がfalseの場合、OpenRouter経由
      else if (clientUseDirectGemini === false) {
        wantsDirectGemini = false;
        logger.warn("⚠️ [Priority 1] Client setting: useDirectGeminiAPI=false - Using OpenRouter");
      }
      // 🔧 PRIORITY 3: クライアント設定がundefinedの場合、モデル名で判定
      else if (isGeminiDirectModel) {
        wantsDirectGemini = true;
        logger.info("✅ [Priority 2] Model name detection: gemini-* - Using Gemini API directly");
      }
      else if (isGeminiOpenRouterModel) {
        wantsDirectGemini = false;
        logger.info("✅ [Priority 2] Model name detection: google/* - Using OpenRouter");
      }
      // 🔧 PRIORITY 4: 環境変数チェック（最終フォールバック）
      else {
        wantsDirectGemini = envUseDirectGemini;
        logger.debug(`🔧 [Priority 3] Environment variable: NEXT_PUBLIC_USE_DIRECT_GEMINI_API=${envUseDirectGemini}`);
      }

      // 🔍 DEBUG: 最終判定結果をログ出力
      logger.debug("🔍 [Final Decision] Gemini routing:", JSON.stringify({
        isGeminiDirectModel,
        isGeminiOpenRouterModel,
        model,
        clientUseDirectGemini,
        envUseDirectGemini,
        wantsDirectGemini,
        finalProvider: wantsDirectGemini ? "gemini" : "openrouter"
      }, null, 2));

      if (wantsDirectGemini) {
        effectiveProvider = "gemini";
        logger.info("✅ Final: Using Gemini API directly");
      } else {
        effectiveProvider = "openrouter";
        logger.warn("⚠️ Final: Routing via OpenRouter");
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
      logger.info("✅ Non-Gemini model detected - Using OpenRouter");
    }

    // プロバイダー判定（非表示）

    // 環境変数から API キーを取得
    // 🔧 FIX: wantsDirectGeminiの判定結果を明示的にeffectiveApiConfigに含める
    const effectiveApiConfig = {
      ...apiConfig,
      provider: effectiveProvider,
      useDirectGeminiAPI: wantsGeminiModel ? wantsDirectGemini : (apiConfig.useDirectGeminiAPI ?? false),
      // 🔥 Prompt Caching: キャッシュキー生成用のIDを追加
      characterId,
      personaId,
    };

    // 🔍 DEBUG: effectiveApiConfigの最終状態をログ出力
    logger.debug("🔍 [DEBUG] effectiveApiConfig:", JSON.stringify({
      provider: effectiveApiConfig.provider,
      model: effectiveApiConfig.model,
      useDirectGeminiAPI: effectiveApiConfig.useDirectGeminiAPI,
      hasGeminiKey: !!effectiveApiConfig.geminiApiKey,
      hasOpenRouterKey: !!effectiveApiConfig.openRouterApiKey,
    }, null, 2));

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
          logger.error("❌ No Gemini API key found (client or environment)");
          throw new Error("Gemini API キーが設定されていません");
        }
      }
    } else if (effectiveProvider === "openrouter") {
      // OpenRouter の場合、フロントエンドから送られてくる API キーを使用
      if (apiConfig.openRouterApiKey) {
        effectiveApiConfig.openRouterApiKey = apiConfig.openRouterApiKey;
        logger.info("✅ OpenRouter API key provided from client");
      } else {
        // フォールバック: 環境変数から読み込み
        const openRouterKey =
          process.env.OPENROUTER_API_KEY ||
          process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
        if (openRouterKey) {
          effectiveApiConfig.openRouterApiKey = openRouterKey;
          logger.info("✅ OpenRouter API key loaded from environment");
        } else {
          logger.error(
            "❌ OpenRouter API key not provided (client or environment)"
          );
          // エラーにせず、simpleAPIManagerV2のデフォルト処理に任せる
          logger.warn(
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
      logger.debug("[DEV]");
      logger.debug("--- [API Route: /api/chat/generate] ---");
      logger.debug(
        `[DEV][Config] Provider: ${apiConfig.provider}, Model: ${apiConfig.model}`
      );

      // システムプロンプトの詳細表示
      if (systemPrompt) {
        logger.debug("[DEV]--- System Prompt ---");
        // システムプロンプト全体を表示（最初の部分）
        const lines = systemPrompt.split("\n");
        lines.slice(0, 15).forEach((line: string) => {
          logger.debug(line);
        });
        if (lines.length > 15) {
          logger.debug("...");
        }

        // キャラクター情報の抽出と表示
        const charInfoMatch = systemPrompt.match(
          /<character_information>([\s\S]*?)<\/character_information>/
        );
        if (charInfoMatch) {
          logger.debug("\n[DEV]--- Character Information ---");
          const charInfo = charInfoMatch[1].trim();
          const charLines = charInfo.split("\n");
          charLines.slice(0, 10).forEach((line: string) => {
            logger.debug(line);
          });
          if (charLines.length > 10) {
            logger.debug("...");
          }
        }

        // ペルソナ情報の抽出と表示
        const personaInfoMatch = systemPrompt.match(
          /<persona_information>([\s\S]*?)<\/persona_information>/
        );
        if (personaInfoMatch) {
          logger.debug("\n[DEV]--- Persona Information ---");
          const personaInfo = personaInfoMatch[1].trim();
          logger.debug(personaInfo);
        }

        // トラッカー情報の抽出と表示
        const trackerMatch = systemPrompt.match(
          /<character_trackers>([\s\S]*?)<\/character_trackers>/
        );
        if (trackerMatch) {
          logger.debug("\n[DEV]--- Tracker Information ---");
          const trackerInfo = trackerMatch[1].trim();
          const trackerLines = trackerInfo.split("\n");
          trackerLines.slice(0, 20).forEach((line: string) => {
            logger.debug(line);
          });
          if (trackerLines.length > 20) {
            logger.debug("...");
          }
        }
      }

      // 会話履歴の詳細表示
      logger.debug(
        `\n[DEV]--- Conversation History (${conversationHistory.length} messages) ---`
      );
      if (conversationHistory && conversationHistory.length > 0) {
        conversationHistory
          .slice(-3)
          .forEach(
            (
              msg: { role: "user" | "assistant"; content: string },
              _idx: number
            ) => {
              const preview = msg.content.substring(0, 200);
              logger.debug(
                `${msg.role}: ${preview}${
                  msg.content.length > 200 ? "..." : ""
                }`
              );
            }
          );
        if (conversationHistory.length > 3) {
          logger.debug(`[... ${conversationHistory.length - 3} older messages]`);
        }
      }

      // ユーザーメッセージ
      logger.debug(`\n[DEV]--- User Message ---`);
      logger.debug(userMessage);

      logger.debug("=====================================\n");
    }

    let aiResponseContent: string;

    try {
      // 🔥 Performance Measurement: API呼び出し前の計測
      const apiCallStartTime = Date.now();
      const systemPromptLength = systemPrompt.length;

      // シンプル化されたログ: APIに送信される完全なプロンプトのみ表示
      logger.info("\n" + "=".repeat(80));
      logger.info("📤 APIリクエスト - 送信プロンプト全文");
      logger.info("=".repeat(80));
      logger.info("🚀 モデル:", effectiveApiConfig.model);
      logger.info("📏 文字数:", systemPromptLength, "文字");
      logger.info("-".repeat(80));
      logger.info(systemPrompt);
      logger.info("=".repeat(80) + "\n");

      // APIリクエスト送信
      aiResponseContent = await simpleAPIManagerV2.generateMessage(
        systemPrompt,
        userMessage,
        conversationHistory,
        effectiveApiConfig // 環境変数設定を渡す
      );

      // 🔥 Performance Measurement: API呼び出し後の計測
      const apiCallEndTime = Date.now();
      const apiCallDuration = apiCallEndTime - apiCallStartTime;

      logger.info("✅ API生成成功");
      logger.info(`⏱️ [Performance] API呼び出し時間: ${apiCallDuration}ms`);
    } catch (error) {
      logger.error("❌ API生成エラー:", error);
      throw error;
    }

    // レスポンスログ（シンプル化）
    logger.info("=".repeat(80));
    logger.info("📥 AI応答");
    logger.info("=".repeat(80));
    logger.info("📏 文字数:", aiResponseContent.length, "文字");
    logger.info("-".repeat(80));
    logger.info(aiResponseContent);
    logger.info("=".repeat(80) + "\n");

    // 🔥 Performance Measurement: 全体の処理時間を記録
    const requestEndTime = Date.now();
    const totalDuration = requestEndTime - requestStartTime;

    logger.info("📊 [Performance Summary]");
    logger.info(`  - Total Request Time: ${totalDuration}ms`);
    logger.info(`  - Model: ${effectiveApiConfig.model}`);
    logger.info(`  - Provider: ${effectiveApiConfig.provider}`);
    if (characterId) logger.info(`  - Character ID: ${characterId}`);
    if (personaId) logger.info(`  - Persona ID: ${personaId}`);

    return NextResponse.json({ response: aiResponseContent });
  } catch (error) {
    logger.error("❌❌❌ Critical Error in /api/chat/generate:", error);
    logger.error("🔍 Error type:", typeof error);
    logger.error("🔍 Error message:", (error as Error).message);
    logger.error("🔍 Error stack:", (error as Error).stack);

    // APIキーの状態を確認（apiConfigが利用可能になった）
    logger.error("🔑 API Key Status:");
    logger.error(
      "  - OpenRouter key provided:",
      !!apiConfig?.openRouterApiKey
    );
    logger.error("  - Gemini key provided:", !!apiConfig?.geminiApiKey);
    logger.error("  - Use Direct Gemini:", apiConfig?.useDirectGeminiAPI);
    logger.error("  - Model:", apiConfig?.model);
    logger.error("  - Provider:", apiConfig?.provider);

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
