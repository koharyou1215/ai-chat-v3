'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Upload, X, PlusCircle, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Character, Persona, TrackerDefinition, TrackerConfig } from '@/types'; // Assuming types exist
import { cn } from '@/lib/utils';
import { AnimatePresence } from 'framer-motion';
import { ImageUploader } from '@/components/ui/image-uploader';
import { AppearancePanel } from './AppearancePanel'; // ★ 専門医をインポート

// Type guard functions
const isCharacter = (data: Character | Persona | null): data is Character => {
  return data !== null && 'speaking_style' in data;
};

const isPersona = (data: Character | Persona | null): data is Persona => {
  return data !== null && 'role' in data && !('speaking_style' in data);
};

interface CharacterFormProps {
    character?: Character | null;
    persona?: Persona | null;
    mode: 'character' | 'persona';
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Character | Persona) => void;
}

const TrackerEditor: React.FC<{
    tracker: TrackerDefinition;
    onChange: (newConfig: TrackerConfig) => void;
}> = ({ tracker, onChange }) => {
    
    const config = tracker?.config; // Use optional chaining

    if (!config) {
        return <p className="text-sm text-slate-400">トラッカーの設定情報が見つかりません。</p>;
    }

    switch(config.type) {
        case 'numeric':
            return (
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label className="text-white">初期値</Label>
                        <Input type="number" value={config.initial_value} onChange={e => onChange({...config, initial_value: +e.target.value})} className="bg-slate-800/50 border-slate-600 text-white focus:border-blue-400" />
                    </div>
                    <div>
                        <Label className="text-white">最小値</Label>
                        <Input type="number" value={config.min_value} onChange={e => onChange({...config, min_value: +e.target.value})} className="bg-slate-800/50 border-slate-600 text-white focus:border-blue-400" />
                    </div>
                    <div>
                        <Label className="text-white">最大値</Label>
                        <Input type="number" value={config.max_value} onChange={e => onChange({...config, max_value: +e.target.value})} className="bg-slate-800/50 border-slate-600 text-white focus:border-blue-400" />
                    </div>
                    <div>
                        <Label className="text-white">ステップ</Label>
                        <Input type="number" value={config.step} onChange={e => onChange({...config, step: +e.target.value})} className="bg-slate-800/50 border-slate-600 text-white focus:border-blue-400" />
                    </div>
                    <div>
                        <Label className="text-white">単位</Label>
                        <Input value={config.unit || ''} onChange={e => onChange({...config, unit: e.target.value})} className="bg-slate-800/50 border-slate-600 text-white focus:border-blue-400" />
                    </div>
                </div>
            )
        case 'state':
            return (
                <div className="space-y-2">
                    <div>
                        <Label className="text-white">初期状態</Label>
                        <Input value={config.initial_state} onChange={e => onChange({...config, initial_state: e.target.value})} className="bg-slate-800/50 border-slate-600 text-white focus:border-blue-400" />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-white">状態リスト</label>
                        {config.possible_states.map((state, i) => (
                            <div key={i} className="flex items-center gap-2 mt-1">
                                <Input value={state.label} onChange={e => {
                                    const newStates = [...config.possible_states];
                                    newStates[i] = {...newStates[i], label: e.target.value};
                                    onChange({...config, possible_states: newStates});
                                }} className="bg-slate-800/50 border-slate-600 text-white focus:border-blue-400" />
                                <Input type="color" value={state.color || '#ffffff'} onChange={e => {
                                    const newStates = [...config.possible_states];
                                    newStates[i] = {...newStates[i], color: e.target.value};
                                    onChange({...config, possible_states: newStates});
                                }} className="w-12 h-10 p-1 bg-slate-800/50 border-slate-600" />
                                <Button size="icon" variant="ghost" onClick={() => {
                                     const newStates = config.possible_states.filter((_, idx) => idx !== i);
                                     onChange({...config, possible_states: newStates});
                                }}>
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                         <Button size="sm" variant="outline" className="mt-2" onClick={() => {
                             const newStates = [...config.possible_states, {id: `state_${Date.now()}`, label: '新しい状態'}];
                             onChange({...config, possible_states: newStates});
                         }}>
                            <PlusCircle className="w-4 h-4 mr-2" />
                            状態を追加
                        </Button>
                    </div>
                </div>
            )
        case 'boolean':
             return <p className="text-sm text-slate-400">ブール型トラッカーには追加設定はありません。</p>
        case 'text':
            return (
                 <div className="space-y-2">
                     <div>
                         <Label className="text-white">初期テキスト</Label>
                         <Textarea placeholder="初期テキスト" value={config.initial_value} onChange={e => onChange({...config, initial_value: e.target.value})} className="bg-slate-800/50 border-slate-600 text-white focus:border-blue-400" />
                     </div>
                     <div>
                         <Label className="text-white">最大文字数</Label>
                         <Input type="number" value={config.max_length || ''} onChange={e => onChange({...config, max_length: +e.target.value})} className="bg-slate-800/50 border-slate-600 text-white focus:border-blue-400" />
                     </div>
                </div>
            )
        default:
            return null;
    }
}


export const CharacterForm: React.FC<CharacterFormProps> = ({
    character,
    persona,
    mode,
    isOpen,
    onClose,
    onSave,
}) => {
    const [formData, setFormData] = useState<Character | Persona | null>(
        mode === 'character' ? (character || null) : (persona || null)
    );
    const [activeTab, setActiveTab] = useState("basic");
    const [expandedTracker, setExpandedTracker] = useState<number | null>(null);
    const [isUploading, setIsUploading] = useState(false); // Add uploading state

    const handleSave = () => {
        if (formData) {
            onSave(formData);
            onClose();
        }
    };
    
    const handleFileUpload = async (file: File, field: 'avatar_url' | 'background_url') => {
        if (!file) {
            console.log('No file provided to handleFileUpload');
            return;
        }

        console.log('Starting file upload:', { 
            fileName: file.name, 
            fileType: file.type, 
            fileSize: file.size,
            field 
        });

        setIsUploading(true);
        const uploadFormData = new FormData();
        uploadFormData.append('file', file);

        try {
            console.log('Sending request to /api/upload/image');
            const response = await fetch('/api/upload/image', {
                method: 'POST',
                body: uploadFormData,
            });

            console.log('Response received:', { 
                status: response.status, 
                statusText: response.statusText,
                ok: response.ok 
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Server response error:', errorText);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            console.log('Upload result:', result);

            if (result.success && result.url) {
                setFormData(prevFormData => prevFormData ? { ...prevFormData, [field]: result.url } : null);
                console.log('File upload successful, URL:', result.url);
            } else {
                throw new Error(result.error || 'Failed to get URL from server');
            }
        } catch (error) {
            console.error('Upload error:', error);
            // Show error message to user
            let errorMessage = 'ファイルのアップロードに失敗しました。';
            if (error instanceof Error) {
                if (error.message.includes('Failed to fetch')) {
                    errorMessage = 'サーバーに接続できません。ネットワーク接続を確認してください。';
                } else {
                    errorMessage = `エラー: ${error.message}`;
                }
            }
            alert(errorMessage);
        } finally {
            setIsUploading(false);
        }
    };

    if (!isOpen) return null;

    const FileUploader: React.FC<{
        label: string;
        field: 'avatar_url' | 'background_url'; // field prop を追加
        url?: string | null;
        onFileUpload: (file: File) => void;
        onUrlChange: (url: string) => void;
        onClear: () => void;
        className?: string;
        aspectRatio?: 'aspect-square' | 'aspect-video';
    }> = ({ label, field, url, onFileUpload, onUrlChange, onClear, className, aspectRatio = 'aspect-square' }) => {
        const [isDragging, setIsDragging] = useState(false);

        const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                const file = e.dataTransfer.files[0];
                if (file.type.startsWith('image/') || file.type === 'video/mp4') {
                    onFileUpload(file);
                }
                e.dataTransfer.clearData();
            }
        };

        const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            if (e.target.files && e.target.files.length > 0) {
                onFileUpload(e.target.files[0]);
            }
        };
        
        const fileInputId = `file-upload-${field}`; // field を使ってユニークなIDを生成
        console.log("Generated fileInputId:", fileInputId, "for label:", label); // デバッグログ

        return (
            <div className={cn("space-y-3 relative", className)}>
                <label className="block text-sm font-medium text-slate-300">{label}</label>
                <div
                    onDragEnter={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                    }}
                    onDragLeave={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    className={cn(
                        "relative overflow-hidden rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer group",
                        isDragging 
                            ? "border-purple-400 bg-purple-500/10 shadow-lg shadow-purple-500/20" 
                            : "border-slate-600 hover:border-slate-500",
                        aspectRatio,
                        "min-h-[200px]"
                    )}
                    onClick={() => document.getElementById(fileInputId)?.click()}
                >
                    {isUploading && (
                        <div className="absolute inset-0 bg-slate-900/80 flex flex-col items-center justify-center z-20">
                            <div className="w-16 h-16 border-4 border-t-purple-500 border-slate-600 rounded-full animate-spin"></div>
                            <p className="mt-4 text-slate-300">Uploading...</p>
                        </div>
                    )}
                    {url ? (
                        <>
                            <div className="relative w-full h-full">
                                {url.endsWith('.mp4') || url.includes('video') ? (
                                    <video 
                                        src={url} 
                                        className="w-full h-full object-cover" 
                                        autoPlay 
                                        loop 
                                        muted 
                                        playsInline
                                    />
                                ) : (
                                    <img 
                                        src={url} 
                                        alt="preview" 
                                        className="w-full h-full object-cover" 
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.style.display = 'none';
                                            target.nextElementSibling?.classList.remove('hidden');
                                        }}
                                    />
                                )}
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <div className="bg-black/70 rounded-lg px-3 py-2 text-white text-sm">
                                        クリックで変更
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onClear();
                                }} 
                                className="absolute top-2 right-2 p-2 bg-red-600/80 hover:bg-red-600 rounded-full transition-colors shadow-lg z-30"
                            >
                                <X className="w-4 h-4 text-white"/>
                            </button>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8">
                            <div className={cn(
                                "w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-all",
                                isDragging 
                                    ? "bg-purple-500/20 text-purple-400" 
                                    : "bg-slate-700 text-slate-500 group-hover:bg-slate-600 group-hover:text-slate-400"
                            )}>
                                <Upload className="w-8 h-8" />
                            </div>
                            <p className={cn(
                                "text-lg font-medium mb-2 transition-colors",
                                isDragging ? "text-purple-300" : "group-hover:text-slate-300"
                            )}>
                                ファイルをドラッグ＆ドロップ
                            </p>
                            <p className="text-sm text-slate-500 mb-2">またはクリックして選択</p>
                            <p className="text-xs text-slate-600">
                                対応フォーマット: JPG, PNG, GIF, MP4
                            </p>
                        </div>
                    )}
                </div>
                <div className="space-y-1">
                    <label className="text-xs text-slate-400">またはURLで指定</label>
                <Input
                    type="text"
                        placeholder="https://example.com/image.jpg"
                    value={url || ''}
                    onChange={(e) => onUrlChange(e.target.value)}
                        className="bg-slate-800/50 border-slate-600 focus:border-purple-400 text-sm"
                    />
                </div>
                <input 
                    type="file" 
                    id={fileInputId} 
                    className="hidden" 
                    onChange={handleFileChange} 
                    accept="image/*,video/mp4" 
                />
            </div>
        );
    }


    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col bg-slate-900/50 backdrop-blur-xl border border-white/10">
                <DialogHeader>
                    <DialogTitle>{mode === 'character' ? 'キャラクター編集' : 'ペルソナ編集'}</DialogTitle>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg p-2 mb-4">
                        <div className="flex flex-wrap gap-1">
                            <button 
                                onClick={() => setActiveTab("basic")}
                                className={cn(
                                    "px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2",
                                    activeTab === "basic" 
                                        ? "bg-purple-600/50 text-white shadow-lg" 
                                        : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
                                )}
                            >
                                <span>👤</span>基本
                            </button>
                            <button 
                                onClick={() => setActiveTab("appearance")}
                                className={cn(
                                    "px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2",
                                    activeTab === "appearance" 
                                        ? "bg-purple-600/50 text-white shadow-lg" 
                                        : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
                                )}
                            >
                                <span>🎨</span>外見
                            </button>
                            <button 
                                onClick={() => setActiveTab("personality")}
                                className={cn(
                                    "px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2",
                                    activeTab === "personality" 
                                        ? "bg-purple-600/50 text-white shadow-lg" 
                                        : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
                                )}
                            >
                                <span>🧠</span>性格
                            </button>
                            <button 
                                onClick={() => setActiveTab("scenario")}
                                className={cn(
                                    "px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2",
                                    activeTab === "scenario" 
                                        ? "bg-purple-600/50 text-white shadow-lg" 
                                        : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
                                )}
                            >
                                <span>📜</span>シナリオ
                            </button>
                            {mode === 'character' && (
                                <button 
                                    onClick={() => setActiveTab("nsfw")}
                                    className={cn(
                                        "px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2",
                                        activeTab === "nsfw" 
                                            ? "bg-red-600/50 text-white shadow-lg" 
                                            : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
                                    )}
                                >
                                    <span>🔞</span>NSFW
                                </button>
                            )}
                            {mode === 'character' && (
                                <button 
                                    onClick={() => setActiveTab("trackers")}
                                    className={cn(
                                        "px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2",
                                        activeTab === "trackers" 
                                            ? "bg-purple-600/50 text-white shadow-lg" 
                                            : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
                                    )}
                                >
                                    <span>📊</span>トラッカー
                                </button>
                            )}
                            {mode === 'character' && (
                                <button 
                                    onClick={() => setActiveTab("prompt")}
                                    className={cn(
                                        "px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2",
                                        activeTab === "prompt" 
                                            ? "bg-purple-600/50 text-white shadow-lg" 
                                            : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
                                    )}
                                >
                                    <span>⚙️</span>プロンプト
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                        <TabsContent value="basic" className="space-y-8">
                            {/* ヘッダー部分 */}
                            <div className="text-center space-y-2">
                                <h2 className="text-2xl font-bold text-white">{mode === 'character' ? 'キャラクター設定' : 'ペルソナ設定'}</h2>
                                <p className="text-slate-400 text-sm">基本情報とプロフィールを設定します</p>
                            </div>

                            {/* 画像アップロード部分 */}
                            <div className="mb-8 space-y-6">
                                {mode === 'character' ? (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <label className="block text-sm font-medium text-slate-300">🎭 アバター画像</label>
                                            <ImageUploader
                                                url={formData?.avatar_url}
                                                onFileUpload={(file) => handleFileUpload(file, 'avatar_url')}
                                                onClear={() => setFormData(prev => prev ? {...prev as any, avatar_url: ''} : null)}
                                                supportVideo={false}
                                                aspectRatio="square"
                                                className="h-64"
                                                placeholder="アバター画像をドラッグ&ドロップ"
                                            />
                                        </div>
                                        {mode === 'character' && (
                                            <div className="space-y-4">
                                                <label className="block text-sm font-medium text-slate-300">🖼️ 背景画像・動画</label>
                                                <ImageUploader
                                                    url={(formData as Character)?.background_url}
                                                    onFileUpload={(file) => handleFileUpload(file, 'background_url')}
                                                    onClear={() => setFormData(prev => prev ? {...prev as Character, background_url: ''} : null)}
                                                    supportVideo={true}
                                                    aspectRatio="16:9"
                                                    className="h-48"
                                                    placeholder="背景画像・動画をドラッグ&ドロップ"
                                                    showPreviewControls={true}
                                                />
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex justify-center mb-6">
                                        <div className="w-full max-w-md space-y-4">
                                            <label className="block text-sm font-medium text-slate-300">🎭 アバター画像</label>
                                            <ImageUploader
                                                url={formData?.avatar_url}
                                                onFileUpload={(file) => handleFileUpload(file, 'avatar_url')}
                                                onClear={() => setFormData(prev => prev ? {...prev as any, avatar_url: ''} : null)}
                                                supportVideo={false}
                                                aspectRatio="square"
                                                className="h-64"
                                                placeholder="ペルソナアバターをドラッグ&ドロップ"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* 基本情報カード */}
                            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-6 rounded-xl border border-slate-700/50 backdrop-blur-sm">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                                        <span className="text-purple-400 text-lg">👤</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-white">基本情報</h3>
                                </div>
                                <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-300">名前 *</label>
                                            <Input 
                                                placeholder="キャラクターの名前を入力" 
                                                value={formData?.name || ''} 
                                                onChange={e => setFormData(prev => prev ? {...prev as any, name: e.target.value} : null)}
                                                className="bg-slate-800/50 border-slate-600 focus:border-purple-400"
                                            />
                                        </div>
                                        {mode === 'character' && (
                                            <div className="space-y-2">
                                                <div className="flex-1">
                                                    <Label htmlFor="character-age">年齢</Label>
                                                    <Input
                                                        id="character-age"
                                                        placeholder="例: 18歳、不明、永遠の17歳"
                                                        value={(formData as Character)?.age || ''}
                                                        onChange={e => setFormData(prev => prev ? {...(prev as Character), age: e.target.value} : prev)}
                                                        className="bg-slate-800/50 border-slate-600 focus:border-purple-400"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    {mode === 'character' && (
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-300">職業・役割</label>
                                            <Input 
                                                placeholder="例: 高校生、魔法使い、騎士" 
                                                value={(formData as Character)?.occupation || ''} 
                                                onChange={e => setFormData(prev => prev ? {...prev as Character, occupation: e.target.value} : null)}
                                                className="bg-slate-800/50 border-slate-600 focus:border-purple-400"
                                            />
                                        </div>
                                    )}
                                    {mode === 'character' && (
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-300">キャッチフレーズ</label>
                                            <Textarea 
                                                placeholder="キャラクターを表す短いフレーズ (30文字以内)" 
                                                value={(formData as Character)?.catchphrase || ''} 
                                                onChange={e => setFormData(prev => prev ? {...prev as Character, catchphrase: e.target.value} : null)}
                                                className="bg-slate-800/50 border-slate-600 focus:border-purple-400 resize-none"
                                                rows={2}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* タグセクション - キャラクターのみ */}
                            {mode === 'character' && (
                                <div className="bg-gradient-to-br from-blue-900/20 to-indigo-900/20 p-6 rounded-xl border border-blue-700/30">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                                            <span className="text-blue-400 text-lg">🏷️</span>
                                        </div>
                                        <h4 className="text-lg font-semibold text-white">タグ</h4>
                                        <p className="text-sm text-slate-400">キャラクターの特徴を表すキーワード</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {((formData as Character)?.tags || []).map((tag: string, index: number) => (
                                            <span key={index} className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 rounded-full text-sm border border-purple-400/30">
                                                <span className="font-medium">{tag}</span>
                                                <button 
                                                    onClick={() => {
                                                        const newTags = (formData as Character)?.tags?.filter((_: string, i: number) => i !== index) || [];
                                                        setFormData(prev => prev ? {...prev as Character, tags: newTags} : null);
                                                    }} 
                                                    className="hover:text-purple-100 transition-colors"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <Input 
                                            placeholder="新しいタグを入力（例: 魔法使い、ツンデレ、幼馴染）" 
                                            className="bg-slate-800/50 border-slate-600 focus:border-blue-400"
                                            onKeyPress={(e) => {
                                                if (e.key === 'Enter') {
                                                    const input = e.target as HTMLInputElement;
                                                    const newTag = input.value.trim();
                                                    if (newTag && !((formData as Character)?.tags || []).includes(newTag)) {
                                                        setFormData(prev => prev ? {...prev as any, tags: [...((prev as Character)?.tags || []), newTag]} : null);
                                                        input.value = '';
                                                    }
                                                }
                                            }}
                                        />
                                        <Button 
                                            type="button" 
                                            size="sm" 
                                            className="bg-blue-600 hover:bg-blue-500"
                                            onClick={() => {
                                                const input = document.querySelector('input[placeholder*="新しいタグを入力"]') as HTMLInputElement;
                                                const newTag = input?.value.trim();
                                                if (newTag && !((formData as Character)?.tags || []).includes(newTag)) {
                                                    setFormData(prev => prev ? {...prev as any, tags: [...((prev as Character)?.tags || []), newTag]} : null);
                                                    input.value = '';
                                                }
                                            }}
                                        >
                                            追加
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* 好み・趣味セクション - キャラクターのみ */}
                            {mode === 'character' && (
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 p-5 rounded-xl border border-green-700/30">
                                        <div className="flex items-center gap-2 mb-4">
                                            <span className="text-green-400 text-lg">🎨</span>
                                            <h4 className="text-lg font-semibold text-white">趣味</h4>
                                        </div>
                                        <div className="space-y-2 mb-4">
                                            {((formData as Character)?.hobbies || []).map((hobby: string, index: number) => (
                                                <div key={index} className="flex items-center gap-2">
                                                    <Input 
                                                        value={hobby} 
                                                        placeholder="趣味を入力"
                                                        className="bg-slate-800/50 border-slate-600 focus:border-green-400 text-sm"
                                                        onChange={e => {
                                                            const newHobbies = [...((formData as Character)?.hobbies || [])];
                                                            newHobbies[index] = e.target.value;
                                                            setFormData(prev => prev ? {...prev as Character, hobbies: newHobbies} : null);
                                                        }}
                                                    />
                                                    <Button 
                                                        size="icon" 
                                                        variant="ghost" 
                                                        className="text-red-400 hover:text-red-300 shrink-0"
                                                        onClick={() => {
                                                            const newHobbies = ((formData as Character)?.hobbies || []).filter((_: string, i: number) => i !== index);
                                                            setFormData(prev => prev ? {...prev as Character, hobbies: newHobbies} : null);
                                                        }}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                        <Button 
                                            size="sm" 
                                            variant="outline" 
                                            className="w-full border-green-600 text-green-300 hover:bg-green-600/20"
                                            onClick={() => setFormData(prev => prev ? {...prev as Character, hobbies: [...((prev as Character)?.hobbies || []), '']} : null)}
                                        >
                                            <PlusCircle className="w-4 h-4 mr-2" />
                                            趣味を追加
                                        </Button>
                                    </div>

                                    <div className="bg-gradient-to-br from-pink-900/20 to-rose-900/20 p-5 rounded-xl border border-pink-700/30">
                                        <div className="flex items-center gap-2 mb-4">
                                            <span className="text-pink-400 text-lg">❤️</span>
                                            <h4 className="text-lg font-semibold text-white">好きなもの</h4>
                                        </div>
                                        <div className="space-y-2 mb-4">
                                            {(formData?.likes || []).map((like: string, index: number) => (
                                                <div key={index} className="flex items-center gap-2">
                                                    <Input 
                                                        value={like} 
                                                        placeholder="好きなものを入力"
                                                        className="bg-slate-800/50 border-slate-600 focus:border-pink-400 text-sm"
                                                        onChange={e => {
                                                            const newLikes = [...((formData as Character)?.likes || [])];
                                                            newLikes[index] = e.target.value;
                                                            setFormData(prev => prev ? {...prev as Character, likes: newLikes} : null);
                                                        }}
                                                    />
                                                    <Button 
                                                        size="icon" 
                                                        variant="ghost" 
                                                        className="text-red-400 hover:text-red-300 shrink-0"
                                                        onClick={() => {
                                                            const newLikes = ((formData as Character)?.likes || []).filter((_: string, i: number) => i !== index);
                                                            setFormData(prev => prev ? {...prev as Character, likes: newLikes} : null);
                                                        }}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                        <Button 
                                            size="sm" 
                                            variant="outline" 
                                            className="w-full border-pink-600 text-pink-300 hover:bg-pink-600/20"
                                            onClick={() => setFormData(prev => prev ? {...prev as Character, likes: [...((prev as Character)?.likes || []), '']} : null)}
                                        >
                                            <PlusCircle className="w-4 h-4 mr-2" />
                                            好きなものを追加
                                        </Button>
                                    </div>

                                    <div className="bg-gradient-to-br from-red-900/20 to-orange-900/20 p-5 rounded-xl border border-red-700/30">
                                        <div className="flex items-center gap-2 mb-4">
                                            <span className="text-red-400 text-lg">💢</span>
                                            <h4 className="text-lg font-semibold text-white">嫌いなもの</h4>
                                        </div>
                                        <div className="space-y-2 mb-4">
                                            {(formData?.dislikes || []).map((dislike: string, index: number) => (
                                                <div key={index} className="flex items-center gap-2">
                                                    <Input 
                                                        value={dislike} 
                                                        placeholder="嫌いなものを入力"
                                                        className="bg-slate-800/50 border-slate-600 focus:border-red-400 text-sm"
                                                        onChange={e => {
                                                            const newDislikes = [...(formData?.dislikes || [])];
                                                            newDislikes[index] = e.target.value;
                                                            setFormData(prev => prev ? {...prev as any, dislikes: newDislikes} : null);
                                                        }}
                                                    />
                                                    <Button 
                                                        size="icon" 
                                                        variant="ghost" 
                                                        className="text-red-400 hover:text-red-300 shrink-0"
                                                        onClick={() => {
                                                            const newDislikes = (formData?.dislikes || []).filter((_: string, i: number) => i !== index);
                                                            setFormData(prev => prev ? {...prev as any, dislikes: newDislikes} : null);
                                                        }}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                        <Button 
                                            size="sm" 
                                            variant="outline" 
                                            className="w-full border-red-600 text-red-300 hover:bg-red-600/20"
                                            onClick={() => setFormData(prev => prev ? {...prev as any, dislikes: [...(formData?.dislikes || []), '']} : null)}
                                        >
                                            <PlusCircle className="w-4 h-4 mr-2" />
                                            嫌いなものを追加
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* ペルソナ独自のフィールド */}
                            {mode === 'persona' && (
                                <div className="space-y-6">
                                    <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-6 rounded-xl border border-slate-700/50">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                                                <span className="text-purple-400 text-lg">📝</span>
                                            </div>
                                            <h3 className="text-xl font-bold text-white">説明・役割</h3>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-300">説明</label>
                                                <Textarea 
                                                    placeholder="このペルソナの簡潔な説明" 
                                                    value={(formData as Persona)?.description || ''} 
                                                    onChange={e => setFormData(prev => prev ? {...(prev as Persona), description: e.target.value} : null)}
                                                    className="bg-slate-800/50 border-slate-600 focus:border-purple-400 resize-none"
                                                    rows={3}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-300">役割</label>
                                                <Input 
                                                    placeholder="例: メンター、アシスタント、専門家" 
                                                    value={(formData as Persona)?.role || ''} 
                                                    onChange={e => setFormData(prev => prev ? {...(prev as Persona), role: e.target.value} : null)}
                                                    className="bg-slate-800/50 border-slate-600 focus:border-purple-400"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-gradient-to-br from-cyan-900/20 to-blue-900/20 p-6 rounded-xl border border-cyan-700/30">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                                                <span className="text-cyan-400 text-lg">✨</span>
                                            </div>
                                            <h3 className="text-xl font-bold text-white">特徴・特性</h3>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium text-slate-300">特徴</label>
                                                {((formData as Persona)?.traits || []).map((trait: string, index: number) => (
                                                    <div key={index} className="flex items-center gap-2">
                                                        <Input
                                                            value={trait}
                                                            onChange={e => {
                                                                const newTraits = [...((formData as Persona)?.traits || [])];
                                                                newTraits[index] = e.target.value;
                                                                setFormData(prev => prev ? {...(prev as Persona), traits: newTraits} : null);
                                                            }}
                                                            className="flex-1 bg-slate-800/50 border-slate-600 focus:border-cyan-400"
                                                        />
                                                        <Button 
                                                            size="icon" 
                                                            variant="ghost" 
                                                            className="text-red-400 hover:bg-red-500/20"
                                                            onClick={() => {
                                                                const newTraits = ((formData as Persona)?.traits || []).filter((_: string, i: number) => i !== index);
                                                                setFormData(prev => prev ? {...(prev as Persona), traits: newTraits} : null);
                                                            }}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                ))}
                                                <Button 
                                                    size="sm" 
                                                    variant="outline" 
                                                    className="w-full border-cyan-600 text-cyan-300 hover:bg-cyan-600/20"
                                                    onClick={() => setFormData(prev => prev ? {...(prev as Persona), traits: [...((formData as Persona)?.traits || []), '']} : null)}
                                                >
                                                    <PlusCircle className="w-4 h-4 mr-2" />
                                                    特徴を追加
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 p-5 rounded-xl border border-green-700/30">
                                            <div className="flex items-center gap-2 mb-4">
                                                <span className="text-green-400 text-lg">❤️</span>
                                                <h4 className="text-lg font-semibold text-white">好きなもの</h4>
                                            </div>
                                            <div className="space-y-2 mb-4">
                                                {(formData?.likes || []).map((like: string, index: number) => (
                                                    <div key={index} className="flex items-center gap-2">
                                                        <Input 
                                                            value={like} 
                                                            placeholder="好きなものを入力"
                                                            className="bg-slate-800/50 border-slate-600 focus:border-green-400 text-sm"
                                                            onChange={e => {
                                                                const newLikes = [...(formData?.likes || [])];
                                                                newLikes[index] = e.target.value;
                                                                setFormData(prev => prev ? {...prev as any, likes: newLikes} : null);
                                                            }}
                                                        />
                                                        <Button 
                                                            size="icon" 
                                                            variant="ghost" 
                                                            className="text-red-400 hover:text-red-300 shrink-0"
                                                            onClick={() => {
                                                                const newLikes = (formData?.likes || []).filter((_: string, i: number) => i !== index);
                                                                setFormData(prev => prev ? {...prev as any, likes: newLikes} : null);
                                                            }}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                            <Button 
                                                size="sm" 
                                                variant="outline" 
                                                className="w-full border-green-600 text-green-300 hover:bg-green-600/20"
                                                onClick={() => setFormData(prev => prev ? {...prev as any, likes: [...(formData?.likes || []), '']} : null)}
                                            >
                                                <PlusCircle className="w-4 h-4 mr-2" />
                                                好きなものを追加
                                            </Button>
                                        </div>

                                        <div className="bg-gradient-to-br from-red-900/20 to-orange-900/20 p-5 rounded-xl border border-red-700/30">
                                            <div className="flex items-center gap-2 mb-4">
                                                <span className="text-red-400 text-lg">💢</span>
                                                <h4 className="text-lg font-semibold text-white">嫌いなもの</h4>
                                            </div>
                                            <div className="space-y-2 mb-4">
                                                {(formData?.dislikes || []).map((dislike: string, index: number) => (
                                                    <div key={index} className="flex items-center gap-2">
                                                        <Input 
                                                            value={dislike} 
                                                            placeholder="嫌いなものを入力"
                                                            className="bg-slate-800/50 border-slate-600 focus:border-red-400 text-sm"
                                                            onChange={e => {
                                                                const newDislikes = [...(formData?.dislikes || [])];
                                                                newDislikes[index] = e.target.value;
                                                                setFormData(prev => prev ? {...prev as any, dislikes: newDislikes} : null);
                                                            }}
                                                        />
                                                        <Button 
                                                            size="icon" 
                                                            variant="ghost" 
                                                            className="text-red-400 hover:text-red-300 shrink-0"
                                                            onClick={() => {
                                                                const newDislikes = (formData?.dislikes || []).filter((_: string, i: number) => i !== index);
                                                                setFormData(prev => prev ? {...prev as any, dislikes: newDislikes} : null);
                                                            }}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                            <Button 
                                                size="sm" 
                                                variant="outline" 
                                                className="w-full border-red-600 text-red-300 hover:bg-red-600/20"
                                                onClick={() => setFormData(prev => prev ? {...prev as any, dislikes: [...(formData?.dislikes || []), '']} : null)}
                                            >
                                                <PlusCircle className="w-4 h-4 mr-2" />
                                                嫌いなものを追加
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </TabsContent>
                        <TabsContent value="appearance" className="space-y-8">
                            <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 p-6 rounded-xl border border-indigo-700/30">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                                        <span className="text-indigo-400 text-lg">✨</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-white">外見の詳細</h3>
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-300">外見の説明</label>
                                        <Textarea
                                            placeholder="身長、髪型、服装、特徴的な外見など詳しく記述してください..."
                                            value={mode === 'character' && formData ? (formData as Character).appearance || '' : ''}
                                            onChange={e => setFormData(prev => prev ? {...prev as any, appearance: e.target.value} : null)}
                                            rows={6}
                                            className="bg-slate-800/50 border-slate-600 focus:border-indigo-400 resize-none"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-300">カラーテーマ</label>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            <div>
                                                <label className="text-xs text-slate-400">プライマリカラー</label>
                                                <div className="flex gap-2">
                                                    <input 
                                                        type="color" 
                                                        value={mode === 'character' && formData ? (formData as Character).color_theme?.primary || '#8b5cf6' : '#8b5cf6'}
                                                        onChange={e => setFormData(prev => prev ? {...prev as any, color_theme: {...(prev as any)?.color_theme, primary: e.target.value}} : null)}
                                                        className="w-10 h-8 rounded border border-slate-600"
                                                    />
                                                    <Input 
                                                        value={mode === 'character' && formData ? (formData as Character).color_theme?.primary || '#8b5cf6' : '#8b5cf6'}
                                                        onChange={e => setFormData(prev => prev ? {...prev as any, color_theme: {...(prev as any)?.color_theme, primary: e.target.value}} : null)}
                                                        className="bg-slate-800/50 border-slate-600 text-xs"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-400">セカンダリカラー</label>
                                                <div className="flex gap-2">
                                                    <input 
                                                        type="color" 
                                                        value={mode === 'character' && formData ? (formData as Character).color_theme?.secondary || '#a0aec0' : '#a0aec0'}
                                                        onChange={e => setFormData(prev => prev ? {...prev as any, color_theme: {...(prev as any)?.color_theme, secondary: e.target.value}} : null)}
                                                        className="w-10 h-8 rounded border border-slate-600"
                                                    />
                                                    <Input 
                                                        value={mode === 'character' && formData ? (formData as Character).color_theme?.secondary || '#a0aec0' : '#a0aec0'}
                                                        onChange={e => setFormData(prev => prev ? {...prev as any, color_theme: {...(prev as any)?.color_theme, secondary: e.target.value}} : null)}
                                                        className="bg-slate-800/50 border-slate-600 text-xs"
                                                    />
                                                </div>
                                            </div>
                            <div>
                                                <label className="text-xs text-slate-400">アクセントカラー</label>
                                                <div className="flex gap-2">
                                                    <input 
                                                        type="color" 
                                                        value={mode === 'character' && formData ? (formData as Character).color_theme?.accent || '#f59e0b' : '#f59e0b'}
                                                        onChange={e => setFormData(prev => prev ? {...prev as any, color_theme: {...(prev as any)?.color_theme, accent: e.target.value}} : null)}
                                                        className="w-10 h-8 rounded border border-slate-600"
                                                    />
                                                    <Input 
                                                        value={mode === 'character' && formData ? (formData as Character).color_theme?.accent || '#f59e0b' : '#f59e0b'}
                                                        onChange={e => setFormData(prev => prev ? {...prev as any, color_theme: {...(prev as any)?.color_theme, accent: e.target.value}} : null)}
                                                        className="bg-slate-800/50 border-slate-600 text-xs"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-500">キャラクターのUIテーマカラーを設定します</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-cyan-900/20 to-blue-900/20 p-6 rounded-xl border border-cyan-700/30">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                                        <span className="text-cyan-400 text-lg">🤖</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-white">AI画像生成設定</h3>
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-300">AI画像生成用プロンプト</label>
                                        <Textarea
                                            placeholder="例: anime girl, long silver hair, purple eyes, white dress, fantasy style..."
                                            value={mode === 'character' && formData ? (formData as Character).image_prompt || '' : ''}
                                            onChange={e => setFormData(prev => prev ? {...prev as any, image_prompt: e.target.value} : null)}
                                            rows={4}
                                            className="bg-slate-800/50 border-slate-600 focus:border-cyan-400 resize-none"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-300">AI画像生成用ネガティブプロンプト</label>
                                <Textarea
                                            placeholder="例: ugly, deformed, blurry, low quality, extra limbs..."
                                            value={mode === 'character' && formData ? (formData as Character).negative_prompt || '' : ''}
                                            onChange={e => setFormData(prev => prev ? {...prev as any, negative_prompt: e.target.value} : null)}
                                            rows={3}
                                            className="bg-slate-800/50 border-slate-600 focus:border-cyan-400 resize-none"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="bg-gradient-to-br from-emerald-900/20 to-green-900/20 p-5 rounded-xl border border-emerald-700/30">
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="text-emerald-400 text-lg">✨</span>
                                        <h4 className="text-lg font-semibold text-white">強み・長所</h4>
                                    </div>
                                    <div className="space-y-2 mb-4">
                                        {(mode === 'character' && formData ? (formData as Character).strengths || [] : []).map((strength: string, index: number) => (
                                            <div key={index} className="flex items-center gap-2">
                                                <Input 
                                                    value={strength} 
                                                    placeholder="強みや長所を入力"
                                                    className="bg-slate-800/50 border-slate-600 focus:border-emerald-400 text-sm"
                                                    onChange={e => {
                                                        const newStrengths = [...(mode === 'character' && formData ? (formData as Character).strengths || [] : [])];
                                                        newStrengths[index] = e.target.value;
                                                        setFormData(prev => prev ? {...prev as any, strengths: newStrengths} : null);
                                                    }}
                                                />
                                                <Button 
                                                    size="icon" 
                                                    variant="ghost" 
                                                    className="text-red-400 hover:text-red-300 shrink-0"
                                                    onClick={() => {
                                                        const newStrengths = (mode === 'character' && formData ? (formData as Character).strengths || [] : []).filter((_: string, i: number) => i !== index);
                                                        setFormData(prev => prev ? {...prev as any, strengths: newStrengths} : null);
                                                    }}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                    <Button 
                                        size="sm" 
                                        variant="outline" 
                                        className="w-full border-emerald-600 text-emerald-300 hover:bg-emerald-600/20"
                                        onClick={() => setFormData(prev => prev ? {...prev as any, strengths: [...(mode === 'character' && formData ? (formData as Character).strengths || [] : []), '']} : null)}
                                    >
                                        <PlusCircle className="w-4 h-4 mr-2" />
                                        強みを追加
                                    </Button>
                                </div>

                                <div className="bg-gradient-to-br from-orange-900/20 to-red-900/20 p-5 rounded-xl border border-orange-700/30">
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="text-orange-400 text-lg">⚠️</span>
                                        <h4 className="text-lg font-semibold text-white">弱み・短所</h4>
                                    </div>
                                    <div className="space-y-2 mb-4">
                                        {(mode === 'character' && formData ? (formData as Character).weaknesses || [] : []).map((weakness: string, index: number) => (
                                            <div key={index} className="flex items-center gap-2">
                                                <Input 
                                                    value={weakness} 
                                                    placeholder="弱点や短所を入力"
                                                    className="bg-slate-800/50 border-slate-600 focus:border-orange-400 text-sm"
                                                    onChange={e => {
                                                        const newWeaknesses = [...(mode === 'character' && formData ? (formData as Character).weaknesses || [] : [])];
                                                        newWeaknesses[index] = e.target.value;
                                                        setFormData(prev => prev ? {...prev as any, weaknesses: newWeaknesses} : null);
                                                    }}
                                                />
                                                <Button 
                                                    size="icon" 
                                                    variant="ghost" 
                                                    className="text-red-400 hover:text-red-300 shrink-0"
                                                    onClick={() => {
                                                        const newWeaknesses = (mode === 'character' && formData ? (formData as Character).weaknesses || [] : []).filter((_: string, i: number) => i !== index);
                                                        setFormData(prev => prev ? {...prev as any, weaknesses: newWeaknesses} : null);
                                                    }}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                    <Button 
                                        size="sm" 
                                        variant="outline" 
                                        className="w-full border-orange-600 text-orange-300 hover:bg-orange-600/20"
                                        onClick={() => setFormData(prev => prev ? {...prev as any, weaknesses: [...(mode === 'character' && formData ? (formData as Character).weaknesses || [] : []), '']} : null)}
                                    >
                                        <PlusCircle className="w-4 h-4 mr-2" />
                                        弱みを追加
                                    </Button>
                                </div>
                            </div>
                        </TabsContent>
                        <TabsContent value="trackers" className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-semibold text-white">トラッカー設定</h3>
                                <Button variant="outline" size="sm" onClick={() => console.log("Add new tracker")}>
                                    <PlusCircle className="w-4 h-4 mr-2" />
                                    新規トラッカーを追加
                                </Button>
                            </div>
                            <div className="space-y-4">
                                {(mode === 'character' && formData ? (formData as Character).trackers : [])?.map((tracker: TrackerDefinition, index: number) => (
                                    <div key={index} className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                                        <div className="flex justify-between items-center cursor-pointer" onClick={() => setExpandedTracker(expandedTracker === index ? null : index)}>
                                            <span className="font-semibold text-white">{tracker.display_name}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-300 rounded-full">{tracker.type}</span>
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); console.log("Delete tracker", index)}}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                                {expandedTracker === index ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                            </div>
                                        </div>
                                        <p className="text-sm text-slate-400 mt-1">{tracker.description}</p>
                                        <AnimatePresence>
                                        {expandedTracker === index && (
                                            <motion.div 
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="mt-4"
                                            >
                                                <TrackerEditor 
                                                    tracker={tracker} 
                                                    onChange={(newConfig) => {
                                                        const newTrackers = [...(formData && mode === 'character' ? (formData as Character).trackers || [] : [])];
                                                        newTrackers[index] = { ...newTrackers[index], config: newConfig };
                                                        setFormData(prev => prev ? { ...prev, trackers: newTrackers } as any : null);
                                                    }}
                                                />
                                            </motion.div>
                                        )}
                                        </AnimatePresence>
                                    </div>
                                ))}
                                {(mode !== 'character' || !formData || !(formData as Character).trackers || (formData as Character).trackers.length === 0) && (
                                    <p className="text-slate-500 text-center py-4">
                                        このキャラクターにはトラッカーが設定されていません。
                                    </p>
                                )}
                            </div>
                        </TabsContent>
                        <TabsContent value="personality" className="space-y-8">
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
                                        onChange={e => setFormData(prev => prev ? {...prev as any, personality: e.target.value} : null)}
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
                        </TabsContent>

                        <TabsContent value="scenario" className="space-y-8">
                            <div className="bg-gradient-to-br from-emerald-900/20 to-teal-900/20 p-6 rounded-xl border border-emerald-700/30">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                                        <span className="text-emerald-400 text-lg">📚</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-white">背景設定</h3>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-sm text-slate-400">キャラクターの過去、生い立ち、経歴など</p>
                                    <Textarea
                                        placeholder="例: 魔法学院で生まれ育った女の子。幼い頃から特別な魔力を持っていたが..."
                                        value={isCharacter(formData) ? formData.background || '' : ''}
                                        onChange={e => setFormData(prev => isCharacter(prev) ? {...prev, background: e.target.value} : prev)}
                                        rows={6}
                                        className="bg-slate-800/50 border-slate-600 focus:border-emerald-400 resize-none"
                                    />
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 p-6 rounded-xl border border-indigo-700/30">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                                        <span className="text-indigo-400 text-lg">🎭</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-white">シナリオ設定</h3>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-sm text-slate-400">会話が始まる状況や舞台設定</p>
                                    <Textarea
                                        placeholder="例: 学院の図書館で、夕日が差し込む中。あなたは古い本を読んでいると..."
                                        value={isCharacter(formData) ? formData.scenario || '' : ''}
                                        onChange={e => setFormData(prev => isCharacter(prev) ? {...prev, scenario: e.target.value} : prev)}
                                        rows={6}
                                        className="bg-slate-800/50 border-slate-600 focus:border-indigo-400 resize-none"
                                    />
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-pink-900/20 to-rose-900/20 p-6 rounded-xl border border-pink-700/30">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-8 h-8 bg-pink-500/20 rounded-lg flex items-center justify-center">
                                        <span className="text-pink-400 text-lg">💬</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-white">最初のメッセージ</h3>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-sm text-slate-400">キャラクターが最初に言う台詞</p>
                                    <Textarea
                                        placeholder="例: あら、こんなところに人がいたのね。私はエミリア。あなたは？"
                                        value={isCharacter(formData) ? formData.first_message || '' : ''}
                                        onChange={e => setFormData(prev => isCharacter(prev) ? {...prev, first_message: e.target.value} : prev)}
                                        rows={4}
                                        className="bg-slate-800/50 border-slate-600 focus:border-pink-400 resize-none"
                                    />
                                </div>
                            </div>
                        </TabsContent>

                        {mode === 'character' && (
                        <TabsContent value="nsfw" className="space-y-6">
                            <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
                                <h4 className="text-red-300 font-semibold mb-2">18+ コンテンツ設定</h4>
                                <p className="text-red-200 text-sm mb-4">この設定は成人向けコンテンツに関連します。</p>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">NSFWペルソナ</label>
                                <Textarea
                                    placeholder="成人向けシーンでのキャラクターの特徴..."
                                    value={isCharacter(formData) ? formData.nsfw_profile?.persona || '' : ''}
                                    onChange={e => {
                                        if (isCharacter(formData)) {
                                            setFormData({
                                                ...formData, 
                                                nsfw_profile: {
                                                    ...formData.nsfw_profile,
                                                    persona: e.target.value
                                                }
                                            });
                                        }
                                    }}
                                    rows={4}
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">性的欲求レベル</label>
                                <Input
                                    placeholder="低い、中程度、高い など"
                                    value={isCharacter(formData) ? formData.nsfw_profile?.libido_level || '' : ''}
                                    onChange={e => {
                                        if (isCharacter(formData)) {
                                            setFormData({
                                                ...formData, 
                                                nsfw_profile: {
                                                    ...formData.nsfw_profile,
                                                    libido_level: e.target.value
                                                }
                                            });
                                        }
                                    }}
                                />
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">ハードリミット（絶対NG）</label>
                                    <Textarea
                                        placeholder="絶対に行わない行為..."
                                        value={isCharacter(formData) ? formData.nsfw_profile?.kinks?.find(k => k.startsWith('hard:'))?.replace('hard:', '') || '' : ''}
                                        onChange={e => {
                                            if (isCharacter(formData)) {
                                                const kinks = formData.nsfw_profile?.kinks || [];
                                                const updatedKinks = kinks.filter(k => !k.startsWith('hard:'));
                                                if (e.target.value) updatedKinks.push(`hard:${e.target.value}`);
                                                setFormData({
                                                    ...formData, 
                                                    nsfw_profile: {
                                                        ...formData.nsfw_profile,
                                                        kinks: updatedKinks
                                                    }
                                                });
                                            }
                                        }}
                                        rows={3}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">ソフトリミット（条件付きNG）</label>
                                    <Textarea
                                        placeholder="条件によってはNGとなる行為..."
                                        value={isCharacter(formData) ? formData.nsfw_profile?.kinks?.find(k => k.startsWith('soft:'))?.replace('soft:', '') || '' : ''}
                                        onChange={e => {
                                            if (isCharacter(formData)) {
                                                const kinks = formData.nsfw_profile?.kinks || [];
                                                const updatedKinks = kinks.filter(k => !k.startsWith('soft:'));
                                                if (e.target.value) updatedKinks.push(`soft:${e.target.value}`);
                                                setFormData({
                                                    ...formData, 
                                                    nsfw_profile: {
                                                        ...formData.nsfw_profile,
                                                        kinks: updatedKinks
                                                    }
                                                });
                                            }
                                        }}
                                        rows={3}
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">性的嗜好・キンク</label>
                                {(isCharacter(formData) ? formData.nsfw_profile?.kinks || [] : []).map((kink: string, index: number) => (
                                    <div key={index} className="flex items-center gap-2 mb-2">
                                        <Input 
                                            value={kink} 
                                            onChange={e => {
                                                if (isCharacter(formData)) {
                                                    const newKinks = [...(formData.nsfw_profile?.kinks || [])];
                                                    newKinks[index] = e.target.value;
                                                    setFormData({
                                                        ...formData, 
                                                        nsfw_profile: {
                                                            ...formData.nsfw_profile,
                                                            kinks: newKinks
                                                        }
                                                    });
                                                }
                                            }}
                                        />
                                        <Button 
                                            size="icon" 
                                            variant="ghost" 
                                            onClick={() => {
                                                if (isCharacter(formData)) {
                                                    const newKinks = (formData.nsfw_profile?.kinks || []).filter((_: string, i: number) => i !== index);
                                                    setFormData({
                                                        ...formData, 
                                                        nsfw_profile: {
                                                            ...formData.nsfw_profile,
                                                            kinks: newKinks
                                                        }
                                                    });
                                                }
                                            }}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                                <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={() => {
                                        if (isCharacter(formData)) {
                                            setFormData({
                                                ...formData, 
                                                nsfw_profile: {
                                                    ...formData.nsfw_profile,
                                                    kinks: [...(formData.nsfw_profile?.kinks || []), '']
                                                }
                                            });
                                        }
                                    }}
                                >
                                    <PlusCircle className="w-4 h-4 mr-2" />
                                    キンクを追加
                                </Button>
                            </div>
                            
                        </TabsContent>
                        )}
                        
                        {mode === 'character' && (
                        <TabsContent value="prompt" className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">システムプロンプト</label>
                                <Textarea
                                    placeholder="AIへの指示やキャラクターの行動指針..."
                                    value={isCharacter(formData) ? formData.system_prompt || '' : ''}
                                    onChange={e => setFormData(prev => isCharacter(prev) ? {...prev, system_prompt: e.target.value} : prev)}
                                    rows={8}
                                />
                            </div>
                        </TabsContent>
                        )}

                            {/* 外見・アバターカード - キャラクターのみ */}
                            {mode === 'character' && (
                                <AppearancePanel
                                    formData={formData as Character | null}
                                    setFormData={setFormData as React.Dispatch<React.SetStateAction<Character | null>>}
                                    handleFileUpload={handleFileUpload}
                                />
                            )}

                            {/* 性格・特性カード */}
                            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-6 rounded-xl border border-slate-700/50">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                                        <span className="text-purple-400 text-lg">🧠</span>
                                    </div>
                                    <h3 className="text-xl font-bold text-white">性格・特性</h3>
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-300">性格（全体的な説明）</label>
                                        <Textarea
                                            placeholder="キャラクターの基本的な性格、価値観、行動パターンなどを詳しく記述..."
                                            value={isCharacter(formData) ? formData.personality || '' : ''}
                                            onChange={e => setFormData(prev => isCharacter(prev) ? {...prev, personality: e.target.value} : prev)}
                                            rows={6}
                                            className="bg-slate-800/50 border-slate-600 focus:border-violet-400 resize-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Tabs>
                    
                    <DialogFooter>
                        <Button variant="ghost" onClick={onClose}>キャンセル</Button>
                        <Button onClick={handleSave}>変更を保存</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    };
