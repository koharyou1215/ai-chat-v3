'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion as _motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label as _Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Upload, X, PlusCircle, Trash2 } from 'lucide-react';
import { Character } from '@/types/core/character.types';
import { Persona } from '@/types/core/persona.types';
import { cn } from '@/lib/utils';
import { AnimatePresence as _AnimatePresence } from 'framer-motion';
import { ImageUploader as _ImageUploader } from '@/components/ui/image-uploader';
import { AppearancePanel } from './AppearancePanel'; // ★ 専門医をインポート
import { BasicInfoPanel } from './BasicInfoPanel';
import { PersonalityPanel } from './PersonalityPanel';
import { TrackersPanel } from './TrackersPanel';

// 文字列の制御文字を正規化する関数
const sanitizeString = (value: string): string => {
  if (!value) return value;
  // 制御文字（タブ、改行以外）を削除し、改行とタブは維持
  return value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
};

// Type guard functions
const isCharacter = (data: Character | Persona | null): data is Character => {
  return data !== null && 'speaking_style' in data;
};

const _isPersona = (data: Character | Persona | null): data is Persona => {
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
    const [isUploading, setIsUploading] = useState(false); // Add uploading state

    const handleSave = () => {
        if (formData) {
            onSave(formData);
            onClose();
        }
    };
    
    const handleFileUpload = async (file: File, field: 'background_url') => {
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

            // Safe JSON parsing with comprehensive error handling
            let result;
            try {
                if (!response.ok) {
                    // Try to get error text even if not JSON
                    const errorText = await response.text();
                    console.error('Server response error:', errorText);
                    throw new Error(`ファイルアップロードに失敗しました (${response.status}): ${errorText || response.statusText}`);
                }

                // Check content type before parsing JSON
                const contentType = response.headers.get('content-type');
                if (!contentType?.includes('application/json')) {
                    const errorText = await response.text();
                    console.error('Non-JSON response received:', errorText);
                    throw new Error(`サーバーがJSON以外のレスポンスを返しました: ${errorText}`);
                }

                result = await response.json();
            } catch (parseError) {
                console.error('JSON parse error during file upload:', parseError);
                if (parseError instanceof SyntaxError) {
                    throw new Error('サーバーレスポンスの解析に失敗しました。サーバーエラーの可能性があります。');
                }
                throw parseError;
            }
            
            console.log('Upload result:', result);

            if (result && result.success && result.url) {
                setFormData(prevFormData => prevFormData ? { ...prevFormData, [field]: result.url } : null);
                console.log('File upload successful, URL:', result.url);
            } else {
                const errorMessage = result?.error || 'ファイルURLの取得に失敗しました';
                throw new Error(errorMessage);
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
        field: 'background_url'; // 🔧 FIX: avatar_url削除
        url?: string | null;
        onFileUpload: (file: File) => void;
        onUrlChange: (url: string) => void;
        onClear: () => void;
        className?: string;
        aspectRatio?: 'aspect-square' | 'aspect-video';
    }> = ({ label, field, url, onFileUpload, onUrlChange, onClear, className, aspectRatio = 'aspect-square' }) => {
        const [isDragging, setIsDragging] = useState(false);
        const [hasError, setHasError] = useState(false);

        useEffect(() => {
            setHasError(false);
        }, [url]);

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
                                    <Image 
                                        src={url} 
                                        alt="preview" 
                                        fill
                                        className="object-cover"
                                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                        unoptimized
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
                            <BasicInfoPanel
                                formData={formData}
                                setFormData={setFormData}
                                mode={mode}
                                handleFileUpload={handleFileUpload}
                            />
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
                                            onChange={e => setFormData(prev => prev ? {...(prev as Character), appearance: e.target.value} : null)}
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
                                                        onChange={e => setFormData(prev => prev ? {...(prev as Character), color_theme: {...((prev as Character)?.color_theme || { primary: '#8b5cf6', secondary: '#8b5cf6', accent: '#8b5cf6' }), primary: e.target.value}} : null)}
                                                        className="w-10 h-8 rounded border border-slate-600"
                                                    />
                                                    <Input 
                                                        value={mode === 'character' && formData ? (formData as Character).color_theme?.primary || '#8b5cf6' : '#8b5cf6'}
                                                        onChange={e => setFormData(prev => prev ? {...(prev as Character), color_theme: {...((prev as Character)?.color_theme || { primary: '#8b5cf6', secondary: '#8b5cf6', accent: '#8b5cf6' }), primary: e.target.value}} : null)}
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
                                                        onChange={e => setFormData(prev => prev ? {...(prev as Character), color_theme: {...((prev as Character)?.color_theme || { primary: '#8b5cf6', secondary: '#8b5cf6', accent: '#8b5cf6' }), secondary: e.target.value}} : null)}
                                                        className="w-10 h-8 rounded border border-slate-600"
                                                    />
                                                    <Input 
                                                        value={mode === 'character' && formData ? (formData as Character).color_theme?.secondary || '#a0aec0' : '#a0aec0'}
                                                        onChange={e => setFormData(prev => prev ? {...(prev as Character), color_theme: {...((prev as Character)?.color_theme || { primary: '#8b5cf6', secondary: '#8b5cf6', accent: '#8b5cf6' }), secondary: e.target.value}} : null)}
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
                                                        onChange={e => setFormData(prev => prev ? {...(prev as Character), color_theme: {...((prev as Character)?.color_theme || { primary: '#8b5cf6', secondary: '#8b5cf6', accent: '#8b5cf6' }), accent: e.target.value}} : null)}
                                                        className="w-10 h-8 rounded border border-slate-600"
                                                    />
                                                    <Input 
                                                        value={mode === 'character' && formData ? (formData as Character).color_theme?.accent || '#f59e0b' : '#f59e0b'}
                                                        onChange={e => setFormData(prev => prev ? {...(prev as Character), color_theme: {...((prev as Character)?.color_theme || { primary: '#8b5cf6', secondary: '#8b5cf6', accent: '#8b5cf6' }), accent: e.target.value}} : null)}
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
                                            onChange={e => setFormData(prev => prev ? {...(prev as Character), image_prompt: e.target.value} : null)}
                                            rows={4}
                                            className="bg-slate-800/50 border-slate-600 focus:border-cyan-400 resize-none"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-300">AI画像生成用ネガティブプロンプト</label>
                                <Textarea
                                            placeholder="例: ugly, deformed, blurry, low quality, extra limbs..."
                                            value={mode === 'character' && formData ? (formData as Character).negative_prompt || '' : ''}
                                            onChange={e => setFormData(prev => prev ? {...(prev as Character), negative_prompt: e.target.value} : null)}
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
                                            <div key={`strength-${index}`} className="flex items-center gap-2">
                                                <Input 
                                                    value={strength} 
                                                    placeholder="強みや長所を入力"
                                                    className="bg-slate-800/50 border-slate-600 focus:border-emerald-400 text-sm"
                                                    onChange={e => {
                                                        const newStrengths = [...(mode === 'character' && formData ? (formData as Character).strengths || [] : [])];
                                                        newStrengths[index] = e.target.value;
                                                        setFormData(prev => prev ? {...(prev as Character), strengths: newStrengths} : null);
                                                    }}
                                                />
                                                <Button 
                                                    size="icon" 
                                                    variant="ghost" 
                                                    className="text-red-400 hover:text-red-300 shrink-0"
                                                    onClick={() => {
                                                        const newStrengths = (mode === 'character' && formData ? (formData as Character).strengths || [] : []).filter((_: string, i: number) => i !== index);
                                                        setFormData(prev => prev ? {...(prev as Character), strengths: newStrengths} : null);
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
                                        onClick={() => setFormData(prev => prev ? {...(prev as Character), strengths: [...(mode === 'character' && formData ? (formData as Character).strengths || [] : []), '']} : null)}
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
                                            <div key={`weakness-${index}`} className="flex items-center gap-2">
                                                <Input 
                                                    value={weakness} 
                                                    placeholder="弱点や短所を入力"
                                                    className="bg-slate-800/50 border-slate-600 focus:border-orange-400 text-sm"
                                                    onChange={e => {
                                                        const newWeaknesses = [...(mode === 'character' && formData ? (formData as Character).weaknesses || [] : [])];
                                                        newWeaknesses[index] = e.target.value;
                                                        setFormData(prev => prev ? {...(prev as Character), weaknesses: newWeaknesses} : null);
                                                    }}
                                                />
                                                <Button 
                                                    size="icon" 
                                                    variant="ghost" 
                                                    className="text-red-400 hover:text-red-300 shrink-0"
                                                    onClick={() => {
                                                        const newWeaknesses = (mode === 'character' && formData ? (formData as Character).weaknesses || [] : []).filter((_: string, i: number) => i !== index);
                                                        setFormData(prev => prev ? {...(prev as Character), weaknesses: newWeaknesses} : null);
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
                                        onClick={() => setFormData(prev => prev ? {...(prev as Character), weaknesses: [...(mode === 'character' && formData ? (formData as Character).weaknesses || [] : []), '']} : null)}
                                    >
                                        <PlusCircle className="w-4 h-4 mr-2" />
                                        弱みを追加
                                    </Button>
                                </div>
                            </div>
                        </TabsContent>
                        <TabsContent value="trackers" className="space-y-6">
                            <TrackersPanel
                                formData={formData}
                                setFormData={setFormData}
                                mode={mode}
                            />
                        </TabsContent>
                        <TabsContent value="personality" className="space-y-8">
                            <PersonalityPanel
                                formData={formData}
                                setFormData={setFormData}
                                mode={mode}
                            />
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
                                        value={isCharacter(formData) && Array.isArray(formData.nsfw_profile?.kinks) ? formData.nsfw_profile.kinks.find(k => k.startsWith('hard:'))?.replace('hard:', '') || '' : ''}
                                        onChange={e => {
                                            if (isCharacter(formData)) {
                                                const sanitizedValue = sanitizeString(e.target.value);
                                                const kinks = Array.isArray(formData.nsfw_profile?.kinks) ? formData.nsfw_profile.kinks : [];
                                                const updatedKinks = kinks.filter(k => !k.startsWith('hard:'));
                                                if (sanitizedValue) updatedKinks.push(`hard:${sanitizedValue}`);
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
                                        value={isCharacter(formData) && Array.isArray(formData.nsfw_profile?.kinks) ? formData.nsfw_profile.kinks.find(k => k.startsWith('soft:'))?.replace('soft:', '') || '' : ''}
                                        onChange={e => {
                                            if (isCharacter(formData)) {
                                                const sanitizedValue = sanitizeString(e.target.value);
                                                const kinks = Array.isArray(formData.nsfw_profile?.kinks) ? formData.nsfw_profile.kinks : [];
                                                const updatedKinks = kinks.filter(k => !k.startsWith('soft:'));
                                                if (sanitizedValue) updatedKinks.push(`soft:${sanitizedValue}`);
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
                                {(isCharacter(formData) && Array.isArray(formData.nsfw_profile?.kinks) ? formData.nsfw_profile.kinks : []).map((kink: string, index: number) => (
                                    <div key={`kink-${index}`} className="flex items-center gap-2 mb-2">
                                        <Input 
                                            value={kink} 
                                            onChange={e => {
                                                if (isCharacter(formData)) {
                                                    const sanitizedValue = sanitizeString(e.target.value);
                                                    const newKinks = [...(Array.isArray(formData.nsfw_profile?.kinks) ? formData.nsfw_profile.kinks : [])];
                                                    newKinks[index] = sanitizedValue;
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
                                                    const newKinks = (Array.isArray(formData.nsfw_profile?.kinks) ? formData.nsfw_profile.kinks : []).filter((_: string, i: number) => i !== index);
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
                                                    kinks: [...(Array.isArray(formData.nsfw_profile?.kinks) ? formData.nsfw_profile.kinks : []), '']
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
                                    setFormData={setFormData}
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
