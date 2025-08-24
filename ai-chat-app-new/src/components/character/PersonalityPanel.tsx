'use client';

import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Character, Persona } from '@/types';

// Type guard functions
const isCharacter = (data: Character | Persona | null): data is Character => {
  return data !== null && 'speaking_style' in data;
};

interface PersonalityPanelProps {
  formData: Character | Persona | null;
  setFormData: React.Dispatch<React.SetStateAction<Character | Persona | null>>;
  mode: 'character' | 'persona';
}

export const PersonalityPanel: React.FC<PersonalityPanelProps> = ({
  formData,
  setFormData,
  mode,
}) => {
  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-br from-violet-900/20 to-purple-900/20 p-6 rounded-xl border border-violet-700/30">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-violet-500/20 rounded-lg flex items-center justify-center">
            <span className="text-violet-400 text-lg">🧠</span>
          </div>
          <h3 className="text-xl font-bold text-white">性格の詳細</h3>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-300">性格（全体的な説明）</label>
          <Textarea
            placeholder="キャラクターの基本的な性格、価値観、行動パターンなどを詳しく記述..."
            value={mode === 'character' && formData ? (formData as Character).personality || '' : ''}
            onChange={e => setFormData(prev => prev ? {...prev, personality: e.target.value} : null)}
            rows={6}
            className="bg-slate-800/50 border-slate-600 focus:border-violet-400 resize-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-sky-900/20 to-blue-900/20 p-5 rounded-xl border border-sky-700/30">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sky-400 text-lg">😊</span>
            <h4 className="text-lg font-semibold text-white">表面的な性格</h4>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-slate-400">他人から見える性格や振る舞い</p>
            <Textarea
              placeholder="例: 明るく元気で、いつも笑顔を絶やさない。友達思いで誠実..."
              value={(formData && 'external_personality' in formData) ? formData.external_personality || '' : ''}
              onChange={e => setFormData(prev => prev && 'external_personality' in prev ? {...prev, external_personality: e.target.value} : prev)}
              rows={4}
              className="bg-slate-800/50 border-slate-600 focus:border-sky-400 resize-none"
            />
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-900/20 to-orange-900/20 p-5 rounded-xl border border-amber-700/30">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-amber-400 text-lg">🕰️</span>
            <h4 className="text-lg font-semibold text-white">内面的な性格</h4>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-slate-400">心の中での本当の想いや感情</p>
            <Textarea
              placeholder="例: 実は寂しがり屋で、人に嫌われることを恐れている..."
              value={isCharacter(formData) ? formData.internal_personality || '' : ''}
              onChange={e => setFormData(prev => isCharacter(prev) ? {...prev, internal_personality: e.target.value} : prev)}
              rows={4}
              className="bg-slate-800/50 border-slate-600 focus:border-amber-400 resize-none"
            />
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-teal-900/20 to-cyan-900/20 p-6 rounded-xl border border-teal-700/30">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-teal-500/20 rounded-lg flex items-center justify-center">
            <span className="text-teal-400 text-lg">💬</span>
          </div>
          <h4 className="text-lg font-semibold text-white">話し方・口調</h4>
        </div>
        <div className="space-y-2">
          <p className="text-sm text-slate-400">一人称、二人称、語尾、特徴的な表現など</p>
          <Textarea
            placeholder="例: 一人称は「私」。二人称は「あなた」。語尾に「です」「ます」を使う丁寧語..."
            value={isCharacter(formData) ? formData.speaking_style || '' : ''}
            onChange={e => setFormData(prev => isCharacter(prev) ? {...prev, speaking_style: e.target.value} : prev)}
            rows={4}
            className="bg-slate-800/50 border-slate-600 focus:border-teal-400 resize-none"
          />
        </div>
      </div>
    </div>
  );
};