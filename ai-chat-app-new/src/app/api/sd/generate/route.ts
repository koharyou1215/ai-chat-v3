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

    // Stable Diffusion APIを呼び出し（リトライとタイムアウト設定）
    const timeout = parseInt(process.env.SD_API_TIMEOUT || '120000'); // デフォルト120秒
    let lastError: any = null;
    const maxRetries = 3;

    // リトライ処理
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        console.log(`🔄 SD API attempt ${attempt}/${maxRetries}`);

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(params),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const result = await response.json();
          console.log('✅ SD API Success, images count:', result.images?.length);

          // SD APIレスポンスの構造をログ出力（デバッグ用）
          if (result.images && result.images.length > 0) {
            console.log('📸 Image data received, first 100 chars:',
              result.images[0].substring(0, 100));
          } else {
            console.warn('⚠️ No images in SD API response');
          }

          return NextResponse.json(result);
        }

        // エラーレスポンスの処理
        let errorMessage = `SD API Error: ${response.status}`;
        try {
          const errorText = await response.text();
          console.error('❌ SD API Error:', response.status, errorText);
          if (errorText) {
            errorMessage = `SD API Error: ${response.status} - ${errorText.substring(0, 500)}`;
          }
        } catch (readError) {
          console.error('❌ Failed to read error response:', readError);
        }

        lastError = new Error(errorMessage);

      } catch (fetchError: any) {
        clearTimeout(timeoutId);

        if (fetchError.name === 'AbortError') {
          console.error(`❌ SD API Timeout after ${timeout/1000} seconds (attempt ${attempt}/${maxRetries})`);
          lastError = new Error(`SD API timeout after ${timeout/1000} seconds`);
        } else if (fetchError.code === 'ECONNRESET' || fetchError.code === 'ECONNREFUSED') {
          console.error(`❌ Connection error (attempt ${attempt}/${maxRetries}):`, fetchError.code);
          lastError = new Error('Cannot connect to SD API. Please check if Stable Diffusion is running.');

          // 接続エラーの場合、少し待ってからリトライ
          if (attempt < maxRetries) {
            console.log('⏳ Waiting 2 seconds before retry...');
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } else {
          console.error(`❌ SD API Error (attempt ${attempt}/${maxRetries}):`, fetchError);
          lastError = fetchError;
        }
      }

      // リトライする場合はループ継続、最後の試行の場合はエラーを返す
      if (attempt === maxRetries) {
        break;
      }
    }

    // すべてのリトライが失敗した場合
    console.error('❌ All SD API attempts failed');

    if (lastError instanceof TypeError && lastError.message.includes('fetch')) {
      return NextResponse.json(
        { error: 'Cannot connect to Stable Diffusion API. Please ensure SD WebUI is running with --api flag on http://localhost:7860' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: lastError?.message || 'SD API request failed after multiple attempts' },
      { status: 503 }
    );
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