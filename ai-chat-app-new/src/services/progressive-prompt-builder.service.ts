/**
 * Progressive Prompt Builder Service
 * 3段階のプロンプトを段階的に構築するサービス
 */

import { Character, Persona, UnifiedChatSession } from '@/types';
import { ProgressivePrompt, ProgressiveStage } from '@/types/progressive-message.types';
import { replaceVariables } from '@/utils/variable-replacer';
import { TrackerManager } from './tracker/tracker-manager';
import { MemoryCard } from '@/types/memory.types';

export class ProgressivePromptBuilder {
  /**
   * Stage 1: Reflex Prompt (反射的応答)
   * 最小限の情報で即座の感情的反応を生成
   */
  buildReflexPrompt(
    input: string,
    character: Character,
    persona?: Persona
  ): ProgressivePrompt {
    const userName = persona?.name || 'User';
    const charName = character.name;
    
    // 最小限のキャラクター情報
    const minimalCharInfo = `
あなたは${charName}です。
性格: ${character.personality ? character.personality.slice(0, 100) : '親しみやすい'}
${character.first_person ? `一人称: ${character.first_person}` : ''}
${character.second_person ? `二人称: ${character.second_person}` : ''}
`;

    const prompt = `
AI=${charName}, User=${userName}

${minimalCharInfo}

## 重要な指示
- 1-2文で短く感情的に反応してください
- 詳しい説明は不要です
- 自然な会話の初期反応のように応答してください
- 相手の発言に対する第一印象や感情を表現してください

## 現在の入力
${userName}: ${input}
${charName}:`;

    return {
      stage: 'reflex',
      prompt: replaceVariables(prompt, { 
        char: charName, 
        user: userName 
      }),
      tokenLimit: 100,
      temperature: 0.9
    };
  }

  /**
   * Stage 2: Context Prompt (文脈的応答)
   * メモリーと会話履歴を含む個人化された応答
   */
  async buildContextPrompt(
    input: string,
    session: UnifiedChatSession,
    memoryCards: MemoryCard[],
    trackerManager?: TrackerManager
  ): Promise<ProgressivePrompt> {
    const character = session.participants.characters[0];
    const persona = session.participants.user;
    const charName = character.name;
    const userName = persona?.name || 'User';
    
    // キャラクター情報（中程度の詳細）
    const characterInfo = `
<character_information>
Name: ${character.name}
Personality: ${character.personality || 'Not specified'}
Speaking Style: ${character.speaking_style || 'Natural'}
First Person: ${character.first_person || '私'}
Second Person: ${character.second_person || 'あなた'}
${character.likes && character.likes.length > 0 ? `Likes: ${character.likes.join(', ')}` : ''}
${character.dislikes && character.dislikes.length > 0 ? `Dislikes: ${character.dislikes.join(', ')}` : ''}
</character_information>`;

    // ペルソナ情報
    const personaInfo = persona ? `
<persona_information>
Name: ${persona.name}
${persona.role ? `Role: ${persona.role}` : ''}
${persona.description ? `Description: ${persona.description.slice(0, 200)}` : ''}
</persona_information>` : '';

    // メモリーカード（重要なもののみ）
    const pinnedMemories = memoryCards.filter(m => m.is_pinned).slice(0, 3);
    const relevantMemories = memoryCards.filter(m => !m.is_pinned).slice(0, 2);
    
    const memorySection = (pinnedMemories.length > 0 || relevantMemories.length > 0) ? `
<memory_context>
${pinnedMemories.map(m => `[Pinned] ${m.title}: ${m.summary}`).join('\n')}
${relevantMemories.map(m => `[Related] ${m.title}: ${m.summary}`).join('\n')}
</memory_context>` : '';

    // 最近の会話（5メッセージ）
    const recentMessages = session.messages.slice(-5);
    const conversationHistory = recentMessages.length > 0 ? `
<recent_conversation>
${recentMessages.map(msg => `${msg.role === 'user' ? userName : charName}: ${msg.content.slice(0, 200)}`).join('\n')}
</recent_conversation>` : '';

    // トラッカー情報（あれば）
    const trackerInfo = trackerManager && character.id ? 
      trackerManager.getEssentialTrackersForPrompt?.(character.id) : null;
    
    const trackerSection = trackerInfo ? `
<relationship_state>
${trackerInfo}
</relationship_state>` : '';

    const prompt = `
AI=${charName}, User=${userName}

${characterInfo}
${personaInfo}
${memorySection}
${trackerSection}
${conversationHistory}

## 応答指示
- 会話の文脈と記憶を踏まえて応答してください
- 相手との関係性を考慮してください
- 3-5文程度で自然に応答してください
- 過去の会話内容を適切に参照してください

## 現在の入力
${userName}: ${input}
${charName}:`;

    return {
      stage: 'context',
      prompt: replaceVariables(prompt, { 
        char: charName, 
        user: userName 
      }),
      tokenLimit: 500,
      temperature: 0.7,
      memoryContext: memorySection,
      conversationHistory: recentMessages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }))
    };
  }

  /**
   * Stage 3: Intelligence Prompt (知的応答)
   * 完全な情報と深い洞察を含む応答
   */
  async buildIntelligencePrompt(
    input: string,
    session: UnifiedChatSession,
    memoryCards: MemoryCard[],
    trackerManager?: TrackerManager,
    systemInstructions?: string
  ): Promise<ProgressivePrompt> {
    const character = session.participants.characters[0];
    const persona = session.participants.user;
    const charName = character.name;
    const userName = persona?.name || 'User';
    
    // システム指示（完全版）
    const systemSection = systemInstructions || `
<system_instructions>
## Core Behavioral Rules
1. Always maintain character consistency
2. Never break character or mention being an AI
3. Respond naturally as the character would
4. Consider emotional context and relationship dynamics
5. Provide thoughtful, detailed responses when appropriate

## Response Quality Guidelines
- Show deep understanding of the conversation context
- Offer creative insights and suggestions
- Reference relevant past conversations naturally
- Demonstrate emotional intelligence
- Maintain appropriate conversation depth
</system_instructions>`;

    // 完全なキャラクター情報
    const fullCharacterInfo = `
<character_information>
## Basic Information
Name: ${character.name}
Age: ${character.age || 'Not specified'}
Gender: ${character.gender || 'Not specified'}
Personality: ${character.personality || 'Not specified'}
Occupation: ${character.occupation || 'Not specified'}

## Communication Style
Speaking Style: ${character.speaking_style || 'Natural'}
First Person: ${character.first_person || '私'}
Second Person: ${character.second_person || 'あなた'}
${character.verbal_tics ? `Verbal Tics: ${character.verbal_tics}` : ''}

## Preferences
${character.likes && character.likes.length > 0 ? `Likes: ${character.likes.join(', ')}` : ''}
${character.dislikes && character.dislikes.length > 0 ? `Dislikes: ${character.dislikes.join(', ')}` : ''}
${character.hobbies && character.hobbies.length > 0 ? `Hobbies: ${character.hobbies.join(', ')}` : ''}

## Background
${character.background || 'No specific background provided'}

## Current Scenario
${character.scenario || 'No specific scenario'}

## Special Context
${character.nsfw_profile?.is_enabled ? `
NSFW Profile Active
Persona: ${character.nsfw_profile.persona || 'Standard'}
Preferences: ${character.nsfw_profile.kinks?.join(', ') || 'None specified'}
` : ''}
</character_information>`;

    // 完全なペルソナ情報
    const fullPersonaInfo = persona ? `
<persona_information>
## User Profile
Name: ${persona.name}
Role: ${persona.role || 'User'}
Description: ${persona.description || 'No description'}

## Characteristics
${persona.traits && persona.traits.length > 0 ? `Traits: ${persona.traits.join(', ')}` : ''}
${persona.likes && persona.likes.length > 0 ? `Likes: ${persona.likes.join(', ')}` : ''}
${persona.dislikes && persona.dislikes.length > 0 ? `Dislikes: ${persona.dislikes.join(', ')}` : ''}

## Additional Information
${persona.personality ? `Personality: ${persona.personality}` : ''}
${persona.speaking_style ? `Speaking Style: ${persona.speaking_style}` : ''}
${persona.background ? `Background: ${persona.background}` : ''}
${persona.other_settings ? `Other Settings: ${persona.other_settings}` : ''}
</persona_information>` : '';

    // 完全なメモリーシステム
    const fullMemorySection = memoryCards.length > 0 ? `
<memory_system>
## Pinned Memories (Most Important)
${memoryCards.filter(m => m.is_pinned).map(m => `
[${m.category}] ${m.title}
Summary: ${m.summary}
Keywords: ${m.keywords.join(', ')}
Importance: ${m.importance.score}
`).join('\n')}

## Relevant Memories
${memoryCards.filter(m => !m.is_pinned).slice(0, 10).map(m => `
[${m.category}] ${m.title}
Summary: ${m.summary}
Keywords: ${m.keywords.join(', ')}
`).join('\n')}
</memory_system>` : '';

    // 完全な会話履歴
    const fullConversationHistory = session.messages.length > 0 ? `
<conversation_history>
${session.messages.slice(-15).map(msg => `
${msg.role === 'user' ? userName : charName}: ${msg.content}
${msg.memory?.summary ? `[Memory: ${msg.memory.summary}]` : ''}
`).join('\n')}
</conversation_history>` : '';

    // 完全なトラッカー情報
    const fullTrackerInfo = trackerManager && character.id ? 
      trackerManager.getDetailedTrackersForPrompt?.(character.id) : null;
    
    const fullTrackerSection = fullTrackerInfo ? `
<relationship_dynamics>
${fullTrackerInfo}
</relationship_dynamics>` : '';

    const prompt = `
AI=${charName}, User=${userName}

${systemSection}
${fullCharacterInfo}
${fullPersonaInfo}
${fullMemorySection}
${fullTrackerSection}
${fullConversationHistory}

## Advanced Response Guidelines
- Provide deep insights and thoughtful analysis when appropriate
- Reference specific past conversations and shared experiences
- Show emotional depth and understanding
- Offer creative suggestions or alternative perspectives
- Maintain character authenticity while demonstrating intelligence
- Consider long-term relationship dynamics
- Balance detail with natural conversation flow

## Current Context Analysis
Consider the user's emotional state, the conversation trajectory, and any implicit needs or desires that haven't been directly expressed.

## Current Input
${userName}: ${input}
${charName}:`;

    return {
      stage: 'intelligence',
      prompt: replaceVariables(prompt, { 
        char: charName, 
        user: userName 
      }),
      tokenLimit: 2000,
      temperature: 0.7,
      systemInstructions: systemSection,
      characterContext: fullCharacterInfo,
      memoryContext: fullMemorySection,
      conversationHistory: session.messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }))
    };
  }

  /**
   * 段階に応じた適切なプロンプトビルダーを選択
   */
  async buildPromptForStage(
    stage: ProgressiveStage,
    input: string,
    session: UnifiedChatSession,
    memoryCards: MemoryCard[] = [],
    trackerManager?: TrackerManager,
    systemInstructions?: string
  ): Promise<ProgressivePrompt> {
    const character = session.participants.characters[0];
    const persona = session.participants.user;

    switch (stage) {
      case 'reflex':
        return this.buildReflexPrompt(input, character, persona);
      
      case 'context':
        return await this.buildContextPrompt(
          input, 
          session, 
          memoryCards, 
          trackerManager
        );
      
      case 'intelligence':
        return await this.buildIntelligencePrompt(
          input,
          session,
          memoryCards,
          trackerManager,
          systemInstructions
        );
      
      default:
        // フォールバック
        return this.buildReflexPrompt(input, character, persona);
    }
  }
}

// シングルトンインスタンス
export const progressivePromptBuilder = new ProgressivePromptBuilder();