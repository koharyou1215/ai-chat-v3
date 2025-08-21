import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, speakerId, settings } = body;

    const voicevoxUrl = process.env.VOICEVOX_ENGINE_URL || 'http://localhost:50021';
    
    // VoiceVoxエンジンが起動しているかチェック
    try {
      const healthCheck = await fetch(`${voicevoxUrl}/version`, { 
        method: 'GET',
        signal: AbortSignal.timeout(3000) // 3秒でタイムアウト
      });
      if (!healthCheck.ok) {
        throw new Error(`VoiceVoxエンジンが応答しません (${healthCheck.status})`);
      }
    } catch (healthError) {
      throw new Error(`VoiceVoxエンジンに接続できません: ${healthError instanceof Error ? healthError.message : 'Unknown error'}`);
    }

    // 1. audio_queryの作成
    const queryResponse = await fetch(`${voicevoxUrl}/audio_query?text=${encodeURIComponent(text)}&speaker=${speakerId}`, { 
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
    });
    if (!queryResponse.ok) {
        throw new Error(`Failed to create audio query: ${queryResponse.statusText}`);
    }
    const audioQuery = await queryResponse.json();

    // 2. 音声合成
    const synthesisResponse = await fetch(`${voicevoxUrl}/synthesis?speaker=${speakerId}`, { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...audioQuery, ...settings }) // 設定をマージ
    });
    if (!synthesisResponse.ok) {
        throw new Error(`Failed to synthesize audio: ${synthesisResponse.statusText}`);
    }
    
    const audioBuffer = await synthesisResponse.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString('base64');
    
    return NextResponse.json({ 
      success: true, 
      audioData: `data:audio/wav;base64,${audioBase64}`
    });

  } catch (error) {
    console.error('Error in VoiceVox API route:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
