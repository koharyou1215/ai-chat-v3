import React from "react";

interface SettingSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export const SettingSection: React.FC<SettingSectionProps> = ({
  title,
  description,
  children,
}) => {
  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-white/60 mb-4">{description}</p>
      )}
      <div className="space-y-3">{children}</div>
    </div>
  );
};