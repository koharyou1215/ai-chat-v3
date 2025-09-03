// Memory Card Generator Service for AI Chat V3
// Automatically generates memory cards from conversation messages

import { UnifiedMessage, MemoryCard, MemoryCategory } from "@/types";
import { apiManager } from "@/services/api-manager";
import { translateMemoryCardToEnglish } from "@/utils/conversation-translator";

// AI分析結果の型定義
interface MemoryAnalysisResult {
  title?: string;
  summary?: string;
  keywords?: string[];
  category?: string;
  importance?: number;
  emotional_impact?: number;
  [key: string]: unknown;
}

export class MemoryCardGenerator {
  /**
   * メッセージからメモリーカードを自動生成
   */
  async generateMemoryCard(
    messages: UnifiedMessage[],
    session_id: string,
    _character_id?: string
  ): Promise<Partial<MemoryCard>> {
    if (messages.length === 0) {
      throw new Error("No messages provided for memory card generation");
    }

    const content = this.formatMessagesForAnalysis(messages);
    const englishContent = translateMemoryCardToEnglish(content);

    try {
      // AI分析プロンプト（英文）
      const analysisPrompt = `
Analyze the following conversation content and generate memory card information.

Conversation content:
${englishContent}

Please output in the following JSON format:
{
  "title": "Short summary title (within 20 characters)",
  "summary": "Conversation summary (100-200 characters)",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "category": "Category (personal_info/preference/event/relationship/promise/important_date/emotion/decision/question/other)",
  "importance_score": 0.7,
  "emotion_tags": ["emotion_tag1", "emotion_tag2"],
  "context_tags": ["context_tag1", "context_tag2"]
}

IMPORTANT: Always respond in Japanese for the output content, but use English for the analysis process.

Importance score (importance_score) should be determined by the following criteria:
- 0.9-1.0: Extremely important (promises, important decisions, emotional events)
- 0.7-0.8: Important (personal information, preferences, relationship changes)
- 0.5-0.6: Normal (general conversation, Q&A)
- 0.3-0.4: Minor (small talk, greetings)

Category selection criteria:
- personal_info: Personal information (name, age, occupation, etc.)
- preference: Preferences and tastes
- event: Events and experiences
- relationship: Relationship-related content
- promise: Promises and schedules
- important_date: Important dates
- emotion: Emotional content
- decision: Decisions
- question: Questions and doubts
- other: Other
`;

      console.log("[MemoryCard] Generating memory card analysis...");
      const response = await apiManager.generateMessage(
        analysisPrompt,
        "",
        [],
        {
          max_tokens: 1024,
          temperature: 0.3,
        }
      );
      console.log("[MemoryCard] Raw API response:", response);

      // JSON解析
      const analysisResult = this.parseAnalysisResult(response);
      
      // analysisResultがnullの場合のデフォルト値
      if (!analysisResult) {
        return {
          title: this.generateFallbackTitle(messages),
          summary: this.generateFallbackSummary(messages),
          keywords: this.extractFallbackKeywords(content),
          category: "other",
          original_content: content,
          importance: {
            score: 0.5,
            factors: {
              emotional_weight: this.calculateEmotionalWeight(content),
              repetition_count: this.calculateRepetitionCount(messages),
              user_emphasis: this.calculateUserEmphasis(content),
              ai_judgment: 0.5,
            },
          },
          confidence: 0.5,
          emotion_tags: [],
          auto_tags: ["auto-generated", `length-${content.length}`],
        };
      }

      return {
        title: analysisResult.title || this.generateFallbackTitle(messages),
        summary:
          analysisResult.summary || this.generateFallbackSummary(messages),
        keywords:
          analysisResult.keywords || this.extractFallbackKeywords(content),
        category: this.validateCategory(analysisResult.category || "") || "other",
        original_content: content,
        importance: {
          score: Math.max(
            0.1,
            Math.min(1.0, (analysisResult.importance_score as number) || 0.5)
          ),
          factors: {
            emotional_weight: this.calculateEmotionalWeight(content),
            repetition_count: this.calculateRepetitionCount(messages),
            user_emphasis: this.calculateUserEmphasis(content),
            ai_judgment: (analysisResult.importance_score as number) || 0.5,
          },
        },
        confidence: 0.8,
        emotion_tags: (analysisResult.emotion_tags as any[]) || [],
        auto_tags: [
          "auto-generated",
          "ai-analyzed",
          `session-${session_id.slice(-8)}`,
        ],
      };
    } catch (error) {
      console.error("Failed to generate memory card with AI:", error);
      // フォールバック処理
      return this.generateFallbackMemoryCard(messages, content);
    }
  }

  /**
   * メッセージを分析用にフォーマット
   */
  private formatMessagesForAnalysis(messages: UnifiedMessage[]): string {
    return messages
      .map((msg) => {
        const role = msg.role === "user" ? "ユーザー" : "アシスタント";
        const timestamp = new Date(msg.created_at).toLocaleString("ja-JP");
        return `[${timestamp}] ${role}: ${msg.content}`;
      })
      .join("\n");
  }

  /**
   * AI分析結果をパース
   */
  private parseAnalysisResult(response: string): MemoryAnalysisResult | null {
    try {
      // JSONブロックを抽出
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // JSONブロックが見つからない場合、手動パース
      return this.manualParseResponse(response);
    } catch (error) {
      console.warn(
        "[MemoryCard] JSON parse failed, using manual parse:",
        error
      );
      return this.manualParseResponse(response);
    }
  }

  /**
   * 手動レスポンスパース（JSONが失敗した場合）
   */
  private manualParseResponse(response: string): MemoryAnalysisResult {
    const result: MemoryAnalysisResult = {};

    // タイトル抽出
    const titleMatch = response.match(/title[\"']?\s*:\s*[\"']([^\"']+)[\"']/i);
    if (titleMatch) result.title = titleMatch[1];

    // 要約抽出
    const summaryMatch = response.match(
      /summary[\"']?\s*:\s*[\"']([^\"']+)[\"']/i
    );
    if (summaryMatch) result.summary = summaryMatch[1];

    // カテゴリー抽出
    const categoryMatch = response.match(
      /category[\"']?\s*:\s*[\"']([^\"']+)[\"']/i
    );
    if (categoryMatch) result.category = categoryMatch[1];

    // 重要度抽出
    const importanceMatch = response.match(
      /importance_score[\"']?\s*:\s*([0-9.]+)/i
    );
    if (importanceMatch)
      result.importance_score = parseFloat(importanceMatch[1]);

    return result;
  }

  /**
   * カテゴリーの検証
   */
  private validateCategory(category: string): MemoryCategory | null {
    const validCategories: MemoryCategory[] = [
      "personal_info",
      "preference",
      "event",
      "relationship",
      "promise",
      "important_date",
      "emotion",
      "decision",
      "knowledge",
      "other",
    ];

    return validCategories.includes(category as MemoryCategory)
      ? (category as MemoryCategory)
      : null;
  }

  /**
   * フォールバック用のメモリーカード生成
   */
  private generateFallbackMemoryCard(
    messages: UnifiedMessage[],
    content: string
  ): Partial<MemoryCard> {
    return {
      title: this.generateFallbackTitle(messages),
      summary: this.generateFallbackSummary(messages),
      keywords: this.extractFallbackKeywords(content),
      category: "other",
      original_content: content,
      importance: {
        score: 0.5,
        factors: {
          emotional_weight: this.calculateEmotionalWeight(content),
          repetition_count: this.calculateRepetitionCount(messages),
          user_emphasis: 0.5,
          ai_judgment: 0.5,
        },
      },
      confidence: 0.6,
      emotion_tags: [],
      auto_tags: ["auto-generated", "fallback", "fallback-generated"],
    };
  }

  /**
   * フォールバック用タイトル生成
   */
  private generateFallbackTitle(messages: UnifiedMessage[]): string {
    const date = new Date().toLocaleDateString("ja-JP");
    const messageCount = messages.length;

    // 最初のメッセージから推測
    const firstMessage = messages[0];
    if (firstMessage && firstMessage.content.length > 0) {
      const preview = firstMessage.content.substring(0, 15);
      return `${preview}... (${messageCount}件の会話)`;
    }

    return `会話の記録 ${date} (${messageCount}件)`;
  }

  /**
   * フォールバック用要約生成
   */
  private generateFallbackSummary(messages: UnifiedMessage[]): string {
    console.log("[MemoryCard] Using fallback summary generation");

    // 最新のメッセージから内容を抽出
    const recentMessages = messages.slice(-3); // 最新の3件
    const contentPreview = recentMessages
      .map((m) => m.content.slice(0, 30))
      .join("、")
      .slice(0, 80);

    if (contentPreview.length > 10) {
      return `${contentPreview}...についての会話`;
    }

    return "最近の会話の記録";
  }

  /**
   * フォールバック用キーワード抽出
   */
  private extractFallbackKeywords(content: string): string[] {
    // 簡単な単語頻度分析
    const words = content
      .replace(/[。、！？\n\r]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 1)
      .map((w) => w.trim());

    const wordCount = new Map<string, number>();
    words.forEach((word) => {
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    });

    // 頻度順でソートして上位5つを返す
    const sortedWords = Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);

    return sortedWords.length > 0 ? sortedWords : ["会話", "対話", "記録"];
  }

  /**
   * 感情重み計算
   */
  private calculateEmotionalWeight(content: string): number {
    const emotionalWords = [
      "嬉しい",
      "悲しい",
      "怒り",
      "驚き",
      "恐れ",
      "好き",
      "嫌い",
      "愛",
      "心配",
      "安心",
    ];
    const emotionalChars = ["！", "？", "♪", "♡", "💕", "😊", "😢", "😠"];

    let score = 0;
    emotionalWords.forEach((word) => {
      score += (content.match(new RegExp(word, "g")) || []).length * 0.1;
    });

    emotionalChars.forEach((char) => {
      score +=
        (
          content.match(
            new RegExp(char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")
          ) || []
        ).length * 0.05;
    });

    return Math.min(1.0, score);
  }

  /**
   * 繰り返し回数計算
   */
  private calculateRepetitionCount(messages: UnifiedMessage[]): number {
    const contents = messages.map((m) => m.content.toLowerCase());
    let repetitions = 0;

    for (let i = 0; i < contents.length - 1; i++) {
      for (let j = i + 1; j < contents.length; j++) {
        const similarity = this.calculateSimilarity(contents[i], contents[j]);
        if (similarity > 0.7) {
          repetitions++;
        }
      }
    }

    return Math.min(1.0, repetitions / Math.max(1, messages.length));
  }

  /**
   * ユーザー強調度計算
   */
  private calculateUserEmphasis(content: string): number {
    const emphasisMarkers = [
      "重要",
      "大切",
      "絶対",
      "必ず",
      "忘れないで",
      "覚えて",
    ];
    const capsWords = content.match(/[A-Z]{2,}/g) || [];
    const exclamations = (content.match(/！+/g) || []).length;

    let score = 0;
    emphasisMarkers.forEach((marker) => {
      score += (content.match(new RegExp(marker, "g")) || []).length * 0.2;
    });

    score += capsWords.length * 0.1;
    score += exclamations * 0.05;

    return Math.min(1.0, score);
  }

  /**
   * 文字列類似度計算（簡易版）
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * レーベンシュタイン距離計算
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }
}

export const memoryCardGenerator = new MemoryCardGenerator();
