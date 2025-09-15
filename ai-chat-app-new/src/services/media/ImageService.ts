/**
 * ImageService
 * 画像生成サービス
 * Stable Diffusion APIを統合管理
 */

import { SDImageGenerator } from "@/services/image-generation/sd-image-generator";
import { Character } from "@/types/core/character.types";
import { UnifiedMessage } from "@/types/memory";
import * as fs from "fs";
import * as path from "path";

export interface ImageGenerationOptions {
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  steps?: number;
  width?: number;
  height?: number;
  cfg_scale?: number;
  sampler_name?: string;
}

type TrackerValueSimple = string | number | boolean;

export class ImageService {
  private sdGenerator: SDImageGenerator;
  private isInitialized = false;
  private defaultOptions: ImageGenerationOptions;

  constructor(options: ImageGenerationOptions = {}) {
    this.defaultOptions = {
      baseUrl:
        options.baseUrl ||
        process.env.NEXT_PUBLIC_SD_API_URL ||
        "http://localhost:7860",
      apiKey: options.apiKey,
      model: options.model,
      steps: options.steps || 30,
      width: options.width || 512,
      height: options.height || 512,
      cfg_scale: options.cfg_scale || 7,
      sampler_name: options.sampler_name || "Euler a",
    };

    this.sdGenerator = new SDImageGenerator(
      this.defaultOptions.baseUrl!,
      this.defaultOptions.apiKey
    );
  }

  /**
   * サービスの初期化
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log("🖼️ ImageService: Initializing...");

    // SD APIの疎通確認
    try {
      const models = await this.getAvailableModels();
      if (models.length > 0) {
        console.log(
          `✅ ImageService: SD API connected, ${models.length} models available`
        );
      } else {
        console.warn("⚠️ ImageService: SD API connected but no models found");
      }
    } catch (error) {
      console.warn("⚠️ ImageService: SD API connection failed", error);
    }

    this.isInitialized = true;
    console.log("✅ ImageService: Initialized");
  }

  /**
   * Base64画像をファイルとして保存し、URLを返す
   */
  private async saveImageToFile(base64Data: string): Promise<string> {
    try {
      // Base64データからBufferを作成
      const base64String = base64Data.startsWith("data:image")
        ? base64Data.split(",")[1]
        : base64Data;

      const buffer = Buffer.from(base64String, "base64");

      // ファイル名を生成（タイムスタンプ + ランダム文字列）
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const filename = `generated-${timestamp}-${randomString}.png`;

      // ファイルパスを生成
      const filePath = path.join(
        process.cwd(),
        "public",
        "uploads",
        "images",
        filename
      );

      // ディレクトリが存在しない場合は作成
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // ファイルを保存
      fs.writeFileSync(filePath, buffer);

      // URLを返す
      const imageUrl = `/uploads/images/${filename}`;
      console.log(`📁 Image saved to: ${imageUrl}`);

      return imageUrl;
    } catch (error) {
      console.error("❌ Failed to save image to file:", error);
      // フォールバック: Data URLを返す
      return base64Data.startsWith("data:image")
        ? base64Data
        : `data:image/png;base64,${base64Data}`;
    }
  }

  /**
   * 画像生成
   */
  public async generate(
    character: Character,
    messages: UnifiedMessage[],
    trackers: Array<{
      name: string;
      value: TrackerValueSimple;
      type: "numeric" | "state" | "boolean" | "text";
    }>,
    customPrompt?: string
  ): Promise<string> {
    console.log("🎨 ImageService: Generating image...");

    try {
      // SD APIで画像生成
      const base64Image = await this.sdGenerator.generateFromChat(
        character,
        messages,
        trackers,
        customPrompt
      );

      if (!base64Image || base64Image.length === 0) {
        throw new Error("Received empty image data from SD API");
      }

      // Base64画像をファイルとして保存し、URLを返す
      const imageUrl = await this.saveImageToFile(base64Image);

      console.log("✅ ImageService: Image generated and saved successfully");
      return imageUrl;
    } catch (error) {
      console.error("❌ ImageService: Generation failed", error);
      throw error;
    }
  }

  /**
   * カスタムプロンプトで画像生成
   */
  public async generateWithPrompt(
    prompt: string,
    negativePrompt?: string,
    options: Partial<ImageGenerationOptions> = {}
  ): Promise<string> {
    console.log("🎨 ImageService: Generating image with custom prompt...");

    const params = {
      ...this.defaultOptions,
      ...options,
    };

    try {
      const response = await fetch(`${params.baseUrl}/sdapi/v1/txt2img`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(params.apiKey && { Authorization: `Bearer ${params.apiKey}` }),
        },
        body: JSON.stringify({
          prompt,
          negative_prompt: negativePrompt || "",
          steps: params.steps,
          width: params.width,
          height: params.height,
          cfg_scale: params.cfg_scale,
          sampler_name: params.sampler_name,
        }),
      });

      if (!response.ok) {
        throw new Error(`SD API error: ${response.statusText}`);
      }

      const data = await response.json();
      const base64Image = data.images[0];

      if (!base64Image) {
        throw new Error("No image returned from SD API");
      }

      // Base64画像をData URLに変換
      const imageUrl = `data:image/png;base64,${base64Image}`;

      console.log("✅ ImageService: Image generated successfully");
      return imageUrl;
    } catch (error) {
      console.error("❌ ImageService: Generation failed", error);
      throw error;
    }
  }

  /**
   * 生成進捗の取得
   */
  public async getProgress(): Promise<{
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
    current_image: string | null;
  } | null> {
    try {
      const progress = await this.sdGenerator.getProgress();
      if (!progress) return null;

      // SD APIの返り値にcurrent_imageがない場合はnullを設定
      return {
        ...progress,
        current_image: null, // SD APIは現在current_imageを返さないためnull固定
      };
    } catch (error) {
      console.error("❌ ImageService: Failed to get progress", error);
      return null;
    }
  }

  /**
   * 利用可能なモデルの取得
   */
  public async getAvailableModels(): Promise<
    Array<{ title: string; model_name: string }>
  > {
    try {
      return await this.sdGenerator.getModels();
    } catch (error) {
      console.error("❌ ImageService: Failed to get models", error);
      return [];
    }
  }

  /**
   * 現在のモデルの取得
   */
  public async getCurrentModel(): Promise<string | null> {
    try {
      const response = await fetch(
        `${this.defaultOptions.baseUrl}/sdapi/v1/options`,
        {
          method: "GET",
          headers: {
            ...(this.defaultOptions.apiKey && {
              Authorization: `Bearer ${this.defaultOptions.apiKey}`,
            }),
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get options: ${response.statusText}`);
      }

      const options = await response.json();
      return options.sd_model_checkpoint || null;
    } catch (error) {
      console.error("❌ ImageService: Failed to get current model", error);
      return null;
    }
  }

  /**
   * モデルの切り替え
   */
  public async switchModel(modelName: string): Promise<void> {
    try {
      const response = await fetch(
        `${this.defaultOptions.baseUrl}/sdapi/v1/options`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(this.defaultOptions.apiKey && {
              Authorization: `Bearer ${this.defaultOptions.apiKey}`,
            }),
          },
          body: JSON.stringify({
            sd_model_checkpoint: modelName,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to switch model: ${response.statusText}`);
      }

      console.log(`✅ ImageService: Switched to model ${modelName}`);
    } catch (error) {
      console.error("❌ ImageService: Failed to switch model", error);
      throw error;
    }
  }

  /**
   * 生成を中断
   */
  public async interrupt(): Promise<void> {
    try {
      const response = await fetch(
        `${this.defaultOptions.baseUrl}/sdapi/v1/interrupt`,
        {
          method: "POST",
          headers: {
            ...(this.defaultOptions.apiKey && {
              Authorization: `Bearer ${this.defaultOptions.apiKey}`,
            }),
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to interrupt: ${response.statusText}`);
      }

      console.log("✅ ImageService: Generation interrupted");
    } catch (error) {
      console.error("❌ ImageService: Failed to interrupt", error);
      throw error;
    }
  }

  /**
   * クリーンアップ
   */
  public async cleanup(): Promise<void> {
    // 進行中の生成を中断
    try {
      await this.interrupt();
    } catch (error) {
      // エラーは無視（生成中でない可能性がある）
    }

    console.log("✅ ImageService: Cleanup completed");
  }
}
