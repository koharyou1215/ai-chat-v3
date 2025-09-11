"use client";

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Heart, Edit, Check, Trash2 } from "lucide-react";
import { Character } from "@/types/core/character.types";
import { cn } from "@/lib/utils";
import Image from "next/image";
import {
  replaceVariablesInCharacter,
  getVariableContext,
} from "@/utils/variable-replacer";
import { useAppStore } from "@/store";

interface CharacterCardProps {
  character: Character;
  isSelected?: boolean;
  onSelect: (character: Character) => void;
  onEdit: (character: Character) => void;
  onDelete?: (characterId: string) => void;
  className?: string;
  isMultiSelectMode?: boolean;
}

export const CharacterCard: React.FC<CharacterCardProps> = ({
  character,
  isSelected = false,
  onSelect,
  onEdit,
  onDelete,
  className,
  isMultiSelectMode = false,
}) => {
  const [isFavorite, setIsFavorite] = useState(character.is_favorite ?? false);

  // 変数置換を適用したキャラクター情報
  const processedCharacter = useMemo(() => {
    const variableContext = getVariableContext(useAppStore.getState);
    return replaceVariablesInCharacter(character, variableContext);
  }, [character]);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFavorite(!isFavorite);
    // Here you would typically call a function to update the character's favorite status in your state management
    // For example: updateCharacter({ ...character, metadata: { ...character.metadata, is_favorite: !isFavorite } });
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      onDelete &&
      confirm(
        `本当に「${character.name}」を削除しますか？この操作は取り消せません。`
      )
    ) {
      onDelete(character.id);
    }
  };

  return (
    <motion.div
      layout
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn("relative group cursor-pointer", className)}
      onClick={() => onSelect(character)}>
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl transition-all duration-300",
          "bg-gradient-to-br from-gray-800/20 to-gray-900/20 backdrop-blur-xl border-2", // 枠線を少し太く
          isSelected
            ? "border-purple-400 shadow-[0_0_30px_rgba(168,85,247,0.3)]"
            : "border-white/10 hover:border-purple-400/50"
        )}>
        {/* 複数選択モード用のオーバーレイ */}
        {isMultiSelectMode && isSelected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-purple-500/30 z-10 pointer-events-none"
          />
        )}

        {character.background_url && character.background_url.trim() !== "" && (
          <div className="absolute inset-0 opacity-30">
            {character.background_url.endsWith(".mp4") ||
            character.background_url.includes("video") ? (
              <video
                src={character.background_url}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <Image
                src={character.background_url}
                alt=""
                fill
                style={{ objectFit: "cover" }}
                className="w-full h-full"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
          </div>
        )}

        <div className="relative p-4">
          <div className="flex items-start gap-3 mb-3">
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              className="relative flex-shrink-0">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-purple-400/50 shadow-xl relative group">
                {character.avatar_url ? (
                  <div className="relative w-full h-full">
                    <Image
                      src={character.avatar_url}
                      alt={character.name}
                      fill
                      className="object-cover transition-all duration-300 group-hover:scale-110 group-hover:brightness-110"
                      sizes="64px"
                      unoptimized
                    />
                    {/* 映像化エフェクト */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-400/20 via-transparent to-pink-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    {/* 光るエフェクト */}
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                      initial={{ x: "-100%" }}
                      whileHover={{ x: "100%" }}
                      transition={{ duration: 0.6, ease: "easeInOut" }}
                    />
                  </div>
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center group-hover:from-purple-400 group-hover:to-pink-400 transition-all duration-300">
                    <span className="text-2xl font-bold text-white group-hover:scale-110 transition-transform duration-300">
                      {character.name.charAt(0)}
                    </span>
                  </div>
                )}
              </div>
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-slate-800">
                  <Check className="w-4 h-4 text-white" />
                </motion.div>
              )}
            </motion.div>

            <div className="flex-1 min-w-0">
              <h3
                className="font-bold text-white text-lg truncate"
                title={processedCharacter.name}>
                {processedCharacter.name}
              </h3>
              <p
                className="text-sm text-purple-300/70 truncate"
                title={processedCharacter.occupation}>
                {processedCharacter.occupation}
              </p>
            </div>

            <motion.button
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleFavoriteClick}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              title={isFavorite ? "お気に入りから外す" : "お気に入りに追加"}>
              <Heart
                className={cn(
                  "w-5 h-5 transition-colors",
                  isFavorite
                    ? "text-red-500 fill-current"
                    : "text-white/50 hover:text-red-400"
                )}
              />
            </motion.button>
          </div>

          <div className="h-10 mb-3">
            <p className="text-sm text-white/80 italic line-clamp-2">
              &ldquo;{processedCharacter.catchphrase}&rdquo;
            </p>
          </div>

          <div className="flex flex-wrap gap-1 mb-3 h-6 overflow-hidden">
            {(() => {
              // tagsは配列として型定義されているため、直接使用
              const tags = processedCharacter.tags || [];
              return tags.slice(0, 3).map((tag: string) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-300 rounded-full">
                  #{tag}
                </span>
              ));
            })()}
            {(() => {
              const tags = processedCharacter.tags || [];
              return (
                tags.length > 3 && (
                  <span className="px-2 py-0.5 text-xs text-white/40">
                    +{tags.length - 3}
                  </span>
                )
              );
            })()}
          </div>

          {/* 統計情報をボタンの上に移動 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-3 p-2 bg-black/30 backdrop-blur-sm rounded-lg border border-white/10">
            <div className="flex justify-between text-xs text-white/60">
              <span>使用回数: {character.statistics?.usage_count ?? 0}</span>
              <span>
                最終使用:{" "}
                {character.statistics?.last_used
                  ? new Date(
                      character.statistics.last_used
                    ).toLocaleDateString()
                  : "なし"}
              </span>
            </div>
          </motion.div>

          {/* チャット画面域と編集画面域 */}
          <div className="flex gap-2">
            <button
              onClick={() => onSelect(character)}
              className={cn(
                "flex-1 py-2 px-4 rounded-lg font-medium transition-all text-sm",
                isSelected
                  ? isMultiSelectMode
                    ? "bg-green-500 text-white"
                    : "bg-purple-500 text-white cursor-default"
                  : "bg-white/10 text-white/70 hover:bg-white/20"
              )}
              disabled={!isMultiSelectMode && isSelected}
              title={
                isSelected
                  ? isMultiSelectMode
                    ? "選択を解除"
                    : "現在選択中"
                  : isMultiSelectMode
                  ? "メンバーに追加"
                  : "このキャラクターとチャットを開始"
              }>
              {isSelected
                ? isMultiSelectMode
                  ? "選択済み"
                  : "選択中"
                : isMultiSelectMode
                ? "選択"
                : "チャット"}
            </button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation();
                onEdit(character);
              }}
              className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
              title="キャラクター設定を編集">
              <Edit className="w-4 h-4 text-white/70" />
            </motion.button>
            {onDelete && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleDeleteClick}
                className="p-2 bg-red-500/10 rounded-lg hover:bg-red-500/20 transition-colors"
                title="キャラクターを削除">
                <Trash2 className="w-4 h-4 text-red-400" />
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
