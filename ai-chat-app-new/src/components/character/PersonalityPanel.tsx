'use client';

import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Character } from '@/types/core/character.types';
import { Persona } from '@/types/core/persona.types';
import { useArrayField } from '@/hooks/useArrayField';
import { ArrayFieldEditor } from '@/components/common/ArrayFieldEditor';

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
  // 配列フィールド管理フックを使用
  const { items: verbalTics, addItem: addVerbalTic, removeItem: removeVerbalTic } = useArrayField(formData as Character, setFormData as React.Dispatch<React.SetStateAction<Character | null>>, 'verbal_tics');
  const { items: strengths, addItem: addStrength, removeItem: removeStrength } = useArrayField(formData as Character, setFormData as React.Dispatch<React.SetStateAction<Character | null>>, 'strengths');
  const { items: weaknesses, addItem: addWeakness, removeItem: removeWeakness } = useArrayField(formData as Character, setFormData as React.Dispatch<React.SetStateAction<Character | null>>, 'weaknesses');
  const { items: hobbies, addItem: addHobby, removeItem: removeHobby } = useArrayField(formData as Character, setFormData as React.Dispatch<React.SetStateAction<Character | null>>, 'hobbies');
  const { items: likes, addItem: addLike, removeItem: removeLike } = useArrayField(formData as Character, setFormData as React.Dispatch<React.SetStateAction<Character | null>>, 'likes');
  const { items: dislikes, addItem: addDislike, removeItem: removeDislike } = useArrayField(formData as Character, setFormData as React.Dispatch<React.SetStateAction<Character | null>>, 'dislikes');

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

      {mode === 'character' && (
        <>
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

              <ArrayFieldEditor
                items={verbalTics}
                onAdd={addVerbalTic}
                onRemove={removeVerbalTic}
                label="口癖"
                placeholder="口癖を入力してEnter（例：だよね、なのです、〜だぜ）"
                maxItems={10}
                colorScheme="teal"
              />
            </div>
          </div>

          {/* 長所・短所 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-emerald-900/20 to-green-900/20 p-5 rounded-xl border border-emerald-700/30">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-emerald-400 text-lg">✨</span>
                <h4 className="text-lg font-semibold text-white">長所</h4>
              </div>
              <ArrayFieldEditor
                items={strengths}
                onAdd={addStrength}
                onRemove={removeStrength}
                placeholder="長所を入力してEnter（例：優しい、責任感が強い）"
                maxItems={10}
                colorScheme="emerald"
              />
            </div>

            <div className="bg-gradient-to-br from-rose-900/20 to-red-900/20 p-5 rounded-xl border border-rose-700/30">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-rose-400 text-lg">💥</span>
                <h4 className="text-lg font-semibold text-white">弱点</h4>
              </div>
              <ArrayFieldEditor
                items={weaknesses}
                onAdd={addWeakness}
                onRemove={removeWeakness}
                placeholder="弱点を入力してEnter（例：優柔不断、高所恐怖症）"
                maxItems={10}
                colorScheme="rose"
              />
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
              <ArrayFieldEditor
                items={hobbies}
                onAdd={addHobby}
                onRemove={removeHobby}
                label="趣味"
                placeholder="趣味を入力してEnter（例：読書、料理、ゲーム）"
                maxItems={10}
                colorScheme="indigo"
              />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ArrayFieldEditor
                  items={likes}
                  onAdd={addLike}
                  onRemove={removeLike}
                  label="好きなもの"
                  placeholder="好きなものを入力してEnter"
                  maxItems={10}
                  colorScheme="green"
                />

                <ArrayFieldEditor
                  items={dislikes}
                  onAdd={addDislike}
                  onRemove={removeDislike}
                  label="嫌いなもの"
                  placeholder="嫌いなものを入力してEnter"
                  maxItems={10}
                  colorScheme="red"
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};