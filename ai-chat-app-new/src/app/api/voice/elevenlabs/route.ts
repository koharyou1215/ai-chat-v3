import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, voiceId, settings } = body;

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      throw new Error(
        'ElevenLabs API キーが設定されていません。\n\n' +
        '設定方法：\n' +
        '1. 環境変数 ELEVENLABS_API_KEY を設定してください\n' +
        '2. ElevenLabsアカウントでAPIキーを取得: https://elevenlabs.io/\n' +
        '3. 本番環境の場合、Vercelの環境変数設定画面で追加してください\n\n' +
        '代替方法：\n' +
        '- ブラウザ組み込みのSystem TTSを使用（設定画面で切り替え）'
      );
    }

    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_multilingual_v2', // or settings.modelId
        voice_settings: {
          stability: settings.stability,
          similarity_boost: settings.similarityBoost,
          style: settings.style,
          use_speaker_boost: settings.useSpeakerBoost,
        },
      }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to synthesize audio from ElevenLabs: ${errorData.detail.message}`);
    }

    const audioBuffer = await response.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString('base64');
    
    return NextResponse.json({ 
      success: true, 
      audioData: `data:audio/mpeg;base64,${audioBase64}`
    });

  } catch (error) {
    console.error('Error in ElevenLabs API route:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
