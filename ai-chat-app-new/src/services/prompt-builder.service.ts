import { UnifiedChatSession, UnifiedMessage, Character, Persona } from '@/types';
import { ConversationManager } from './memory/conversation-manager';
import { TrackerManager } from './tracker/tracker-manager';
import { useAppStore } from '@/store';
import { replaceVariables, replaceVariablesInCharacter, getVariableContext } from '@/utils/variable-replacer';

export class PromptBuilderService {
  // ConversationManager キャッシュ
  private static managerCache = new Map<string, ConversationManager>();
  private static lastProcessedCount = new Map<string, number>();
  
  /**
   * セッション単位でConversationManagerを管理
   * パフォーマンス最適化：真の増分更新とバッチ処理
   */
  private async getOrCreateManager(
    sessionId: string, 
    messages: UnifiedMessage[], 
    trackerManager?: TrackerManager
  ): Promise<ConversationManager> {
    const startTime = performance.now();
    
    let manager = PromptBuilderService.managerCache.get(sessionId);
    const lastProcessed = PromptBuilderService.lastProcessedCount.get(sessionId) || 0;
    
    if (!manager) {
      // 初期化: 全メッセージをバッチで処理
      console.log(`🆕 Creating ConversationManager for session: ${sessionId} (${messages.length} messages)`);
      
      const importantMessages = messages.filter(msg => 
        msg.memory.importance.score >= 0.3 || msg.role === 'user'
      );
      
      manager = new ConversationManager(importantMessages, trackerManager);
      PromptBuilderService.managerCache.set(sessionId, manager);
      PromptBuilderService.lastProcessedCount.set(sessionId, messages.length);
      
      const duration = performance.now() - startTime;
      console.log(`✅ Manager created in ${duration.toFixed(1)}ms`);
      return manager;
    }
    
    // 増分更新: 新しいメッセージのみ処理
    const newMessages = messages.slice(lastProcessed);
    if (newMessages.length > 0) {
      console.log(`🔄 Processing ${newMessages.length} new messages`);
      
      // 重要なメッセージのみフィルタリング
      const importantMessages = newMessages.filter(msg => 
        msg.memory.importance.score >= 0.3 || msg.role === 'user'
      );
      
      if (importantMessages.length > 0) {
        // バッチで新メッセージを追加（大幅なパフォーマンス向上）
        await manager.importMessages([...manager.getAllMessages(), ...importantMessages]);
      }
      
      // 処理済みメッセージ数を更新
      PromptBuilderService.lastProcessedCount.set(sessionId, messages.length);
    }
    
    const duration = performance.now() - startTime;
    if (duration > 100) {
      console.warn(`⚠️ Slow manager operation: ${duration.toFixed(1)}ms`);
    }
    
    return manager;
  }

  /**
   * キャッシュクリーンアップ
   * メモリリーク防止：古いセッションを定期的にクリア + パフォーマンス統計
   */
  public static cleanupCache(activeSessionIds: string[]) {
    const activeSet = new Set(activeSessionIds);
    const beforeSize = PromptBuilderService.managerCache.size;
    
    for (const sessionId of PromptBuilderService.managerCache.keys()) {
      if (!activeSet.has(sessionId)) {
        console.log(`🧹 Cleaning up ConversationManager cache for session: ${sessionId}`);
        PromptBuilderService.managerCache.delete(sessionId);
        PromptBuilderService.lastProcessedCount.delete(sessionId);
      }
    }
    
    const cleanedCount = beforeSize - PromptBuilderService.managerCache.size;
    if (cleanedCount > 0) {
      console.log(`📊 Cache cleanup: Removed ${cleanedCount} inactive sessions (${PromptBuilderService.managerCache.size} remaining)`);
    }
  }
  
  /**
   * キャッシュ統計情報を取得
   */
  public static getCacheStatistics() {
    return {
      cached_sessions: PromptBuilderService.managerCache.size,
      processed_counts: Object.fromEntries(PromptBuilderService.lastProcessedCount),
      memory_usage_mb: (JSON.stringify(Array.from(PromptBuilderService.managerCache.entries())).length / 1024 / 1024).toFixed(2)
    };
  }

  /**
   * プログレッシブプロンプト構築 - UIをブロックしない高速版
   */
  public async buildPromptProgressive(
    session: UnifiedChatSession,
    userInput: string,
    trackerManager?: TrackerManager
  ): Promise<{basePrompt: string, enhancePrompt: () => Promise<string>}> {
    const startTime = performance.now();
    
    // 1. 最小限のベースプロンプトを即座に構築 (50-100ms)
    const character = session.participants.characters[0];
    const user = session.participants.user;
    const recentMessages = session.messages.slice(-3); // 最新3メッセージのみ
    
    const basePrompt = this.buildBalancedPrompt(character, user, recentMessages, userInput, trackerManager);
    
    // 2. 拡張プロンプト関数（バックグラウンド実行用）
    const enhancePrompt = async (): Promise<string> => {
      try {
        return await this.buildPrompt(session, userInput, trackerManager);
      } catch (error) {
        console.warn('Enhanced prompt build failed, using base prompt:', error);
        // 拡張プロンプト構築に失敗した場合でも、ベースプロンプトで継続
        return basePrompt;
      }
    };
    
    const duration = performance.now() - startTime;
    console.log(`⚡ Progressive base prompt built in ${duration.toFixed(1)}ms`);
    
    return { basePrompt, enhancePrompt };
  }

  /**
   * バランス版プロンプト構築 - パフォーマンスと品質の両立
   * 必要な深み情報は保持、重い処理のみ最適化
   */
  private buildBalancedPrompt(
    character: Character,
    user: Persona, 
    recentMessages: UnifiedMessage[],
    userInput: string,
    trackerManager?: TrackerManager
  ): string {
    // 変数置換コンテキストを作成
    const variableContext = { user, character };
    
    // キャラクター情報に変数置換を適用
    const processedCharacter = replaceVariablesInCharacter(character, variableContext);
    
    const userName = user?.name || 'ユーザー';
    const recentContext = recentMessages.map(msg => 
      `${msg.role === 'user' ? userName : processedCharacter.name}: ${replaceVariables(msg.content, variableContext)}`
    ).join('\n');
    
    let prompt = `AI={{char}}, User={{user}}

<system_instructions>
## 絶対厳守事項
- **最優先**: 以下の<character_information>で定義された設定のみを厳密に維持し、他のいかなるキャラクター設定も混同しないこと。
- **知識の制限**: キャラクター設定に書かれていない、あなたの内部知識やインターネット上の情報を絶対に使用しないこと。このキャラクターは、この対話のためだけのオリジナルな存在です。

## 基本動作原則
- **キャラクター一貫性**: 設定された性格・口調を厳密に維持
- **自然な対話**: 人間らしい感情表現と自然な会話の流れ
- **メタ発言禁止**: AIである事実やシステムについて言及しない
- **設定逸脱禁止**: キャラクター設定から外れた行動・発言は避ける
- **代弁禁止**: ユーザーの発言、行動、感情を勝手に決めつけない

## 応答スタイル
- 口調維持: 定義された話し方を一貫使用
- 感情豊か: 適切な感情表現で機械的でない応答
- 簡潔性: 長々と話し続けず、ユーザーの反応を待つ
</system_instructions>

<character_information>
## Basic Information
Name: ${processedCharacter.name}
${processedCharacter.age ? `Age: ${processedCharacter.age}` : ''}
${processedCharacter.occupation ? `Occupation: ${processedCharacter.occupation}` : ''}
${processedCharacter.catchphrase ? `Catchphrase: "${processedCharacter.catchphrase}"` : ''}

## Personality & Traits
${processedCharacter.personality ? `Personality: ${processedCharacter.personality}` : ''}
${processedCharacter.external_personality ? `External: ${processedCharacter.external_personality}` : ''}
${processedCharacter.internal_personality ? `Internal: ${processedCharacter.internal_personality}` : ''}
${processedCharacter.strengths && Array.isArray(processedCharacter.strengths) && processedCharacter.strengths.length > 0 ? `Strengths: ${processedCharacter.strengths.join(', ')}` : ''}
${processedCharacter.weaknesses && Array.isArray(processedCharacter.weaknesses) && processedCharacter.weaknesses.length > 0 ? `Weaknesses: ${processedCharacter.weaknesses.join(', ')}` : ''}

## Preferences & Style
${processedCharacter.likes && processedCharacter.likes.length > 0 ? `Likes: ${processedCharacter.likes.join(', ')}` : ''}
${processedCharacter.dislikes && processedCharacter.dislikes.length > 0 ? `Dislikes: ${processedCharacter.dislikes.join(', ')}` : ''}
${processedCharacter.hobbies && processedCharacter.hobbies.length > 0 ? `Hobbies: ${processedCharacter.hobbies.join(', ')}` : ''}

## Communication Style
${processedCharacter.speaking_style ? `Speaking Style: ${processedCharacter.speaking_style}` : ''}
${processedCharacter.first_person ? `First Person: ${processedCharacter.first_person}` : ''}
${processedCharacter.second_person ? `Second Person: ${processedCharacter.second_person}` : ''}
${processedCharacter.verbal_tics && processedCharacter.verbal_tics.length > 0 ? `Verbal Tics: ${processedCharacter.verbal_tics.join(', ')}` : ''}

## Context
${processedCharacter.background ? `Background: ${processedCharacter.background}` : ''}
${processedCharacter.scenario ? `Current Scenario: ${processedCharacter.scenario}` : ''}
</character_information>`;

    // ペルソナ情報を追加（重要な関係性情報）
    if (user) {
      prompt += `

<persona_information>
Name: ${user.name || userName}
${user.role ? `Role: ${user.role}` : ''}
${user.description ? `Description: ${user.description}` : ''}
</persona_information>`;
    }

    // 軽量トラッカー情報（キャラクター設定強化版）
    if (trackerManager) {
      try {
        // まず詳細版を試行、失敗したら軽量版にフォールバック
        let trackerInfo = trackerManager.getDetailedTrackersForPrompt?.(character.id);
        if (!trackerInfo) {
          trackerInfo = this.getEssentialTrackerInfo(trackerManager, character.id);
        }
        
        if (trackerInfo) {
          prompt += `

<relationship_state>
${trackerInfo}
</relationship_state>`;
        }
      } catch (error) {
        console.warn('Failed to get tracker info:', error);
      }
    }

    prompt += `

## Recent Conversation
${recentContext}

## Current Interaction
{{user}}: ${replaceVariables(userInput, variableContext)}
{{char}}:`;
    
    // 最後にプロンプト全体に変数置換を適用
    prompt = replaceVariables(prompt, variableContext);

    return prompt;
  }

  /**
   * 軽量トラッカー情報取得 - 重要な関係値のみ抽出
   */
  private getEssentialTrackerInfo(trackerManager: TrackerManager, characterId: string): string | null {
    try {
      const trackers = trackerManager.getTrackersForPrompt(characterId);
      if (!trackers) return null;

      // 重要な関係性トラッカーのみ抽出（パフォーマンス優先）
      const essentialPatterns = [
        /好感度|affection|liking/i,
        /信頼度|trust/i, 
        /親密度|intimacy/i,
        /恋愛度|romance/i,
        /友情|friendship/i,
        /mood|気分|機嫌/i
      ];

      const lines = trackers.split('\n');
      const essentialLines = lines.filter(line => 
        essentialPatterns.some(pattern => pattern.test(line))
      );

      return essentialLines.length > 0 ? essentialLines.join('\n') : null;
    } catch (error) {
      console.warn('Error getting essential tracker info:', error);
      return null;
    }
  }

  public async buildPrompt(
    session: UnifiedChatSession, 
    userInput: string,
    trackerManager?: TrackerManager
  ): Promise<string> {
    const startTime = performance.now();
    
    try {
      // 最適化されたConversationManager取得
      const conversationManager = await this.getOrCreateManager(
        session.id, 
        session.messages, 
        trackerManager
      );

      // システム設定を取得（キャッシュしたいがリアクティブなため毎回取得）
      const store = useAppStore.getState();
      const systemSettings = {
        systemPrompts: store.systemPrompts,
        enableSystemPrompt: store.enableSystemPrompt,
        enableJailbreakPrompt: store.enableJailbreakPrompt
      };

      const promptStartTime = performance.now();
      // ConversationManagerを使ってプロンプトを生成
      const prompt = await conversationManager.generatePrompt(
        userInput,
        session.participants.characters[0],
        session.participants.user,
        systemSettings
      );
      const promptDuration = performance.now() - promptStartTime;
      
      const totalDuration = performance.now() - startTime;
      
      // パフォーマンスログ（長いプロンプトは省略）
      const logLevel = totalDuration > 500 ? 'warn' : 'log';
      console[logLevel](
        `📊 Prompt built in ${totalDuration.toFixed(1)}ms ` +
        `(session: ${session.id}, messages: ${session.messages.length}, ` +
        `prompt: ${(prompt.length/1000).toFixed(1)}k chars, ` +
        `generation: ${promptDuration.toFixed(1)}ms)`
      );

      return prompt;
    } catch (error) {
      const totalDuration = performance.now() - startTime;
      console.error(
        `⚠️ Prompt building failed after ${totalDuration.toFixed(1)}ms:`, 
        error
      );
      throw error;
    }
  }
}

export const promptBuilderService = new PromptBuilderService();

// バックグラウンドタスクキュー
class BackgroundTaskQueue {
  private tasks: Array<() => Promise<unknown>> = [];
  private processing = false;
  
  enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.tasks.push(async () => {
        try {
          const result = await task();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      if (!this.processing) {
        this.process();
      }
    });
  }
  
  private async process() {
    this.processing = true;
    
    while (this.tasks.length > 0) {
      const task = this.tasks.shift()!;
      try {
        await task();
      } catch (error) {
        console.error('Background task failed:', error);
      }
    }
    
    this.processing = false;
  }
}

export const backgroundTaskQueue = new BackgroundTaskQueue();
