import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Character, GroupChatScenario } from '@/types';

interface ScenarioSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (scenario: GroupChatScenario) => void;
  members: Character[];
}

export const ScenarioSetupModal: React.FC<ScenarioSetupModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  members,
}) => {
  const [title, setTitle] = useState('');
  const [situation, setSituation] = useState('');
  const [characterRoles, setCharacterRoles] = useState<Record<string, string>>({});

  const handleSubmit = () => {
    const scenario: GroupChatScenario = {
      title: title.trim() === '' ? 'スキップ' : title.trim(),
      situation: situation.trim(),
      character_roles: characterRoles,
    };
    onSubmit(scenario);
  };

  const handleRoleChange = (characterId: string, role: string) => {
    setCharacterRoles(prev => ({ ...prev, [characterId]: role }));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-2xl bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-col"
          >
            <div className="p-4 border-b border-white/10 flex justify-between items-center">
              <h2 className="text-xl font-bold">シナリオ設定</h2>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="text-sm font-medium text-slate-300">シナリオ名 (任意)</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例：新しいメイド服の選定"
                  className="mt-1 bg-slate-800/50 border-slate-700"
                />
                 <p className="text-xs text-slate-500 mt-1">空欄の場合、グループ名がシナリオ名になります。</p>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-300">状況説明</label>
                <Textarea
                  value={situation}
                  onChange={(e) => setSituation(e.target.value)}
                  placeholder="ご主人様の書斎。大きなテーブルの上には、メイド服のカタログやデザイン画が広げられている。"
                  className="mt-1 bg-slate-800/50 border-slate-700 h-24"
                />
              </div>

              <div>
                <h3 className="text-md font-semibold mb-2">キャラクターの役割設定 (任意)</h3>
                <div className="space-y-3">
                  {members.map(member => (
                    <div key={member.id}>
                      <label className="text-sm font-medium text-slate-300">{member.name}</label>
                      <Input
                        value={characterRoles[member.id] || ''}
                        onChange={(e) => handleRoleChange(member.id, e.target.value)}
                        placeholder={`${member.name}の役割や立場を簡潔に設定`}
                        className="mt-1 bg-slate-800/50 border-slate-700"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-white/10 flex justify-end gap-2">
              <Button variant="ghost" onClick={handleSubmit}>
                スキップして開始
              </Button>
              <Button onClick={handleSubmit}>
                この内容で開始
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

