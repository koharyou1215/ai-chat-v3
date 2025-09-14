import { NextRequest, NextResponse } from 'next/server';

/**
 * VOICEVOX API Proxy Route
 * ブラウザから直接VOICEVOXに接続できない場合のプロキシ
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint, method = 'GET', data } = body;

    const voicevoxUrl = process.env.VOICEVOX_ENGINE_URL || 'http://localhost:50021';
    const fullUrl = `${voicevoxUrl}${endpoint}`;

    console.log(`🔊 VOICEVOX Proxy: ${method} ${fullUrl}`);

    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (method === 'POST' && data) {
      options.body = typeof data === 'string' ? data : JSON.stringify(data);
    }

    const response = await fetch(fullUrl, options);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('VOICEVOX error:', errorText);
      return NextResponse.json(
        { error: `VOICEVOX error: ${response.statusText}` },
        { status: response.status }
      );
    }

    // バイナリデータの場合（音声合成結果）
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('audio')) {
      const audioBuffer = await response.arrayBuffer();
      const audioBase64 = Buffer.from(audioBuffer).toString('base64');
      return NextResponse.json({
        success: true,
        audioData: `data:audio/wav;base64,${audioBase64}`,
      });
    }

    // JSONデータの場合
    const jsonData = await response.json();
    return NextResponse.json({
      success: true,
      data: jsonData,
    });

  } catch (error) {
    console.error('VOICEVOX Proxy error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}