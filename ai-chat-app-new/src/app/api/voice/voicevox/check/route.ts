import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const voicevoxUrl = process.env.VOICEVOX_ENGINE_URL || 'http://localhost:50021';

    // VoiceVoxエンジンの状態をチェック
    const response = await fetch(`${voicevoxUrl}/version`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000) // 5秒でタイムアウト
    });

    if (response.ok) {
      const version = await response.json();
      return NextResponse.json({ 
        success: true, 
        version: version,
        status: 'VoiceVoxエンジンに接続済み'
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: `VoiceVoxエンジンが応答しません (${response.status})` 
      }, { status: 503 });
    }

  } catch (error) {
    console.error('VoiceVox接続チェックエラー:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'VoiceVoxエンジンに接続できません' 
    }, { status: 503 });
  }
}