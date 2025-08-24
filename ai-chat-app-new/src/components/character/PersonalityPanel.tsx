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
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">一人称</label>
              <input
                type="text"
                placeholder="私、僕、俺、わたくし など"
                value={isCharacter(formData) ? formData.first_person || '' : ''}
                onChange={e => setFormData(prev => isCharacter(prev) ? {...prev, first_person: e.target.value} : prev)}
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-lg focus:border-teal-400 focus:outline-none text-white"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">二人称</label>
              <input
                type="text"
                placeholder="あなた、君、お前、貴方 など"
                value={isCharacter(formData) ? formData.second_person || '' : ''}
                onChange={e => setFormData(prev => isCharacter(prev) ? {...prev, second_person: e.target.value} : prev)}
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-lg focus:border-teal-400 focus:outline-none text-white"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">全体的な話し方</label>
            <Textarea
              placeholder="例: 丁寧語を使い、語尾に「です」「ます」をつける。時々関西弁が混じる..."
              value={isCharacter(formData) ? formData.speaking_style || '' : ''}
              onChange={e => setFormData(prev => isCharacter(prev) ? {...prev, speaking_style: e.target.value} : prev)}
              rows={3}
              className="bg-slate-800/50 border-slate-600 focus:border-teal-400 resize-none"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">口癖</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {isCharacter(formData) && formData.verbal_tics && formData.verbal_tics.map((tic: string, index: number) => (
                <span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-teal-500/20 text-teal-300 rounded-full text-sm">
                  {tic}
                  <button
                    onClick={() => {
                      const newTics = formData.verbal_tics?.filter((_, i) => i !== index) || [];
                      setFormData(prev => isCharacter(prev) ? {...prev, verbal_tics: newTics} : prev);
                    }}
                    className="ml-1 hover:text-red-300"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="口癖を入力（例：だよね、なのです、〜だぜ）"
                className="flex-1 px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-lg focus:border-teal-400 focus:outline-none text-white"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    const currentTics = isCharacter(formData) ? formData.verbal_tics || [] : [];
                    setFormData(prev => isCharacter(prev) ? {...prev, verbal_tics: [...currentTics, e.currentTarget.value.trim()]} : prev);
                    e.currentTarget.value = '';
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 長所・短所 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-emerald-900/20 to-green-900/20 p-5 rounded-xl border border-emerald-700/30">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-emerald-400 text-lg">✨</span>
            <h4 className="text-lg font-semibold text-white">長所</h4>
          </div>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 mb-2">
              {isCharacter(formData) && formData.strengths && formData.strengths.map((strength: string, index: number) => (
                <span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-sm">
                  {strength}
                  <button
                    onClick={() => {
                      const newStrengths = formData.strengths?.filter((_, i) => i !== index) || [];
                      setFormData(prev => isCharacter(prev) ? {...prev, strengths: newStrengths} : prev);
                    }}
                    className="ml-1 hover:text-red-300"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              placeholder="長所を入力してEnter（例：優しい、責任感が強い）"
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-lg focus:border-emerald-400 focus:outline-none text-white"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                  const currentStrengths = isCharacter(formData) ? formData.strengths || [] : [];
                  setFormData(prev => isCharacter(prev) ? {...prev, strengths: [...currentStrengths, e.currentTarget.value.trim()]} : prev);
                  e.currentTarget.value = '';
                }
              }}
            />
          </div>
        </div>

        <div className="bg-gradient-to-br from-rose-900/20 to-red-900/20 p-5 rounded-xl border border-rose-700/30">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-rose-400 text-lg">💥</span>
            <h4 className="text-lg font-semibold text-white">弱点</h4>
          </div>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 mb-2">
              {isCharacter(formData) && formData.weaknesses && formData.weaknesses.map((weakness: string, index: number) => (
                <span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-rose-500/20 text-rose-300 rounded-full text-sm">
                  {weakness}
                  <button
                    onClick={() => {
                      const newWeaknesses = formData.weaknesses?.filter((_, i) => i !== index) || [];
                      setFormData(prev => isCharacter(prev) ? {...prev, weaknesses: newWeaknesses} : prev);
                    }}
                    className="ml-1 hover:text-red-300"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              placeholder="弱点を入力してEnter（例：優柔不断、高所恐怖症）"
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-lg focus:border-rose-400 focus:outline-none text-white"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                  const currentWeaknesses = isCharacter(formData) ? formData.weaknesses || [] : [];
                  setFormData(prev => isCharacter(prev) ? {...prev, weaknesses: [...currentWeaknesses, e.currentTarget.value.trim()]} : prev);
                  e.currentTarget.value = '';
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* 趣味・好み */}
      <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 p-6 rounded-xl border border-indigo-700/30">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center">
            <span className="text-indigo-400 text-lg">💝</span>
          </div>
          <h4 className="text-lg font-semibold text-white">趣味・好み</h4>
        </div>
        
        <div className="space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-300">趣味</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {isCharacter(formData) && formData.hobbies && formData.hobbies.map((hobby: string, index: number) => (
                <span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-sm">
                  {hobby}
                  <button
                    onClick={() => {
                      const newHobbies = formData.hobbies?.filter((_, i) => i !== index) || [];
                      setFormData(prev => isCharacter(prev) ? {...prev, hobbies: newHobbies} : prev);
                    }}
                    className="ml-1 hover:text-red-300"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              placeholder="趣味を入力してEnter（例：読書、料理、ゲーム）"
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-lg focus:border-indigo-400 focus:outline-none text-white"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                  const currentHobbies = isCharacter(formData) ? formData.hobbies || [] : [];
                  setFormData(prev => isCharacter(prev) ? {...prev, hobbies: [...currentHobbies, e.currentTarget.value.trim()]} : prev);
                  e.currentTarget.value = '';
                }
              }}
            />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-300">好きなもの</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {isCharacter(formData) && formData.likes && formData.likes.map((like: string, index: number) => (
                  <span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm">
                    {like}
                    <button
                      onClick={() => {
                        const newLikes = formData.likes?.filter((_, i) => i !== index) || [];
                        setFormData(prev => isCharacter(prev) ? {...prev, likes: newLikes} : prev);
                      }}
                      className="ml-1 hover:text-red-300"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                placeholder="好きなものを入力してEnter"
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-lg focus:border-green-400 focus:outline-none text-white"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    const currentLikes = isCharacter(formData) ? formData.likes || [] : [];
                    setFormData(prev => isCharacter(prev) ? {...prev, likes: [...currentLikes, e.currentTarget.value.trim()]} : prev);
                    e.currentTarget.value = '';
                  }
                }}
              />
            </div>
            
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-300">嫌いなもの</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {isCharacter(formData) && formData.dislikes && formData.dislikes.map((dislike: string, index: number) => (
                  <span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-red-500/20 text-red-300 rounded-full text-sm">
                    {dislike}
                    <button
                      onClick={() => {
                        const newDislikes = formData.dislikes?.filter((_, i) => i !== index) || [];
                        setFormData(prev => isCharacter(prev) ? {...prev, dislikes: newDislikes} : prev);
                      }}
                      className="ml-1 hover:text-red-300"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                placeholder="嫌いなものを入力してEnter"
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-lg focus:border-red-400 focus:outline-none text-white"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    const currentDislikes = isCharacter(formData) ? formData.dislikes || [] : [];
                    setFormData(prev => isCharacter(prev) ? {...prev, dislikes: [...currentDislikes, e.currentTarget.value.trim()]} : prev);
                    e.currentTarget.value = '';
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};