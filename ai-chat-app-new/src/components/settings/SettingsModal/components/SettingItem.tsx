import React from "react";

interface SettingItemProps {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  badge?: string;
}

export const SettingItem: React.FC<SettingItemProps> = ({
  title,
  description,
  checked,
  onChange,
  badge,
}) => (
  <div className="flex items-start justify-between p-4 bg-slate-800/50 rounded-lg border border-gray-700">
    <div className="flex-1">
      <div className="flex items-center gap-2 mb-1">
        <h4 className="font-medium text-white">{title}</h4>
        {badge && (
          <span className="px-2 py-1 text-xs bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/30">
            {badge}
          </span>
        )}
      </div>
      <p className="text-sm text-gray-400">{description}</p>
    </div>
    <div className="ml-4">
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
      </label>
    </div>
  </div>
);