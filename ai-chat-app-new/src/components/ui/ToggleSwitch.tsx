import React from 'react';

interface ToggleSwitchProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  onText?: string;
  offText?: string;
  icon?: string;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  label,
  description,
  checked,
  onChange,
  disabled = false,
  onText = 'ON',
  offText = 'OFF',
  icon,
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
          {icon && <span>{icon}</span>}
          {label}
        </label>
        <button
          onClick={() => !disabled && onChange(!checked)}
          disabled={disabled}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          } ${
            checked ? 'bg-purple-600' : 'bg-gray-600'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              checked ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
      {description && (
        <p className="text-xs text-gray-400">
          {checked ? `✅ ${onText}: ${description}` : `⭕ ${offText}: ${description}`}
        </p>
      )}
    </div>
  );
};