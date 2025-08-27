import { NextResponse } from 'next/server';
import { apiManager } from '@/services/api-manager';
// Removed unused import: import type { APIConfig } from '@/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      systemPrompt, 
      userMessage, 
      conversationHistory, 
      apiConfig,
      textFormatting = 'readable'
    } = body;

    if (!userMessage) {
      return NextResponse.json({ error: 'userMessage is required' }, { status: 400 });
    }

    // API Managerに設定を適用
    console.log('🔧 Applying API configuration:', apiConfig);
    
    // 環境変数から API キーを取得
    const effectiveApiConfig = { ...apiConfig };
    
    if (apiConfig.provider === 'gemini') {
      const geminiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!geminiKey) {
        console.error('❌ NEXT_PUBLIC_GEMINI_API_KEY not found in environment');
        throw new Error('Gemini API キーが設定されていません');
      }
      effectiveApiConfig.geminiApiKey = geminiKey;
      console.log('✅ Gemini API key loaded from environment');
    } else if (apiConfig.provider === 'openrouter') {
      // OpenRouter の場合、フロントエンドから送られてくる API キーを使用
      if (!apiConfig.openRouterApiKey) {
        console.error('❌ OpenRouter API key not provided');
        throw new Error('OpenRouter API キーが設定されていません');
      }
      console.log('✅ OpenRouter API key provided from client');
    }
    
    // ログ出力（これがターミナルに表示される）
    console.log("\n--- [API Route: /api/chat/generate] ---");
    console.log(`[Config] Provider: ${apiConfig.provider}, Model: ${apiConfig.model}`);
    console.log("--- System Prompt ---");
    console.log(systemPrompt);
    console.log("--- Conversation History ---");
    console.log(JSON.stringify(conversationHistory, null, 2));
    console.log("--- User Message ---");
    console.log(userMessage);
    console.log("-----------------------------------------\n");

    const aiResponseContent = await apiManager.generateMessage(
      systemPrompt,
      userMessage,
      conversationHistory,
      { ...effectiveApiConfig, textFormatting } // 環境変数とテキスト整形設定を渡す
    );

    return NextResponse.json({ response: aiResponseContent });

  } catch (error) {
    console.error('Error in /api/chat/generate:', error);
    return NextResponse.json(
      { error: 'Failed to generate AI response', details: (error as Error).message }, 
      { status: 500 }
    );
  }
}
