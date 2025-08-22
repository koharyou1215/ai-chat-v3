'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { PanelLeft, UserCircle, Bot, Phone, Users, Brain } from 'lucide-react';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';
import { GroupChatMode } from '@/types/core/group-chat.types';
import { VoiceCallInterface } from '../voice/VoiceCallInterface';

// モデル名を短縮表示する関数
const getModelDisplayName = (modelId: string): string => {
    if (!modelId) return 'Unknown';
    
    // プロバイダー別の短縮表示
    if (modelId.startsWith('google/')) {
        const modelName = modelId.replace('google/', '');
        if (modelName.includes('gemini-2.5-pro')) return 'Gemini 2.5 Pro';
        if (modelName.includes('gemini-2.5-flash')) return 'Gemini 2.5 Flash';
        return 'Gemini';
    }
    
    if (modelId.startsWith('anthropic/')) {
        const modelName = modelId.replace('anthropic/', '');
        if (modelName.includes('claude-opus')) return 'Claude Opus';
        if (modelName.includes('claude-sonnet')) return 'Claude Sonnet';
        return 'Claude';
    }
    
    if (modelId.startsWith('x-ai/')) return 'Grok-4';
    if (modelId.startsWith('openai/')) return 'GPT-5';
    if (modelId.startsWith('deepseek/')) return 'DeepSeek';
    if (modelId.startsWith('mistralai/')) return 'Mistral';
    if (modelId.startsWith('meta-llama/')) return 'Llama';
    if (modelId.startsWith('qwen/')) return 'Qwen';
    if (modelId.startsWith('z-ai/')) return 'GLM';
    if (modelId.startsWith('moonshotai/')) return 'Kimi';
    
    // デフォルト: 最初の部分のみ表示
    return modelId.split('/')[0] || modelId;
};

export const ChatHeader: React.FC = () => {
    const [isVoiceCallActive, setIsVoiceCallActive] = useState(false);
    
    const { 
        toggleLeftSidebar, 
        isLeftSidebarOpen,
        toggleRightPanel,
        isRightPanelOpen,
        getActiveSession,
        setShowCharacterGallery,
        setShowPersonaGallery,
        getSelectedCharacter,
        getSelectedPersona,
        is_group_mode,
        active_group_session_id,
        groupSessions,
    } = useAppStore();
    
    const session = getActiveSession();
    const character = getSelectedCharacter();
    const persona = getSelectedPersona();
    const activeGroupSession = active_group_session_id ? groupSessions.get(active_group_session_id) : null;
    
    // sessionがない場合でも、characterとpersonaがいれば部分的に表示
    if (!character || !persona) {
        return (
            <div className="flex-shrink-0 p-4 border-b border-white/10 h-[73px]">
                 {/* Maybe a loading skeleton here */}
            </div>
        );
    }

    // Calculate last active time
    // const lastActiveTime = session?.messages.length
    //   ? formatDistanceToNow(new Date(session.messages[session.messages.length - 1].created_at), { addSuffix: true })
    //   : 'Not active yet';

    return (
        <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-white/10 h-20 relative z-50">
            <div className="flex items-center gap-4">
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={toggleLeftSidebar}
                    className={cn(
                        "p-2 rounded-full transition-colors",
                        isLeftSidebarOpen ? "bg-purple-500/20 text-purple-300" : "hover:bg-white/10"
                    )}
                    title={isLeftSidebarOpen ? "Close sidebar" : "Open sidebar"}
                >
                    <PanelLeft className="w-5 h-5" />
                </motion.button>
                
                {/* Character Info または Group Info */}
                {is_group_mode && activeGroupSession ? (
                    // グループチャット情報
                    <div className="flex items-center gap-2">
                        <Users className="w-10 h-10 text-purple-400" />
                        <div>
                            <h1 className="text-white text-lg font-bold">{activeGroupSession.name}</h1>
                            <p className="text-white/50 text-sm">
                                {activeGroupSession.active_character_ids.size}人のキャラクター • {activeGroupSession.message_count} messages
                            </p>
                        </div>
                    </div>
                ) : (
                    // 通常のキャラクター情報
                    <div 
                        className="flex items-center gap-2 cursor-pointer relative z-10"
                        onClick={() => {
                            console.log('Character info clicked!');
                            setShowCharacterGallery(true);
                        }}
                        style={{ pointerEvents: 'auto' }}
                    >
                        {character.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={character.avatar_url} alt={character.name} className="w-10 h-10 rounded-full object-cover"/>
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                                <Bot className="w-6 h-6 text-slate-400" />
                            </div>
                        )}
                        <div>
                            <h1 className="text-white text-lg font-bold">{character.name}</h1>
                            {session && (
                                <p className="text-white/50 text-sm">
                                    {session.message_count} messages
                                </p>
                            )}
                        </div>
                    </div>
                )}
                
                {/* Persona Info */}
                <div 
                    className="flex items-center gap-2 cursor-pointer relative z-10"
                    onClick={() => {
                        console.log('Persona info clicked!');
                        setShowPersonaGallery(true);
                    }}
                    style={{ pointerEvents: 'auto' }}
                >
                     {persona.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={persona.avatar_url} alt={persona.name} className="w-10 h-10 rounded-full object-cover"/>
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                            <UserCircle className="w-6 h-6 text-slate-400" />
                        </div>
                    )}
                    <div>
                        <h2 className="text-white font-semibold">{persona.name}</h2>
                        <p className="text-white/50 text-sm">as Persona</p>
                    </div>
                </div>
            </div>
            
            {/* Right side - phone button and brain tracker */}
            <div className="flex items-center gap-3">
                {/* 音声通話ボタン - 直接通話開始/終了 */}
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsVoiceCallActive(!isVoiceCallActive)}
                    className={`p-3 md:p-3 max-md:p-4 rounded-full transition-colors touch-manipulation ${
                        isVoiceCallActive 
                            ? "bg-red-500/20 hover:bg-red-500/30 text-red-400" 
                            : "bg-green-500/20 hover:bg-green-500/30 text-green-400"
                    }`}
                    title={isVoiceCallActive ? "音声通話を終了" : "音声通話を開始"}
                >
                    <Phone className="w-6 h-6 md:w-6 md:h-6 max-md:w-7 max-md:h-7" />
                </motion.button>
                
                {/* トラッカー（記憶情報）ボタン */}
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={toggleRightPanel}
                    className={cn(
                        "p-3 md:p-3 max-md:p-4 rounded-full transition-colors touch-manipulation",
                        isRightPanelOpen ? "bg-purple-500/20 text-purple-300" : "hover:bg-white/10"
                    )}
                    title={isRightPanelOpen ? "記憶情報を非表示" : "記憶情報を表示"}
                >
                    <Brain className="w-6 h-6 md:w-6 md:h-6 max-md:w-7 max-md:h-7" />
                </motion.button>
            </div>
            
            {/* 音声通話インターフェース - コンパクト版 */}
            {isVoiceCallActive && (
                <VoiceCallInterface
                    characterId={character?.id}
                    isActive={isVoiceCallActive}
                    onEnd={() => setIsVoiceCallActive(false)}
                />
            )}
        </div>
    );
};
