// Prompt Template Management for AI Chat V3
// Manages dynamic prompt templates for conversation enhancement

import { PromptTemplate } from "@/types/core/memory.types";

export class PromptTemplateManager {
  private templates: Map<string, PromptTemplate> = new Map();

  constructor() {
    // デフォルトテンプレートの自動ロードを無効化しました。
    // ユーザーがテンプレートを望まないため、初期状態では空のテンプレートセットとします。
    // 必要な場合は addTemplate() を使って明示的に追加してください。
  }

  /**
   * 将来的にデフォルトテンプレートを再ロードしたい場合に使用するユーティリティ。
   */
  loadDefaultTemplates(): void {
    DEFAULT_PROMPT_TEMPLATES.forEach((template) =>
      this.templates.set(template.id, template)
    );
  }

  /**
   * テンプレートを取得
   */
  getTemplate(id: string): PromptTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * カテゴリ別のテンプレート一覧を取得
   */
  getTemplatesByCategory(
    category: PromptTemplate["category"]
  ): PromptTemplate[] {
    return Array.from(this.templates.values()).filter(
      (template) => template.category === category
    );
  }

  /**
   * 変数を置換してプロンプトを生成
   */
  generatePrompt(
    templateId: string,
    variables: Record<string, string>
  ): string {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template with id "${templateId}" not found`);
    }

    let prompt = template.template;

    // 変数を置換
    template.variables.forEach((variable) => {
      const value = variables[variable] || "";
      prompt = prompt.replace(new RegExp(`{{${variable}}}`, "g"), value);
    });

    return prompt;
  }

  /**
   * カスタムテンプレートを追加
   */
  addTemplate(template: PromptTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * テンプレートを削除
   */
  removeTemplate(id: string): boolean {
    return this.templates.delete(id);
  }

  /**
   * すべてのテンプレートを取得
   */
  getAllTemplates(): PromptTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * テンプレートを更新
   */
  updateTemplate(id: string, updates: Partial<PromptTemplate>): boolean {
    const template = this.templates.get(id);
    if (!template) {
      return false;
    }

    const updatedTemplate = { ...template, ...updates };
    this.templates.set(id, updatedTemplate);
    return true;
  }

  /**
   * テンプレートの変数を検証
   */
  validateVariables(
    templateId: string,
    variables: Record<string, string>
  ): {
    valid: boolean;
    missing: string[];
  } {
    const template = this.templates.get(templateId);
    if (!template) {
      return { valid: false, missing: [] };
    }

    const missing = template.variables.filter(
      (variable) =>
        !(variable in variables) || variables[variable] === undefined
    );

    return {
      valid: missing.length === 0,
      missing,
    };
  }
}

// デフォルトのプロンプトテンプレート集
export const DEFAULT_PROMPT_TEMPLATES: PromptTemplate[] = [
  // 返信提案用テンプレート
  {
    id: "friendly-suggestions",
    name: "フレンドリーな返信",
    description: "親しみやすい雰囲気の返信を生成",
    category: "conversation",
    template: `
会話の文脈を踏まえて、親しみやすくフレンドリーな返信を3つ生成してください。
絵文字や感嘆符を適度に使い、温かい雰囲気を演出してください。

会話の文脈:
{{context}}

返信候補:
1. 
2. 
3. 
`,
    variables: ["context"],
  },
  {
    id: "professional-suggestions",
    name: "プロフェッショナルな返信",
    description: "ビジネスライクで丁寧な返信を生成",
    category: "conversation",
    template: `
会話の文脈を踏まえて、プロフェッショナルで丁寧な返信を生成してください。
敬語を適切に使い、論理的で明確な内容にしてください。

会話の文脈:
{{context}}

返信:
`,
    variables: ["context"],
  },

  // テキスト強化用テンプレート
  {
    id: "expand-detail",
    name: "詳細に拡張",
    description: "簡潔な入力を詳細で丁寧な文章に拡張",
    category: "inspiration",
    template: `
以下の短いテキストを、会話の流れに合わせて詳細で丁寧な文章に拡張してください。
具体例や理由を追加し、相手に伝わりやすくしてください。

会話の文脈:
{{context}}

元のテキスト: {{text}}

拡張されたテキスト:
`,
    variables: ["context", "text"],
  },
  {
    id: "add-emotion",
    name: "感情を追加",
    description: "感情表現を加えて温かみのある文章に",
    category: "inspiration",
    template: `
以下のテキストに適切な感情表現を加えて、より人間味のある文章にしてください。
相手との関係性を考慮し、自然な感情表現を使ってください。

会話の文脈:
{{context}}

元のテキスト: {{text}}

感情を加えたテキスト:
`,
    variables: ["context", "text"],
  },
  {
    id: "make-polite",
    name: "丁寧語に変換",
    description: "カジュアルな文章を丁寧な敬語に変換",
    category: "inspiration",
    template: `
以下のテキストを、適切な敬語を使った丁寧な文章に変換してください。

元のテキスト: {{text}}

丁寧な文章:
`,
    variables: ["text"],
  },

  // システム用テンプレート
  {
    id: "context-analysis",
    name: "コンテキスト分析",
    description: "会話の文脈を分析してキーポイントを抽出",
    category: "system",
    template: `
以下の会話を分析し、重要なポイントと感情的な流れを整理してください。

会話:
{{conversation}}

分析結果:
- 主要なトピック:
- 感情的な流れ:
- 重要な情報:
- 次の展開の予測:
`,
    variables: ["conversation"],
  },
  {
    id: "memory-extraction",
    name: "メモリ抽出",
    description: "会話から重要な記憶要素を抽出",
    category: "memory",
    template: `
以下の会話から、長期記憶として保存すべき重要な情報を抽出してください。
事実、関係性、感情的な出来事、約束などを特定してください。

会話:
{{conversation}}

抽出された重要な情報:
`,
    variables: ["conversation"],
  },
  {
    id: "conversation-summary",
    name: "会話要約",
    description: "会話セッションの要約を生成",
    category: "memory",
    template: `
以下の会話セッションを要約してください。
主要な議題、決定事項、感情的な変化を含めてください。

会話:
{{conversation}}

要約:
`,
    variables: ["conversation"],
  },
];

// シングルトンインスタンス
export const promptTemplateManager = new PromptTemplateManager();
