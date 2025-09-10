"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, User, Settings, Upload } from "lucide-react";
import { Persona } from "@/types";
import { Input } from "@/components/ui/input";
import { AvatarUploadWidget } from "@/components/ui/AvatarUploadWidget";
import { cn } from "@/lib/utils";

interface PersonaDetailModalProps {
  persona: Persona | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (persona: Persona) => void;
}

const tabs = [
  { id: "basic", label: "基本情報", icon: User },
  { id: "settings", label: "詳細設定", icon: Settings },
];

export const PersonaDetailModal: React.FC<PersonaDetailModalProps> = ({
  persona,
  isOpen,
  onClose,
  onSave,
}) => {
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");

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
      console.error("Failed to save persona:", error);
      alert("ペルソナの保存に失敗しました");
    } finally {
      setIsSaving(false);
    }
  };

  const updatePersona = (updates: Partial<Persona>) => {
    if (!editingPersona) return;
    setEditingPersona({ ...editingPersona, ...updates });
  };

  const renderTabContent = () => {
    if (!editingPersona) return null;

    switch (activeTab) {
      case "basic":
        return (
          <div className="space-y-6">
            {/* アバターアップロード */}
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-cyan-400/50">
                {editingPersona.avatar_path ? (
                  <img
                    src={editingPersona.avatar_path}
                    alt={editingPersona.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    <User className="w-8 h-8 text-white" />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  アバター画像
                </label>
                <AvatarUploadWidget
                  onUpload={(filePath) =>
                    updatePersona({ avatar_path: filePath })
                  }
                  currentImage={editingPersona.avatar_path}
                  className="text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  ペルソナ名
                </label>
                <Input
                  value={editingPersona.name}
                  onChange={(e) => updatePersona({ name: e.target.value })}
                  className="bg-slate-900/50 border-slate-600 focus:border-cyan-500 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  ロール
                </label>
                <Input
                  value={editingPersona.role}
                  onChange={(e) => updatePersona({ role: e.target.value })}
                  className="bg-slate-900/50 border-slate-600 focus:border-cyan-500 text-white"
                />
              </div>
            </div>
          </div>
        );

      case "settings":
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                その他の設定
              </label>
              <textarea
                value={editingPersona.other_settings || ""}
                onChange={(e) =>
                  updatePersona({ other_settings: e.target.value })
                }
                rows={15}
                placeholder="Description: ペルソナの説明&#10;&#10;Traits: 特性1, 特性2, 特性3&#10;&#10;Likes: 好きなもの1, 好きなもの2, 好きなもの3&#10;&#10;Dislikes: 嫌いなもの1, 嫌いなもの2, 嫌いなもの3&#10;&#10;Speaking Style: 話し方・口調&#10;&#10;Personality: 性格・人格&#10;&#10;Background: 背景・設定&#10;&#10;その他の詳細情報..."
                className="w-full p-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-white/40 focus:border-cyan-500 focus:outline-none font-mono text-sm"
              />
              <p className="text-xs text-white/60 mt-2">
                上記のフォーマットに従って詳細情報を入力してください。各行は改行で区切ってください。
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!isOpen || !editingPersona) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-slate-800/90 border border-slate-700 rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-700">
            <div className="flex items-center gap-3">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  ペルソナ詳細設定
                </h2>
                <p className="text-sm text-white/60">
                  {editingPersona.name}の設定を編集
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50">
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {isSaving ? "保存中..." : "保存"}
              </motion.button>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-slate-700 transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-700">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2",
                  activeTab === tab.id
                    ? "text-cyan-400 border-cyan-400 bg-cyan-500/10"
                    : "text-white/60 border-transparent hover:text-white hover:bg-slate-700/50"
                )}>
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="p-6">
                {renderTabContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
