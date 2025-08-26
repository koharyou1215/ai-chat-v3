'use client';

import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Camera, Link, User, X, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AvatarUploadWidgetProps {
  currentAvatar?: string;
  onAvatarChange: (url: string) => void;
  size?: 'small' | 'medium' | 'large';
  name?: string;
  showUrlInput?: boolean;
  className?: string;
}

interface UploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
  success: boolean;
}

export const AvatarUploadWidget: React.FC<AvatarUploadWidgetProps> = ({
  currentAvatar,
  onAvatarChange,
  size = 'medium',
  name = '',
  showUrlInput = true,
  className
}) => {
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
    success: false
  });
  const [dragActive, setDragActive] = useState(false);
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [urlInput, setUrlInput] = useState(currentAvatar || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Size configurations
  const sizeConfig = {
    small: { 
      container: 'w-16 h-16',
      icon: 'w-4 h-4',
      text: 'text-xs'
    },
    medium: { 
      container: 'w-24 h-24',
      icon: 'w-5 h-5',
      text: 'text-sm'
    },
    large: { 
      container: 'w-32 h-32',
      icon: 'w-6 h-6',
      text: 'text-base'
    }
  };

  const config = sizeConfig[size];

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        uploadFile(file);
      } else {
        setUploadState(prev => ({ ...prev, error: '画像ファイルのみサポートしています' }));
      }
    }
  }, [uploadFile]);

  const uploadFile = useCallback(async (file: File) => {
    setUploadState({
      isUploading: true,
      progress: 0,
      error: null,
      success: false
    });

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`アップロードに失敗しました: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success && result.url) {
        setUploadState({
          isUploading: false,
          progress: 100,
          error: null,
          success: true
        });
        onAvatarChange(result.url);
        
        // Success feedback
        setTimeout(() => {
          setUploadState(prev => ({ ...prev, success: false }));
        }, 2000);
      } else {
        throw new Error(result.error || 'アップロードに失敗しました');
      }
    } catch (error) {
      setUploadState({
        isUploading: false,
        progress: 0,
        error: error instanceof Error ? error.message : 'アップロードエラーが発生しました',
        success: false
      });
    }
  }, [onAvatarChange]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      uploadFile(files[0]);
    }
  };

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      onAvatarChange(urlInput.trim());
      setShowUrlModal(false);
      setUploadState(prev => ({ ...prev, success: true, error: null }));
      setTimeout(() => {
        setUploadState(prev => ({ ...prev, success: false }));
      }, 2000);
    }
  };

  const resetUploadState = () => {
    setUploadState({
      isUploading: false,
      progress: 0,
      error: null,
      success: false
    });
  };

  return (
    <div className={cn("relative", className)}>
      {/* Main Avatar Display */}
      <div
        className={cn(
          "relative rounded-full overflow-hidden border-2 border-slate-600 bg-slate-800/50 transition-all duration-300",
          config.container,
          dragActive && "border-cyan-400 bg-cyan-500/10",
          uploadState.isUploading && "border-blue-400",
          uploadState.success && "border-green-400",
          uploadState.error && "border-red-400"
        )}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {currentAvatar ? (
          <img
            src={currentAvatar}
            alt={name || "Avatar"}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center">
            <User className={cn(config.icon, "text-slate-400")} />
          </div>
        )}

        {/* Upload Overlay */}
        <AnimatePresence>
          {(dragActive || uploadState.isUploading) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 flex items-center justify-center"
            >
              {uploadState.isUploading ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  <span className={cn(config.text, "text-cyan-300")}>
                    {uploadState.progress}%
                  </span>
                </div>
              ) : (
                <Upload className={cn(config.icon, "text-cyan-400")} />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success Indicator */}
        <AnimatePresence>
          {uploadState.success && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center"
            >
              <Check className="w-3 h-3 text-white" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mt-3 justify-center">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1 px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-xs"
        >
          <Camera className="w-3 h-3" />
          ファイル
        </motion.button>
        
        {showUrlInput && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowUrlModal(true)}
            className="flex items-center gap-1 px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-xs"
          >
            <Link className="w-3 h-3" />
            URL
          </motion.button>
        )}
      </div>

      {/* Error Display */}
      <AnimatePresence>
        {uploadState.error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full mt-2 left-0 right-0 bg-red-500/20 border border-red-500/50 rounded-lg p-2 text-xs text-red-300 flex items-center gap-2"
          >
            <AlertCircle className="w-3 h-3" />
            <span>{uploadState.error}</span>
            <button
              onClick={resetUploadState}
              className="ml-auto text-red-300 hover:text-red-200"
            >
              <X className="w-3 h-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* URL Input Modal */}
      <AnimatePresence>
        {showUrlModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
            onClick={() => setShowUrlModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-800 border border-slate-600 rounded-lg p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-white mb-4">画像URL設定</h3>
              <div className="space-y-4">
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  className="w-full p-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-white/40"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleUrlSubmit}
                    className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white py-2 rounded-lg transition-colors"
                  >
                    設定
                  </button>
                  <button
                    onClick={() => setShowUrlModal(false)}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg transition-colors"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};