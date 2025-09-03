'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Upload, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MediaUploaderProps {
  label: string;
  field: 'avatar_url' | 'background_url';
  url?: string | null;
  onFileUpload: (file: File) => void;
  onUrlChange: (url: string) => void;
  onClear: () => void;
  className?: string;
  aspectRatio?: 'aspect-square' | 'aspect-video';
  isUploading?: boolean;
}

export const MediaUploader: React.FC<MediaUploaderProps> = ({ 
  label, 
  field, 
  url, 
  onFileUpload, 
  onUrlChange, 
  onClear, 
  className, 
  aspectRatio = 'aspect-square',
  isUploading = false
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [url]);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/') || file.type === 'video/mp4') {
        onFileUpload(file);
      }
      e.dataTransfer.clearData();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileUpload(e.target.files[0]);
    }
  };
  
  const fileInputId = `file-upload-${field}`;

  return (
    <div className={cn("space-y-3 relative", className)}>
      <label className="block text-sm font-medium text-slate-300">{label}</label>
      <div
        onDragEnter={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragging(false);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className={cn(
          "relative overflow-hidden rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer group",
          isDragging 
            ? "border-purple-400 bg-purple-500/10 shadow-lg shadow-purple-500/20" 
            : "border-slate-600 hover:border-slate-500",
          aspectRatio,
          "min-h-[200px]"
        )}
        onClick={() => document.getElementById(fileInputId)?.click()}
      >
        {isUploading && (
          <div className="absolute inset-0 bg-slate-900/80 flex flex-col items-center justify-center z-20">
            <div className="w-16 h-16 border-4 border-t-purple-500 border-slate-600 rounded-full animate-spin"></div>
            <p className="mt-4 text-slate-300">Uploading...</p>
          </div>
        )}
        {url ? (
          <>
            <div className="relative w-full h-full">
              {url.endsWith('.mp4') || url.includes('video') ? (
                <video 
                  src={url} 
                  className="w-full h-full object-cover" 
                  autoPlay 
                  loop 
                  muted 
                  playsInline
                />
              ) : (
                <Image 
                  src={url} 
                  alt="preview" 
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  unoptimized
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              )}
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="bg-black/70 rounded-lg px-3 py-2 text-white text-sm">
                  クリックで変更
                </div>
              </div>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }} 
              className="absolute top-2 right-2 p-2 bg-red-600/80 hover:bg-red-600 rounded-full transition-colors shadow-lg z-30"
            >
              <X className="w-4 h-4 text-white"/>
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8">
            <div className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-all",
              isDragging 
                ? "bg-purple-500/20 text-purple-400" 
                : "bg-slate-700 text-slate-500 group-hover:bg-slate-600 group-hover:text-slate-400"
            )}>
              <Upload className="w-8 h-8" />
            </div>
            <p className={cn(
              "text-lg font-medium mb-2 transition-colors",
              isDragging ? "text-purple-300" : "group-hover:text-slate-300"
            )}>
              ファイルをドラッグ＆ドロップ
            </p>
            <p className="text-sm text-slate-500 mb-2">またはクリックして選択</p>
            <p className="text-xs text-slate-600">
              対応フォーマット: JPG, PNG, GIF, MP4
            </p>
          </div>
        )}
      </div>
      <div className="space-y-1">
        <label className="text-xs text-slate-400">またはURLで指定</label>
        <Input
          type="text"
          placeholder="https://example.com/image.jpg"
          value={url || ''}
          onChange={(e) => onUrlChange(e.target.value)}
          className="bg-slate-800/50 border-slate-600 focus:border-purple-400 text-sm"
        />
      </div>
      <input 
        type="file" 
        id={fileInputId} 
        className="hidden" 
        onChange={handleFileChange} 
        accept="image/*,video/mp4" 
      />
    </div>
  );
};