'use client';

import React, { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Character, Persona } from '@/types';
import { ImageUploader } from '@/components/ui/image-uploader';

// 親コンポーネントから受け取るpropsの型を定義
interface AppearancePanelProps {
  formData: Character | null;
  setFormData: React.Dispatch<React.SetStateAction<Character | Persona | null>>;
}

export const AppearancePanel: React.FC<AppearancePanelProps> = ({ formData, setFormData }) => {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (file: File, field: 'avatar_url' | 'background_url') => {
    setIsUploading(true);
    console.log('Starting file upload:', { field, fileName: file.name, fileSize: file.size });
    
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      console.log('Sending request to /api/upload/image');
      const response = await fetch('/api/upload/image', {
          method: 'POST',
          body: uploadFormData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('File upload failed:', { 
            status: response.status, 
            statusText: response.statusText,
            errorBody: errorText
        });
        throw new Error(`File upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('File upload successful, URL:', result.url);
      setFormData(prev => prev ? {...(prev as Character), [field]: result.url} : prev);
    } catch (error) {
        console.error('An error occurred during file upload:', error);
    } finally {
        setIsUploading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 p-6 rounded-xl border border-indigo-700/30">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center">
          <span className="text-indigo-400 text-lg">🖼️</span>
        </div>
        <h4 className="text-lg font-semibold text-white">外見・アバター</h4>
        <p className="text-sm text-slate-400">キャラクターのビジュアル設定</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 外見の詳細 */}
        <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">外見の詳細</label>
            <Textarea 
                placeholder="身長、髪型、服装、特徴的な外見など詳しく記述してください..." 
                value={formData?.appearance || ''} 
                onChange={e => setFormData(prev => prev ? {...prev, appearance: e.target.value} : prev)}
                rows={6}
                className="bg-slate-800/50 border-slate-600 focus:border-indigo-400 resize-none"
            />
        </div>
        {/* アバター画像 */}
        <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">アバター画像</label>
            <ImageUploader
                url={formData?.avatar_url}
                onUrlChange={(url) => setFormData(prev => prev ? {...(prev as Character), avatar_url: url} : prev)}
                onFileUpload={(file) => handleFileUpload(file, 'avatar_url')}
                onClear={() => setFormData(prev => prev ? {...(prev as Character), avatar_url: ''} : prev)}
                className="h-64"
                isUploading={isUploading}
            />
        </div>
      </div>
    </div>
  );
};
