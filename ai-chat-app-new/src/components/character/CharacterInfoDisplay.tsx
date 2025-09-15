"use client";

import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Calendar, MapPin, Heart, Star, Brain, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store";
import { Character } from "@/types";

interface CharacterInfoDisplayProps {
  character_id: string;
}

export const CharacterInfoDisplay: React.FC<CharacterInfoDisplayProps> = ({
  character_id,
}) => {
  // Subscribe to character updates from the store
  const character = useAppStore((state) => state.characters.get(character_id));

  // Force re-render when character updates
  const updateTrigger = useAppStore((state) => state.updateTrigger);

  const characterData = useMemo(() => {
    if (!character) return null;
    return {
      ...character,
      // Ensure we have the latest data
      timestamp: Date.now()
    };
  }, [character, updateTrigger]);

  if (!characterData) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="p-4 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm mx-auto mb-4 w-16 h-16 flex items-center justify-center">
            <User size={32} className="text-white" />
          </div>
          <p className="text-sm text-gray-300">
            キャラクター情報を読み込み中...
          </p>
        </div>
      </div>
    );
  }

  const InfoSection: React.FC<{
    icon: React.ElementType;
    title: string;
    content: string | React.ReactNode;
    color?: string;
  }> = ({ icon: Icon, title, content, color = "text-purple-400" }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <div className={cn("p-2 rounded-lg bg-white/10 backdrop-blur-sm", color)}>
          <Icon size={16} />
        </div>
        <h3 className="text-sm font-semibold text-white/90">{title}</h3>
      </div>
      <div className="p-3 rounded-lg bg-black/20 backdrop-blur-sm border border-white/10">
        {typeof content === 'string' ? (
          <p className="text-xs text-gray-300 leading-relaxed">{content}</p>
        ) : (
          content
        )}
      </div>
    </motion.div>
  );

  return (
    <div className="h-full flex flex-col space-y-4 p-2">
      {/* Character Avatar and Name */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm border border-white/20">
        {characterData.avatar_url ? (
          <img
            src={characterData.avatar_url}
            alt={characterData.name}
            className="w-16 h-16 rounded-full object-cover border-2 border-white/30"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <User size={28} className="text-white" />
          </div>
        )}
        <div className="flex-1">
          <h2 className="text-lg font-bold text-white">{characterData.name}</h2>
          {characterData.age && (
            <p className="text-sm text-gray-300">年齢: {characterData.age}歳</p>
          )}
          {characterData.occupation && (
            <p className="text-xs text-purple-300 mt-1">{characterData.occupation}</p>
          )}
        </div>
      </motion.div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {/* Basic Information */}
        {characterData.description && (
          <InfoSection
            icon={User}
            title="基本情報"
            content={characterData.description}
            color="text-blue-400"
          />
        )}

        {/* Personality */}
        {characterData.personality && (
          <InfoSection
            icon={Brain}
            title="性格"
            content={characterData.personality}
            color="text-purple-400"
          />
        )}

        {/* External Personality */}
        {characterData.external_personality && (
          <InfoSection
            icon={Sparkles}
            title="外見的性格"
            content={characterData.external_personality}
            color="text-pink-400"
          />
        )}

        {/* Internal Personality */}
        {characterData.internal_personality && (
          <InfoSection
            icon={Heart}
            title="内面的性格"
            content={characterData.internal_personality}
            color="text-red-400"
          />
        )}

        {/* First Message */}
        {characterData.first_message && (
          <InfoSection
            icon={Star}
            title="初期メッセージ"
            content={characterData.first_message}
            color="text-yellow-400"
          />
        )}

        {/* Scenario */}
        {characterData.scenario && (
          <InfoSection
            icon={MapPin}
            title="シナリオ"
            content={characterData.scenario}
            color="text-green-400"
          />
        )}

        {/* System Prompt */}
        {characterData.system_prompt && (
          <InfoSection
            icon={Brain}
            title="システムプロンプト"
            content={
              <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono">
                {characterData.system_prompt}
              </pre>
            }
            color="text-indigo-400"
          />
        )}

        {/* Update Timestamp */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-gray-500 text-center py-2">
          最終更新: {new Date().toLocaleTimeString('ja-JP')}
        </motion.div>
      </div>
    </div>
  );
};