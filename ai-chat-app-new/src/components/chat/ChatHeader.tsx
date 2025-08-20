'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { Brain, PanelLeft, UserCircle, Bot, Settings, Users } from 'lucide-react'; // アイコンを追加
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';
import { GroupChatMode } from '@/types/core/group-chat.types';

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
        apiConfig,
        setShowSettingsModal,
        is_group_mode,
        setGroupMode,
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
            
            {/* Right side buttons - group mode toggle and right panel toggle */}
            <div className="flex items-center gap-3">
                {/* グループチャットモード選択ドロップダウン */}
                {is_group_mode && activeGroupSession && (
                    <select
                        value={activeGroupSession.chat_mode}
                        onChange={(e) => {
                            const newMode = e.target.value as GroupChatMode;
                            // グループセッションのモードを更新
                            useAppStore.setState(state => {
                                const updatedSession = {
                                    ...activeGroupSession,
                                    chat_mode: newMode
                                };
                                return {
                                    groupSessions: new Map(state.groupSessions).set(activeGroupSession.id, updatedSession)
                                };
                            });
                        }}
                        className="text-xs bg-slate-700 hover:bg-slate-600 text-white/80 px-3 py-2 rounded border border-white/10 focus:border-purple-400 focus:outline-none cursor-pointer"
                    >
                        <option value="sequential">📋 順次応答</option>
                        <option value="simultaneous">⚡ 同時応答</option>
                        <option value="random">🎲 ランダム</option>
                        <option value="smart">🧠 スマート</option>
                    </select>
                )}

                {/* グループチャットモード切り替え */}
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setGroupMode(!is_group_mode)}
                    className={cn(
                        "p-2 rounded-full transition-colors",
                        is_group_mode ? "bg-purple-500/20 text-purple-300" : "hover:bg-white/10"
                    )}
                    title={is_group_mode ? "通常チャットに切り替え" : "グループチャットに切り替え"}
                >
                    <Users className="w-5 h-5" />
                </motion.button>

                {/* 現在のモデル表示 */}
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowSettingsModal(true, 'api')}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-600/50 rounded-lg border border-white/10 transition-colors group"
                    title="設定でモデルを変更"
                >
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-xs font-medium text-white/80 group-hover:text-white">
                            {getModelDisplayName(apiConfig.model)}
                        </span>
                    </div>
                    <Settings className="w-3 h-3 text-white/40 group-hover:text-white/60" />
                </motion.button>
                
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={toggleRightPanel}
                    className={cn(
                        "p-2 rounded-full transition-colors",
                        isRightPanelOpen ? "bg-purple-500/20 text-purple-300" : "hover:bg-white/10"
                    )}
                    title={isRightPanelOpen ? "記憶情報を非表示" : "記憶情報を表示"}
                >
                    <Brain className="w-5 h-5" />
                </motion.button>
            </div>
        </div>
    );
};
