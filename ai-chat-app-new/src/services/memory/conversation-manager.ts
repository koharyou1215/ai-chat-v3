// Integrated Conversation Management System for AI Chat V3
// Combines hierarchical memory, vector search, and dynamic summarization

import { VectorStore } from './vector-store';
import { MemoryLayerManager } from './memory-layer-manager';
import { DynamicSummarizer } from './dynamic-summarizer';
import { TrackerManager } from '../tracker/tracker-manager'; // Import TrackerManager
import { UnifiedMessage, SearchResult, ConversationContext, Character, MemoryCard, Persona } from '@/types';
import { DEFAULT_SYSTEM_PROMPT } from '@/constants/prompts';
import { replaceVariables, replaceVariablesInCharacter } from '@/utils/variable-replacer';

/**
 * 統合会話管理システム
 * 階層的メモリ、ベクトル検索、動的要約を統合
 */
export class ConversationManager {
  private vectorStore: VectorStore;
  private memoryLayers: MemoryLayerManager;
  private summarizer: DynamicSummarizer;
  private trackerManager?: TrackerManager; // Make it optional
  
  // 設定パラメータ（デフォルト値）
  private config = {
    maxImmediateContext: 3,
    maxWorkingMemory: 6,
    maxRelevantMemories: 5,
    maxMemoryCards: 50,
    maxPromptTokens: 32000,
    maxContextMessages: 20,
    summarizeInterval: 10,      // 10メッセージごとに要約
    vectorSearchThreshold: 0.7,
    enablePinning: true,
    costOptimization: {
      batchEmbedding: true,
      cacheEnabled: true,
      lowImportanceThreshold: 0.3
    }
  };

  // 内部状態
  private allMessages: UnifiedMessage[] = [];
  private sessionSummary: string = '';
  private pinnedMessages: Set<string> = new Set();
  private messageCount: number = 0;

  constructor(initialMessages: UnifiedMessage[] = [], trackerManager?: TrackerManager) {
    this.vectorStore = new VectorStore();
    this.memoryLayers = new MemoryLayerManager();
    this.summarizer = new DynamicSummarizer();
    this.trackerManager = trackerManager; // Assign from constructor
    this.allMessages = initialMessages;
    this.messageCount = initialMessages.length;
    this.importMessages(initialMessages);
  }

  /**
   * 記憶容量の設定を更新
   */
  public updateMemoryLimits(limits: {
    max_working_memory?: number;
    max_memory_cards?: number;
    max_relevant_memories?: number;
    max_prompt_tokens?: number;
    max_context_messages?: number;
  }) {
    if (limits.max_working_memory) this.config.maxWorkingMemory = limits.max_working_memory;
    if (limits.max_memory_cards) this.config.maxMemoryCards = limits.max_memory_cards;
    if (limits.max_relevant_memories) this.config.maxRelevantMemories = limits.max_relevant_memories;
    if (limits.max_prompt_tokens) this.config.maxPromptTokens = limits.max_prompt_tokens;
    if (limits.max_context_messages) this.config.maxContextMessages = limits.max_context_messages;
  }

  /**
   * メッセージの一括インポート（パフォーマンス最適化）
   */
  public async importMessages(messages: UnifiedMessage[]): Promise<void> {
      this.allMessages = messages;
      this.messageCount = messages.length;
      
      // バッチ処理でメモリレイヤーを更新
      for (const message of messages) {
          this.memoryLayers.addMessage(message);
      }
      
      // インデックス対象メッセージを抽出してバッチ処理
      const messagesToIndex = messages.filter(msg => this.shouldIndexMessage(msg));
      
      if (messagesToIndex.length > 0) {
          // バッチでベクトルストアに追加（大幅なパフォーマンス向上）
          await this.vectorStore.addMessagesBatch(messagesToIndex);
      }
  }

  /**
   * メッセージを追加して処理
   * パフォーマンス最適化: 重い処理を非同期化して即座にレスポンス
   */
  async addMessage(
    role: 'user' | 'assistant',
    content: string,
    metadata?: Record<string, unknown>
  ): Promise<UnifiedMessage> {
    // メッセージオブジェクトの作成（軽量処理のみ）
    const now = new Date().toISOString();
    const message: UnifiedMessage = {
      id: this.generateMessageId(),
      created_at: now,
      updated_at: now,
      version: 1,
      metadata: metadata || {},
      
      session_id: '', // セッションIDは呼び出し側で設定
      role,
      content,
      
      memory: {
        importance: {
          score: this.calculateImportance(content, metadata),
          factors: {
            emotional_weight: 0.5,
            repetition_count: 0,
            user_emphasis: 0.5,
            ai_judgment: 0.5
          }
        },
        is_pinned: false,
        is_bookmarked: false,
        keywords: [],
        summary: undefined
      },
      
      expression: {
        emotion: {
          primary: 'neutral',
          intensity: 0.5,
          emoji: '😐'
        },
        style: {
          font_weight: 'normal',
          text_color: '#ffffff'
        },
        effects: []
      },
      
      edit_history: [],
      regeneration_count: 0,
      is_deleted: false
    };

    // 即座に基本データを更新（UI ブロッキング回避）
    this.allMessages.push(message);
    this.messageCount++;

    // 重い処理は非同期で実行（UIをブロックしない）
    this.processMessageAsync(message).catch(error => {
      console.error('Async message processing failed:', error);
    });

    return message;
  }
  
  /**
   * 非同期でのメッセージ処理（UIをブロックしない）
   */
  private async processMessageAsync(message: UnifiedMessage): Promise<void> {
    const processingTasks = [];
    
    // 階層的メモリに追加
    processingTasks.push(
      Promise.resolve().then(() => this.memoryLayers.addMessage(message))
    );

    // ベクトルストアに追加（コスト最適化考慮）
    if (this.shouldIndexMessage(message)) {
      processingTasks.push(
        this.vectorStore.addMessage(message)
      );
    }

    // 自動要約のトリガー
    if (this.messageCount % this.config.summarizeInterval === 0) {
      processingTasks.push(
        this.updateSessionSummary()
      );
    }

    // 全ての処理を並列実行
    await Promise.allSettled(processingTasks);

    // 重要な情報の自動抽出とピン留め（最後に実行）
    if (await this.shouldAutoPinMessage(message)) {
      this.pinMessage(message.id);
    }
  }

  /**
   * 応答生成用のコンテキストを構築
   * 階層的メモリとベクトル検索を組み合わせた最適なコンテキスト生成
   */
  async buildContext(currentInput: string): Promise<ConversationContext> {
    // 1. 階層的メモリから取得
    const layeredMemory = this.memoryLayers.getLayeredContext(currentInput);
    
    // 2. ベクトル検索で関連メッセージを取得
    const relevantMemories = await this.searchRelevantMemories(currentInput);
    
    // 3. ピン留めされたメッセージを取得
    const pinnedMessages = this.getPinnedMessages();
    
    // 4. 感情状態の推定
    const emotionalState = this.estimateEmotionalState();
    
    // 5. コンテキストの構築
    const context: ConversationContext = {
      currentInput,
      recentConversation: layeredMemory.working.slice(-this.config.maxWorkingMemory),
      relevantMemories: relevantMemories,
      pinnedMemories: pinnedMessages,
      emotionalState
    };

    // 6. トークン数の最適化
    return this.optimizeContextTokens(context);
  }

  /**
   * プロンプトの生成
   * タグシステムを使用して構造化
   */
  async generatePrompt(
    userInput: string,
    character?: Character,
    persona?: Persona,
    systemSettings?: {
      systemPrompts: {
        system?: string;
        jailbreak?: string;
      };
      enableSystemPrompt: boolean;
      enableJailbreakPrompt: boolean;
    }
  ): Promise<string> {
    const context = await this.buildContext(userInput);
    
    // 変数置換コンテキストを作成
    const variableContext = { user: persona, character };
    
    // キャラクター情報に変数置換を適用
    const processedCharacter = character ? replaceVariablesInCharacter(character, variableContext) : undefined;
    
    let prompt = '';

    // 1. System Definitions (最優先)
    prompt += `AI={{char}}, User={{user}}\n\n`;

    // 2. System Prompt (絶対厳守事項を最優先)
    let systemPromptContent = DEFAULT_SYSTEM_PROMPT;
    
    // カスタムプロンプトが有効で内容がある場合は追加
    if (systemSettings?.enableSystemPrompt && 
        systemSettings.systemPrompts?.system && 
        systemSettings.systemPrompts.system.trim() !== DEFAULT_SYSTEM_PROMPT.trim()) {
      systemPromptContent += `\n\n## 追加指示\n${systemSettings.systemPrompts.system}`;
    }
    
    prompt += `<system_instructions>\n${systemPromptContent}\n</system_instructions>\n\n`;

    // 4. Character Information (Enhanced)
    if (processedCharacter) {
      prompt += '<character_information>\n';
      
      // 基本情報
      prompt += `## Basic Information\n`;
      prompt += `Name: ${processedCharacter.name}\n`;
      if (processedCharacter.age) prompt += `Age: ${processedCharacter.age}\n`;
      if (processedCharacter.occupation) prompt += `Occupation: ${processedCharacter.occupation}\n`;
      if (processedCharacter.catchphrase) prompt += `Catchphrase: "${processedCharacter.catchphrase}"\n`;
      if (processedCharacter.tags && Array.isArray(processedCharacter.tags) && processedCharacter.tags.length > 0) {
        prompt += `Tags: ${processedCharacter.tags.join(', ')}\n`;
      }
      
      // 外見
      if (processedCharacter.appearance) {
        prompt += `\n## Appearance\n`;
        prompt += `${processedCharacter.appearance}\n`;
      }
      
      // 性格詳細
      prompt += `\n## Personality\n`;
      if (processedCharacter.personality) prompt += `Overall: ${processedCharacter.personality}\n`;
      if (processedCharacter.external_personality) prompt += `External (How others see them): ${processedCharacter.external_personality}\n`;
      if (processedCharacter.internal_personality) prompt += `Internal (True feelings): ${processedCharacter.internal_personality}\n`;
      
      // 長所・短所
      if (processedCharacter.strengths && (Array.isArray(processedCharacter.strengths) ? processedCharacter.strengths.length > 0 : processedCharacter.strengths)) {
        const strengths = Array.isArray(processedCharacter.strengths) ? processedCharacter.strengths : `${processedCharacter.strengths}`.split(',').map(s => s.trim());
        prompt += `Strengths: ${strengths.join(', ')}\n`;
      }
      if (processedCharacter.weaknesses && (Array.isArray(processedCharacter.weaknesses) ? processedCharacter.weaknesses.length > 0 : processedCharacter.weaknesses)) {
        const weaknesses = Array.isArray(processedCharacter.weaknesses) ? processedCharacter.weaknesses : `${processedCharacter.weaknesses}`.split(',').map(s => s.trim());
        prompt += `Weaknesses: ${weaknesses.join(', ')}\n`;
      }
      
      // 趣味・好み
      if (processedCharacter.hobbies && (Array.isArray(processedCharacter.hobbies) ? processedCharacter.hobbies.length > 0 : processedCharacter.hobbies)) {
        const hobbies = Array.isArray(processedCharacter.hobbies) ? processedCharacter.hobbies : `${processedCharacter.hobbies}`.split(',').map(s => s.trim());
        prompt += `Hobbies: ${hobbies.join(', ')}\n`;
      }
      if (processedCharacter.likes && (Array.isArray(processedCharacter.likes) ? processedCharacter.likes.length > 0 : processedCharacter.likes)) {
        const likes = Array.isArray(processedCharacter.likes) ? processedCharacter.likes : `${processedCharacter.likes}`.split(',').map(s => s.trim());
        prompt += `Likes: ${likes.join(', ')}\n`;
      }
      if (processedCharacter.dislikes && (Array.isArray(processedCharacter.dislikes) ? processedCharacter.dislikes.length > 0 : processedCharacter.dislikes)) {
        const dislikes = Array.isArray(processedCharacter.dislikes) ? processedCharacter.dislikes : `${processedCharacter.dislikes}`.split(',').map(s => s.trim());
        prompt += `Dislikes: ${dislikes.join(', ')}\n`;
      }
      
      // 話し方・言語スタイル
      prompt += `\n## Communication Style\n`;
      if (processedCharacter.speaking_style) prompt += `Speaking Style: ${processedCharacter.speaking_style}\n`;
      if (processedCharacter.first_person) prompt += `First Person: ${processedCharacter.first_person}\n`;
      if (processedCharacter.second_person) prompt += `Second Person: ${processedCharacter.second_person}\n`;
      if (processedCharacter.verbal_tics && (Array.isArray(processedCharacter.verbal_tics) ? processedCharacter.verbal_tics.length > 0 : processedCharacter.verbal_tics)) {
        const verbal_tics = Array.isArray(processedCharacter.verbal_tics) ? processedCharacter.verbal_tics : `${processedCharacter.verbal_tics}`.split(',').map(s => s.trim());
        prompt += `Verbal Tics: ${verbal_tics.join(', ')}\n`;
      }
      
      // 背景・シナリオ
      if (processedCharacter.background) {
        prompt += `\n## Background\n${processedCharacter.background}\n`;
      }
      if (processedCharacter.scenario) {
        prompt += `\n## Current Scenario\n${processedCharacter.scenario}\n`;
      }
      
      // 初回メッセージ（参考として）
      if (processedCharacter.first_message) {
        prompt += `\n## Reference First Message\n"${processedCharacter.first_message}"\n`;
      }
      
      // NSFW設定（適切に処理）
      if (processedCharacter.nsfw_profile && processedCharacter.nsfw_profile.persona) {
        prompt += `\n## Special Context\n`;
        if (processedCharacter.nsfw_profile.persona) prompt += `Context Persona: ${processedCharacter.nsfw_profile.persona}\n`;
        if (processedCharacter.nsfw_profile.situation) prompt += `Situation: ${processedCharacter.nsfw_profile.situation}\n`;
        if (processedCharacter.nsfw_profile.mental_state) prompt += `Mental State: ${processedCharacter.nsfw_profile.mental_state}\n`;
      }
      
      prompt += '</character_information>\n\n';
    }

    // 5. Persona Information (if available)
    if (persona) {
      console.log('🎭 [ConversationManager] Persona found:', persona.name, persona.description);
      prompt += '<persona_information>\n';
      prompt += `Name: ${persona.name}\n`;
      prompt += `Role: ${persona.role}\n`;
      prompt += `Description: ${persona.description}\n`;
      prompt += '</persona_information>\n\n';
    } else {
      console.warn('⚠️ [ConversationManager] No persona provided to generatePrompt');
    }

    // 6. Memory System Information
    
    // 6a. ピン留めメモリーカード（最優先）
    const pinnedMemoryCards = await this.getPinnedMemoryCards();
    console.log('📌 [ConversationManager] Pinned memory cards found:', pinnedMemoryCards.length);
    if (pinnedMemoryCards.length > 0) {
      console.log('📌 [ConversationManager] Adding pinned memory cards to prompt:', pinnedMemoryCards.map(c => c.title));
      prompt += '<pinned_memory_cards>\n';
      pinnedMemoryCards.forEach(card => {
        prompt += `[${card.category}] ${card.title}: ${card.summary}\n`;
        if (card.keywords.length > 0) {
          prompt += `Keywords: ${card.keywords.join(', ')}\n`;
        }
      });
      prompt += '</pinned_memory_cards>\n\n';
    } else {
      console.log('📌 [ConversationManager] No pinned memory cards found');
    }

    // 6b. 関連メモリーカード（スマート選択版）
    const relevantMemoryCards = await this.getRelevantMemoryCards(userInput, processedCharacter);
    console.log('🔍 [ConversationManager] Relevant memory cards found:', relevantMemoryCards.length, 'for input:', userInput.substring(0, 30) + '...');
    if (relevantMemoryCards.length > 0) {
      console.log('🔍 [ConversationManager] Adding relevant memory cards to prompt:', relevantMemoryCards.map(c => c.title));
      prompt += '<relevant_memory_cards>\n';
      relevantMemoryCards.forEach(card => {
        prompt += `[${card.category}] ${card.title}: ${card.summary}\n`;
        // キーワードも含めてコンテキストを豊富に
        if (card.keywords.length > 0) {
          prompt += `Keywords: ${card.keywords.slice(0, 3).join(', ')}\n`;
        }
      });
      prompt += '</relevant_memory_cards>\n\n';
    } else {
      console.log('🔍 [ConversationManager] No relevant memory cards found for input');
    }

    // 6c. ピン留めメッセージ（従来機能）
    if (context.pinnedMemories.length > 0) {
      prompt += '<pinned_messages>\n';
      context.pinnedMemories.forEach(msg => {
        prompt += `${msg.role}: ${msg.content}\n`;
      });
      prompt += '</pinned_messages>\n\n';
    }

    // 6d. 関連メッセージ（従来機能、設定上限まで）
    if (context.relevantMemories.length > 0) {
      prompt += '<relevant_messages>\n';
      context.relevantMemories.slice(0, this.config.maxRelevantMemories).forEach(result => {
        prompt += `${result.message.role}: ${result.message.content}\n`;
      });
      prompt += '</relevant_messages>\n\n';
    }

    if (this.sessionSummary) {
      prompt += `<session_summary>\n${this.sessionSummary}\n</session_summary>\n\n`;
    }

    // 7. Tracker Information (Enhanced)
    if (processedCharacter && this.trackerManager) {
        // 詳細トラッカー情報を使用してキャラクター設定反映を強化
        const detailedTrackerInfo = this.trackerManager.getDetailedTrackersForPrompt(processedCharacter.id);
        if (detailedTrackerInfo) {
            prompt += `${detailedTrackerInfo}\n\n`;
        } else {
            // フォールバック：基本版を使用
            const basicTrackerInfo = this.trackerManager.getTrackersForPrompt(processedCharacter.id);
            if (basicTrackerInfo) {
                prompt += `${basicTrackerInfo}\n\n`;
            }
        }
    }
    
    // 8. Chat History (Working Memory)
    prompt += '<recent_conversation>\n';
    context.recentConversation.forEach(msg => {
      const role = msg.role === 'user' ? 'User' : 'AI';
      prompt += `${role}: ${replaceVariables(msg.content, variableContext)}\n`;
    });
    prompt += '</recent_conversation>\n\n';

    // 9. Character System Prompt (キャラクター固有のシステムプロンプト)
    if (processedCharacter?.system_prompt) {
      prompt += `<character_system_prompt>\n${processedCharacter.system_prompt}\n</character_system_prompt>\n\n`;
    }

    // 10. Current Input
    prompt += `User: ${replaceVariables(userInput, variableContext)}\n`;
    prompt += `AI: `;

    // 最後にプロンプト全体に変数置換を適用
    prompt = replaceVariables(prompt, variableContext);

    console.log("====================\n[AI Prompt Context]\n====================", prompt);

    return prompt;
  }

  /**
   * 関連メッセージの検索
   * ハイブリッド検索（ベクトル + キーワード）を使用
   */
  private async searchRelevantMemories(query: string): Promise<SearchResult[]> {
    // キーワード抽出
    const keywords = this.extractKeywords(query);
    
    // ハイブリッド検索
    const results = await this.vectorStore.hybridSearch(
      query,
      keywords,
      this.config.maxRelevantMemories
    );

    // 時間減衰を適用
    const now = Date.now();
    return results.map(result => ({
      ...result,
      similarity: this.applyTimeDecay(result.similarity, result.message.timestamp, now)
    })).sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * メッセージの重要度計算
   * 複数の要因を考慮した総合スコア
   */
  private calculateImportance(content: string, metadata?: Record<string, unknown>): number {
    let importance = 0.5; // ベーススコア

    // コンテンツの長さ（情報量の指標）
    if (content.length > 200) importance += 0.1;
    if (content.length > 500) importance += 0.1;

    // 感情的な内容
    if (metadata?.emotion) {
      importance += 0.15;
    }

    // 質問文を含む
    if (content.includes('？') || content.includes('?')) {
      importance += 0.1;
    }

    // 固有名詞や数値を含む（事実的内容の可能性）
    const hasNumbers = /\d+/.test(content);
    const hasProperNouns = /[A-Z][a-z]+/.test(content);
    if (hasNumbers || hasProperNouns) {
      importance += 0.1;
    }

    return Math.min(importance, 1.0);
  }

  /**
   * メッセージのピン留め
   * ユーザーが明示的に重要とマークした情報
   */
  pinMessage(messageId: string): void {
    const message = this.allMessages.find(m => m.id === messageId);
    if (message) {
      this.pinnedMessages.add(messageId);
      
      // ベクトルストアにも追加（重要なので必ず索引化）
      this.vectorStore.addMessage(message);
    }
  }

  /**
   * メッセージのピン留め解除
   */
  unpinMessage(messageId: string): void {
    this.pinnedMessages.delete(messageId);
  }

  /**
   * ピン留めされたメッセージの取得
   */
  private getPinnedMessages(): Message[] {
    return this.allMessages.filter(m => this.pinnedMessages.has(m.id));
  }

  /**
   * 自動ピン留めの判定
   * AIが重要と判断した情報を自動的にピン留め
   */
  private async shouldAutoPinMessage(message: Message): Promise<boolean> {
    // 重要度が高い場合
    if (message.importance && message.importance >= 0.8) {
      return true;
    }

    // 特定のキーワードを含む場合
    const importantKeywords = ['約束', '重要', '忘れないで', '覚えて'];
    const containsImportant = importantKeywords.some(keyword => 
      message.content.includes(keyword)
    );

    return containsImportant;
  }

  /**
   * セッション要約の更新
   * インクリメンタル更新で効率化
   */
  private async updateSessionSummary(): Promise<void> {
    const recentMessages = this.allMessages.slice(-this.config.summarizeInterval);
    
    if (this.sessionSummary) {
      // 既存要約の更新
      this.sessionSummary = await this.summarizer.updateSummary(
        this.sessionSummary,
        recentMessages
      );
    } else {
      // 新規要約の作成
      this.sessionSummary = await this.summarizer.summarizeChunk(recentMessages);
    }
  }

  /**
   * コンテキストのトークン数最適化
   * トークン制限を超えないように調整
   */
  private optimizeContextTokens(context: ConversationContext): ConversationContext {
    const maxTokens = 2000; // 想定最大トークン数
    let currentTokens = this.estimateTokens(context);

    // トークン数が制限を超える場合は削減
    while (currentTokens > maxTokens) {
      // 優先度の低い順に削減
      if (context.relevantMemories.length > 2) {
        context.relevantMemories.pop();
      } else if (context.recentConversation.length > 3) {
        context.recentConversation.shift();
      } else {
        break; // これ以上削減できない
      }
      
      currentTokens = this.estimateTokens(context);
    }

    return context;
  }

  /**
   * トークン数の推定
   * 実際はtiktokenライブラリを使用
   */
  private estimateTokens(context: ConversationContext): number {
    let totalChars = context.currentInput.length;
    
    totalChars += context.recentConversation.reduce((sum, m) => sum + m.content.length, 0);
    totalChars += context.relevantMemories.reduce((sum, r) => sum + r.message.content.length, 0);
    totalChars += context.pinnedMemories.reduce((sum, m) => sum + m.content.length, 0);

    // 日本語は1文字≒1トークン、英語は4文字≒1トークンで概算
    return Math.ceil(totalChars / 2);
  }

  /**
   * 時間減衰の適用
   */
  private applyTimeDecay(
    baseScore: number,
    timestamp: Date,
    now: number
  ): number {
    const messageTime = timestamp.getTime();
    const ageInHours = (now - messageTime) / (1000 * 60 * 60);
    
    // 24時間で約0.7倍、48時間で約0.5倍に減衰
    const decayFactor = Math.exp(-ageInHours / 48);
    
    return baseScore * (0.5 + 0.5 * decayFactor);
  }

  /**
   * キーワード抽出
   */
  private extractKeywords(text: string): string[] {
    // 簡易的な実装（実際は形態素解析を使用）
    const words = text.split(/[\s、。！？,.!?]+/);
    return words.filter(word => 
      word.length > 2 && 
      !['です', 'ます', 'した', 'ある', 'いる', 'する', 'なる'].includes(word)
    ).slice(0, 5);
  }

  /**
   * メッセージIDの生成
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * インデックスすべきメッセージか判定
   * コスト最適化
   */
  private shouldIndexMessage(message: Message): boolean {
    // ピン留めされたメッセージは必ずインデックス
    if (this.pinnedMessages.has(message.id)) return true;
    
    // 重要度が閾値以上
    if (message.importance && message.importance >= this.config.costOptimization.lowImportanceThreshold) {
      return true;
    }
    
    // ユーザーメッセージは基本的にインデックス
    if (message.sender === 'user') return true;
    
    return false;
  }

  /**
   * 感情状態の推定
   */
  private estimateEmotionalState() {
    const _recentMessages = this.allMessages.slice(-5);
    // 簡易的な感情推定（実際はより高度な分析を実装）
    return {
      current: 'neutral',
      trend: 'stable' as const,
      intensity: 0.5
    };
  }

  /**
   * 応答指示の構築
   */
  private buildResponseInstructions(): string {
    return `
【応答の優先順位】
1. 最優先: <current_input>への直接的で自然な応答
2. 補助的: <recent_conversation>の文脈を考慮した一貫性
3. 必要時のみ: <relevant_memories>や<pinned_memories>の参照

【禁止事項】
- 突然古い話題に戻ること
- 文脈を無視した応答
- <session_summary>の内容を直接言及すること

【指示】
上記の情報を参考に、現在の入力に対して自然に応答してください。
`;
  }

  /**
   * 会話のリセット
   */
  reset(): void {
    this.allMessages = [];
    this.sessionSummary = '';
    this.pinnedMessages.clear();
    this.messageCount = 0;
    this.memoryLayers = new MemoryLayerManager();
  }

  /**
   * 統計情報の取得
   */
  getStatistics(): Record<string, unknown> {
    return {
      totalMessages: this.allMessages.length,
      pinnedMessages: this.pinnedMessages.size,
      sessionSummaryLength: this.sessionSummary.length,
      memoryLayers: this.memoryLayers.getStatistics(),
      messageCount: this.messageCount
    };
  }

  /**
   * エクスポート用データの生成
   */
  exportData(): Record<string, unknown> {
    return {
      messages: this.allMessages,
      summary: this.sessionSummary,
      pinnedIds: Array.from(this.pinnedMessages),
      statistics: this.getStatistics()
    };
  }

  /**
   * インポートからの復元
   */
  async importData(data: Record<string, unknown>): Promise<void> {
    this.allMessages = (data.messages as Message[]) || [];
    this.sessionSummary = (data.summary as string) || '';
    this.pinnedMessages = new Set((data.pinnedIds as string[]) || []);
    
    // メモリレイヤーの再構築
    for (const message of this.allMessages) {
      this.memoryLayers.addMessage(message);
      
      // ベクトルストアへの追加（バッチ処理）
      if (this.shouldIndexMessage(message)) {
        await this.vectorStore.addMessage(message);
      }
    }
  }

  /**
   * 全メッセージを取得（PromptBuilderService で使用）
   */
  public getAllMessages(): UnifiedMessage[] {
    return [...this.allMessages];
  }

  /**
   * ピン留めメモリーカードの取得
   * プロンプトで最優先表示される
   */
  private async getPinnedMemoryCards(): Promise<MemoryCard[]> {
    try {
      // グローバルストアからピン留めメモリーカードを取得
      // 本来はDIで注入するべきだが、ここでは直接参照
      const { useAppStore } = await import('@/store');
      const store = useAppStore.getState();
      
      if (!store.memory_cards) return [];
      
      return Array.from(store.memory_cards.values())
        .filter(card => card.is_pinned)
        .sort((a, b) => b.importance.score - a.importance.score)
        .slice(0, 5); // 最大5件
    } catch (error) {
      console.error('Failed to get pinned memory cards:', error);
      return [];
    }
  }

  /**
   * 関連メモリーカードの取得（スマート版）
   * キャラクターとの関連性とユーザー入力を総合的に考慮
   */
  private async getRelevantMemoryCards(userInput: string, character?: Character): Promise<MemoryCard[]> {
    try {
      const { useAppStore } = await import('@/store');
      const store = useAppStore.getState();
      
      if (!store.memory_cards) return [];
      
      const cards = Array.from(store.memory_cards.values())
        .filter(card => !card.is_hidden); // 非表示カードは除外
      
      // スマートな関連度計算
      const relevantCards = cards.map(card => {
        const relevanceScore = this.calculateSmartMemoryCardRelevance(card, userInput, character);
        return { card, relevanceScore };
      })
      .filter(item => item.relevanceScore > 0.2) // 閾値を0.2に下げて包括性向上
      .sort((a, b) => {
        // 関連度 > 重要度 > 作成日時の順でソート
        if (Math.abs(a.relevanceScore - b.relevanceScore) > 0.1) {
          return b.relevanceScore - a.relevanceScore;
        }
        if (Math.abs(a.card.importance.score - b.card.importance.score) > 0.1) {
          return b.card.importance.score - a.card.importance.score;
        }
        return new Date(b.card.created_at).getTime() - new Date(a.card.created_at).getTime();
      })
      .slice(0, 8) // 最大8件に増やして重要な情報の見落としを防止
      .map(item => item.card);
      
      console.log(`📋 Found ${relevantCards.length} relevant memory cards for: "${userInput.substring(0, 30)}..."`);
      
      return relevantCards;
    } catch (error) {
      console.error('Failed to get relevant memory cards:', error);
      return [];
    }
  }

  /**
   * メモリーカードの関連度計算（基本版）
   */
  private calculateMemoryCardRelevance(card: MemoryCard, userInput: string): number {
    const input = userInput.toLowerCase();
    let score = 0;
    
    // タイトルマッチ（重み: 0.4）
    if (card.title.toLowerCase().includes(input)) {
      score += 0.4;
    }
    
    // キーワードマッチ（重み: 0.3）
    const matchingKeywords = card.keywords.filter(keyword =>
      input.includes(keyword.toLowerCase()) || keyword.toLowerCase().includes(input)
    );
    score += (matchingKeywords.length / Math.max(card.keywords.length, 1)) * 0.3;
    
    // 要約マッチ（重み: 0.2）
    if (card.summary.toLowerCase().includes(input)) {
      score += 0.2;
    }
    
    // 元内容マッチ（重み: 0.1）
    if (card.original_content && card.original_content.toLowerCase().includes(input)) {
      score += 0.1;
    }
    
    // 重要度ボーナス
    score *= (0.5 + card.importance.score * 0.5);
    
    return Math.min(score, 1.0);
  }

  /**
   * スマートメモリーカード関連度計算
   * キャラクターとの親和性も考慮した高度な関連度計算
   */
  private calculateSmartMemoryCardRelevance(card: MemoryCard, userInput: string, character?: Character): number {
    const input = userInput.toLowerCase();
    let score = 0;
    
    // 基本的な関連度スコア（重み: 0.6）
    const basicScore = this.calculateMemoryCardRelevance(card, userInput);
    score += basicScore * 0.6;
    
    // キャラクターとの親和性スコア（重み: 0.3）
    if (character) {
      const characterAffinityScore = this.calculateCharacterAffinity(card, character);
      score += characterAffinityScore * 0.3;
    }
    
    // カテゴリー重要度（重み: 0.1）
    const categoryBonus = this.getCategoryImportanceBonus(card.category, userInput);
    score += categoryBonus * 0.1;
    
    // 時間減衰を軽減（重要な記憶は時間が経っても価値を保持）
    const timeFactor = this.calculateTimeFactor(card);
    score *= timeFactor;
    
    // ピン留めされた記憶には大幅なボーナス
    if (card.is_pinned) {
      score *= 1.5;
    }
    
    // ユーザーが確認済みの記憶にもボーナス
    if (card.is_verified) {
      score *= 1.2;
    }
    
    return Math.min(score, 1.0);
  }

  /**
   * メモリーカードとキャラクターの親和性を計算
   */
  private calculateCharacterAffinity(card: MemoryCard, character: Character): number {
    let affinity = 0;
    
    // キャラクターの興味・好みとの一致
    const characterKeywords = [
      ...character.likes || [],
      ...character.hobbies || [],
      ...character.tags || [],
      character.occupation,
      ...character.strengths || []
    ].filter(Boolean).map(item => item.toLowerCase());
    
    const cardKeywords = card.keywords.map(k => k.toLowerCase());
    const matchingInterests = cardKeywords.filter(keyword => 
      characterKeywords.some(charKeyword => 
        charKeyword.includes(keyword) || keyword.includes(charKeyword)
      )
    );
    
    if (matchingInterests.length > 0) {
      affinity += 0.4 * (matchingInterests.length / Math.max(cardKeywords.length, 1));
    }
    
    // カテゴリーとキャラクターの関連性
    if (card.category === 'relationship' && character.personality) {
      affinity += 0.3; // 関係性記憶は常に重要
    }
    
    if (card.category === 'preference' && (character.likes || character.dislikes)) {
      affinity += 0.2; // 好み情報も重要
    }
    
    if (card.category === 'promise' || card.category === 'important_date') {
      affinity += 0.3; // 約束や重要日付は常に関連性高い
    }
    
    return Math.min(affinity, 1.0);
  }

  /**
   * カテゴリーの重要度ボーナスを計算
   */
  private getCategoryImportanceBonus(category: string, userInput: string): number {
    const input = userInput.toLowerCase();
    
    // ユーザー入力の内容に応じてカテゴリーの重要度を動的調整
    if (input.includes('約束') || input.includes('promise') && category === 'promise') {
      return 0.8;
    }
    
    if ((input.includes('好き') || input.includes('like') || input.includes('嫌い')) && category === 'preference') {
      return 0.7;
    }
    
    if ((input.includes('関係') || input.includes('友達') || input.includes('恋人')) && category === 'relationship') {
      return 0.6;
    }
    
    if ((input.includes('日付') || input.includes('日') || input.includes('時')) && category === 'important_date') {
      return 0.5;
    }
    
    return 0.3; // デフォルトボーナス
  }

  /**
   * 時間要素を考慮した重要度
   */
  private calculateTimeFactor(card: MemoryCard): number {
    const now = Date.now();
    const cardTime = new Date(card.created_at).getTime();
    const ageInDays = (now - cardTime) / (1000 * 60 * 60 * 24);
    
    // 重要度が高い記憶は時間による減衰を軽減
    const importanceMultiplier = 0.5 + (card.importance.score * 0.5);
    
    // 基本的な時間減衰（30日で約0.8倍）
    const timeFactor = Math.exp(-ageInDays / 60); // より緩やかな減衰
    
    return Math.max(0.3, timeFactor * importanceMultiplier);
  }
}
