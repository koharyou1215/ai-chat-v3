'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { 
  X, 
  Palette, 
  Volume2, 
  Cpu, 
  Database,
  Shield,
  Bell,
  Globe,
  Code,
  Save,
  Sparkles,
  Brain,
  Activity,
  Gauge,
  Wand2,
  Lightbulb,
  Edit3,
  Eye,
  EyeOff,
  TestTube2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store';
import { useEffectSettings } from '@/contexts/EffectSettingsContext';
import { SystemPrompts } from '@/types/core/settings.types';
import { EffectSettings } from '@/store/slices/settings.slice';
import { StorageManager } from '@/utils/storage-cleanup';


interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: string;
  onEffectSettingsChange?: (settings: EffectSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'effects',
  onEffectSettingsChange
}) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const { settings: _contextSettings, updateSettings: updateContextSettings } = useEffectSettings();
  const {
    systemPrompts,
    enableSystemPrompt,
    enableJailbreakPrompt,
    updateSystemPrompts,
    setEnableSystemPrompt,
    setEnableJailbreakPrompt,
    apiConfig,
    setTemperature,
    setMaxTokens,
    setTopP,
    openRouterApiKey,
    setOpenRouterApiKey,
    geminiApiKey,
    setGeminiApiKey,
    setAPIModel,
    setAPIProvider,
    effectSettings,
    updateEffectSettings
  } = useAppStore();

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  const [localSystemPrompts, setLocalSystemPrompts] = useState<SystemPrompts>(systemPrompts);
  
  useEffect(() => {
    if (isOpen) {
      setLocalSystemPrompts(systemPrompts);
    }
  }, [isOpen, systemPrompts]);

  const [_showSystemPrompt, _setShowSystemPrompt] = useState(false);
  const [_showJailbreakPrompt, _setShowJailbreakPrompt] = useState(false);
  const [_showReplySuggestionPrompt, _setShowReplySuggestionPrompt] = useState(false);
  const [_showTextEnhancementPrompt, _setShowTextEnhancementPrompt] = useState(false);
  
  
  // エフェクト設定のローカル状態 - Zustandストアから取得
  const [localEffectSettings, setLocalEffectSettings] = useState<EffectSettings>(effectSettings);
  
  // ストアの設定が変更された場合はローカル状態を更新
  useEffect(() => {
    if (isOpen) {
      setLocalEffectSettings(effectSettings);
    }
  }, [isOpen, effectSettings]);

  const tabs = [
    { id: 'effects', label: 'エフェクト', icon: Sparkles },
    { id: '3d', label: '3D機能', icon: Wand2 },
    { id: 'emotion', label: '感情分析', icon: Brain },
    { id: 'tracker', label: 'トラッカー', icon: Activity },
    { id: 'performance', label: 'パフォーマンス', icon: Gauge },
    { id: 'chat', label: 'チャット', icon: Brain },
    { id: 'appearance', label: '外観', icon: Palette },
    { id: 'voice', label: '音声', icon: Volume2 },
    { id: 'ai', label: 'AI', icon: Cpu },
    { id: 'data', label: 'データ', icon: Database },
    { id: 'privacy', label: 'プライバシー', icon: Shield },
    { id: 'notifications', label: '通知', icon: Bell },
    { id: 'language', label: '言語・地域', icon: Globe },
    { id: 'developer', label: '開発者', icon: Code },
  ];

  const updateEffectSetting = <K extends keyof EffectSettings>(key: K, value: EffectSettings[K]) => {
    const newSettings = {
      ...localEffectSettings,
      [key]: value
    };
    setLocalEffectSettings(newSettings);
    
    // Zustandストアに即座に保存（永続化される）
    updateEffectSettings(newSettings);
    
    // 下位互換性のためEffectSettingsContextにも反映
    updateContextSettings(newSettings);
    if (onEffectSettingsChange) {
      onEffectSettingsChange(newSettings);
    }
  };

  const handleSave = () => {
    // AI設定（プロンプト）を保存
    updateSystemPrompts(localSystemPrompts);
    
    // エフェクト設定を保存
    if (onEffectSettingsChange) {
      onEffectSettingsChange(localEffectSettings);
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl max-h-[80vh] bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* ヘッダー */}
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">設定</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white/70" />
              </button>
            </div>

            {/* コンテンツ */}
            <div className="flex-1 flex overflow-hidden">
              {/* サイドバー */}
              <div className="w-48 border-r border-white/10 p-4 overflow-y-auto">
                <nav className="space-y-1">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                        activeTab === tab.id
                          ? 'bg-purple-500/20 text-purple-400'
                          : 'text-white/60 hover:bg-white/5 hover:text-white/80'
                      )}
                    >
                      <tab.icon className="w-4 h-4" />
                      <span className="text-sm">{tab.label}</span>
                    </button>
                  ))}
                </nav>
              </div>

              {/* 設定パネル */}
              <div className="flex-1 p-6 overflow-y-auto">
                {activeTab === 'effects' && (
                  <EffectsPanel settings={localEffectSettings} updateSetting={updateEffectSetting} />
                )}
                {activeTab === '3d' && (
                  <ThreeDPanel settings={localEffectSettings} updateSetting={updateEffectSetting} />
                )}
                {activeTab === 'emotion' && (
                  <EmotionPanel settings={localEffectSettings} updateSetting={updateEffectSetting} />
                )}
                {activeTab === 'tracker' && (
                  <TrackerPanel settings={localEffectSettings} updateSetting={updateEffectSetting} />
                )}
                {activeTab === 'performance' && (
                  <PerformancePanel settings={localEffectSettings} updateSetting={updateEffectSetting} />
                )}
                {activeTab === 'chat' && (
                  <ChatPanel />
                )}
                {activeTab === 'appearance' && (
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-white mb-4">外観設定</h3>
                    <p className="text-gray-400">外観設定は開発中です。</p>
                  </div>
                )}
                {activeTab === 'voice' && (
                  <VoicePanel />
                )}
                {activeTab === 'ai' && (
                  <AIPanel
                    systemPrompts={localSystemPrompts}
                    enableSystemPrompt={enableSystemPrompt}
                    enableJailbreakPrompt={enableJailbreakPrompt}
                    apiConfig={apiConfig}
                    openRouterApiKey={openRouterApiKey ?? ''}
                    geminiApiKey={geminiApiKey ?? ''}
                    showSystemPrompt={_showSystemPrompt}
                    showJailbreakPrompt={_showJailbreakPrompt}
                    showReplySuggestionPrompt={_showReplySuggestionPrompt}
                    showTextEnhancementPrompt={_showTextEnhancementPrompt}
                    onUpdateSystemPrompts={setLocalSystemPrompts}
                    onSetEnableSystemPrompt={setEnableSystemPrompt}
                    onSetEnableJailbreakPrompt={setEnableJailbreakPrompt}
                    onSetTemperature={setTemperature}
                    onSetMaxTokens={setMaxTokens}
                    onSetTopP={setTopP}
                    onToggleSystemPrompt={() => _setShowSystemPrompt(!_showSystemPrompt)}
                    onToggleJailbreakPrompt={() => _setShowJailbreakPrompt(!_showJailbreakPrompt)}
                    onToggleReplySuggestionPrompt={() => _setShowReplySuggestionPrompt(!_showReplySuggestionPrompt)}
                    onToggleTextEnhancementPrompt={() => _setShowTextEnhancementPrompt(!_showTextEnhancementPrompt)}
                    setAPIModel={setAPIModel}
                    setAPIProvider={setAPIProvider}
                    setOpenRouterApiKey={setOpenRouterApiKey}
                    setGeminiApiKey={setGeminiApiKey}
                  />
                )}
                {activeTab === 'language' && (
                  <LanguagePanel />
                )}
                {activeTab === 'data' && (
                  <DataManagementPanel />
                )}
                {['privacy', 'notifications', 'developer'].includes(activeTab) && (
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-white mb-4">{tabs.find(t => t.id === activeTab)?.label}設定</h3>
                    <p className="text-gray-400">この設定は開発中です。</p>
                  </div>
                )}
              </div>
            </div>

            {/* フッター */}
            <div className="px-6 py-4 border-t border-white/10 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-white/60 hover:text-white/80 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                保存
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// エフェクト設定パネル
const EffectsPanel: React.FC<{
  settings: EffectSettings;
  updateSetting: <K extends keyof EffectSettings>(key: K, value: EffectSettings[K]) => void;
}> = ({ settings, updateSetting }) => (
  <div className="space-y-6">
    <h3 className="text-xl font-semibold text-white mb-4">メッセージエフェクト</h3>
    
    <SettingItem
      title="カラフル吹き出し"
      description="グラデーション背景とグロー効果を有効にします"
      checked={settings.colorfulBubbles}
      onChange={(checked) => updateSetting('colorfulBubbles', checked)}
    />
    
    <SettingItem
      title="フォントエフェクト"
      description="特殊文字の装飾と動的なフォントスタイルを有効にします"
      checked={settings.fontEffects}
      onChange={(checked) => updateSetting('fontEffects', checked)}
    />
    
    <SettingItem
      title="パーティクルエフェクト"
      description="ハート、星、虹などのアニメーションエフェクトを有効にします"
      checked={settings.particleEffects}
      onChange={(checked) => updateSetting('particleEffects', checked)}
    />
    
    <SettingItem
      title="タイプライター効果"
      description="文字を1つずつ表示するタイプライター効果を有効にします"
      checked={settings.typewriterEffect}
      onChange={(checked) => updateSetting('typewriterEffect', checked)}
    />

    {/* 外観設定 */}
    <div className="border-t border-white/10 pt-6">
      <h4 className="text-lg font-medium text-white mb-4">外観設定</h4>
      
      {/* 透明度設定 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h5 className="text-sm font-medium text-white">吹き出しの透明度</h5>
            <p className="text-xs text-gray-400">吹き出しの背景の透明度を調整します</p>
          </div>
          <span className="text-sm text-purple-400 font-medium">{settings.bubbleOpacity}%</span>
        </div>
        <div className="relative">
          <input
            type="range"
            min="10"
            max="100"
            step="5"
            value={settings.bubbleOpacity}
            onChange={(e) => updateSetting('bubbleOpacity', parseInt(e.target.value))}
            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
            style={{
              background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${settings.bubbleOpacity}%, #4b5563 ${settings.bubbleOpacity}%, #4b5563 100%)`
            }}
          />
        </div>
      </div>
      
      <SettingItem
        title="背景ぼかし効果"
        description="吹き出し背景にぼかし効果を適用します（半透明時により美しい見た目になります）"
        checked={settings.bubbleBlur}
        onChange={(checked) => updateSetting('bubbleBlur', checked)}
      />
    </div>
  </div>
);

// 3D機能設定パネル
const ThreeDPanel: React.FC<{
  settings: EffectSettings;
  updateSetting: <K extends keyof EffectSettings>(key: K, value: EffectSettings[K]) => void;
}> = ({ settings, updateSetting }) => (
  <div className="space-y-6">
    <h3 className="text-xl font-semibold text-white mb-4">3D機能</h3>
    
    <SettingItem
      title="ホログラムメッセージ"
      description="WebGLを使用した立体的なメッセージ表示"
      checked={settings.hologramMessages}
      onChange={(checked) => updateSetting('hologramMessages', checked)}
      badge="実験的"
    />
    
    <SettingItem
      title="パーティクルテキスト"
      description="文字が粒子化して集合・分散するエフェクト"
      checked={settings.particleText}
      onChange={(checked) => updateSetting('particleText', checked)}
      badge="実験的"
    />
    
    <SettingItem
      title="リップルエフェクト"
      description="タッチ位置から波紋が広がるニューモーフィック効果"
      checked={settings.rippleEffects}
      onChange={(checked) => updateSetting('rippleEffects', checked)}
    />
    
    <SettingItem
      title="背景パーティクル"
      description="3D空間に浮遊するパーティクル背景を表示"
      checked={settings.backgroundParticles}
      onChange={(checked) => updateSetting('backgroundParticles', checked)}
      badge="実験的"
    />
  </div>
);

// 感情分析設定パネル
const EmotionPanel: React.FC<{
  settings: EffectSettings;
  updateSetting: <K extends keyof EffectSettings>(key: K, value: EffectSettings[K]) => void;
}> = ({ settings, updateSetting }) => (
  <div className="space-y-6">
    <h3 className="text-xl font-semibold text-white mb-4">感情分析</h3>
    
    <SettingItem
      title="リアルタイム感情検出"
      description="メッセージから感情を自動検出し、表情を変更します"
      checked={settings.realtimeEmotion}
      onChange={(checked) => updateSetting('realtimeEmotion', checked)}
    />
    
    <SettingItem
      title="感情ベースのスタイル変更"
      description="検出した感情に基づいてメッセージの見た目を自動変更します"
      checked={settings.emotionBasedStyling}
      onChange={(checked) => updateSetting('emotionBasedStyling', checked)}
    />
    
    <SettingItem
      title="自動リアクション"
      description="感情に応じて自動的にビジュアルエフェクトを発動します"
      checked={settings.autoReactions}
      onChange={(checked) => updateSetting('autoReactions', checked)}
    />
  </div>
);

// トラッカー設定パネル
const TrackerPanel: React.FC<{
  settings: EffectSettings;
  updateSetting: <K extends keyof EffectSettings>(key: K, value: EffectSettings[K]) => void;
}> = ({ settings, updateSetting }) => (
  <div className="space-y-6">
    <h3 className="text-xl font-semibold text-white mb-4">トラッカーシステム</h3>
    
    <SettingItem
      title="自動トラッカー更新"
      description="メッセージ内容に基づいてトラッカーを自動更新します"
      checked={settings.autoTrackerUpdate}
      onChange={(checked) => updateSetting('autoTrackerUpdate', checked)}
    />
    
    <SettingItem
      title="トラッカー表示"
      description="チャット画面にトラッカーパネルを表示します"
      checked={settings.showTrackers}
      onChange={(checked) => updateSetting('showTrackers', checked)}
    />
  </div>
);

// パフォーマンス設定パネル
const PerformancePanel: React.FC<{
  settings: EffectSettings;
  updateSetting: <K extends keyof EffectSettings>(key: K, value: EffectSettings[K]) => void;
}> = ({ settings, updateSetting }) => (
  <div className="space-y-6">
    <h3 className="text-xl font-semibold text-white mb-4">パフォーマンス</h3>
    
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          エフェクト品質
        </label>
        <select
          value={settings.effectQuality}
          onChange={(e) => updateSetting('effectQuality', e.target.value as 'low' | 'medium' | 'high')}
          className="w-full px-3 py-2 bg-slate-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
        >
          <option value="low">低品質（軽快）</option>
          <option value="medium">中品質（推奨）</option>
          <option value="high">高品質（重い）</option>
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          アニメーション速度: {settings.animationSpeed}x
        </label>
        <input
          type="range"
          min="0.5"
          max="2"
          step="0.1"
          value={settings.animationSpeed}
          onChange={(e) => updateSetting('animationSpeed', parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
        />
      </div>
    </div>
  </div>
);

// 設定項目コンポーネント
const SettingItem: React.FC<{
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  badge?: string;
}> = ({ title, description, checked, onChange, badge }) => (
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

// AI設定パネル
const AIPanel: React.FC<{
  systemPrompts: Record<string, string>;
  enableSystemPrompt: boolean;
  enableJailbreakPrompt: boolean;
  apiConfig: APIConfig; // APIConfig型を使用
  openRouterApiKey: string; // openRouterApiKey を追加
  geminiApiKey: string; // geminiApiKey を追加
  showSystemPrompt: boolean;
  showJailbreakPrompt: boolean;
  showReplySuggestionPrompt: boolean;
  showTextEnhancementPrompt: boolean;
  onUpdateSystemPrompts: (prompts: Record<string, string>) => void;
  onSetEnableSystemPrompt: (enable: boolean) => void;
  onSetEnableJailbreakPrompt: (enable: boolean) => void;
  onSetTemperature: (temp: number) => void;
  onSetMaxTokens: (tokens: number) => void;
  onSetTopP: (topP: number) => void;
  onToggleSystemPrompt: () => void;
  onToggleJailbreakPrompt: () => void;
  onToggleReplySuggestionPrompt: () => void;
  onToggleTextEnhancementPrompt: () => void;
  setAPIModel: (model: string) => void; // setAPIModel を追加
  setAPIProvider: (provider: string) => void; // setAPIProvider を追加
  setOpenRouterApiKey: (key: string) => void; // setOpenRouterApiKey を追加
  setGeminiApiKey: (key: string) => void; // setGeminiApiKey を追加
}> = ({
  systemPrompts,
  enableSystemPrompt,
  enableJailbreakPrompt,
  apiConfig,
  openRouterApiKey,
  geminiApiKey,
  showSystemPrompt,
  showJailbreakPrompt,
  showReplySuggestionPrompt,
  showTextEnhancementPrompt,
  onUpdateSystemPrompts,
  onSetEnableSystemPrompt,
  onSetEnableJailbreakPrompt,
  onSetTemperature,
  onSetMaxTokens,
  onSetTopP,
  onToggleSystemPrompt,
  onToggleJailbreakPrompt,
  onToggleReplySuggestionPrompt,
  onToggleTextEnhancementPrompt,
  setAPIModel,
  setAPIProvider,
  setOpenRouterApiKey,
  setGeminiApiKey
}) => {
  const [localOpenRouterApiKey, setLocalOpenRouterApiKey] = useState(openRouterApiKey || '');
  const [localGeminiApiKey, setLocalGeminiApiKey] = useState(geminiApiKey || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showGeminiApiKey, setShowGeminiApiKey] = useState(false);

  // apiConfig がなければ何も表示しない
  if (!apiConfig) {
    return null;
  }

  const handleModelChange = (modelId: string) => {
    setAPIModel(modelId);
    if (modelId.includes('gemini')) {
      setAPIProvider('gemini');
    } else {
      setAPIProvider('openrouter');
    }
  };

  const handleApiKeyChange = (key: string) => {
    setLocalOpenRouterApiKey(key);
    setOpenRouterApiKey(key);
  };

  const handleGeminiApiKeyChange = (key: string) => {
    setLocalGeminiApiKey(key);
    setGeminiApiKey(key);
  };

  const isGemini = apiConfig.provider === 'gemini';

  const handlePromptChange = (key: keyof SystemPrompts, value: string) => {
    onUpdateSystemPrompts({ ...systemPrompts, [key]: value });
  };

  const handleSavePrompts = () => {
    console.log('Saving custom prompts:', systemPrompts);
  };

  return (
    <div className="space-y-6 max-h-[60vh] overflow-y-auto">
      {/* API設定セクション */}
      <div className="space-y-4">
        <h4 className="text-lg font-medium text-white">API設定</h4>
        
        {/* モデル選択 */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">モデル選択</label>
          <select
            value={apiConfig.model}
            onChange={(e) => handleModelChange(e.target.value)}
            className="w-full px-3 py-2 bg-slate-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
          >
            <optgroup label="Google">
              <option value="google/gemini-2.5-pro">Gemini 2.5 Pro</option>
              <option value="google/gemini-2.5-flash">Gemini 2.5 Flash</option>
            </optgroup>
            <optgroup label="Anthropic (OpenRouter)">
              <option value="anthropic/claude-opus-4">Claude Opus 4</option>
              <option value="anthropic/claude-sonnet-4">Claude Sonnet 4</option>
            </optgroup>
            <optgroup label="xAI (OpenRouter)">
              <option value="x-ai/grok-4">Grok-4</option>
            </optgroup>
            <optgroup label="OpenAI (OpenRouter)">
              <option value="openai/gpt-5-chat">GPT-5</option>
              <option value="openai/gpt-5-mini">GPT-5 Mini</option>
            </optgroup>
            <optgroup label="Standard (OpenRouter)">
              <option value="deepseek/deepseek-chat-v3.1">DeepSeek Chat v3</option>
              <option value="mistralai/mistral-medium-3.1">Mistral Medium 3.1</option>
              <option value="meta-llama/llama-4-maverick">Llama 4 Maverick</option>
            </optgroup>
            <optgroup label="Specialized (OpenRouter)">
              <option value="qwen/qwen3-30b-a3b-instruct-2507">Qwen3 30B A3B</option>
              <option value="z-ai/glm-4.5">GLM-4.5</option>
              <option value="moonshotai/kimi-k2">Kimi K2</option>
            </optgroup>
          </select>
          {isGemini ? (
              <p className="text-xs text-blue-400 mt-1">
                Gemini APIを使用します。APIキーは <code className="bg-gray-700 px-1 rounded">gemini-api-key.txt</code> から読み込まれます。
              </p>
          ) : (
              <p className="text-xs text-purple-400 mt-1">
                OpenRouter APIを使用します。
              </p>
          )}
        </div>

        {/* Gemini APIキー入力 */}
        <AnimatePresence>
          {isGemini && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2 overflow-hidden"
            >
              <label className="block text-sm font-medium text-gray-300">Gemini APIキー</label>
              <div className="relative">
                <input
                  type={showGeminiApiKey ? 'text' : 'password'}
                  value={localGeminiApiKey}
                  onChange={(e) => handleGeminiApiKeyChange(e.target.value)}
                  className="w-full px-3 py-2 pr-10 bg-slate-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  placeholder="AIza..."
                />
                <button
                  onClick={() => setShowGeminiApiKey(!showGeminiApiKey)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showGeminiApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-400">
                Google AI Studioで取得したAPIキーを入力してください。
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* OpenRouter APIキー入力 */}
        <AnimatePresence>
          {!isGemini && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2 overflow-hidden"
            >
              <label className="block text-sm font-medium text-gray-300">OpenRouter APIキー</label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={localOpenRouterApiKey}
                  onChange={(e) => handleApiKeyChange(e.target.value)}
                  className="w-full px-3 py-2 pr-10 bg-slate-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                  placeholder="sk-or-..."
                />
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-400">
                OpenRouterのAPIキーを入力してください。キーは暗号化されてローカルに保存されます。
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="border-t border-white/10 pt-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-semibold text-white">AI設定</h3>
          <Button onClick={handleSavePrompts} size="sm">
            <Save className="w-4 h-4 mr-2" />
            プロンプトを保存
          </Button>
        </div>

        {/* AI パラメータ */}
        <div className="space-y-4">
          <h4 className="text-lg font-medium text-white">生成パラメータ</h4>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Temperature: {apiConfig.temperature}
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={apiConfig.temperature}
              onChange={(e) => onSetTemperature(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <p className="text-xs text-gray-400 mt-1">創造性の度合い (0: 保守的, 2: 創造的)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Max Tokens: {apiConfig.max_tokens}
            </label>
            <input
              type="range"
              min="256"
              max="8192"
              step="256"
              value={apiConfig.max_tokens}
              onChange={(e) => onSetMaxTokens(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <p className="text-xs text-gray-400 mt-1">最大出力トークン数</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Top-p: {apiConfig.top_p}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={apiConfig.top_p}
              onChange={(e) => onSetTopP(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <p className="text-xs text-gray-400 mt-1">語彙の多様性 (0.1: 制限的, 1.0: 多様)</p>
          </div>
        </div>

        {/* システムプロンプト */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu size={16} className="text-blue-500" />
              <label className="text-sm font-medium">システムプロンプト</label>
            </div>
            <div className="flex items-center gap-2">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableSystemPrompt}
                  onChange={(e) => onSetEnableSystemPrompt(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
              </label>
              <button
                onClick={onToggleSystemPrompt}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors flex items-center gap-1"
              >
                {showSystemPrompt ? <EyeOff size={12} /> : <Eye size={12} />}
                {showSystemPrompt ? '隠す' : '表示'}
              </button>
            </div>
          </div>
          {showSystemPrompt && (
            <textarea
              value={systemPrompts.system}
              onChange={(e) => handlePromptChange('system', e.target.value)}
              className="w-full h-32 px-3 py-2 bg-slate-800 border border-gray-600 rounded text-xs font-mono text-white focus:outline-none focus:border-blue-500"
              placeholder="システムプロンプトを入力..."
            />
          )}
        </div>

        {/* 脱獄プロンプト */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-red-500" />
              <label className="text-sm font-medium">脱獄プロンプト</label>
            </div>
            <div className="flex items-center gap-2">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableJailbreakPrompt}
                  onChange={(e) => onSetEnableJailbreakPrompt(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-500"></div>
              </label>
              <button
                onClick={onToggleJailbreakPrompt}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors flex items-center gap-1"
              >
                {showJailbreakPrompt ? <EyeOff size={12} /> : <Eye size={12} />}
                {showJailbreakPrompt ? '隠す' : '表示'}
              </button>
            </div>
          </div>
          {showJailbreakPrompt && (
            <textarea
              value={systemPrompts.jailbreak}
              onChange={(e) => handlePromptChange('jailbreak', e.target.value)}
              className="w-full h-20 px-3 py-2 bg-slate-800 border border-gray-600 rounded text-xs text-white focus:outline-none focus:border-red-500"
              placeholder="脱獄プロンプトを入力..."
            />
          )}
        </div>

        {/* 返信提案プロンプト */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Lightbulb size={16} className="text-yellow-600" />
            <label className="text-sm font-medium">返信提案💡プロンプト</label>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleReplySuggestionPrompt}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors flex items-center gap-1"
            >
              {showReplySuggestionPrompt ? <EyeOff size={12} /> : <Eye size={12} />}
              {showReplySuggestionPrompt ? '隠す' : '表示'}
            </button>
          </div>
          {showReplySuggestionPrompt && (
            <textarea
              value={systemPrompts.replySuggestion}
              onChange={(e) => handlePromptChange('replySuggestion', e.target.value)}
              className="w-full h-32 px-3 py-2 bg-slate-800 border border-gray-600 rounded text-xs font-mono text-white focus:outline-none focus:border-yellow-500"
              placeholder="返信提案プロンプトを入力..."
            />
          )}
        </div>

        {/* 文章強化プロンプト */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Edit3 size={16} className="text-green-600" />
            <label className="text-sm font-medium">文章強化✨プロンプト</label>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleTextEnhancementPrompt}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs transition-colors flex items-center gap-1"
            >
              {showTextEnhancementPrompt ? <EyeOff size={12} /> : <Eye size={12} />}
              {showTextEnhancementPrompt ? '隠す' : '表示'}
            </button>
          </div>
          {showTextEnhancementPrompt && (
            <textarea
              value={systemPrompts.textEnhancement}
              onChange={(e) => handlePromptChange('textEnhancement', e.target.value)}
              className="w-full h-32 px-3 py-2 bg-slate-800 border border-gray-600 rounded text-xs font-mono text-white focus:outline-none focus:border-green-500"
              placeholder="文章強化プロンプトを入力..."
            />
          )}
        </div>
      </div>
    </div>
  );
};

// チャット設定パネル
const ChatPanel: React.FC = () => {
  const { 
    chat, 
    updateChatSettings,
    _systemPrompts: systemPrompts,
    _enableSystemPrompt: enableSystemPrompt,
    _enableJailbreakPrompt: enableJailbreakPrompt,
    updateSystemPrompts,
    _setEnableSystemPrompt: setEnableSystemPrompt,
    _setEnableJailbreakPrompt: setEnableJailbreakPrompt
  } = useAppStore();

  const [_showSystemPrompt, _setShowSystemPrompt] = useState(false);
  const [_showJailbreakPrompt, _setShowJailbreakPrompt] = useState(false);
  const [_showReplySuggestionPrompt, _setShowReplySuggestionPrompt] = useState(false);
  const [_showTextEnhancementPrompt, _setShowTextEnhancementPrompt] = useState(false);

  const handleMemoryLimitChange = (key: string, value: number) => {
    const currentLimits = chat.memory_limits || {
      max_working_memory: 6,
      max_memory_cards: 50,
      max_relevant_memories: 5,
      max_prompt_tokens: 32000,
      max_context_messages: 20,
    };
    
    updateChatSettings({
      memory_limits: {
        ...currentLimits,
        [key]: value
      }
    });
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-white mb-4">チャット設定</h3>
      
      {/* 記憶容量設定 */}
      <div className="space-y-4">
        <h4 className="text-lg font-medium text-white">記憶容量制限</h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              作業記憶 (メッセージ数)
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={chat.memory_limits?.max_working_memory || 6}
              onChange={(e) => handleMemoryLimitChange('max_working_memory', parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-slate-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
            <p className="text-xs text-gray-400">最新の会話メッセージを保持する数</p>
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              メモリーカード上限
            </label>
            <input
              type="number"
              min="10"
              max="200"
              value={chat.memory_limits?.max_memory_cards || 50}
              onChange={(e) => handleMemoryLimitChange('max_memory_cards', parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-slate-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
            <p className="text-xs text-gray-400">保存できるメモリーカードの最大数</p>
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              関連記憶検索数
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={chat.memory_limits?.max_relevant_memories || 5}
              onChange={(e) => handleMemoryLimitChange('max_relevant_memories', parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-slate-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
            <p className="text-xs text-gray-400">プロンプトに含める関連記憶の数</p>
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              プロンプト最大トークン
            </label>
            <input
              type="number"
              min="8000"
              max="128000"
              step="1000"
              value={chat.memory_limits?.max_prompt_tokens || 32000}
              onChange={(e) => handleMemoryLimitChange('max_prompt_tokens', parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-slate-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
            <p className="text-xs text-gray-400">プロンプト全体のトークン制限</p>
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              会話履歴上限 (メッセージ数)
            </label>
            <input
              type="number"
              min="5"
              max="50"
              value={chat.memory_limits?.max_context_messages || 20}
              onChange={(e) => handleMemoryLimitChange('max_context_messages', parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-slate-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
            <p className="text-xs text-gray-400">プロンプトに含める会話履歴の数</p>
          </div>
        </div>
      </div>

      {/* その他のチャット設定 */}
      <div className="space-y-4">
        <h4 className="text-lg font-medium text-white">一般設定</h4>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            記憶容量: {chat.memoryCapacity}
          </label>
          <input
            type="range"
            min="10"
            max="500"
            value={chat.memoryCapacity}
            onChange={(e) => updateChatSettings({ memoryCapacity: parseInt(e.target.value) })}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none slider-thumb"
          />
          <p className="text-xs text-gray-400">従来の記憶容量設定（レガシー）</p>
        </div>
      </div>
    </div>
  );
};

// 言語・地域設定パネル
const LanguagePanel: React.FC = () => {
  const { languageSettings, updateLanguageSettings } = useAppStore();
  
  const languages = [
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'zh', name: '中文', flag: '🇨🇳' },
    { code: 'ko', name: '한국어', flag: '🇰🇷' },
  ];
  
  const timezones = [
    { value: 'Asia/Tokyo', label: '東京 (UTC+9)' },
    { value: 'America/New_York', label: 'ニューヨーク (UTC-5)' },
    { value: 'Europe/London', label: 'ロンドン (UTC+0)' },
    { value: 'Asia/Shanghai', label: '上海 (UTC+8)' },
    { value: 'Asia/Seoul', label: 'ソウル (UTC+9)' },
  ];
  
  const dateFormats = [
    { value: 'YYYY/MM/DD', label: '2024/12/25' },
    { value: 'MM/DD/YYYY', label: '12/25/2024' },
    { value: 'DD/MM/YYYY', label: '25/12/2024' },
    { value: 'YYYY-MM-DD', label: '2024-12-25' },
  ];
  
  const currencies = [
    { value: 'JPY', label: '日本円 (¥)' },
    { value: 'USD', label: '米ドル ($)' },
    { value: 'EUR', label: 'ユーロ (€)' },
    { value: 'CNY', label: '人民元 (¥)' },
    { value: 'KRW', label: '韓国ウォン (₩)' },
  ];
  
  const getCurrentTime = () => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      timeZone: languageSettings.timezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: languageSettings.timeFormat === '12',
    };
    return now.toLocaleTimeString(languageSettings.language === 'ja' ? 'ja-JP' : 'en-US', options);
  };
  
  const getCurrentDate = () => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      timeZone: languageSettings.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    };
    return now.toLocaleDateString(languageSettings.language === 'ja' ? 'ja-JP' : 'en-US', options);
  };
  
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-white mb-4">言語・地域設定</h3>
      
      {/* 現在の時刻表示 */}
      <div className="p-4 bg-slate-800/50 rounded-lg border border-gray-700">
        <h4 className="text-sm font-medium text-gray-300 mb-2">現在の設定プレビュー</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">現在時刻:</span>
            <span className="ml-2 text-white font-mono">{getCurrentTime()}</span>
          </div>
          <div>
            <span className="text-gray-400">現在日付:</span>
            <span className="ml-2 text-white font-mono">{getCurrentDate()}</span>
          </div>
        </div>
      </div>
      
      {/* 言語選択 */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-300">表示言語</label>
        <div className="grid grid-cols-2 gap-3">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => updateLanguageSettings({ language: lang.code as 'ja' | 'en' | 'zh' | 'ko' })}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                languageSettings.language === lang.code
                  ? "bg-purple-500/20 border-purple-500/50 text-purple-300"
                  : "bg-slate-800/50 border-gray-700 text-white/80 hover:bg-slate-700/50"
              )}
            >
              <span className="text-lg">{lang.flag}</span>
              <span className="font-medium">{lang.name}</span>
            </button>
          ))}
        </div>
      </div>
      
      {/* タイムゾーン設定 */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-300">タイムゾーン</label>
        <select
          value={languageSettings.timezone}
          onChange={(e) => updateLanguageSettings({ timezone: e.target.value })}
          className="w-full px-3 py-2 bg-slate-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
        >
          {timezones.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </select>
      </div>
      
      {/* 日付形式設定 */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-300">日付形式</label>
        <select
          value={languageSettings.dateFormat}
          onChange={(e) => updateLanguageSettings({ dateFormat: e.target.value })}
          className="w-full px-3 py-2 bg-slate-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
        >
          {dateFormats.map((format) => (
            <option key={format.value} value={format.value}>
              {format.label}
            </option>
          ))}
        </select>
      </div>
      
      {/* 時刻形式設定 */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-300">時刻形式</label>
        <div className="flex gap-3">
          <button
            onClick={() => updateLanguageSettings({ timeFormat: '24' })}
            className={cn(
              "flex-1 py-2 px-4 rounded-lg border transition-colors",
              languageSettings.timeFormat === '24'
                ? "bg-purple-500/20 border-purple-500/50 text-purple-300"
                : "bg-slate-800/50 border-gray-700 text-white/80 hover:bg-slate-700/50"
            )}
          >
            24時間表示 (18:30)
          </button>
          <button
            onClick={() => updateLanguageSettings({ timeFormat: '12' })}
            className={cn(
              "flex-1 py-2 px-4 rounded-lg border transition-colors",
              languageSettings.timeFormat === '12'
                ? "bg-purple-500/20 border-purple-500/50 text-purple-300"
                : "bg-slate-800/50 border-gray-700 text-white/80 hover:bg-slate-700/50"
            )}
          >
            12時間表示 (6:30 PM)
          </button>
        </div>
      </div>
      
      {/* 通貨設定 */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-300">通貨</label>
        <select
          value={languageSettings.currency}
          onChange={(e) => updateLanguageSettings({ currency: e.target.value })}
          className="w-full px-3 py-2 bg-slate-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
        >
          {currencies.map((currency) => (
            <option key={currency.value} value={currency.value}>
              {currency.label}
            </option>
          ))}
        </select>
      </div>
      
      {/* 追加情報 */}
      <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <h4 className="text-sm font-medium text-blue-300 mb-2">💡 ヒント</h4>
        <ul className="text-xs text-blue-200 space-y-1">
          <li>• 言語設定はアプリケーション全体に反映されます</li>
          <li>• タイムゾーンはメッセージの時刻表示に影響します</li>
          <li>• 設定は自動的に保存されます</li>
        </ul>
      </div>
    </div>
  );
};

// 音声設定パネル
const VoicePanel: React.FC = () => {
  const { 
    voice, 
    updateVoiceSettings 
  } = useAppStore();

  const [isPlaying, setIsPlaying] = useState(false);
  const [voiceVoxStatus, setVoiceVoxStatus] = useState<'unknown' | 'available' | 'unavailable'>('unknown');

  // VoiceVox接続状態をチェック
  const checkVoiceVoxStatus = async () => {
    try {
      const response = await fetch('/api/voice/voicevox/check', { method: 'GET' });
      setVoiceVoxStatus(response.ok ? 'available' : 'unavailable');
    } catch (_err) {
      setVoiceVoxStatus('unavailable');
    }
  };

  // コンポーネントマウント時にVoiceVox状態をチェック
  React.useEffect(() => {
    if (voice.provider === 'voicevox') {
      checkVoiceVoxStatus();
    }
  }, [voice.provider]);

  const handleTestVoice = async () => {
    setIsPlaying(true);
    const text = 'こんにちは、音声テスト中です。設定が正しく反映されているかテストしています。';

    try {
      if (voice.provider === 'voicevox') {
        // VoiceVox API呼び出し
        const response = await fetch('/api/voice/voicevox', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            speakerId: voice.voicevox.speaker,
            settings: {
              speedScale: voice.voicevox.speed,
              pitchScale: voice.voicevox.pitch,
              intonationScale: voice.voicevox.intonation,
              volumeScale: voice.voicevox.volume,
            }
          }),
        });

        // Safe JSON parsing with proper error handling
        let data;
        try {
          if (!response.ok) {
            // Try to get error text even if not JSON
            const errorText = await response.text();
            throw new Error(`VoiceVox APIエラー (${response.status}): ${errorText || response.statusText}`);
          }

          // Check content type before parsing JSON
          const contentType = response.headers.get('content-type');
          if (!contentType?.includes('application/json')) {
            const errorText = await response.text();
            throw new Error(`VoiceVox APIがJSON以外のレスポンスを返しました: ${errorText}`);
          }

          data = await response.json();
        } catch (parseError) {
          console.error('VoiceVox JSON parse error:', parseError);
          if (parseError instanceof SyntaxError) {
            throw new Error('VoiceVox APIレスポンスの解析に失敗しました。サーバーエラーの可能性があります。');
          }
          throw parseError;
        }
        
        if (data && data.success && data.audioData) {
          const audio = new Audio(data.audioData);
          audio.play();
          audio.onended = () => setIsPlaying(false);
          audio.onerror = () => {
            console.error("音声の再生に失敗しました。");
            setIsPlaying(false);
          };
        } else {
          const errorMessage = data?.error || 'VoiceVox APIからエラーが返されました';
          throw new Error(errorMessage);
        }
      } else {
        // システム音声をフォールバック
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = voice.system.rate;
        utterance.pitch = voice.system.pitch;
        utterance.volume = voice.system.volume;
        speechSynthesis.speak(utterance);
        utterance.onend = () => setIsPlaying(false);
      }
    } catch (err) {
      console.error('VoiceVox音声テスト失敗、システム音声でフォールバック:', err);
      
      // VoiceVoxが失敗した場合、システム音声でフォールバック
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = voice.system?.rate || 1.0;
        utterance.pitch = voice.system?.pitch || 1.0;
        utterance.volume = voice.system?.volume || 1.0;
        speechSynthesis.speak(utterance);
        utterance.onend = () => setIsPlaying(false);
        utterance.onerror = () => setIsPlaying(false);
      } catch (systemErr) {
        console.error('システム音声も失敗しました:', systemErr);
        setIsPlaying(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-white mb-4">音声設定</h3>
      
      {/* 基本設定 */}
      <div className="space-y-4">
        <h4 className="text-lg font-medium text-white">基本設定</h4>
        
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="voice-enabled"
            checked={voice.enabled}
            onChange={(e) => updateVoiceSettings({ enabled: e.target.checked })}
            className="w-4 h-4 text-blue-500 bg-slate-700 border-gray-600 rounded focus:ring-blue-500"
          />
          <label htmlFor="voice-enabled" className="text-sm font-medium text-gray-300">
            音声機能を有効にする
          </label>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="voice-autoplay"
            checked={voice.autoPlay}
            onChange={(e) => updateVoiceSettings({ autoPlay: e.target.checked })}
            className="w-4 h-4 text-blue-500 bg-slate-700 border-gray-600 rounded focus:ring-blue-500"
          />
          <label htmlFor="voice-autoplay" className="text-sm font-medium text-gray-300">
            メッセージを自動再生
          </label>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">音声プロバイダー</label>
          <select
            value={voice.provider}
            onChange={(e) => updateVoiceSettings({ provider: e.target.value as 'voicevox' | 'elevenlabs' })}
            className="w-full px-3 py-2 bg-slate-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
          >
            <option value="voicevox">VoiceVox</option>
            <option value="elevenlabs">ElevenLabs</option>
            <option value="system">システム音声</option>
          </select>
        </div>
      </div>

      {/* VoiceVox設定 */}
      {voice.provider === 'voicevox' && (
        <div className="space-y-4 border-t border-gray-600 pt-4">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-medium text-white">VoiceVox設定</h4>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                voiceVoxStatus === 'available' ? 'bg-green-500' : 
                voiceVoxStatus === 'unavailable' ? 'bg-red-500' : 'bg-gray-500'
              }`}></div>
              <span className="text-xs text-gray-400">
                {voiceVoxStatus === 'available' ? '接続済み' : 
                 voiceVoxStatus === 'unavailable' ? '未接続' : '確認中...'}
              </span>
              <button
                onClick={checkVoiceVoxStatus}
                className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
              >
                再確認
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                話者: {voice.voicevox.speaker}
              </label>
              <input
                type="range"
                min="0"
                max="46"
                value={voice.voicevox.speaker}
                onChange={(e) => updateVoiceSettings({ 
                  voicevox: { ...voice.voicevox, speaker: parseInt(e.target.value) }
                })}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                話速: {voice.voicevox.speed.toFixed(1)}
              </label>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={voice.voicevox.speed}
                onChange={(e) => updateVoiceSettings({ 
                  voicevox: { ...voice.voicevox, speed: parseFloat(e.target.value) }
                })}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                音程: {voice.voicevox.pitch.toFixed(1)}
              </label>
              <input
                type="range"
                min="-0.15"
                max="0.15"
                step="0.01"
                value={voice.voicevox.pitch}
                onChange={(e) => updateVoiceSettings({ 
                  voicevox: { ...voice.voicevox, pitch: parseFloat(e.target.value) }
                })}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                抑揚: {voice.voicevox.intonation.toFixed(1)}
              </label>
              <input
                type="range"
                min="0"
                max="2.0"
                step="0.1"
                value={voice.voicevox.intonation}
                onChange={(e) => updateVoiceSettings({ 
                  voicevox: { ...voice.voicevox, intonation: parseFloat(e.target.value) }
                })}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* テストボタンと状態表示 */}
      <div className="border-t border-gray-600 pt-4 space-y-3">
        {voice.provider === 'voicevox' && voiceVoxStatus === 'unavailable' && (
          <div className="p-3 bg-yellow-900/30 border border-yellow-600/50 rounded-lg">
            <p className="text-sm text-yellow-200">
              ⚠️ VoiceVoxエンジンに接続できません。システム音声でテストします。
            </p>
            <p className="text-xs text-yellow-300 mt-1">
              VoiceVoxエンジンが起動していることを確認してください。
            </p>
          </div>
        )}
        
        <button
          onClick={handleTestVoice}
          disabled={isPlaying}
          className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {isPlaying ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              音声テスト中...
            </>
          ) : (
            <>
              <TestTube2 className="w-4 h-4" />
              {voice.provider === 'voicevox' && voiceVoxStatus === 'unavailable' 
                ? 'システム音声でテスト' 
                : '音声テスト'}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

// データ管理パネル
const DataManagementPanel: React.FC = () => {
  const [storageInfo, setStorageInfo] = useState<{
    totalSize: number;
    sizeInMB: number;
    itemCount: number;
    mainStorageSize: number;
  }>({ totalSize: 0, sizeInMB: 0, itemCount: 0, mainStorageSize: 0 });

  const [isCleaningUp, setIsCleaningUp] = useState(false);

  useEffect(() => {
    const updateStorageInfo = () => {
      const info = StorageManager.getStorageInfo();
      setStorageInfo(info);
    };

    updateStorageInfo();
    // 定期的に更新
    const interval = setInterval(updateStorageInfo, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleCleanup = async () => {
    if (!confirm('古いチャット履歴とメモリーカードを削除してストレージを最適化します。続行しますか？')) {
      return;
    }

    setIsCleaningUp(true);
    try {
      const success = StorageManager.cleanupOldData();
      if (success) {
        // 情報を更新
        const info = StorageManager.getStorageInfo();
        setStorageInfo(info);
        alert('ストレージのクリーンアップが完了しました。');
      } else {
        alert('クリーンアップに失敗しました。');
      }
    } catch (error) {
      console.error('Cleanup error:', error);
      alert('クリーンアップ中にエラーが発生しました。');
    } finally {
      setIsCleaningUp(false);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('⚠️ 警告: すべてのチャット履歴、設定、データが完全に削除されます。\n\nこの操作は取り消せません。続行しますか？')) {
      return;
    }

    if (!confirm('本当によろしいですか？すべてのデータが失われます。')) {
      return;
    }

    try {
      const success = StorageManager.clearAllData();
      if (success) {
        alert('すべてのデータが削除されました。ページが再読み込みされます。');
        window.location.reload();
      } else {
        alert('データの削除に失敗しました。');
      }
    } catch (error) {
      console.error('Clear all error:', error);
      alert('データ削除中にエラーが発生しました。');
    }
  };

  const isNearLimit = StorageManager.isStorageNearLimit();
  const usagePercentage = Math.min((storageInfo.sizeInMB / 5) * 100, 100); // 5MBを100%として計算

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <Database className="w-6 h-6 text-blue-400" />
        <h3 className="text-xl font-semibold text-white">ストレージ管理</h3>
      </div>

      {/* ストレージ使用量表示 */}
      <div className="bg-slate-800/50 p-4 rounded-lg border border-gray-600">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-300">ストレージ使用量</span>
          <span className={`text-sm font-mono ${isNearLimit ? 'text-yellow-400' : 'text-gray-400'}`}>
            {storageInfo.sizeInMB.toFixed(2)} MB
          </span>
        </div>
        
        <div className="w-full bg-gray-700 rounded-full h-2 mb-3">
          <div 
            className={`h-2 rounded-full transition-all ${
              usagePercentage > 80 ? 'bg-red-500' : 
              usagePercentage > 60 ? 'bg-yellow-500' : 'bg-blue-500'
            }`}
            style={{ width: `${usagePercentage}%` }}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">アプリデータ:</span>
            <span className="ml-2 text-white font-mono">
              {(storageInfo.mainStorageSize / (1024 * 1024)).toFixed(2)} MB
            </span>
          </div>
          <div>
            <span className="text-gray-400">項目数:</span>
            <span className="ml-2 text-white font-mono">{storageInfo.itemCount}</span>
          </div>
        </div>

        {isNearLimit && (
          <div className="mt-3 p-2 bg-yellow-900/30 border border-yellow-600/50 rounded text-sm text-yellow-200">
            ⚠️ ストレージ使用量が上限に近づいています。クリーンアップをお勧めします。
          </div>
        )}
      </div>

      {/* 個別削除機能 */}
      <div className="space-y-4">
        <h4 className="text-lg font-medium text-white">個別データ削除</h4>
        
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => {
              if (confirm('すべてのチャット履歴を削除しますか？')) {
                const store = useAppStore.getState();
                store.sessions.clear();
                store.active_session_id = null;
                alert('チャット履歴を削除しました');
                window.location.reload();
              }
            }}
            className="px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm transition-colors"
          >
            チャット履歴を削除
          </button>
          
          <button
            onClick={() => {
              if (confirm('すべてのメモリーカードを削除しますか？')) {
                const store = useAppStore.getState();
                if (store.memoryCards) {
                  store.memoryCards = [];
                }
                if (store.memories) {
                  store.memories = [];
                }
                alert('メモリーカードを削除しました');
                window.location.reload();
              }
            }}
            className="px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm transition-colors"
          >
            メモリーカードを削除
          </button>
        </div>
        
        <div className="w-full">
          <button
            onClick={() => {
              if (confirm('アップロードされた画像をすべて削除しますか？大幅に容量を節約できます。')) {
                let deletedCount = 0;
                let savedMB = 0;
                for (let i = localStorage.length - 1; i >= 0; i--) {
                  const key = localStorage.key(i);
                  if (key) {
                    const value = localStorage.getItem(key) || '';
                    if (key.includes('image') || key.includes('upload') || value.startsWith('data:image')) {
                      const sizeMB = new Blob([value]).size / (1024 * 1024);
                      localStorage.removeItem(key);
                      deletedCount++;
                      savedMB += sizeMB;
                    }
                  }
                }
                alert(`画像${deletedCount}個を削除し、${savedMB.toFixed(2)}MBを節約しました`);
                window.location.reload();
              }
            }}
            className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors"
          >
            🌇 アップロード画像を削除（大幅に容量削減）
          </button>
        </div>
      </div>

      {/* クリーンアップオプション */}
      <div className="space-y-4">
        <h4 className="text-lg font-medium text-white">データ管理</h4>
        
        <div className="space-y-3">
          <button
            onClick={handleCleanup}
            disabled={isCleaningUp}
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isCleaningUp ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                クリーンアップ中...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                ストレージを最適化
              </>
            )}
          </button>
          <p className="text-xs text-gray-400 text-center">
            古いチャット履歴とメモリーカードを削除してストレージ容量を確保します
          </p>
        </div>

        <div className="border-t border-gray-600 pt-4">
          <button
            onClick={handleClearAll}
            className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" />
            全データを削除
          </button>
          <p className="text-xs text-gray-400 text-center mt-2">
            ⚠️ すべてのチャット履歴、設定、データが完全に削除されます
          </p>
        </div>
      </div>

      {/* ヘルプ情報 */}
      <div className="bg-slate-900/50 p-4 rounded-lg border border-gray-700">
        <h5 className="text-sm font-medium text-white mb-2">💡 ストレージについて</h5>
        <ul className="text-xs text-gray-400 space-y-1">
          <li>• チャット履歴は最新10セッションまで自動保持</li>
          <li>• メモリーカードは最新100件まで自動保持</li>
          <li>• ストレージが満杯になると自動でクリーンアップされます</li>
          <li>• 設定とAPIキーは常に保持されます</li>
        </ul>
      </div>
    </div>
  );
};

export default SettingsModal;
