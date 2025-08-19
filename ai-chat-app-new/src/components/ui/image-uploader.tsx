'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useRef, useState, useEffect } from 'react';
import { Upload, X, Image as ImageIcon, Video, ZoomIn, ZoomOut, RotateCw, Move } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageUploaderProps {
  url?: string;
  onUrlChange?: (url: string) => void;
  onFileUpload?: (file: File) => void;
  onClear?: () => void;
  className?: string;
  isUploading?: boolean;
  placeholder?: string;
  supportVideo?: boolean;
  showPreviewControls?: boolean;
  aspectRatio?: 'square' | '16:9' | '4:3' | 'auto';
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  url,
  onUrlChange: _onUrlChange,
  onFileUpload,
  onClear,
  className,
  isUploading = false,
  placeholder = "画像・動画をドラッグ&ドロップまたはクリックして選択",
  supportVideo = true,
  showPreviewControls = true,
  aspectRatio = 'auto'
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRef = useRef<HTMLImageElement | HTMLVideoElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isVideo, setIsVideo] = useState(false);
  const [mediaTransform, setMediaTransform] = useState({
    scale: 1,
    rotation: 0,
    x: 0,
    y: 0
  });
  const [isDraggingMedia, setIsDraggingMedia] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (url) {
      const isVideoFile = url.includes('.mp4') || url.includes('.webm') || url.includes('.mov') || url.includes('video');
      setIsVideo(isVideoFile);
    }
  }, [url]);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (file: File) => {
    if (file && (file.type.startsWith('image/') || (supportVideo && file.type.startsWith('video/')))) {
      onFileUpload?.(file);
    }
  };

  // メディア変形コントロール
  const handleZoom = (delta: number) => {
    setMediaTransform(prev => ({
      ...prev,
      scale: Math.max(0.1, Math.min(3, prev.scale + delta))
    }));
  };

  const handleRotate = () => {
    setMediaTransform(prev => ({
      ...prev,
      rotation: prev.rotation + 90
    }));
  };

  const handleReset = () => {
    setMediaTransform({ scale: 1, rotation: 0, x: 0, y: 0 });
  };

  // メディアドラッグ処理
  const handleMediaMouseDown = (e: React.MouseEvent) => {
    if (!showPreviewControls) return;
    e.preventDefault();
    setIsDraggingMedia(true);
    setDragStart({ x: e.clientX - mediaTransform.x, y: e.clientY - mediaTransform.y });
  };

  const handleMediaMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingMedia || !showPreviewControls) return;
    setMediaTransform(prev => ({
      ...prev,
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    }));
  };

  const handleMediaMouseUp = () => {
    setIsDraggingMedia(false);
  };

  // タッチイベント対応
  const handleMediaTouchStart = (e: React.TouchEvent) => {
    if (!showPreviewControls) return;
    e.preventDefault();
    const touch = e.touches[0];
    setIsDraggingMedia(true);
    setDragStart({ x: touch.clientX - mediaTransform.x, y: touch.clientY - mediaTransform.y });
  };

  const handleMediaTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingMedia || !showPreviewControls) return;
    e.preventDefault();
    const touch = e.touches[0];
    setMediaTransform(prev => ({
      ...prev,
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y
    }));
  };

  const handleMediaTouchEnd = () => {
    setIsDraggingMedia(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  return (
    <div className={cn("relative", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept={supportVideo ? "image/*,video/*" : "image/*"}
        onChange={handleFileInputChange}
        className="hidden"
      />
      
      {url ? (
        <div className={cn(
          "relative group overflow-hidden rounded-lg border border-slate-600",
          aspectRatio === 'square' && "aspect-square",
          aspectRatio === '16:9' && "aspect-video",
          aspectRatio === '4:3' && "aspect-[4/3]"
        )}>
          <div 
            className="relative w-full h-full cursor-move overflow-hidden"
            onMouseMove={handleMediaMouseMove}
            onMouseUp={handleMediaMouseUp}
            onMouseLeave={handleMediaMouseUp}
          >
            {isVideo ? (
              <video
                ref={mediaRef as React.RefObject<HTMLVideoElement>}
                src={url}
                controls
                loop
                muted
                playsInline
                className="w-full h-full object-contain"
                style={{
                  transform: `translate(${mediaTransform.x}px, ${mediaTransform.y}px) scale(${mediaTransform.scale}) rotate(${mediaTransform.rotation}deg)`,
                  transformOrigin: 'center',
                  transition: isDraggingMedia ? 'none' : 'transform 0.1s ease-out'
                }}
                onMouseDown={handleMediaMouseDown}
                onTouchStart={handleMediaTouchStart}
                onTouchMove={handleMediaTouchMove}
                onTouchEnd={handleMediaTouchEnd}
              />
            ) : (
              <img
                ref={mediaRef as React.RefObject<HTMLImageElement>}
                src={url}
                alt="Uploaded"
                className="w-full h-full object-contain"
                style={{
                  transform: `translate(${mediaTransform.x}px, ${mediaTransform.y}px) scale(${mediaTransform.scale}) rotate(${mediaTransform.rotation}deg)`,
                  transformOrigin: 'center',
                  transition: isDraggingMedia ? 'none' : 'transform 0.1s ease-out'
                }}
                onMouseDown={handleMediaMouseDown}
                onTouchStart={handleMediaTouchStart}
                onTouchMove={handleMediaTouchMove}
                onTouchEnd={handleMediaTouchEnd}
              />
            )}
          </div>
          
          {/* 操作コントロール */}
          {showPreviewControls && (
            <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-lg p-1">
              <button
                onClick={() => handleZoom(0.1)}
                className="p-1 text-white hover:text-blue-400 transition-colors"
                title="拡大"
              >
                <ZoomIn size={16} />
              </button>
              <button
                onClick={() => handleZoom(-0.1)}
                className="p-1 text-white hover:text-blue-400 transition-colors"
                title="縮小"
              >
                <ZoomOut size={16} />
              </button>
              <button
                onClick={handleRotate}
                className="p-1 text-white hover:text-blue-400 transition-colors"
                title="回転"
              >
                <RotateCw size={16} />
              </button>
              <button
                onClick={handleReset}
                className="p-1 text-white hover:text-green-400 transition-colors"
                title="リセット"
              >
                <Move size={16} />
              </button>
            </div>
          )}
          
          {onClear && (
            <button
              onClick={onClear}
              className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
              disabled={isUploading}
              title="削除"
            >
              <X size={16} />
            </button>
          )}
        </div>
      ) : (
        <div
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "w-full h-full border-2 border-dashed border-slate-600 rounded-lg",
            "flex flex-col items-center justify-center cursor-pointer",
            "hover:border-indigo-400 hover:bg-slate-800/30 transition-all",
            "text-slate-400 hover:text-slate-300",
            isDragging && "border-indigo-400 bg-slate-800/50",
            isUploading && "opacity-50 cursor-not-allowed"
          )}
        >
          {isUploading ? (
            <>
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-400 border-t-transparent mb-2" />
              <p className="text-sm">アップロード中...</p>
            </>
          ) : (
            <>
              <div className="p-3 bg-slate-700/50 rounded-full mb-3">
                {isDragging ? (
                  <Upload className="w-6 h-6 text-indigo-400" />
                ) : supportVideo ? (
                  <Video className="w-6 h-6" />
                ) : (
                  <ImageIcon className="w-6 h-6" />
                )}
              </div>
              <p className="text-sm text-center px-4">{placeholder}</p>
              <p className="text-xs text-slate-500 mt-1">
                {supportVideo ? "PNG, JPG, GIF, MP4, WebM対応" : "PNG, JPG, GIF対応"}
              </p>
              {showPreviewControls && (
                <p className="text-xs text-slate-400 mt-1">ドラッグ・ズーム・回転可能</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};