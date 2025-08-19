'use client';

import React, { createContext, useState, useEffect, ReactNode, useContext } from 'react';
import { EffectSettings } from '@/components/settings/SettingsModal';

interface EffectSettingsContextType {
  settings: EffectSettings;
  updateSettings: (newSettings: EffectSettings) => void;
  resetSettings: () => void;
}

const EffectSettingsContext = createContext<EffectSettingsContextType | undefined>(undefined);

// セーフモード検出
const safeMode = typeof window !== 'undefined' && localStorage.getItem('safe-mode') === 'true';

// 最適化されたデフォルト設定 - 安定性重視
const defaultSettings: EffectSettings = {
  // メッセージエフェクト - 基本的なもののみ有効
  colorfulBubbles: !safeMode,
  fontEffects: !safeMode,
  particleEffects: false, // パフォーマンス問題のため常に無効
  typewriterEffect: !safeMode,
  
  // 外観設定
  bubbleOpacity: 85,
  bubbleBlur: true,
  
  // 3D機能 - 全て無効（パフォーマンス重視）
  hologramMessages: false,
  particleText: false,
  rippleEffects: false,
  backgroundParticles: false,
  
  // 感情分析 - 軽量なもののみ
  realtimeEmotion: !safeMode,
  emotionBasedStyling: false, // 震え問題回避のため一時無効
  autoReactions: false, // CPU負荷軽減のため無効
  
  // トラッカー
  autoTrackerUpdate: !safeMode,
  showTrackers: true,
  
  // パフォーマンス - 保守的な設定
  effectQuality: safeMode ? 'low' : 'medium',
  animationSpeed: safeMode ? 0 : 0.5 // より控えめな速度
};

interface EffectSettingsProviderProps {
  children: ReactNode;
}

export const EffectSettingsProvider: React.FC<EffectSettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<EffectSettings>(defaultSettings);

  // 設定をローカルストレージから読み込み
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedSettings = localStorage.getItem('effect-settings');
        if (savedSettings && savedSettings.trim()) {
          const parsedSettings = JSON.parse(savedSettings);
          if (parsedSettings && typeof parsedSettings === 'object') {
            setSettings({ ...defaultSettings, ...parsedSettings });
          }
        }
      } catch (error) {
        console.error('Failed to parse saved settings:', error);
        // 破損した設定をクリア
        try {
          localStorage.removeItem('effect-settings');
        } catch (clearError) {
          console.error('Failed to clear corrupted settings:', clearError);
        }
        setSettings(defaultSettings);
      }
    }
  }, []);

  const updateSettings = (newSettings: EffectSettings) => {
    setSettings(newSettings);
    if (typeof window !== 'undefined') {
      try {
        const settingsJson = JSON.stringify(newSettings);
        localStorage.setItem('effect-settings', settingsJson);
      } catch (error) {
        console.error('Failed to save settings:', error);
      }
    }
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('effect-settings');
      } catch (error) {
        console.error('Failed to reset settings:', error);
      }
    }
  };

  return (
    <EffectSettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </EffectSettingsContext.Provider>
  );
};

export const useEffectSettings = () => {
  const context = useContext(EffectSettingsContext);
  if (context === undefined) {
    throw new Error('useEffectSettings must be used within an EffectSettingsProvider');
  }
  return context;
};

export default EffectSettingsContext;