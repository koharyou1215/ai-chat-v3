// src/hooks/useFileUpload.ts
import { useState } from 'react';

interface UploadOptions {
  onSuccess?: (url: string) => void;
  onError?: (error: Error) => void;
  onProgress?: (progress: number) => void;
}

interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * ファイルアップロード処理を統一管理するカスタムフック
 *
 * @returns {object} uploadFile関数、アップロード状態、進捗状況
 *
 * @example
 * ```tsx
 * const { uploadFile, isUploading, progress } = useFileUpload();
 *
 * const handleFileUpload = async (file: File, field: 'avatar_url' | 'background_url') => {
 *   try {
 *     const url = await uploadFile(file);
 *     setFormData(prev => prev ? { ...prev, [field]: url } : prev);
 *   } catch (error) {
 *     alert(`アップロードエラー: ${error.message}`);
 *   }
 * };
 * ```
 */
export const useFileUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadFile = async (
    file: File,
    options?: UploadOptions
  ): Promise<string> => {
    setIsUploading(true);
    setProgress(0);

    try {
      // ファイルサイズチェック (10MB制限)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('ファイルサイズは10MB以下にしてください');
      }

      // ファイル形式チェック
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('サポートされていないファイル形式です');
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
        cache: 'no-store',
        headers: {
          'Pragma': 'no-cache',
        },
      });

      // Content-Type検証
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        const errorText = await response.text();
        throw new Error(`サーバーエラー: ${errorText}`);
      }

      const result: UploadResult = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || `アップロード失敗 (${response.status})`);
      }

      if (!result.url) {
        throw new Error('URLの取得に失敗しました');
      }

      setProgress(100);
      options?.onSuccess?.(result.url);
      return result.url;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'ファイルアップロードに失敗しました';

      const uploadError = new Error(errorMessage);
      options?.onError?.(uploadError);
      throw uploadError;
    } finally {
      setIsUploading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  return {
    uploadFile,
    isUploading,
    progress,
  };
};
