'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TestTube2 } from 'lucide-react';
import { useAppStore } from '@/store';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';

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
    updateVoiceSettings 
  } = useAppStore();

  const [isPlaying, setIsPlaying] = useState(false);
  
  const handleTestVoice = async () => {
    setIsPlaying(true);
    const text = 'こんにちは、音声テスト中です。';

    try {
      if (voice.provider === 'System') {
        // --- System Speech Synthesis ---
        const utterance = new SpeechSynthesisUtterance(text);
        // TODO: Map system voices and settings
        speechSynthesis.speak(utterance);
        utterance.onend = () => setIsPlaying(false);

      } else {
        // --- API-based Speech Synthesis ---
        const apiEndpoint = voice.provider === 'VoiceVox' ? '/api/voice/voicevox' : '/api/voice/elevenlabs';
        
        let requestBody;
        if (voice.provider === 'VoiceVox') {
            requestBody = {
                text,
                speakerId: voice.voicevox.speakerId,
                settings: voice.voicevox,
            };
        } else { // ElevenLabs
            requestBody = {
                text,
                voiceId: voice.elevenlabs.voiceId,
                settings: voice.elevenlabs,
            };
        }

        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        const data = await response.json();

        if (data.success && data.audioData) {
          console.log('音声合成成功。再生を開始します。');
          const audio = new Audio(data.audioData);
          audio.play();
          audio.onended = () => setIsPlaying(false);
          audio.onerror = () => {
            console.error("音声の再生に失敗しました。");
            setIsPlaying(false);
          }
        } else {
          console.error('音声合成リクエスト失敗:', data.error || 'APIから音声データが返されませんでした。');
          setIsPlaying(false);
        }
      }
    } catch (err: unknown) {
      console.error('音声テスト中にエラーが発生しました:', err);
      setIsPlaying(false);
    }
  };

  if (!showVoiceSettingsModal) return null;

  return (
    <AnimatePresence>
      {showVoiceSettingsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-2xl max-h-[80vh] flex flex-col bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl"
          >
            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <TestTube2 className="w-6 h-6" />
                音声設定
              </h2>
              <button
                onClick={() => setShowVoiceSettingsModal(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              <Tabs defaultValue="basic" className="p-4">
                <TabsList className="grid w-full grid-cols-4 mb-4">
                  <TabsTrigger value="basic">基本設定</TabsTrigger>
                  <TabsTrigger value="voicevox">VoiceVox</TabsTrigger>
                  <TabsTrigger value="elevenlabs">ElevenLabs</TabsTrigger>
                  <TabsTrigger value="system">システム音声</TabsTrigger>
                  <TabsTrigger value="advanced">高度な設定</TabsTrigger>
                </TabsList>
                
                <TabsContent value="basic">
                    <div className="space-y-4">
                        <SettingRow label="音声エンジン">
                            <select
                                value={voice.provider}
                                onChange={(e) => updateVoiceSettings({ provider: e.target.value as 'VoiceVox' | 'ElevenLabs' | 'System' })}
                                className="w-full bg-slate-700 border border-white/10 rounded-lg px-3 py-2 text-white"
                            >
                                <option value="VoiceVox">VoiceVox</option>
                                <option value="ElevenLabs">ElevenLabs</option>
                                <option value="System">システム音声</option>
                            </select>
                        </SettingRow>
                        <div className="flex items-center justify-between">
                            <SettingRow label="自動再生" description="AIからの応答を自動で再生します" />
                            <Toggle checked={voice.autoPlay} onChange={checked => updateVoiceSettings({ autoPlay: checked })} />
                        </div>
                    </div>
                </TabsContent>
                <TabsContent value="voicevox">
                    <div className="space-y-4">
                        <SettingRow label={`話者ID: ${voice.voicevox.speakerId}`}>
                            <Slider value={voice.voicevox.speakerId} onChange={v => updateVoiceSettings({ voicevox: { ...voice.voicevox, speakerId: v }})} min={0} max={50} step={1} />
                        </SettingRow>
                        <SettingRow label={`速度: ${voice.voicevox.speed}`}>
                            <Slider value={voice.voicevox.speed} onChange={v => updateVoiceSettings({ voicevox: { ...voice.voicevox, speed: v }})} min={0.5} max={2.0} step={0.1} />
                        </SettingRow>
                        <SettingRow label={`ピッチ: ${voice.voicevox.pitch}`}>
                            <Slider value={voice.voicevox.pitch} onChange={v => updateVoiceSettings({ voicevox: { ...voice.voicevox, pitch: v }})} min={-0.15} max={0.15} step={0.01} />
                        </SettingRow>
                        <SettingRow label={`抑揚: ${voice.voicevox.intonation}`}>
                            <Slider value={voice.voicevox.intonation} onChange={v => updateVoiceSettings({ voicevox: { ...voice.voicevox, intonation: v }})} min={0} max={2} step={0.1} />
                        </SettingRow>
                        <SettingRow label={`音量: ${voice.voicevox.volume}`}>
                            <Slider value={voice.voicevox.volume} onChange={v => updateVoiceSettings({ voicevox: { ...voice.voicevox, volume: v }})} min={0} max={2} step={0.1} />
                        </SettingRow>
                        <div className="flex items-center justify-between">
                            <SettingRow label="疑問文の自動調整" description="疑問文の語尾を自動的に上げて自然にします" />
                            <Toggle checked={voice.voicevox.enableInterrogativeUpspeak} onChange={c => updateVoiceSettings({ voicevox: { ...voice.voicevox, enableInterrogativeUpspeak: c }})} />
                        </div>
                    </div>
                </TabsContent>
                <TabsContent value="elevenlabs">
                    <div className="space-y-4">
                        <SettingRow label="Voice ID" description="ElevenLabsのボイスIDを入力します">
                            <Input value={voice.elevenlabs.voiceId} onChange={e => updateVoiceSettings({ elevenlabs: { ...voice.elevenlabs, voiceId: e.target.value }})} />
                        </SettingRow>
                        <SettingRow label={`安定性: ${voice.elevenlabs.stability}`}>
                            <Slider value={voice.elevenlabs.stability} onChange={v => updateVoiceSettings({ elevenlabs: { ...voice.elevenlabs, stability: v }})} min={0} max={1} step={0.05} />
                        </SettingRow>
                        <SettingRow label={`類似度ブースト: ${voice.elevenlabs.similarityBoost}`}>
                            <Slider value={voice.elevenlabs.similarityBoost} onChange={v => updateVoiceSettings({ elevenlabs: { ...voice.elevenlabs, similarityBoost: v }})} min={0} max={1} step={0.05} />
                        </SettingRow>
                        <SettingRow label={`スタイル: ${voice.elevenlabs.style}`}>
                            <Slider value={voice.elevenlabs.style} onChange={v => updateVoiceSettings({ elevenlabs: { ...voice.elevenlabs, style: v }})} min={0} max={1} step={0.05} />
                        </SettingRow>
                        <div className="flex items-center justify-between">
                            <SettingRow label="スピーカーブースト" description="音声の明瞭度を向上させます" />
                            <Toggle checked={voice.elevenlabs.useSpeakerBoost} onChange={c => updateVoiceSettings({ elevenlabs: { ...voice.elevenlabs, useSpeakerBoost: c }})} />
                        </div>
                    </div>
                </TabsContent>
                <TabsContent value="system">
                    <div className="space-y-4">
                        <SettingRow label="システム音声" description="OSにインストールされている音声を使用します">
                            <select
                                value={voice.system.voice}
                                onChange={(e) => updateVoiceSettings({ system: { ...voice.system, voice: e.target.value }})}
                                className="w-full bg-slate-700 border border-white/10 rounded-lg px-3 py-2 text-white"
                            >
                                {/* TODO: Populate with system voices */}
                                <option value="">利用可能な音声が見つかりません</option>
                            </select>
                        </SettingRow>
                        <SettingRow label={`速度: ${voice.system.rate}`}>
                            <Slider value={voice.system.rate} onChange={v => updateVoiceSettings({ system: { ...voice.system, rate: v }})} min={0.5} max={2.0} step={0.1} />
                        </SettingRow>
                        <SettingRow label={`ピッチ: ${voice.system.pitch}`}>
                            <Slider value={voice.system.pitch} onChange={v => updateVoiceSettings({ system: { ...voice.system, pitch: v }})} min={0} max={2} step={0.1} />
                        </SettingRow>
                        <SettingRow label={`音量: ${voice.system.volume}`}>
                            <Slider value={voice.system.volume} onChange={v => updateVoiceSettings({ system: { ...voice.system, volume: v }})} min={0} max={1} step={0.1} />
                        </SettingRow>
                    </div>
                </TabsContent>
                <TabsContent value="advanced">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <SettingRow label="ノーマライゼーション" description="音声の音量を均一化します" />
                            <Toggle checked={voice.advanced.normalization} onChange={c => updateVoiceSettings({ advanced: { ...voice.advanced, normalization: c }})} />
                        </div>
                        <div className="flex items-center justify-between">
                            <SettingRow label="ノイズリダクション" description="背景ノイズを低減します" />
                            <Toggle checked={voice.advanced.noiseReduction} onChange={c => updateVoiceSettings({ advanced: { ...voice.advanced, noiseReduction: c }})} />
                        </div>
                    </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 p-4 border-t border-white/10 flex justify-between items-center">
              <span className="text-xs text-white/50">変更は自動的に保存されます</span>
              <button
                onClick={handleTestVoice}
                disabled={isPlaying}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition-colors disabled:opacity-50"
              >
                {isPlaying ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                    再生中...
                  </>
                ) : (
                  <>
                    <TestTube2 className="w-4 h-4" />
                    音声テスト
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};