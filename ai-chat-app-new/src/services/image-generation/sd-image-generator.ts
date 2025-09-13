/**
 * Stable Diffusion Image Generation Service
 * コンテキストを考慮した画像生成の統合サービス
 */

import { Character } from '@/types/core/character.types';
import { UnifiedMessage } from '@/types/memory';
import { TrackerPromptMapper } from './tracker-prompt-mapper';
import { ContextAnalyzer } from './context-analyzer';

// TrackerValueSimple is just the actual value, not the full TrackerValue interface
type TrackerValueSimple = string | number | boolean;

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

interface SDResponse {
  images: string[]; // Base64 encoded images
  parameters: SDGenerationParams;
  info: string;
}

export class SDImageGenerator {
  private baseUrl: string;
  private apiKey?: string;

  constructor(baseUrl: string = 'http://localhost:7860', apiKey?: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  /**
   * チャットコンテキストから画像を生成
   */
  async generateFromChat(
    character: Character,
    messages: UnifiedMessage[],
    trackers: Array<{
      name: string;
      value: TrackerValueSimple;
      type: 'numeric' | 'state' | 'boolean' | 'text';
    }>,
    customPrompt?: string
  ): Promise<string> {
    // 1. プロンプトを構築
    const { prompt, negativePrompt } = this.buildPrompt(
      character,
      messages,
      trackers,
      customPrompt
    );

    console.log('📸 Generated Prompt:', prompt);
    console.log('🚫 Negative Prompt:', negativePrompt);

    // 2. SD APIに送信
    const params: SDGenerationParams = {
      prompt,
      negative_prompt: negativePrompt,
      width: 768,
      height: 1024,
      steps: 25,
      cfg_scale: 7.5,
      sampler_name: 'DPM++ 2M Karras',
      seed: -1,
      restore_faces: true,
      enable_hr: false
    };

    const response = await this.callSDAPI(params);
    return response.images[0]; // 最初の画像を返す
  }

  /**
   * 優先度付きプロンプト構築
   */
  private buildPrompt(
    character: Character,
    messages: UnifiedMessage[],
    trackers: Array<{
      name: string;
      value: TrackerValueSimple;
      type: 'numeric' | 'state' | 'boolean' | 'text';
    }>,
    customPrompt?: string
  ): { prompt: string; negativePrompt: string } {
    // 1. トラッカーからプロンプト要素を取得
    const trackerPrompts = TrackerPromptMapper.generateIntegratedPrompt(trackers);

    // 2. チャット文脈を分析
    const context = ContextAnalyzer.analyzeRecentMessages(messages, character);

    // 3. キャラクター基本情報
    const characterBase = this.extractCharacterPrompts(character);

    // 4. 優先度付きで統合
    const layers = {
      // 最優先：トラッカーのcritical状態（拘束、戦闘など）
      critical: [
        ...trackerPrompts.critical,
        ...(context.action.filter(a => a.includes('restrained') || a.includes('fighting')))
      ],

      // 高優先：現在のアクションと感情
      high: [
        ...trackerPrompts.high,
        ...context.action.filter(a => !a.includes('restrained') && !a.includes('fighting')),
        ...context.emotion
      ],

      // 中優先：キャラクター特徴
      medium: [
        ...trackerPrompts.medium,
        ...characterBase.appearance,
        ...context.interaction
      ],

      // 低優先：環境と基本設定
      low: [
        ...trackerPrompts.low,
        ...context.environment,
        ...characterBase.style
      ]
    };

    // 5. 矛盾を解決
    const resolved = this.resolveLayerContradictions(layers);

    // 6. カスタムプロンプトがある場合は最優先で追加
    if (customPrompt) {
      resolved.unshift(customPrompt);
    }

    // 7. 品質タグを追加
    const qualityTags = [
      'masterpiece',
      'best quality',
      'ultra-detailed',
      'high resolution'
    ];

    // 8. 最終プロンプト構築
    const finalPrompt = [
      ...qualityTags,
      ...resolved
    ].join(', ');

    // 9. ネガティブプロンプト構築
    const negativePrompt = [
      'worst quality',
      'low quality',
      'normal quality',
      'lowres',
      'bad anatomy',
      'bad hands',
      'error',
      'missing fingers',
      'extra digit',
      'fewer digits',
      'cropped',
      'jpeg artifacts',
      'signature',
      'watermark',
      'username',
      'blurry',
      ...trackerPrompts.negative
    ].join(', ');

    return {
      prompt: finalPrompt,
      negativePrompt
    };
  }

  /**
   * キャラクター情報からプロンプト要素を抽出
   */
  private extractCharacterPrompts(character: Character): {
    appearance: string[];
    style: string[];
  } {
    const appearance: string[] = [];
    const style: string[] = [];

    // 外見情報を解析
    if (character.appearance) {
      // 髪色
      const hairMatch = character.appearance.match(/(黒|茶|金|赤|青|緑|紫|白|銀|ピンク)髪/);
      if (hairMatch) {
        const colorMap: Record<string, string> = {
          '黒': 'black hair',
          '茶': 'brown hair',
          '金': 'blonde hair',
          '赤': 'red hair',
          '青': 'blue hair',
          '緑': 'green hair',
          '紫': 'purple hair',
          '白': 'white hair',
          '銀': 'silver hair',
          'ピンク': 'pink hair'
        };
        appearance.push(colorMap[hairMatch[1]] || 'hair');
      }

      // 髪型
      if (character.appearance.includes('ロング')) appearance.push('long hair');
      if (character.appearance.includes('ショート')) appearance.push('short hair');
      if (character.appearance.includes('ツインテール')) appearance.push('twintails');
      if (character.appearance.includes('ポニーテール')) appearance.push('ponytail');

      // 目の色
      const eyeMatch = character.appearance.match(/(青|赤|緑|紫|茶|黒|金)い?目/);
      if (eyeMatch) {
        const colorMap: Record<string, string> = {
          '青': 'blue eyes',
          '赤': 'red eyes',
          '緑': 'green eyes',
          '紫': 'purple eyes',
          '茶': 'brown eyes',
          '黒': 'black eyes',
          '金': 'golden eyes'
        };
        appearance.push(colorMap[eyeMatch[1]] || 'eyes');
      }

      // 体型
      if (character.appearance.includes('スレンダー')) appearance.push('slender');
      if (character.appearance.includes('巨乳')) appearance.push('large breasts');
      if (character.appearance.includes('貧乳')) appearance.push('flat chest');
      if (character.appearance.includes('小柄')) appearance.push('petite', 'small body');
      if (character.appearance.includes('高身長')) appearance.push('tall');
    }

    // タグから追加情報
    if (character.tags) {
      for (const tag of character.tags) {
        switch (tag.toLowerCase()) {
          case 'アイドル':
            style.push('idol', 'stage costume');
            break;
          case '魔法少女':
            style.push('magical girl', 'frilly dress');
            break;
          case '戦士':
            style.push('warrior', 'armor');
            break;
          case 'メイド':
            style.push('maid', 'maid outfit');
            break;
          case '学生':
            style.push('school uniform', 'student');
            break;
        }
      }
    }

    return { appearance, style };
  }

  /**
   * レイヤー間の矛盾を解決
   */
  private resolveLayerContradictions(layers: {
    critical: string[];
    high: string[];
    medium: string[];
    low: string[];
  }): string[] {
    const result: string[] = [];
    const used = new Set<string>();

    // 優先度順に処理
    for (const priority of ['critical', 'high', 'medium', 'low'] as const) {
      for (const prompt of layers[priority]) {
        // 重複チェック
        if (!used.has(prompt)) {
          result.push(prompt);
          used.add(prompt);
        }
      }
    }

    return result;
  }

  /**
   * Stable Diffusion APIを呼び出し
   */
  private async callSDAPI(params: SDGenerationParams): Promise<SDResponse> {
    try {
      console.log('🎨 Calling SD API via Next.js route');
      console.log('📝 Request params:', {
        ...params,
        prompt: params.prompt.substring(0, 100) + '...' // Log truncated prompt
      });

      // Next.js APIルートを経由してSD APIを呼び出す（CORS回避）
      const response = await fetch('/api/sd/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ SD API Error Response:', errorData);
        throw new Error(errorData.error || `SD API Error: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ SD API Success, received image');
      return result;
    } catch (error) {
      console.error('❌ SD API Call Failed:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Cannot connect to API. Please check your connection');
      }
      throw error;
    }
  }

  /**
   * 画像生成の進捗を取得
   */
  async getProgress(): Promise<{
    progress: number;
    eta_relative: number;
    state: {
      skipped: boolean;
      interrupted: boolean;
      job: string;
      job_count: number;
      job_no: number;
      sampling_step: number;
      sampling_steps: number;
    };
  }> {
    const endpoint = `${this.baseUrl}/sdapi/v1/progress`;
    const response = await fetch(endpoint);

    if (!response.ok) {
      throw new Error(`SD API Error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * 利用可能なモデルを取得
   */
  async getModels(): Promise<Array<{ title: string; model_name: string; hash: string }>> {
    const endpoint = `${this.baseUrl}/sdapi/v1/sd-models`;
    const response = await fetch(endpoint);

    if (!response.ok) {
      throw new Error(`SD API Error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * 現在のモデルを切り替え
   */
  async switchModel(modelName: string): Promise<void> {
    const endpoint = `${this.baseUrl}/sdapi/v1/options`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sd_model_checkpoint: modelName
      })
    });

    if (!response.ok) {
      throw new Error(`SD API Error: ${response.status}`);
    }
  }
}