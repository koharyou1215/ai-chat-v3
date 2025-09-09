'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, User, Plus, Trash2, Heart, Star, Palette, Settings, FileText } from 'lucide-react';
import { Persona } from '@/types';
import { Input } from '@/components/ui/input';
import { AvatarUploadWidget } from '@/components/ui/AvatarUploadWidget';
import { cn } from '@/lib/utils';

interface PersonaDetailModalProps {
  persona: Persona | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (persona: Persona) => void;
}

const tabs = [
  { id: 'basic', label: '基本情報', icon: User },
  { id: 'personality', label: '性格', icon: Heart },
  { id: 'traits', label: '特性', icon: Star },
  { id: 'appearance', label: '外観', icon: Palette },
  { id: 'advanced', label: '詳細設定', icon: Settings }
];

export const PersonaDetailModal: React.FC<PersonaDetailModalProps> = ({
  persona,
  isOpen,
  onClose,
  onSave,
}) => {
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  useEffect(() => {
    if (persona) {
      setEditingPersona({ ...persona });
    }
  }, [persona]);

  const handleSave = async () => {
    if (!editingPersona) return;

    setIsSaving(true);
    try {
      await onSave(editingPersona);
      onClose();
    } catch (error) {
      console.error('Failed to save persona:', error);
      alert('ペルソナの保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const updatePersona = (updates: Partial<Persona>) => {
    if (!editingPersona) return;
    setEditingPersona({ ...editingPersona, ...updates });
  };

  const addTrait = () => {
    if (!editingPersona) return;
    const newTrait = `新しい特性${editingPersona.traits.length + 1}`;
    updatePersona({
      traits: [...editingPersona.traits, newTrait]
    });
  };

  const removeTrait = (index: number) => {
    if (!editingPersona) return;
    const newTraits = editingPersona.traits.filter((_, i) => i !== index);
    updatePersona({ traits: newTraits });
  };

  const updateTrait = (index: number, value: string) => {
    if (!editingPersona) return;
    const newTraits = [...editingPersona.traits];
    newTraits[index] = value;
    updatePersona({ traits: newTraits });
  };

  const addLike = () => {
    if (!editingPersona) return;
    const newLike = `新しい好み${editingPersona.likes.length + 1}`;
    updatePersona({
      likes: [...editingPersona.likes, newLike]
    });
  };

  const removeLike = (index: number) => {
    if (!editingPersona) return;
    const newLikes = editingPersona.likes.filter((_, i) => i !== index);
    updatePersona({ likes: newLikes });
  };

  const updateLike = (index: number, value: string) => {
    if (!editingPersona) return;
    const newLikes = [...editingPersona.likes];
    newLikes[index] = value;
    updatePersona({ likes: newLikes });
  };

  const addDislike = () => {
    if (!editingPersona) return;
    const newDislike = `新しい嫌い${editingPersona.dislikes.length + 1}`;
    updatePersona({
      dislikes: [...editingPersona.dislikes, newDislike]
    });
  };

  const removeDislike = (index: number) => {
    if (!editingPersona) return;
    const newDislikes = editingPersona.dislikes.filter((_, i) => i !== index);
    updatePersona({ dislikes: newDislikes });
  };

  const updateDislike = (index: number, value: string) => {
    if (!editingPersona) return;
    const newDislikes = [...editingPersona.dislikes];
    newDislikes[index] = value;
    updatePersona({ dislikes: newDislikes });
  };

  const renderTabContent = () => {
    if (!editingPersona) return null;

    switch (activeTab) {
      case 'basic':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-white mb-2">ペルソナ名</label>
                <Input
                  value={editingPersona.name}
                  onChange={(e) => updatePersona({ name: e.target.value })}
                  className="bg-slate-900/50 border-slate-600 focus:border-cyan-500 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">ロール</label>
                <Input
                  value={editingPersona.role}
                  onChange={(e) => updatePersona({ role: e.target.value })}
                  className="bg-slate-900/50 border-slate-600 focus:border-cyan-500 text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">説明</label>
              <textarea
                value={editingPersona.description}
                onChange={(e) => updatePersona({ description: e.target.value })}
                rows={4}
                placeholder="このペルソナの基本的な説明を入力してください..."
                className="w-full p-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-white/40 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>
        );

      case 'personality':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-white mb-2">性格・人格</label>
              <textarea
                value={editingPersona.personality || ''}
                onChange={(e) => updatePersona({ personality: e.target.value })}
                rows={5}
                placeholder="性格、価値観、思考パターンなど詳細な人格設定を記述してください..."
                className="w-full p-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-white/40 focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">話し方・口調</label>
              <textarea
                value={editingPersona.speaking_style || ''}
                onChange={(e) => updatePersona({ speaking_style: e.target.value })}
                rows={4}
                placeholder="話し方、口調、よく使う表現、コミュニケーションスタイルを記述してください..."
                className="w-full p-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-white/40 focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">背景・設定</label>
              <textarea
                value={editingPersona.background || ''}
                onChange={(e) => updatePersona({ background: e.target.value })}
                rows={4}
                placeholder="キャラクターの背景、経歴、設定などを記述してください..."
                className="w-full p-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-white/40 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>
        );

      case 'traits':
        return (
          <div className="space-y-6">
            {/* Traits */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-white">特性・性格要素</label>
                <button
                  onClick={addTrait}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-cyan-500/20 text-cyan-300 rounded-lg hover:bg-cyan-500/30 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  追加
                </button>
              </div>
              <div className="grid gap-2">
                {editingPersona.traits.map((trait, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-2"
                  >
                    <Input
                      value={trait}
                      onChange={(e) => updateTrait(index, e.target.value)}
                      className="flex-1 bg-slate-900/50 border-slate-600 focus:border-cyan-500 text-white"
                      placeholder="特性を入力..."
                    />
                    <button
                      onClick={() => removeTrait(index)}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Likes */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-white">好みもの・興味</label>
                <button
                  onClick={addLike}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-green-500/20 text-green-300 rounded-lg hover:bg-green-500/30 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  追加
                </button>
              </div>
              <div className="grid gap-2">
                {editingPersona.likes.map((like, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-2"
                  >
                    <Input
                      value={like}
                      onChange={(e) => updateLike(index, e.target.value)}
                      className="flex-1 bg-slate-900/50 border-slate-600 focus:border-green-500 text-white"
                      placeholder="好みを入力..."
                    />
                    <button
                      onClick={() => removeLike(index)}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Dislikes */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-white">嫌いなもの・苦手</label>
                <button
                  onClick={addDislike}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  追加
                </button>
              </div>
              <div className="grid gap-2">
                {editingPersona.dislikes.map((dislike, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-2"
                  >
                    <Input
                      value={dislike}
                      onChange={(e) => updateDislike(index, e.target.value)}
                      className="flex-1 bg-slate-900/50 border-slate-600 focus:border-red-500 text-white"
                      placeholder="嫌いなものを入力..."
                    />
                    <button
                      onClick={() => removeDislike(index)}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'appearance':
        return (
          <div className="space-y-6">
            
            
            <div>
              <label className="block text-sm font-medium text-white mb-2">カラーテーマ</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  { name: 'cyan', color: 'bg-cyan-500', label: 'シアン' },
                  { name: 'blue', color: 'bg-blue-500', label: 'ブルー' },
                  { name: 'purple', color: 'bg-purple-500', label: 'パープル' },
                  { name: 'pink', color: 'bg-pink-500', label: 'ピンク' },
                  { name: 'green', color: 'bg-green-500', label: 'グリーン' },
                  { name: 'yellow', color: 'bg-yellow-500', label: 'イエロー' },
                  { name: 'red', color: 'bg-red-500', label: 'レッド' },
                  { name: 'gray', color: 'bg-gray-500', label: 'グレー' }
                ].map((theme) => (
                  <button
                    key={theme.name}
                    onClick={() => updatePersona({ color_theme: theme.name })}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-lg border transition-colors",
                      editingPersona.color_theme === theme.name
                        ? "border-white bg-slate-700"
                        : "border-slate-600 hover:border-slate-500"
                    )}
                  >
                    <div className={cn("w-4 h-4 rounded-full", theme.color)} />
                    <span className="text-xs text-white">{theme.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 'advanced':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-white mb-2">その他設定</label>
              <textarea
                value={editingPersona.other_settings || ''}
                onChange={(e) => updatePersona({ other_settings: e.target.value })}
                rows={6}
                placeholder="追加の設定やカスタマイズ情報をJSON形式や自由形式で記述してください..."
                className="w-full p-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-white/40 focus:border-cyan-500 focus:outline-none font-mono text-sm"
              />
            </div>
            
            <div className="bg-slate-800/50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                設定例
              </h4>
              <pre className="text-xs text-slate-400 whitespace-pre-wrap">
{`{
  "voice_settings": {
    "speed": 1.0,
    "pitch": 1.0
  },
  "response_style": {
    "length": "medium",
    "formality": "casual"
  }
}`}
              </pre>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!isOpen || !editingPersona) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-slate-800/90 border border-slate-700 rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-700">
            <div className="flex items-center gap-3">
              
              <div>
                <h2 className="text-xl font-semibold text-white">ペルソナ詳細設定</h2>
                <p className="text-sm text-white/60">{editingPersona.name}の設定を編集</p>
              </div>
            </div>
            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {isSaving ? '保存中...' : '保存'}
              </motion.button>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-slate-700">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 border-transparent hover:bg-slate-700/50",
                    activeTab === tab.id
                      ? "text-cyan-400 border-cyan-400 bg-slate-700/30"
                      : "text-slate-400 hover:text-slate-300"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="p-6"
              >
                {renderTabContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};