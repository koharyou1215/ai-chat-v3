'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useRef, useState } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageUploaderProps {
  url?: string;
  onUrlChange?: (url: string) => void;
  onFileUpload?: (file: File) => void;
  onClear?: () => void;
  className?: string;
  isUploading?: boolean;
  placeholder?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  url,
  onUrlChange: _onUrlChange,
  onFileUpload,
  onClear,
  className,
  isUploading = false,
  placeholder = "画像をドラッグ&ドロップまたはクリックして選択"
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      onFileUpload?.(file);
    }
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
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
      />
      
      {url ? (
        <div className="relative group">
          <img
            src={url}
            alt="Uploaded"
            className="w-full h-full object-cover rounded-lg border border-slate-600"
          />
          {onClear && (
            <button
              onClick={onClear}
              className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              disabled={isUploading}
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
                ) : (
                  <ImageIcon className="w-6 h-6" />
                )}
              </div>
              <p className="text-sm text-center px-4">{placeholder}</p>
              <p className="text-xs text-slate-500 mt-1">PNG, JPG, GIF対応</p>
            </>
          )}
        </div>
      )}
    </div>
  );
};