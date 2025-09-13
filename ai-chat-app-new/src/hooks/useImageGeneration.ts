/**
 * Image Generation Hook
 * UI層からSD画像生成サービスを呼び出すフック
 */

import { useState, useCallback } from 'react';
import { SDImageGenerator } from '@/services/image-generation/sd-image-generator';
import { Character } from '@/types/core/character.types';
import { UnifiedMessage } from '@/types/memory';
// TrackerValueSimple is just the actual value, not the full TrackerValue interface
type TrackerValueSimple = string | number | boolean;
import { useAppStore } from '@/store';

interface UseImageGenerationOptions {
  baseUrl?: string;
  apiKey?: string;
}

export function useImageGeneration(options: UseImageGenerationOptions = {}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // SD画像生成器インスタンス
  const generator = new SDImageGenerator(
    options.baseUrl || process.env.NEXT_PUBLIC_SD_API_URL || 'http://localhost:7860',
    options.apiKey
  );

  const generateImage = useCallback(async (
    character: Character,
    messages: UnifiedMessage[],
    trackers: Array<{
      name: string;
      value: TrackerValueSimple;
      type: 'numeric' | 'state' | 'boolean' | 'text';
    }>,
    customPrompt?: string
  ) => {
    setIsGenerating(true);
    setError(null);

    try {
      const base64Image = await generator.generateFromChat(
        character,
        messages,
        trackers,
        customPrompt
      );

      console.log('🔍 Received base64 image in hook, length:', base64Image?.length);
      console.log('🎨 Base64 preview (first 100 chars):', base64Image?.substring(0, 100));

      // Base64画像をData URLに変換
      // SD APIからのBase64データが正しいか確認
      if (!base64Image || base64Image.length === 0) {
        throw new Error('Received empty image data from SD API');
      }

      // すでにdata:imageで始まっている場合はそのまま使用
      const imageUrl = base64Image.startsWith('data:image')
        ? base64Image
        : `data:image/png;base64,${base64Image}`;
      setGeneratedImage(imageUrl);

      return imageUrl;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Image generation failed';
      setError(errorMessage);
      console.error('Image generation error:', err);
      throw err;
    } finally {
      setIsGenerating(false);
    }
  }, [generator]);

  // 生成進捗を取得
  const getProgress = useCallback(async () => {
    try {
      return await generator.getProgress();
    } catch (err) {
      console.error('Failed to get progress:', err);
      return null;
    }
  }, [generator]);

  // 利用可能なモデルを取得
  const getModels = useCallback(async () => {
    try {
      return await generator.getModels();
    } catch (err) {
      console.error('Failed to get models:', err);
      return [];
    }
  }, [generator]);

  return {
    generateImage,
    getProgress,
    getModels,
    isGenerating,
    generatedImage,
    error,
  };
}