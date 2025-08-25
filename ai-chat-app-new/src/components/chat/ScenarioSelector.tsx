'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Wand2, FileText, Sparkles, ChevronRight, Loader2 } from 'lucide-react';
import { GroupChatScenario, ScenarioTemplate } from '@/types/core/group-chat.types';
import { Character } from '@/types/core/character.types';
import { Persona } from '@/types/core/persona.types';
import { scenarioGenerator } from '@/services/scenario-generator';
import { cn } from '@/lib/utils';

interface ScenarioSelectorProps {
  characters: Character[];
  persona: Persona;
  onScenarioSelect: (scenario: GroupChatScenario) => void;
  onSkip: () => void;
}

export const ScenarioSelector: React.FC<ScenarioSelectorProps> = ({
  characters,
  persona,
  onScenarioSelect,
  onSkip
}) => {
  const [scenarioMode, setScenarioMode] = useState<'template' | 'custom' | 'ai_generate'>('template');
  const [customRequest, setCustomRequest] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [recommendedTemplates] = useState(() => 
    scenarioGenerator.getRecommendedTemplates(characters)
  );

  const handleTemplateSelect = (template: ScenarioTemplate) => {
    const generatedScenario = scenarioGenerator.generateFromTemplate(template, characters);
    
    const scenario: GroupChatScenario = {
      id: `scenario-${Date.now()}`,
      ...generatedScenario,
      scenario_type: 'template',
      template_id: template.id
    };
    
    onScenarioSelect(scenario);
  };

  const handleCustomScenario = () => {
    if (!customRequest.trim()) return;
    
    const characterNames = characters.map(c => c.name).join('、');
    const characterRoles: Record<string, string> = {};
    
    characters.forEach(char => {
      characterRoles[char.id] = '自分らしく振る舞い、シナリオに沿って行動する';
    });

    const scenario: GroupChatScenario = {
      id: `scenario-${Date.now()}`,
      title: `カスタムシナリオ - ${characterNames}`,
      setting: 'ユーザー指定のシナリオ',
      situation: customRequest,
      initial_prompt: `${customRequest}というシナリオで、${characterNames}が物語を展開します。`,
      character_roles: characterRoles,
      objectives: ['シナリオに沿った展開', 'キャラクターらしい行動'],
      background_context: customRequest,
      scenario_type: 'custom'
    };
    
    onScenarioSelect(scenario);
  };

  const handleAIGenerate = async () => {
    setIsGenerating(true);
    try {
      const generatedScenario = await scenarioGenerator.generateCustomScenario(
        characters,
        persona,
        customRequest || undefined
      );
      
      const scenario: GroupChatScenario = {
        id: `scenario-${Date.now()}`,
        ...generatedScenario,
        scenario_type: 'ai_generated'
      };
      
      onScenarioSelect(scenario);
    } catch (error) {
      console.error('Failed to generate AI scenario:', error);
      alert('シナリオの生成に失敗しました。もう一度お試しください。');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-bold text-white mb-2">シナリオを選択</h3>
        <p className="text-white/60">
          {characters.map(c => c.name).join('、')}のグループチャット用シナリオ
        </p>
      </div>

      {/* シナリオタイプ選択 */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => setScenarioMode('template')}
          className={cn(
            "p-3 rounded-lg border-2 transition-all",
            scenarioMode === 'template'
              ? "border-purple-500 bg-purple-500/20"
              : "border-purple-400/30 hover:border-purple-400/50"
          )}
        >
          <FileText className="w-6 h-6 mx-auto mb-2 text-purple-400" />
          <div className="text-sm text-white">テンプレート</div>
        </button>
        
        <button
          onClick={() => setScenarioMode('custom')}
          className={cn(
            "p-3 rounded-lg border-2 transition-all",
            scenarioMode === 'custom'
              ? "border-purple-500 bg-purple-500/20"
              : "border-purple-400/30 hover:border-purple-400/50"
          )}
        >
          <Wand2 className="w-6 h-6 mx-auto mb-2 text-blue-400" />
          <div className="text-sm text-white">自作</div>
        </button>
        
        <button
          onClick={() => setScenarioMode('ai_generate')}
          className={cn(
            "p-3 rounded-lg border-2 transition-all",
            scenarioMode === 'ai_generate'
              ? "border-purple-500 bg-purple-500/20"
              : "border-purple-400/30 hover:border-purple-400/50"
          )}
        >
          <Sparkles className="w-6 h-6 mx-auto mb-2 text-green-400" />
          <div className="text-sm text-white">AI生成</div>
        </button>
      </div>

      {/* コンテンツエリア */}
      <div className="min-h-[300px]">
        {scenarioMode === 'template' && (
          <div className="space-y-3">
            <h4 className="text-lg font-medium text-white mb-4">おすすめテンプレート</h4>
            {recommendedTemplates.length > 0 ? (
              <div className="space-y-2">
                {recommendedTemplates.slice(0, 4).map((template) => (
                  <motion.button
                    key={template.id}
                    onClick={() => handleTemplateSelect(template)}
                    className="w-full p-4 bg-white/5 hover:bg-white/10 rounded-lg border border-purple-400/20 transition-all text-left group"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-white font-medium mb-1">{template.name}</div>
                        <div className="text-white/60 text-sm">{template.description}</div>
                        <div className="text-xs text-purple-400 mt-1">
                          {template.character_requirements.min_count}-{template.character_requirements.max_count}人 / {template.tone}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-white/40 group-hover:text-white/60" />
                    </div>
                  </motion.button>
                ))}
              </div>
            ) : (
              <div className="text-center text-white/50 py-8">
                <p>選択されたキャラクターに適したテンプレートがありません</p>
                <p className="text-sm mt-2">他のモードをお試しください</p>
              </div>
            )}
          </div>
        )}

        {(scenarioMode === 'custom' || scenarioMode === 'ai_generate') && (
          <div className="space-y-4">
            <div>
              <label className="block text-white font-medium mb-2">
                {scenarioMode === 'custom' ? 'カスタムシナリオ' : 'AI生成のヒント'}
              </label>
              <textarea
                value={customRequest}
                onChange={(e) => setCustomRequest(e.target.value)}
                placeholder={
                  scenarioMode === 'custom'
                    ? "例: カフェで偶然出会ったキャラクターたちが..."
                    : "例: ミステリアスな事件、恋愛要素、コメディタッチ（空白でもOK）"
                }
                className="w-full h-32 p-3 bg-white/5 border border-purple-400/30 rounded-lg text-white placeholder-white/40 resize-none focus:outline-none focus:border-purple-500"
              />
            </div>
            
            <button
              onClick={scenarioMode === 'custom' ? handleCustomScenario : handleAIGenerate}
              disabled={isGenerating || (scenarioMode === 'custom' && !customRequest.trim())}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  AI生成中...
                </>
              ) : (
                <>
                  {scenarioMode === 'custom' ? <Wand2 className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                  {scenarioMode === 'custom' ? 'カスタムシナリオを作成' : 'AIでシナリオ生成'}
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* 🚀 改善されたスキップボタン */}
      <div className="text-center pt-6 border-t border-purple-400/20 space-y-3">
        <button
          onClick={onSkip}
          className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors border border-purple-400/20 hover:border-purple-400/30"
        >
          🏃‍♂️ シナリオなしですぐに開始
        </button>
        <p className="text-xs text-white/40">
          後からでもシナリオを追加できます
        </p>
      </div>
    </div>
  );
};