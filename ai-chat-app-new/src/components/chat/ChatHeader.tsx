'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { PanelLeft, UserCircle, Bot, Phone, Users, Brain, Settings, ChevronDown } from 'lucide-react';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';
import { GroupChatMode as _GroupChatMode } from '@/types/core/group-chat.types';
import { VoiceCallInterface } from '../voice/VoiceCallInterface';
import { VoiceCallModal } from '../voice/VoiceCallModal';
import { useTranslation, commonTexts } from '@/hooks/useLanguage';
import { ClientOnlyProvider } from '../ClientOnlyProvider';

// モデル名を短縮表示する関数
const getModelDisplayName = (modelId: string): string => {
    if (!modelId) return 'Unknown';
    
    // プロバイダー別の短縮表示
    if (modelId.startsWith('google/')) {
        const modelName = modelId.replace('google/', '');
        if (modelName.includes('gemini-2.5-pro')) return 'Gemini 2.5 Pro';
        if (modelName.includes('gemini-2.5-flash')) return 'Gemini 2.5 Flash';
        if (modelName.includes('gemini-1.5-pro')) return 'Gemini 1.5 Pro';
        if (modelName.includes('gemini-1.5-flash')) return 'Gemini 1.5 Flash';
        return 'Gemini';
    }
    
    if (modelId.startsWith('anthropic/')) {
        const modelName = modelId.replace('anthropic/', '');
        if (modelName.includes('claude-opus')) return 'Claude Opus';
        if (modelName.includes('claude-sonnet')) return 'Claude Sonnet';
        return 'Claude';
    }
    
    // Gemini直接指定の場合（プレフィックスなし）
    if (modelId.includes('gemini-2.5-pro')) return 'Gemini 2.5 Pro';
    if (modelId.includes('gemini-2.5-flash')) return 'Gemini 2.5 Flash';
    if (modelId.includes('gemini-1.5-pro')) return 'Gemini 1.5 Pro';
    if (modelId.includes('gemini-1.5-flash')) return 'Gemini 1.5 Flash';
    
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

// SSR安全なヘッダーコンテンツコンポーネント
const ChatHeaderContent: React.FC = () => {
    const [isVoiceCallActive, setIsVoiceCallActive] = useState(false);
    const [isVoiceCallModalOpen, setIsVoiceCallModalOpen] = useState(false);
    const { t } = useTranslation();
    
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
            <div className="flex-shrink-0 p-4 border-b border-transparent h-16 md:h-20 bg-slate-900/70 backdrop-blur-md">
                 {/* Maybe a loading skeleton here */}
            </div>
        );
    }

    // Calculate last active time
    // const lastActiveTime = session?.messages.length
    //   ? formatDistanceToNow(new Date(session.messages[session.messages.length - 1].created_at), { addSuffix: true })
    //   : 'Not active yet';

    return (
        <div className="flex-shrink-0 flex items-center justify-between p-3 md:p-4 border-b border-transparent h-16 md:h-20 relative z-50 bg-slate-900/80 backdrop-blur-md">
            <div className="flex items-center gap-4">
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={toggleLeftSidebar}
                    className={cn(
                        "p-2 rounded-full transition-colors text-white",
                        isLeftSidebarOpen ? "bg-purple-500/20 text-purple-300" : "hover:bg-white/20 text-white"
                    )}
                    title={isLeftSidebarOpen ? "Close sidebar" : "Open sidebar"}
                >
                    <PanelLeft className="w-5 h-5" />
                </motion.button>
                
                {/* Character Info または Group Info */}
                {is_group_mode && activeGroupSession ? (
                    // グループチャット情報
                    <div className="flex items-center gap-2">
                        <Users className="w-8 h-8 md:w-10 md:h-10 text-purple-400" />
                        <div>
                            <h1 className="text-white text-base md:text-lg font-bold">{activeGroupSession.name}</h1>
                            <p className="text-white/50 text-xs md:text-sm">
                                {t({ 
                                    ja: `${activeGroupSession.active_character_ids.size}人のキャラクター • ${typeof commonTexts.messageCount.ja === 'function' ? commonTexts.messageCount.ja(activeGroupSession.message_count) : `${activeGroupSession.message_count} messages`}`,
                                    en: `${activeGroupSession.active_character_ids.size} characters • ${typeof commonTexts.messageCount.en === 'function' ? commonTexts.messageCount.en(activeGroupSession.message_count) : `${activeGroupSession.message_count} messages`}`,
                                    zh: `${activeGroupSession.active_character_ids.size}个角色 • ${typeof commonTexts.messageCount.zh === 'function' ? commonTexts.messageCount.zh(activeGroupSession.message_count) : `${activeGroupSession.message_count} 消息`}`,
                                    ko: `${activeGroupSession.active_character_ids.size}개 캐릭터 • ${typeof commonTexts.messageCount.ko === 'function' ? commonTexts.messageCount.ko(activeGroupSession.message_count) : `${activeGroupSession.message_count} 메시지`}`
                                })}
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
                            <img src={character.avatar_url} alt={character.name} className="w-8 h-8 md:w-10 md:h-10 rounded-full object-cover"/>
                        ) : (
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-slate-700 flex items-center justify-center">
                                <Bot className="w-5 h-5 md:w-6 md:h-6 text-slate-400" />
                            </div>
                        )}
                        <div>
                            <h1 className="text-white text-base md:text-lg font-bold">{character.name}</h1>
                            {session && (
                                <p className="text-white/50 text-xs md:text-sm">
                                    {t({
                                        ja: typeof commonTexts.messageCount.ja === 'function' ? commonTexts.messageCount.ja(session.message_count) : `${session.message_count} メッセージ`,
                                        en: typeof commonTexts.messageCount.en === 'function' ? commonTexts.messageCount.en(session.message_count) : `${session.message_count} messages`,
                                        zh: typeof commonTexts.messageCount.zh === 'function' ? commonTexts.messageCount.zh(session.message_count) : `${session.message_count} 消息`,
                                        ko: typeof commonTexts.messageCount.ko === 'function' ? commonTexts.messageCount.ko(session.message_count) : `${session.message_count} 메시지`
                                    })}
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
                        <img src={persona.avatar_url} alt={persona.name} className="w-8 h-8 md:w-10 md:h-10 rounded-full object-cover"/>
                    ) : (
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-slate-700 flex items-center justify-center">
                            <UserCircle className="w-5 h-5 md:w-6 md:h-6 text-slate-400" />
                        </div>
                    )}
                    <div>
                        <h2 className="text-white text-sm md:text-base font-semibold">{persona.name}</h2>
                        <p className="text-white/50 text-xs md:text-sm">as Persona</p>
                    </div>
                </div>
                
                {/* グループモード切り替えボタン */}
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setGroupMode(!is_group_mode)}
                    className={cn(
                        "p-3 md:px-4 md:py-3 max-md:p-4 rounded-xl transition-colors touch-manipulation border flex items-center gap-2",
                        is_group_mode 
                            ? "bg-purple-500/20 text-purple-300 border-purple-400/50" 
                            : "hover:bg-white/10 text-white/70 border-white/20 hover:border-purple-400/40"
                    )}
                    title={is_group_mode ? "個人チャットに切り替え" : "グループチャットに切り替え"}
                >
                    <Users className="w-5 h-5 md:w-5 md:h-5 max-md:w-6 max-md:h-6" />
                    <span className="hidden md:inline text-sm font-medium">
                        {is_group_mode ? "グループ" : "個人"}
                    </span>
                </motion.button>
            </div>
            
            {/* Right side - model selector, phone button and brain tracker */}
            <div className="flex items-center gap-3">
                {/* モデル選択ドロップダウン */}
                <div className="relative">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                            const { setShowSettingsModal } = useAppStore.getState();
                            setShowSettingsModal(true, 'ai');
                        }}
                        className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors border border-purple-400/30 text-sm font-medium"
                        title="モデル設定を変更"
                    >
                        <Settings className="w-4 h-4 text-blue-400" />
                        <span className="text-white/90 hidden md:inline">
                            {getModelDisplayName(useAppStore.getState().apiConfig.model)}
                        </span>
                        <ChevronDown className="w-3 h-3 text-white/60" />
                    </motion.button>
                </div>
                {/* 音声通話ボタン - 統合版 */}
                <div className="relative">
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
                    
                    {/* フル画面モーダル切り替え用の小さなアイコン */}
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setIsVoiceCallModalOpen(true)}
                        className="absolute -bottom-1 -right-1 w-4 h-4 bg-purple-500 hover:bg-purple-600 rounded-full flex items-center justify-center"
                        title="フル画面モードで開く"
                    >
                        <div className="w-2 h-2 bg-white rounded-full" />
                    </motion.button>
                </div>
                
                {/* トラッカー（記憶情報）ボタン */}
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={toggleRightPanel}
                    className={cn(
                        "p-3 md:p-3 max-md:p-4 rounded-full transition-colors touch-manipulation text-white",
                        isRightPanelOpen ? "bg-purple-500/20 text-purple-300" : "hover:bg-white/20 text-white"
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
            
            {/* フル画面音声通話モーダル */}
            <VoiceCallModal
                characterId={character?.id}
                isOpen={isVoiceCallModalOpen}
                onClose={() => setIsVoiceCallModalOpen(false)}
            />
        </div>
    );
};

// メインのChatHeaderコンポーネント（SSR対応）
export const ChatHeader: React.FC = () => {
    return (
        <ClientOnlyProvider fallback={
            <div className="flex-shrink-0 p-4 border-b border-transparent h-16 md:h-20 bg-slate-900/70 backdrop-blur-md">
                {/* Loading placeholder */}
            </div>
        }>
            <ChatHeaderContent />
        </ClientOnlyProvider>
    );
};
