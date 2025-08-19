import { UnifiedChatSession } from '@/types';
import { ConversationManager } from './memory/conversation-manager';
import { TrackerManager } from './tracker/tracker-manager';

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

    // TODO: トラッカー情報をConversationManagerに渡す
    // conversationManager.setTrackers(session.state_management.trackers);

    // ConversationManagerを使ってプロンプトを生成
    const prompt = await conversationManager.generatePrompt(
      userInput,
      session.participants.characters[0],
      session.participants.user
    );

    return prompt;
  }
}

export const promptBuilderService = new PromptBuilderService();
