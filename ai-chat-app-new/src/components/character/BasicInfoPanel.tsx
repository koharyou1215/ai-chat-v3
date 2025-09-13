'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ImageUploader } from '@/components/ui/image-uploader';
import { PlusCircle, Trash2, X } from 'lucide-react';
import { Character } from '@/types/core/character.types';
import { Persona } from '@/types/core/persona.types';

interface BasicInfoPanelProps {
  formData: Character | Persona | null;
  setFormData: React.Dispatch<React.SetStateAction<Character | Persona | null>>;
  mode: 'character' | 'persona';
  handleFileUpload: (file: File, field: 'background_url' | 'avatar_url') => Promise<void>;
}

export const BasicInfoPanel: React.FC<BasicInfoPanelProps> = ({
  formData,
  setFormData,
  mode,
  handleFileUpload,
}) => {
  return (
    <div className="space-y-8">
      {/* ヘッダー部分 */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">
          {mode === 'character' ? 'キャラクター設定' : 'ペルソナ設定'}
        </h2>
        <p className="text-slate-400 text-sm">基本情報とプロフィールを設定します</p>
      </div>

      {/* 基本情報カード */}
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-6 rounded-xl border border-slate-700/50 backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
            <span className="text-purple-400 text-lg">👤</span>
          </div>
          <h3 className="text-xl font-bold text-white">基本情報</h3>
        </div>
        <div className="space-y-4">
          {/* アバター画像アップロード（キャラクターモードのみ） */}
          {mode === 'character' && (
            <div className="mb-6">
              <label className="text-sm font-medium text-slate-300 block mb-2">キャラクターアイコン</label>
              <div className="flex items-center gap-4">
                <div 
                  className="w-24 h-24 rounded-full overflow-hidden border-2 border-purple-400/50 bg-slate-800/50 cursor-pointer transition-all hover:border-purple-400"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add('border-cyan-400', 'bg-cyan-500/10');
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('border-cyan-400', 'bg-cyan-500/10');
                  }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('border-cyan-400', 'bg-cyan-500/10');
                    const files = Array.from(e.dataTransfer.files);
                    if (files[0] && files[0].type.startsWith('image/')) {
                      await handleFileUpload(files[0], 'avatar_url');
                    }
                  }}
                  onClick={() => {
                    document.getElementById('avatar-upload')?.click();
                  }}
                  title="クリックまたはドラッグ＆ドロップで画像をアップロード"
                >
                  {(formData as Character)?.avatar_url ? (
                    <img
                      src={(formData as Character).avatar_url}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 hover:text-slate-300">
                      <span className="text-3xl">👤</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    id="avatar-upload"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        await handleFileUpload(file, 'avatar_url');
                      }
                    }}
                  />
                  <div className="text-xs text-slate-400">
                    ドラッグ＆ドロップ<br/>または<br/>クリックで選択
                  </div>
                  {(formData as Character)?.avatar_url && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFormData(prev => prev ? {...prev, avatar_url: ""} : null);
                      }}
                      className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm transition-colors"
                    >
                      削除
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">名前 *</label>
              <Input 
                placeholder="名前を入力" 
                value={formData?.name || ''} 
                onChange={e => setFormData(prev => prev ? {...prev, name: e.target.value} : null)}
                className="bg-slate-800/50 border-slate-600 focus:border-purple-400"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">役割</label>
              <Input 
                placeholder="役割を入力" 
                value={mode === 'persona' && formData && 'role' in formData ? formData.role : ''} 
                onChange={e => setFormData(prev => prev && mode === 'persona' ? {...prev, role: e.target.value} : prev)}
                className="bg-slate-800/50 border-slate-600 focus:border-purple-400"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">詳細設定</label>
            <Textarea 
              placeholder="その他の設定や詳細情報" 
              value={mode === 'persona' && formData && 'other_settings' in formData ? formData.other_settings : ''} 
              onChange={e => setFormData(prev => prev && mode === 'persona' ? {...prev, other_settings: e.target.value} : prev)}
              className="bg-slate-800/50 border-slate-600 focus:border-purple-400 resize-none"
              rows={4}
            />
          </div>
        </div>
      </div>
    </div>
  );
};