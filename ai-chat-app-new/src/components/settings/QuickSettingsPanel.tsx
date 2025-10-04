import React from 'react';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { useAppStore } from '@/store';
import { Settings, Eye, EyeOff, Zap, MessageSquare, Sparkles, Palette, Box, Brain, Activity } from 'lucide-react';

interface QuickSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickSettingsPanel: React.FC<QuickSettingsPanelProps> = ({ isOpen, onClose }) => {
  const {
    enableSystemPrompt,
    setEnableSystemPrompt,
    enableJailbreakPrompt,
    setEnableJailbreakPrompt,
    useDirectGeminiAPI,
    setUseDirectGeminiAPI,
    apiConfig,
    effectSettings,
    updateEffectSettings,
    appearanceSettings,
    updateAppearanceSettings,
  } = useAppStore();

  // ローカル状態管理（UI表示用）
  const [showSystemPrompt, setShowSystemPrompt] = React.useState(false);
  const [showJailbreakPrompt, setShowJailbreakPrompt] = React.useState(false);
  const [showReplySuggestion, setShowReplySuggestion] = React.useState(false);
  const [showTextEnhancement, setShowTextEnhancement] = React.useState(false);

  const isGeminiModel = apiConfig.model?.includes('gemini') ?? false;

  if (!isOpen) return null;

  return (
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

        {/* プロンプト設定セクション */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-purple-400 uppercase tracking-wider">
            プロンプト設定
          </h3>
          
          <ToggleSwitch
            label="システムプロンプト"
            checked={enableSystemPrompt}
            onChange={setEnableSystemPrompt}
            icon="⚙️"
            description={enableSystemPrompt ? "有効" : "無効"}
          />

          <ToggleSwitch
            label="Jailbreakプロンプト"
            checked={enableJailbreakPrompt}
            onChange={setEnableJailbreakPrompt}
            icon="🔓"
            description={enableJailbreakPrompt ? "有効" : "無効"}
          />
        </div>

        {/* エフェクト設定セクション */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-purple-400 uppercase tracking-wider">
            エフェクト設定
          </h3>
          
          <ToggleSwitch
            label="カラフルバブル"
            checked={effectSettings.colorfulBubbles}
            onChange={(checked) => updateEffectSettings({ colorfulBubbles: checked })}
            icon="🎨"
            description={effectSettings.colorfulBubbles ? "有効" : "無効"}
          />

          <ToggleSwitch
            label="パーティクルエフェクト"
            checked={effectSettings.particleEffects}
            onChange={(checked) => updateEffectSettings({ particleEffects: checked })}
            icon="✨"
            description={effectSettings.particleEffects ? "有効" : "無効"}
          />

          <ToggleSwitch
            label="タイプライター効果"
            checked={effectSettings.typewriterEffect}
            onChange={(checked) => updateEffectSettings({ typewriterEffect: checked })}
            icon="⌨️"
            description={effectSettings.typewriterEffect ? "有効" : "無効"}
          />
        </div>

        {/* 3D機能セクション */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-purple-400 uppercase tracking-wider">
            3D機能
          </h3>

          <ToggleSwitch
            label="ホログラムメッセージ"
            checked={effectSettings.threeDEffects?.hologram.enabled ?? false}
            onChange={(checked) => updateEffectSettings({
              threeDEffects: {
                ...effectSettings.threeDEffects!,
                hologram: { ...effectSettings.threeDEffects!.hologram, enabled: checked }
              }
            })}
            icon="🔮"
            description={effectSettings.threeDEffects?.hologram.enabled ? "有効" : "無効"}
          />

          <ToggleSwitch
            label="パーティクルテキスト"
            checked={effectSettings.threeDEffects?.particleText.enabled ?? false}
            onChange={(checked) => updateEffectSettings({
              threeDEffects: {
                ...effectSettings.threeDEffects!,
                particleText: { ...effectSettings.threeDEffects!.particleText, enabled: checked }
              }
            })}
            icon="🌟"
            description={effectSettings.threeDEffects?.particleText.enabled ? "有効" : "無効"}
          />

          <ToggleSwitch
            label="リップルエフェクト"
            checked={effectSettings.threeDEffects?.ripple.enabled ?? false}
            onChange={(checked) => updateEffectSettings({
              threeDEffects: {
                ...effectSettings.threeDEffects!,
                ripple: { ...effectSettings.threeDEffects!.ripple, enabled: checked }
              }
            })}
            icon="💫"
            description={effectSettings.threeDEffects?.ripple.enabled ? "有効" : "無効"}
          />

          <ToggleSwitch
            label="背景パーティクル"
            checked={effectSettings.threeDEffects?.backgroundParticles.enabled ?? false}
            onChange={(checked) => updateEffectSettings({
              threeDEffects: {
                ...effectSettings.threeDEffects!,
                backgroundParticles: { ...effectSettings.threeDEffects!.backgroundParticles, enabled: checked }
              }
            })}
            icon="🌌"
            description={effectSettings.threeDEffects?.backgroundParticles.enabled ? "有効" : "無効"}
          />
        </div>

        {/* 感情分析セクション */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-purple-400 uppercase tracking-wider">
            感情分析
          </h3>
          
          <ToggleSwitch
            label="リアルタイム感情分析"
            checked={effectSettings.emotion?.realtimeDetection ?? false}
            onChange={(checked) => updateEffectSettings({
              emotion: {
                ...effectSettings.emotion!,
                realtimeDetection: checked
              }
            })}
            icon="🎭"
            description={effectSettings.emotion?.realtimeDetection ? "有効" : "無効"}
          />

          <ToggleSwitch
            label="感情ベーススタイリング"
            checked={effectSettings.emotion?.display.applyColors ?? false}
            onChange={(checked) => updateEffectSettings({
              emotion: {
                ...effectSettings.emotion!,
                display: {
                  ...effectSettings.emotion!.display,
                  applyColors: checked
                }
              }
            })}
            icon="🎨"
            description={effectSettings.emotion?.display.applyColors ? "有効" : "無効"}
          />

          <ToggleSwitch
            label="自動リアクション"
            checked={effectSettings.emotion?.autoReactions ?? false}
            onChange={(checked) => updateEffectSettings({
              emotion: {
                ...effectSettings.emotion!,
                autoReactions: checked
              }
            })}
            icon="😊"
            description={effectSettings.emotion?.autoReactions ? "有効" : "無効"}
          />
        </div>

        {/* トラッカー設定セクション */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-purple-400 uppercase tracking-wider">
            トラッカー
          </h3>
          
          <ToggleSwitch
            label="自動トラッカー更新"
            checked={effectSettings.autoTrackerUpdate}
            onChange={(checked) => updateEffectSettings({ autoTrackerUpdate: checked })}
            icon="📊"
            description={effectSettings.autoTrackerUpdate ? "有効" : "無効"}
          />

          <ToggleSwitch
            label="トラッカー表示"
            checked={effectSettings.showTrackers}
            onChange={(checked) => updateEffectSettings({ showTrackers: checked })}
            icon="📈"
            description={effectSettings.showTrackers ? "表示" : "非表示"}
          />
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
};