import { NextResponse } from 'next/server';
import { apiManager } from '@/services/api-manager';
import type { APIConfig } from '@/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      systemPrompt, 
      userMessage, 
      conversationHistory, 
      apiConfig 
    } = body;

    if (!userMessage) {
      return NextResponse.json({ error: 'userMessage is required' }, { status: 400 });
    }

    // API Managerに設定を適用
    // apiManager.setConfig(apiConfig as Partial<APIConfig>);
    // if (apiConfig.provider === 'openrouter' && apiConfig.openRouterApiKey) {
    //   apiManager.setOpenRouterApiKey(apiConfig.openRouterApiKey);
    // }
    
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
      apiConfig // apiConfig を直接渡す
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
