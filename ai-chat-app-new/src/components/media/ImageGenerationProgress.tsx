/**
 * ImageGenerationProgress
 * 画像生成の進捗表示コンポーネント
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Image, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageGenerationProgressProps {
  isGenerating: boolean;
  progress?: number;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  imageUrl?: string;
  className?: string;
}

export const ImageGenerationProgress: React.FC<ImageGenerationProgressProps> = ({
  isGenerating,
  progress = 0,
  status = 'pending',
  error,
  imageUrl,
  className,
}) => {
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (status === 'completed' && imageUrl) {
      setShowPreview(true);
      // 3秒後に自動的に閉じる
      const timer = setTimeout(() => {
        setShowPreview(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [status, imageUrl]);

  if (!isGenerating && !showPreview) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className={cn(
          'fixed bottom-20 right-4 z-50 bg-gradient-to-br from-purple-900/90 to-indigo-900/90 backdrop-blur-lg rounded-lg p-4 shadow-2xl border border-purple-500/30 min-w-[300px]',
          className
        )}
      >
        <div className="flex items-center gap-3">
          {/* アイコン */}
          <div className="relative">
            {status === 'processing' && (
              <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            )}
            {status === 'pending' && (
              <Image className="w-8 h-8 text-purple-400 animate-pulse" />
            )}
            {status === 'completed' && (
              <CheckCircle className="w-8 h-8 text-green-400" />
            )}
            {status === 'failed' && (
              <XCircle className="w-8 h-8 text-red-400" />
            )}
          </div>

          {/* ステータステキスト */}
          <div className="flex-1">
            <p className="text-white font-medium text-sm">
              {status === 'pending' && '画像生成準備中...'}
              {status === 'processing' && '画像を生成中...'}
              {status === 'completed' && '画像生成完了！'}
              {status === 'failed' && '画像生成失敗'}
            </p>

            {/* プログレスバー */}
            {status === 'processing' && (
              <div className="mt-2">
                <div className="bg-purple-800/50 rounded-full h-2 overflow-hidden">
                  <motion.div
                    className="bg-gradient-to-r from-purple-400 to-indigo-400 h-full"
                    initial={{ width: '0%' }}
                    animate={{ width: `${progress * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className="text-xs text-purple-300 mt-1">
                  {Math.round(progress * 100)}%
                </p>
              </div>
            )}

            {/* エラーメッセージ */}
            {error && (
              <p className="text-xs text-red-300 mt-1">{error}</p>
            )}
          </div>
        </div>

        {/* 画像プレビュー */}
        {imageUrl && showPreview && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="mt-3 rounded-lg overflow-hidden border border-purple-500/50"
          >
            <img
              src={imageUrl}
              alt="Generated"
              className="w-full h-32 object-cover"
            />
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

/**
 * 画像生成プログレスフック
 * MediaOrchestratorと連携して進捗を取得
 */
export const useImageGenerationProgress = () => {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'pending' | 'processing' | 'completed' | 'failed'>('pending');

  const startProgress = () => {
    setStatus('processing');
    setProgress(0);

    // 擬似的な進捗更新（実際のSD APIから進捗を取得する場合は置き換える）
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 0.9) {
          clearInterval(interval);
          return 0.95;
        }
        return prev + 0.1;
      });
    }, 500);

    return () => clearInterval(interval);
  };

  const completeProgress = () => {
    setProgress(1);
    setStatus('completed');
  };

  const failProgress = (error?: string) => {
    setStatus('failed');
  };

  const resetProgress = () => {
    setProgress(0);
    setStatus('pending');
  };

  return {
    progress,
    status,
    startProgress,
    completeProgress,
    failProgress,
    resetProgress,
  };
};