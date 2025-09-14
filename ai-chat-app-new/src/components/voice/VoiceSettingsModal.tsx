'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TestTube2 } from 'lucide-react';
import { useAppStore } from '@/store';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { AvatarUploadWidget } from '@/components/ui/AvatarUploadWidget';
import { MediaOrchestrator } from '@/services/media';

// ... (Assuming detailed VoiceSettings type is in the store)

const SettingRow: React.FC<{ label: string; description?: string; children: React.ReactNode }> = ({ label, description, children }) => (
    <div>
        <label className="block text-sm font-medium text-white/80">{label}</label>
        {description && <p className="text-xs text-white/50 mb-2">{description}</p>}
        {children}
    </div>
);

const Slider: React.FC<{ value: number; onChange: (value: number) => void; min: number; max: number; step: number; }> = ({ value, onChange, ...props }) => (
    <input
        type="range"
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
        {...props}
    />
);

const Toggle: React.FC<{ checked: boolean; onChange: (checked: boolean) => void; }> = ({ checked, onChange }) => (
    <button
        onClick={() => onChange(!checked)}
        className={`relative w-12 h-6 rounded-full transition-colors ${checked ? 'bg-purple-600' : 'bg-slate-600'}`}
    >
        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${checked ? 'translate-x-7' : 'translate-x-1'}`} />
    </button>
);

export const VoiceSettingsModal: React.FC = () => {
  const {
    showVoiceSettingsModal,
    setShowVoiceSettingsModal,
    voice,
    updateVoiceSettings,
    getSelectedPersona,
    updatePersona
  } = useAppStore();

  const persona = getSelectedPersona();

  const [isPlaying, setIsPlaying] = useState(false);
  const orchestratorRef = useRef<MediaOrchestrator | null>(null);

  // MediaOrchestratorのインスタンスを取得
  useEffect(() => {
    orchestratorRef.current = MediaOrchestrator.getInstance();
    orchestratorRef.current.initialize().catch(console.error);
  }, []);

  const handleTestVoice = async () => {
    if (!orchestratorRef.current) {
      console.error('MediaOrchestrator not initialized');
      alert('音声システムが初期化されていません');
      return;
    }

    setIsPlaying(true);
    const text = 'こんにちは、音声テスト中です。';

    try {
      console.log('🔊 音声テスト開始:', {
        provider: voice.provider,
        text
      });

      // MediaOrchestratorを使用して音声再生
      const voiceType = voice.provider === 'voicevox' ? 'voicevox' as const : 'browser' as const;

      const options = {
        voiceType,
        speakerId: voice.voicevox?.speaker || 1,
        speed: voice.voicevox?.speed || 1.0,
        pitch: voice.voicevox?.pitch || 1.0,
        volume: voice.voicevox?.volume || 1.0,
        lang: 'ja-JP',
      };

      await orchestratorRef.current.playAudio(text, undefined, options);

      console.log('✅ 音声テスト完了');
      setIsPlaying(false);
    } catch (err: unknown) {
      console.error('音声テスト中にエラーが発生しました:', err);

      let errorMessage = '音声合成に失敗しました';
      if (err instanceof Error) {
        if (err.message.includes('VOICEVOX')) {
          errorMessage = 'VOICEVOXエンジンに接続できません。エンジンが起動していることを確認してください。';
        } else {
          errorMessage = err.message;
        }
      }

      alert(errorMessage);
      setIsPlaying(false);
    }
  };

  if (!showVoiceSettingsModal) return null;

  return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                onClick={() => setShowVoiceSettingsModal(false)}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl border border-white/10"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-white">音声設定</h2>
                        <button onClick={() => setShowVoiceSettingsModal(false)} className="text-white/50 hover:text-white transition-colors">
                            <X size={24} />
                        </button>
                    </div>

                    <Tabs defaultValue="general" className="w-full">
                        <TabsList className="grid w-full grid-cols-3 bg-slate-800/50 rounded-lg p-1">
                            <TabsTrigger value="general" className="data-[state=active]:bg-purple-600 text-white">一般</TabsTrigger>
                            <TabsTrigger value="voicevox" className="data-[state=active]:bg-purple-600 text-white">VOICEVOX</TabsTrigger>
                            <TabsTrigger value="persona" className="data-[state=active]:bg-purple-600 text-white">ペルソナ音声</TabsTrigger>
                        </TabsList>

                        <TabsContent value="general" className="space-y-4 mt-4">
                            <SettingRow label="音声プロバイダー" description="使用する音声合成エンジンを選択">
                                <select
                                    value={voice.provider}
                                    onChange={e => updateVoiceSettings({ provider: e.target.value as any })}
                                    className="w-full p-2 bg-slate-700 text-white rounded-md"
                                >
                                    <option value="system">システム音声</option>
                                    <option value="voicevox">VOICEVOX</option>
                                    <option value="elevenlabs">ElevenLabs</option>
                                </select>
                            </SettingRow>

                            <SettingRow label="自動再生" description="新しいメッセージを自動的に読み上げ">
                                <Toggle checked={voice.autoPlay} onChange={checked => updateVoiceSettings({ autoPlay: checked })} />
                            </SettingRow>

                            <button
                                onClick={handleTestVoice}
                                disabled={isPlaying}
                                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors disabled:opacity-50"
                            >
                                <TestTube2 size={16} />
                                {isPlaying ? '再生中...' : '音声テスト'}
                            </button>
                        </TabsContent>

                        <TabsContent value="voicevox" className="space-y-4 mt-4">
                            <SettingRow label="スピーカーID" description="VOICEVOX話者を選択 (0-50)">
                                <Input
                                    type="number"
                                    value={voice.voicevox.speaker}
                                    onChange={e => updateVoiceSettings({ voicevox: { ...voice.voicevox, speaker: parseInt(e.target.value) } })}
                                    min={0}
                                    max={50}
                                    className="bg-slate-700 text-white"
                                />
                            </SettingRow>

                            <SettingRow label="速度" description={`現在: ${voice.voicevox.speed.toFixed(2)}`}>
                                <Slider
                                    value={voice.voicevox.speed}
                                    onChange={value => updateVoiceSettings({ voicevox: { ...voice.voicevox, speed: value } })}
                                    min={0.5}
                                    max={2.0}
                                    step={0.1}
                                />
                            </SettingRow>

                            <SettingRow label="ピッチ" description={`現在: ${voice.voicevox.pitch.toFixed(2)}`}>
                                <Slider
                                    value={voice.voicevox.pitch}
                                    onChange={value => updateVoiceSettings({ voicevox: { ...voice.voicevox, pitch: value } })}
                                    min={-0.15}
                                    max={0.15}
                                    step={0.01}
                                />
                            </SettingRow>

                            <SettingRow label="イントネーション" description={`現在: ${voice.voicevox.intonation.toFixed(2)}`}>
                                <Slider
                                    value={voice.voicevox.intonation}
                                    onChange={value => updateVoiceSettings({ voicevox: { ...voice.voicevox, intonation: value } })}
                                    min={0.0}
                                    max={2.0}
                                    step={0.1}
                                />
                            </SettingRow>

                            <SettingRow label="音量" description={`現在: ${voice.voicevox.volume.toFixed(2)}`}>
                                <Slider
                                    value={voice.voicevox.volume}
                                    onChange={value => updateVoiceSettings({ voicevox: { ...voice.voicevox, volume: value } })}
                                    min={0.0}
                                    max={1.0}
                                    step={0.1}
                                />
                            </SettingRow>
                        </TabsContent>

                        <TabsContent value="persona" className="space-y-4 mt-4">
                            {persona && (
                                <>
                                    <SettingRow label="ペルソナ名">
                                        <p className="text-white/80">{persona.name}</p>
                                    </SettingRow>

                                    <SettingRow label="音声キャラクター">
                                        <Input
                                            value={persona.voice_character || ''}
                                            onChange={e => updatePersona(persona.id, { voice_character: e.target.value })}
                                            placeholder="例: ずんだもん"
                                            className="bg-slate-700 text-white"
                                        />
                                    </SettingRow>

                                    <SettingRow label="音声スタイル">
                                        <Input
                                            value={persona.voice_style || ''}
                                            onChange={e => updatePersona(persona.id, { voice_style: e.target.value })}
                                            placeholder="例: 優しい、元気、落ち着いた"
                                            className="bg-slate-700 text-white"
                                        />
                                    </SettingRow>

                                    <SettingRow label="アバター画像">
                                        <AvatarUploadWidget
                                            currentAvatar={persona.avatar_url || '/cat.png'}
                                            onAvatarChange={(avatarData) => updatePersona(persona.id, { avatar_url: avatarData })}
                                        />
                                    </SettingRow>
                                </>
                            )}
                        </TabsContent>
                    </Tabs>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};