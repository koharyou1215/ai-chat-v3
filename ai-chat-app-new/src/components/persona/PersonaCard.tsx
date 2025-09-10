"use client";

import React from "react";
import { motion } from "framer-motion";
import { Check, Edit, User } from "lucide-react";
import { Persona } from "@/types";
import { cn } from "@/lib/utils";

interface PersonaCardProps {
  persona: Persona;
  isSelected?: boolean;
  onSelect: (persona: Persona) => void;
  onEdit: (persona: Persona) => void;
  className?: string;
}

export const PersonaCard: React.FC<PersonaCardProps> = ({
  persona,
  isSelected = false,
  onSelect,
  onEdit,
  className,
}) => {
  return (
    <motion.div
      layout
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn("relative group cursor-pointer", className)}
      onClick={() => onSelect(persona)}>
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl transition-all duration-300",
          "bg-gradient-to-br from-blue-900/20 to-cyan-900/20 backdrop-blur-xl border",
          isSelected
            ? "border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.3)]"
            : "border-white/10 hover:border-cyan-400/50"
        )}>
        <div className="relative p-4">
          <div className="flex items-start gap-3 mb-3">
            <motion.div
              whileHover={{ scale: 1.1, rotate: -5 }}
              className="relative flex-shrink-0">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-cyan-400/50 shadow-xl">
                {persona.avatar_path ? (
                  <img
                    src={persona.avatar_path}
                    alt={persona.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    <User className="w-8 h-8 text-white" />
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
                title={persona.name}>
                {persona.name}
              </h3>
              <p
                className="text-sm text-cyan-300/70 truncate"
                title={persona.role}>
                {persona.role}
              </p>
            </div>

            <div className="w-8">
              {/* is_default property removed from simplified Persona type */}
            </div>
          </div>

          <div className="h-10 mb-3">
            <p className="text-sm text-white/80 line-clamp-2">
              {persona.other_settings
                ? persona.other_settings
                    .split("\n")[0]
                    .replace("Description: ", "")
                : "詳細情報なし"}
            </p>
          </div>

          <div className="flex flex-wrap gap-1 mb-4 h-6 overflow-hidden">
            {persona.other_settings
              ? persona.other_settings
                  .split("\n")
                  .find((line) => line.startsWith("Traits:"))
                  ?.replace("Traits: ", "")
                  .split(", ")
                  .slice(0, 3)
                  .map((trait, index) => (
                    <span
                      key={index}
                      className="px-2 py-0.5 text-xs bg-cyan-500/20 text-cyan-300 rounded-full">
                      {trait.trim()}
                    </span>
                  ))
              : []}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => onSelect(persona)}
              className={cn(
                "flex-1 py-2 px-4 rounded-lg font-medium transition-all text-sm",
                isSelected
                  ? "bg-cyan-500 text-white cursor-default"
                  : "bg-white/10 text-white/70 hover:bg-white/20"
              )}
              disabled={isSelected}>
              {isSelected ? "選択中" : "選択"}
            </button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation();
                onEdit(persona);
              }}
              className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
              title="編集">
              <Edit className="w-4 h-4 text-white/70" />
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
