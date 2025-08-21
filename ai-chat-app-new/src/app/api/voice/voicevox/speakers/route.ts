import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const voicevoxUrl = process.env.VOICEVOX_ENGINE_URL || 'http://localhost:50021';

    // VoiceVoxエンジンから話者リストを取得
    const response = await fetch(`${voicevoxUrl}/speakers`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000) // 5秒でタイムアウト
    });

    if (response.ok) {
      const speakers = await response.json();
      return NextResponse.json({ 
        success: true, 
        speakers: speakers,
        count: Array.isArray(speakers) ? speakers.length : 0
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: `VoiceVoxエンジンから話者リストを取得できませんでした (${response.status})` 
      }, { status: response.status });
    }

  } catch (error) {
    console.error('VoiceVox話者リスト取得エラー:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage.includes('fetch')) {
      return NextResponse.json({ 
        success: false, 
        error: 'VoiceVoxエンジンに接続できません。エンジンが起動しているか確認してください。' 
      }, { status: 503 });
    }
    
    return NextResponse.json({ 
      success: false, 
      error: `予期しないエラーが発生しました: ${errorMessage}` 
    }, { status: 500 });
  }
}
