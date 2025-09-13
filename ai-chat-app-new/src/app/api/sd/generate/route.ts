import { NextRequest, NextResponse } from 'next/server';

interface SDGenerationParams {
  prompt: string;
  negative_prompt: string;
  width: number;
  height: number;
  steps: number;
  cfg_scale: number;
  sampler_name: string;
  seed: number;
  restore_faces: boolean;
  enable_hr: boolean;
  hr_scale?: number;
  hr_upscaler?: string;
  denoising_strength?: number;
}

export async function POST(request: NextRequest) {
  try {
    const params: SDGenerationParams = await request.json();

    // SD APIのURLを環境変数から取得（デフォルトはローカル）
    const sdUrl = process.env.NEXT_PUBLIC_SD_API_URL || 'http://localhost:7860';
    const endpoint = `${sdUrl}/sdapi/v1/txt2img`;

    console.log('🎨 Server: Calling SD API:', endpoint);
    console.log('📝 Prompt (first 100 chars):', params.prompt?.substring(0, 100));

    // Stable Diffusion APIを呼び出し（タイムアウト設定追加）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒タイムアウト

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ SD API Error:', response.status, errorText);
        return NextResponse.json(
          { error: `SD API Error: ${response.status} - ${errorText}` },
          { status: response.status }
        );
      }

      const result = await response.json();
      console.log('✅ SD API Success, images count:', result.images?.length);

      return NextResponse.json(result);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error('❌ SD API Timeout after 30 seconds');
        return NextResponse.json(
          { error: 'SD API timeout - ensure Stable Diffusion is running and responsive' },
          { status: 504 }
        );
      }
      throw fetchError;
    }
  } catch (error) {
    console.error('❌ Server SD API Error:', error);

    if (error instanceof TypeError && error.message.includes('fetch')) {
      return NextResponse.json(
        { error: 'Cannot connect to Stable Diffusion API. Please ensure SD WebUI is running with --api flag on http://localhost:7860' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}