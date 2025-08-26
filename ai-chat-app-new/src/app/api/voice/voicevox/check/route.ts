import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const voicevoxUrl = process.env.VOICEVOX_ENGINE_URL || 'http://localhost:50021';
    console.log(`🔍 VoiceVox status check to: ${voicevoxUrl}`);

    // VoiceVoxエンジンの状態をチェック
    const response = await fetch(`${voicevoxUrl}/version`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000) // 5秒でタイムアウト
    });

    if (response.ok) {
      const version = await response.json();
      console.log('✅ VoiceVox engine is running:', version);
      return NextResponse.json({ 
        success: true, 
        version: version,
        url: voicevoxUrl,
        status: 'VoiceVoxエンジンに接続済み'
      });
    } else {
      const errorText = await response.text().catch(() => 'No response text');
      console.error('VoiceVox status check failed:', {
        status: response.status,
        statusText: response.statusText,
        errorText
      });
      return NextResponse.json({ 
        success: false, 
        url: voicevoxUrl,
        error: `VoiceVoxエンジンが応答しません (${response.status}: ${response.statusText})`,
        details: errorText,
        troubleshooting: [
          'VoiceVoxエンジンが起動していることを確認してください',
          `エンジンURL (${voicevoxUrl}) が正しいことを確認してください`
        ]
      }, { status: 503 });
    }

  } catch (error) {
    const voicevoxUrl = process.env.VOICEVOX_ENGINE_URL || 'http://localhost:50021';
    console.error('VoiceVox接続チェックエラー:', error);
    
    let errorMessage = 'VoiceVoxエンジンに接続できません';
    let troubleshooting = [];
    
    if (error instanceof Error) {
      errorMessage = error.message;
      if (error.name === 'AbortError') {
        troubleshooting = [
          'VoiceVoxエンジンが起動していない可能性があります',
          `タイムアウト（5秒）が発生しました`,
          `エンジンURL: ${voicevoxUrl}`
        ];
      } else {
        troubleshooting = [
          'ネットワーク接続を確認してください',
          'VoiceVoxエンジンが起動していることを確認してください',
          `エンジンURL: ${voicevoxUrl}`
        ];
      }
    }
    
    return NextResponse.json({ 
      success: false,
      url: voicevoxUrl,
      error: errorMessage,
      troubleshooting
    }, { status: 503 });
  }
}