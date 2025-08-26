import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // speakerId を speaker に修正
    const { text, speaker, settings } = body;

    const voicevoxUrl = process.env.VOICEVOX_ENGINE_URL || 'http://localhost:50021';
    
    // VoiceVoxエンジンが起動しているかチェック
    try {
      console.log(`🔊 VoiceVox health check to: ${voicevoxUrl}/version`);
      const healthCheck = await fetch(`${voicevoxUrl}/version`, { 
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5秒でタイムアウト
      });
      if (!healthCheck.ok) {
        const errorText = await healthCheck.text().catch(() => 'No response text');
        console.error('VoiceVox health check failed:', {
          status: healthCheck.status,
          statusText: healthCheck.statusText,
          errorText
        });
        throw new Error(`VoiceVoxエンジンが応答しません (${healthCheck.status}: ${healthCheck.statusText}). ${errorText ? 'Response: ' + errorText : ''}`);
      }
      const versionInfo = await healthCheck.json().catch(() => null);
      console.log('✅ VoiceVox engine is running:', versionInfo);
    } catch (healthError) {
      console.error('VoiceVox connection error:', healthError);
      if (healthError instanceof Error && healthError.name === 'AbortError') {
        throw new Error(`VoiceVoxエンジンに接続できません: タイムアウト (5秒) - エンジンが起動していない可能性があります`);
      }
      throw new Error(`VoiceVoxエンジンに接続できません: ${healthError instanceof Error ? healthError.message : 'Unknown error'} - エンジンのURLを確認してください: ${voicevoxUrl}`);
    }

    // 1. audio_queryの作成
    const queryResponse = await fetch(`${voicevoxUrl}/audio_query?text=${encodeURIComponent(text)}&speaker=${speaker}`, { 
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
    
    // settings があれば audioQuery にマージ
    if (settings) {
      audioQuery.speedScale = settings.speed ?? 1.0;
      audioQuery.pitchScale = settings.pitch ?? 0.0;
      audioQuery.intonationScale = settings.intonation ?? 1.0;
      audioQuery.volumeScale = settings.volume ?? 1.0;
    }
    
    console.log('Audio query created:', audioQuery);

    // 2. 音声合成
    const synthesisResponse = await fetch(`${voicevoxUrl}/synthesis?speaker=${speaker}`, { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(audioQuery)
    });
    
    if (!synthesisResponse.ok) {
        const errorText = await synthesisResponse.text();
        console.error('VOICEVOX synthesis error:', errorText);
        throw new Error(`Failed to synthesize audio: ${synthesisResponse.status} ${synthesisResponse.statusText} - ${errorText}`);
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
