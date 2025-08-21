import { UnifiedChatSession } from '@/types';
import { ConversationManager } from './memory/conversation-manager';
import { TrackerManager } from './tracker/tracker-manager';
import { useAppStore } from '@/store';

export class PromptBuilderService {
  public async buildPrompt(
    session: UnifiedChatSession, 
    userInput: string,
    trackerManager?: TrackerManager
  ): Promise<string> {
    
    const conversationManager = new ConversationManager(session.messages, trackerManager); 
    
    // ConversationManagerに現在のセッションのメッセージをロードする
    // 本来はaddMessageを都度呼び出すが、ここでは簡易的に全メッセージをロード
    await conversationManager.importMessages(session.messages);

    // システム設定を取得
    const store = useAppStore.getState();
    const systemSettings = {
      systemPrompts: store.systemPrompts,
      enableSystemPrompt: store.enableSystemPrompt,
      enableJailbreakPrompt: store.enableJailbreakPrompt
    };

    // ConversationManagerを使ってプロンプトを生成
    const prompt = await conversationManager.generatePrompt(
      userInput,
      session.participants.characters[0],
      session.participants.user,
      systemSettings
    );

    console.log("==================== BUILT PROMPT ====================");
    console.log(prompt);
    console.log("======================================================");

    return prompt;
  }
}

export const promptBuilderService = new PromptBuilderService();
