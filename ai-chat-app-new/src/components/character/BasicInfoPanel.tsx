'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ImageUploader } from '@/components/ui/image-uploader';
import { PlusCircle, Trash2, X } from 'lucide-react';
import { Character, Persona } from '@/types';

interface BasicInfoPanelProps {
  formData: Character | Persona | null;
  setFormData: React.Dispatch<React.SetStateAction<Character | Persona | null>>;
  mode: 'character' | 'persona';
  handleFileUpload: (file: File, field: 'avatar_url' | 'background_url') => Promise<void>;
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

      {/* 画像アップロード部分 */}
      <div className="mb-8 space-y-6">
        {mode === 'character' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <label className="block text-sm font-medium text-slate-300">🎭 アバター画像</label>
              <ImageUploader
                url={formData?.avatar_url}
                onFileUpload={(file) => handleFileUpload(file, 'avatar_url')}
                onClear={() => setFormData(prev => prev ? {...prev, avatar_url: ''} : null)}
                supportVideo={false}
                aspectRatio="square"
                className="h-64"
                placeholder="アバター画像をドラッグ&ドロップ"
              />
            </div>
            {mode === 'character' && (
              <div className="space-y-4">
                <label className="block text-sm font-medium text-slate-300">🖼️ 背景画像・動画</label>
                <ImageUploader
                  url={(formData as Character)?.background_url}
                  onFileUpload={(file) => handleFileUpload(file, 'background_url')}
                  onClear={() => setFormData(prev => prev ? {...prev as Character, background_url: ''} : null)}
                  supportVideo={true}
                  aspectRatio="16:9"
                  className="h-48"
                  placeholder="背景画像・動画をドラッグ&ドロップ"
                  showPreviewControls={true}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="flex justify-center mb-6">
            <div className="w-full max-w-md space-y-4">
              <label className="block text-sm font-medium text-slate-300">🎭 アバター画像</label>
              <ImageUploader
                url={formData?.avatar_url}
                onFileUpload={(file) => handleFileUpload(file, 'avatar_url')}
                onClear={() => setFormData(prev => prev ? {...prev, avatar_url: ''} : null)}
                supportVideo={false}
                aspectRatio="square"
                className="h-64"
                placeholder="ペルソナアバターをドラッグ&ドロップ"
              />
            </div>
          </div>
        )}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">名前 *</label>
              <Input 
                placeholder="キャラクターの名前を入力" 
                value={formData?.name || ''} 
                onChange={e => setFormData(prev => prev ? {...prev, name: e.target.value} : null)}
                className="bg-slate-800/50 border-slate-600 focus:border-purple-400"
              />
            </div>
            {mode === 'character' && (
              <div className="space-y-2">
                <div className="flex-1">
                  <Label htmlFor="character-age">年齢</Label>
                  <Input
                    id="character-age"
                    placeholder="例: 18歳、不明、永遠の17歳"
                    value={(formData as Character)?.age || ''}
                    onChange={e => setFormData(prev => prev ? {...(prev as Character), age: e.target.value} : prev)}
                    className="bg-slate-800/50 border-slate-600 focus:border-purple-400"
                  />
                </div>
              </div>
            )}
          </div>
          {mode === 'character' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">職業・役割</label>
              <Input 
                placeholder="例: 高校生、魔法使い、騎士" 
                value={(formData as Character)?.occupation || ''} 
                onChange={e => setFormData(prev => prev ? {...prev as Character, occupation: e.target.value} : null)}
                className="bg-slate-800/50 border-slate-600 focus:border-purple-400"
              />
            </div>
          )}
          {mode === 'character' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">キャッチフレーズ</label>
              <Textarea 
                placeholder="キャラクターを表す短いフレーズ (30文字以内)" 
                value={(formData as Character)?.catchphrase || ''} 
                onChange={e => setFormData(prev => prev ? {...prev as Character, catchphrase: e.target.value} : null)}
                className="bg-slate-800/50 border-slate-600 focus:border-purple-400 resize-none"
                rows={2}
              />
            </div>
          )}
        </div>
      </div>

      {/* タグセクション - キャラクターのみ */}
      {mode === 'character' && (
        <div className="bg-gradient-to-br from-blue-900/20 to-indigo-900/20 p-6 rounded-xl border border-blue-700/30">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <span className="text-blue-400 text-lg">🏷️</span>
            </div>
            <h4 className="text-lg font-semibold text-white">タグ</h4>
            <p className="text-sm text-slate-400">キャラクターの特徴を表すキーワード</p>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {((formData as Character)?.tags || []).map((tag: string, index: number) => (
              <span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 rounded-full text-sm border border-purple-400/30">
                <span className="font-medium">{tag}</span>
                <button 
                  onClick={() => {
                    const newTags = (formData as Character)?.tags?.filter((_: string, i: number) => i !== index) || [];
                    setFormData(prev => prev ? {...prev as Character, tags: newTags} : null);
                  }} 
                  className="hover:text-purple-100 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input 
              placeholder="新しいタグを入力（例: 魔法使い、ツンデレ、幼馴染）" 
              className="bg-slate-800/50 border-slate-600 focus:border-blue-400"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  const input = e.target as HTMLInputElement;
                  const newTag = input.value.trim();
                  if (newTag && !((formData as Character)?.tags || []).includes(newTag)) {
                    setFormData(prev => prev ? {...prev, tags: [...((prev as Character)?.tags || []), newTag]} : null);
                    input.value = '';
                  }
                }
              }}
            />
            <Button 
              type="button" 
              size="sm" 
              className="bg-blue-600 hover:bg-blue-500"
              onClick={() => {
                const input = document.querySelector('input[placeholder*="新しいタグを入力"]') as HTMLInputElement;
                const newTag = input?.value.trim();
                if (newTag && !((formData as Character)?.tags || []).includes(newTag)) {
                  setFormData(prev => prev ? {...prev, tags: [...((prev as Character)?.tags || []), newTag]} : null);
                  input.value = '';
                }
              }}
            >
              追加
            </Button>
          </div>
        </div>
      )}

      {/* 好み・趣味セクション - キャラクターのみ */}
      {mode === 'character' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 p-5 rounded-xl border border-green-700/30">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-green-400 text-lg">🎨</span>
              <h4 className="text-lg font-semibold text-white">趣味</h4>
            </div>
            <div className="space-y-2 mb-4">
              {((formData as Character)?.hobbies || []).map((hobby: string, index: number) => (
                <div key={index} className="flex items-center gap-2">
                  <Input 
                    value={hobby} 
                    placeholder="趣味を入力"
                    className="bg-slate-800/50 border-slate-600 focus:border-green-400 text-sm"
                    onChange={e => {
                      const newHobbies = [...((formData as Character)?.hobbies || [])];
                      newHobbies[index] = e.target.value;
                      setFormData(prev => prev ? {...prev as Character, hobbies: newHobbies} : null);
                    }}
                  />
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="text-red-400 hover:text-red-300 shrink-0"
                    onClick={() => {
                      const newHobbies = ((formData as Character)?.hobbies || []).filter((_: string, i: number) => i !== index);
                      setFormData(prev => prev ? {...prev as Character, hobbies: newHobbies} : null);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              className="w-full border-green-600 text-green-300 hover:bg-green-600/20"
              onClick={() => setFormData(prev => prev ? {...prev as Character, hobbies: [...((prev as Character)?.hobbies || []), '']} : null)}
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              趣味を追加
            </Button>
          </div>

          <div className="bg-gradient-to-br from-pink-900/20 to-rose-900/20 p-5 rounded-xl border border-pink-700/30">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-pink-400 text-lg">❤️</span>
              <h4 className="text-lg font-semibold text-white">好きなもの</h4>
            </div>
            <div className="space-y-2 mb-4">
              {(formData?.likes || []).map((like: string, index: number) => (
                <div key={index} className="flex items-center gap-2">
                  <Input 
                    value={like} 
                    placeholder="好きなものを入力"
                    className="bg-slate-800/50 border-slate-600 focus:border-pink-400 text-sm"
                    onChange={e => {
                      const newLikes = [...((formData as Character)?.likes || [])];
                      newLikes[index] = e.target.value;
                      setFormData(prev => prev ? {...prev as Character, likes: newLikes} : null);
                    }}
                  />
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="text-red-400 hover:text-red-300 shrink-0"
                    onClick={() => {
                      const newLikes = ((formData as Character)?.likes || []).filter((_: string, i: number) => i !== index);
                      setFormData(prev => prev ? {...prev as Character, likes: newLikes} : null);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              className="w-full border-pink-600 text-pink-300 hover:bg-pink-600/20"
              onClick={() => setFormData(prev => prev ? {...prev as Character, likes: [...((prev as Character)?.likes || []), '']} : null)}
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              好きなものを追加
            </Button>
          </div>

          <div className="bg-gradient-to-br from-red-900/20 to-orange-900/20 p-5 rounded-xl border border-red-700/30">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-red-400 text-lg">💢</span>
              <h4 className="text-lg font-semibold text-white">嫌いなもの</h4>
            </div>
            <div className="space-y-2 mb-4">
              {(formData?.dislikes || []).map((dislike: string, index: number) => (
                <div key={index} className="flex items-center gap-2">
                  <Input 
                    value={dislike} 
                    placeholder="嫌いなものを入力"
                    className="bg-slate-800/50 border-slate-600 focus:border-red-400 text-sm"
                    onChange={e => {
                      const newDislikes = [...(formData?.dislikes || [])];
                      newDislikes[index] = e.target.value;
                      setFormData(prev => prev ? {...prev, dislikes: newDislikes} : null);
                    }}
                  />
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="text-red-400 hover:text-red-300 shrink-0"
                    onClick={() => {
                      const newDislikes = (formData?.dislikes || []).filter((_: string, i: number) => i !== index);
                      setFormData(prev => prev ? {...prev, dislikes: newDislikes} : null);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              className="w-full border-red-600 text-red-300 hover:bg-red-600/20"
              onClick={() => setFormData(prev => prev ? {...prev, dislikes: [...(prev?.dislikes || []), '']} : null)}
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              嫌いなものを追加
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};