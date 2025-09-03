"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface SettingItemProps {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  badge?: string;
  disabled?: boolean;
}

/**
 * 設定項目コンポーネント
 * トグルスイッチ付きの設定項目を表示
 * バッジ表示、無効状態をサポート
 */
export const SettingItem: React.FC<SettingItemProps> = ({ 
  title, 
  description, 
  checked, 
  onChange, 
  badge, 
  disabled 
}) => (
  <div
    className={cn(
      "flex items-start justify-between p-4 bg-slate-800/50 rounded-lg border border-gray-700",
      disabled && "opacity-50"
    )}>
    <div className="flex-1">
      <div className="flex items-center gap-2 mb-1">
        <h4
          className={cn(
            "font-medium",
            disabled ? "text-gray-400" : "text-white"
          )}>
          {title}
        </h4>
        {badge && (
          <span className="px-2 py-1 text-xs bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/30">
            {badge}
          </span>
        )}
      </div>
      <p className="text-sm text-gray-400">{description}</p>
    </div>
    <div className="ml-4">
      <label
        className={cn(
          "relative inline-flex items-center",
          disabled ? "cursor-not-allowed" : "cursor-pointer"
        )}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => !disabled && onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only peer"
        />
        <div
          className={cn(
            "w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all",
            !disabled && "peer-checked:bg-purple-500"
          )}></div>
      </label>
    </div>
  </div>
);