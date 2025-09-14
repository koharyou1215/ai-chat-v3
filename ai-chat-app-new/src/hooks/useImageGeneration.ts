/**
 * Image Generation Hook
 * MediaOrchestratorを使用した画像生成フック
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { MediaOrchestrator } from '@/services/media';
import { Character } from '@/types/core/character.types';
import { UnifiedMessage } from '@/types/memory';

// TrackerValueSimple is just the actual value, not the full TrackerValue interface
type TrackerValueSimple = string | number | boolean;

interface UseImageGenerationOptions {
  baseUrl?: string;
  apiKey?: string;
}

export function useImageGeneration(options: UseImageGenerationOptions = {}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const orchestratorRef = useRef<MediaOrchestrator | null>(null);

  // MediaOrchestratorのインスタンスを取得
  useEffect(() => {
    orchestratorRef.current = MediaOrchestrator.getInstance({
      // オプションの設定が必要な場合はここで渡す
    });
    orchestratorRef.current.initialize().catch(console.error);
  }, []);

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
    if (!orchestratorRef.current) {
      const errorMessage = 'MediaOrchestrator not initialized';
      console.error(errorMessage);
      setError(errorMessage);
      throw new Error(errorMessage);
    }

    setIsGenerating(true);
    setError(null);

    try {
      // MediaOrchestratorを使用して画像生成
      const imageUrl = await orchestratorRef.current.generateImage(
        character,
        messages,
        trackers,
        customPrompt
      );

      console.log('🎨 Image generated successfully via MediaOrchestrator');
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
  }, []);

  // 生成進捗を取得
  const getProgress = useCallback(async () => {
    if (!orchestratorRef.current) {
      return null;
    }

    // MediaOrchestratorからキューの状態を取得
    const queueStatus = orchestratorRef.current.getQueueStatus();

    // 画像生成リクエストの進捗を確認
    const imageRequests = queueStatus.requests.filter(r => r.type === 'image');
    const processingRequest = imageRequests.find(r => r.status === 'processing');

    if (processingRequest) {
      // 実際の生成進捗はSD APIから取得する必要がある場合
      // ここでは簡易的な進捗表示
      return {
        progress: 0.5,
        status: 'processing',
        requestId: processingRequest.id
      };
    }

    return null;
  }, []);

  // キャッシュ統計を取得
  const getCacheStats = useCallback(() => {
    if (!orchestratorRef.current) {
      return null;
    }

    return orchestratorRef.current.getCacheStats();
  }, []);

  // キャッシュをクリア
  const clearCache = useCallback(async () => {
    if (!orchestratorRef.current) {
      return;
    }

    await orchestratorRef.current.clearCache();
    console.log('🧹 Image cache cleared');
  }, []);

  return {
    generateImage,
    getProgress,
    getCacheStats,
    clearCache,
    isGenerating,
    generatedImage,
    error,
  };
}