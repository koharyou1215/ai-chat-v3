import { NextResponse } from 'next/server';
// Removed unused import: NextRequest

export async function GET() {
  try {
    const voicevoxUrl = process.env.VOICEVOX_ENGINE_URL || 'http://localhost:50021';
    
    console.log('Testing VOICEVOX connection...');
    
    // 1. バージョンチェック
    const versionResponse = await fetch(`${voicevoxUrl}/version`);
    if (!versionResponse.ok) {
      throw new Error(`Version check failed: ${versionResponse.statusText}`);
    }
    const version = await versionResponse.text();
    console.log('VOICEVOX version:', version);

    // 2. 音声クエリテスト
    const queryUrl = `${voicevoxUrl}/audio_query?text=${encodeURIComponent('こんにちは')}&speaker=1`;
    console.log('Testing audio query:', queryUrl);
    
    const queryResponse = await fetch(queryUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!queryResponse.ok) {
      const errorText = await queryResponse.text();
      console.error('Audio query failed:', errorText);
      throw new Error(`Audio query failed: ${queryResponse.status} ${queryResponse.statusText} - ${errorText}`);
    }
    
    const audioQuery = await queryResponse.json();
    console.log('Audio query success:', audioQuery);

    // 3. 音声合成テスト
    const synthesisResponse = await fetch(`${voicevoxUrl}/synthesis?speaker=1`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(audioQuery)
    });

    if (!synthesisResponse.ok) {
      const errorText = await synthesisResponse.text();
      console.error('Synthesis failed:', errorText);
      throw new Error(`Synthesis failed: ${synthesisResponse.status} ${synthesisResponse.statusText} - ${errorText}`);
    }

    const audioBuffer = await synthesisResponse.arrayBuffer();
    console.log('Synthesis success, audio size:', audioBuffer.byteLength);

    return NextResponse.json({
      success: true,
      version,
      audioQuerySize: JSON.stringify(audioQuery).length,
      audioSize: audioBuffer.byteLength,
      message: 'VOICEVOX test completed successfully'
    });

  } catch (error) {
    console.error('VOICEVOX test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}