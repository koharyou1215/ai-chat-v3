import React from 'react';
import { createPortal } from 'react-dom';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { useAppStore } from '@/store';
import { Settings } from 'lucide-react';

interface QuickSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickSettingsPanel: React.FC<QuickSettingsPanelProps> = ({ isOpen, onClose }) => {
  const {
    useDirectGeminiAPI,
    setUseDirectGeminiAPI,
    apiConfig,
    effectSettings,
    updateEffectSettings,
  } = useAppStore();

  const isGeminiModel = apiConfig.model?.includes('gemini') ?? false;

  // 🔍 DEBUG: 設定値をコンソールに出力
  React.useEffect(() => {
    if (isOpen) {
      console.log('🎨 [QuickSettingsPanel] Current effect settings:', {
        colorfulBubbles: effectSettings?.colorfulBubbles,
        particleEffects: effectSettings?.particleEffects,
        typewriterEffect: effectSettings?.typewriterEffect,
        bubbleOpacity: effectSettings?.bubbleOpacity,
        bubbleBlur: effectSettings?.bubbleBlur,
        threeDEffects: effectSettings?.threeDEffects,
        emotion: effectSettings?.emotion,
      });
      console.log('🎨 [QuickSettingsPanel] updateEffectSettings function:', typeof updateEffectSettings);
    }
  }, [isOpen, effectSettings, updateEffectSettings]);

  if (!isOpen) return null;

  // 🔧 FIX: React Portalを使用してbody直下にレンダリング
  // これにより、ChatHeaderの高さ制限（68px）から解放される
  const panelContent = (
    <div className="fixed right-0 top-0 h-full w-80 bg-gray-900 border-l border-gray-700 shadow-xl z-[9999] overflow-y-auto">
      {/* ヘッダー */}
      <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Settings className="w-5 h-5" />
            クイック設定
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      {/* 設定内容 */}
      <div className="p-4 space-y-6">
        {/* API設定セクション */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-purple-400 uppercase tracking-wider">
            API設定
          </h3>
          
          {isGeminiModel && (
            <ToggleSwitch
              label="Gemini API直接使用"
              checked={useDirectGeminiAPI ?? false}
              onChange={setUseDirectGeminiAPI}
              icon="🔥"
              onText="直接接続"
              offText="OpenRouter経由"
              description={useDirectGeminiAPI ? "高速な直接接続" : "安定したルーティング"}
            />
          )}
        </div>

        {/* エフェクト設定セクション */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-purple-400 uppercase tracking-wider">
            エフェクト設定
          </h3>

          <ToggleSwitch
            label="カラフルバブル"
            checked={effectSettings.colorfulBubbles}
            onChange={(checked) => {
              console.log('🎨 [QuickSettings] カラフルバブル onChange:', checked);
              updateEffectSettings({ colorfulBubbles: checked });
            }}
            icon="🎨"
            description={effectSettings.colorfulBubbles ? "有効" : "無効"}
          />

          <ToggleSwitch
            label="パーティクルエフェクト"
            checked={effectSettings.particleEffects}
            onChange={(checked) => {
              console.log('✨ [QuickSettings] パーティクルエフェクト onChange:', checked);
              updateEffectSettings({ particleEffects: checked });
            }}
            icon="✨"
            description={effectSettings.particleEffects ? "有効" : "無効"}
          />

          <ToggleSwitch
            label="タイプライター効果"
            checked={effectSettings.typewriterEffect}
            onChange={(checked) => {
              console.log('⌨️ [QuickSettings] タイプライター効果 onChange:', checked);
              updateEffectSettings({ typewriterEffect: checked });
            }}
            icon="⌨️"
            description={effectSettings.typewriterEffect ? "有効" : "無効"}
          />
        </div>

        {/* 吹き出し外観設定セクション */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-purple-400 uppercase tracking-wider">
            吹き出し外観
          </h3>

          {/* 透明度スライダー */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">💧</span>
                <span className="text-sm font-medium text-white">吹き出しの透明度</span>
              </div>
              <span className="text-sm text-purple-400 font-medium">
                {effectSettings.bubbleOpacity}%
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              step="5"
              value={effectSettings.bubbleOpacity}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                console.log('💧 [QuickSettings] 吹き出しの透明度 onChange:', value);
                updateEffectSettings({ bubbleOpacity: value });
              }}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${effectSettings.bubbleOpacity}%, #4b5563 ${effectSettings.bubbleOpacity}%, #4b5563 100%)`,
              }}
            />
            <p className="text-xs text-gray-400">
              吹き出しの背景の透明度を調整します
            </p>
          </div>

          {/* 背景ぼかし効果トグル */}
          <ToggleSwitch
            label="背景ぼかし効果"
            checked={effectSettings.bubbleBlur}
            onChange={(checked) => {
              console.log('🌫️ [QuickSettings] 背景ぼかし効果 onChange:', checked);
              updateEffectSettings({ bubbleBlur: checked });
            }}
            icon="🌫️"
            description={effectSettings.bubbleBlur ? "有効" : "無効"}
          />
        </div>

        {/* 3D機能セクション */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-purple-400 uppercase tracking-wider">
            3D機能
          </h3>

          {effectSettings.threeDEffects && (
            <>
              <ToggleSwitch
                label="ホログラムメッセージ"
                checked={effectSettings.threeDEffects.hologram?.enabled ?? false}
                onChange={(checked) => updateEffectSettings({
                  threeDEffects: {
                    ...effectSettings.threeDEffects,
                    hologram: { ...effectSettings.threeDEffects.hologram, enabled: checked }
                  }
                })}
                icon="🔮"
                description={effectSettings.threeDEffects.hologram?.enabled ? "有効" : "無効"}
              />

              <ToggleSwitch
                label="パーティクルテキスト"
                checked={effectSettings.threeDEffects.particleText?.enabled ?? false}
                onChange={(checked) => updateEffectSettings({
                  threeDEffects: {
                    ...effectSettings.threeDEffects,
                    particleText: { ...effectSettings.threeDEffects.particleText, enabled: checked }
                  }
                })}
                icon="🌟"
                description={effectSettings.threeDEffects.particleText?.enabled ? "有効" : "無効"}
              />

              <ToggleSwitch
                label="リップルエフェクト"
                checked={effectSettings.threeDEffects.ripple?.enabled ?? false}
                onChange={(checked) => updateEffectSettings({
                  threeDEffects: {
                    ...effectSettings.threeDEffects,
                    ripple: { ...effectSettings.threeDEffects.ripple, enabled: checked }
                  }
                })}
                icon="💫"
                description={effectSettings.threeDEffects.ripple?.enabled ? "有効" : "無効"}
              />

              <ToggleSwitch
                label="背景パーティクル"
                checked={effectSettings.threeDEffects.backgroundParticles?.enabled ?? false}
                onChange={(checked) => updateEffectSettings({
                  threeDEffects: {
                    ...effectSettings.threeDEffects,
                    backgroundParticles: { ...effectSettings.threeDEffects.backgroundParticles, enabled: checked }
                  }
                })}
                icon="🌌"
                description={effectSettings.threeDEffects.backgroundParticles?.enabled ? "有効" : "無効"}
              />
            </>
          )}
        </div>

        {/* 感情分析セクション */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-purple-400 uppercase tracking-wider">
            感情分析
          </h3>
          
          {effectSettings.emotion && (
            <>
              <ToggleSwitch
                label="リアルタイム感情分析"
                checked={effectSettings.emotion.realtimeDetection ?? false}
                onChange={(checked) => updateEffectSettings({
                  emotion: {
                    ...effectSettings.emotion,
                    realtimeDetection: checked
                  }
                })}
                icon="🎭"
                description={effectSettings.emotion.realtimeDetection ? "有効" : "無効"}
              />

              <ToggleSwitch
                label="感情ベーススタイリング"
                checked={effectSettings.emotion.display?.applyColors ?? false}
                onChange={(checked) => updateEffectSettings({
                  emotion: {
                    ...effectSettings.emotion,
                    display: {
                      ...effectSettings.emotion.display,
                      applyColors: checked
                    }
                  }
                })}
                icon="🎨"
                description={effectSettings.emotion.display?.applyColors ? "有効" : "無効"}
              />

              <ToggleSwitch
                label="自動リアクション"
                checked={effectSettings.emotion.autoReactions ?? false}
                onChange={(checked) => updateEffectSettings({
                  emotion: {
                    ...effectSettings.emotion,
                    autoReactions: checked
                  }
                })}
                icon="😊"
                description={effectSettings.emotion.autoReactions ? "有効" : "無効"}
              />
            </>
          )}
        </div>

        {/* 現在の設定状態 */}
        <div className="border-t border-gray-700 pt-4">
          <h3 className="text-sm font-medium text-gray-400 mb-2">現在の設定</h3>
          <div className="text-xs text-gray-500 space-y-1">
            <p>モデル: {apiConfig.model || 'gemini-2.5-flash'}</p>
            <p>Temperature: {apiConfig.temperature || 0.7}</p>
            <p>Max Tokens: {apiConfig.max_tokens || 2048}</p>
          </div>
        </div>
      </div>
    </div>
  );

  // 🔧 FIX: SSR対応 - ブラウザ環境でのみPortalを使用
  if (typeof window === 'undefined') return null;

  return createPortal(panelContent, document.body);
};