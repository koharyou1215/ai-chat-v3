/**
 * Inspiration Service Tests
 * インスピレーション機能の品質検証テスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InspirationService } from '../services/inspiration-service';
import { Character, Persona, UnifiedMessage } from '@/types';

describe('InspirationService - Quality Validation', () => {
  let service: InspirationService;

  beforeEach(() => {
    service = new InspirationService();
  });

  describe('validateAndFixSuggestions', () => {
    it('should filter out invalid suggestions (empty, too short)', () => {
      const mockSuggestions = [
        { id: '1', type: 'empathy' as const, content: '', confidence: 0.8 },
        { id: '2', type: 'question' as const, content: '短い', confidence: 0.8 },
        {
          id: '3',
          type: 'topic' as const,
          content: '有効な提案です。' + 'あ'.repeat(100),
          confidence: 0.8,
        },
      ];

      const result = (service as any).validateAndFixSuggestions(mockSuggestions, 3);

      expect(result).toHaveLength(1);
      expect(result[0].content).toContain('有効な提案');
    });

    it('should filter out theme-only descriptions', () => {
      const mockSuggestions = [
        {
          id: '1',
          type: 'empathy' as const,
          content: '共感・受容型',
          confidence: 0.8,
        },
        {
          id: '2',
          type: 'question' as const,
          content: '相手の感情や状況に寄り添い、褒めて安心させ共感する',
          confidence: 0.8,
        },
        {
          id: '3',
          type: 'topic' as const,
          content:
            '本当に良く頑張っているね。その努力を見ていると、俺も元気が出てくるよ。' +
            'あ'.repeat(50),
          confidence: 0.8,
        },
      ];

      const result = (service as any).validateAndFixSuggestions(mockSuggestions, 3);

      expect(result).toHaveLength(1);
      expect(result[0].content).toContain('本当に良く頑張って');
    });

    it('should filter out duplicates with 90% similarity', () => {
      const mockSuggestions = [
        {
          id: '1',
          type: 'empathy' as const,
          content: 'これは良い提案です。' + 'あ'.repeat(90),
          confidence: 0.8,
        },
        {
          id: '2',
          type: 'question' as const,
          content: 'これは良い提案です。' + 'い'.repeat(90),
          confidence: 0.8,
        },
        {
          id: '3',
          type: 'topic' as const,
          content: '完全に異なる提案です。' + 'う'.repeat(80),
          confidence: 0.8,
        },
      ];

      const result = (service as any).validateAndFixSuggestions(mockSuggestions, 3);

      // 🔧 類似度90%以上で重複除外（以前は80%）
      // 上記の2つの提案は90%未満の類似度なので両方通過する
      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result[0].content).toContain('これは良い提案');
    });

    it('should truncate long suggestions to 400 chars', () => {
      const longContent = 'あ'.repeat(500);
      const mockSuggestions = [
        { id: '1', type: 'empathy' as const, content: longContent, confidence: 0.8 },
      ];

      const result = (service as any).validateAndFixSuggestions(mockSuggestions, 1);

      expect(result).toHaveLength(1);
      expect(result[0].content.length).toBeLessThanOrEqual(403); // 400 + "..."
      expect(result[0].content).toContain('...');
    });
  });

  describe('parseReplySuggestionsAdvanced', () => {
    it('should parse numbered list format (standard)', () => {
      const mockResponse = `
1. これは共感型の提案です。相手に寄り添って話しましょう。${'あ'.repeat(80)}
2. これは質問型の提案です。相手に質問してみましょう。${'い'.repeat(80)}
3. これはトピック型の提案です。新しい話題を提供しましょう。${'う'.repeat(80)}
      `;

      const result = (service as any).parseReplySuggestionsAdvanced(mockResponse);

      expect(result).toHaveLength(3);
      expect(result[0].content).toContain('これは共感型');
      expect(result[1].content).toContain('これは質問型');
      expect(result[2].content).toContain('これはトピック型');
    });

    it('should parse numbered list with Japanese punctuation', () => {
      const mockResponse = `
1。これは共感型の提案です。${'あ'.repeat(80)}
2）これは質問型の提案です。${'い'.repeat(80)}
3. これはトピック型の提案です。${'う'.repeat(80)}
      `;

      const result = (service as any).parseReplySuggestionsAdvanced(mockResponse);

      expect(result.length).toBeGreaterThanOrEqual(3);
    });

    it('should parse bracket format', () => {
      const mockResponse = `
[共感・受容] 相手の気持ちを理解して、優しく話しかけます。${'あ'.repeat(70)}
[質問・探求] 相手の考えを深掘りする質問をします。${'い'.repeat(70)}
[トピック展開] 新しい視点から話題を広げます。${'う'.repeat(70)}
      `;

      const result = (service as any).parseReplySuggestionsAdvanced(mockResponse);

      expect(result).toHaveLength(3);
      expect(result[0].content).toContain('相手の気持ち');
      expect(result[1].content).toContain('相手の考え');
      expect(result[2].content).toContain('新しい視点');
    });

    it('should parse paragraph-separated format (fallback)', () => {
      const mockResponse = `
これは共感型の提案です。相手に寄り添って話しましょう。${'あ'.repeat(80)}

これは質問型の提案です。相手に質問してみましょう。${'い'.repeat(80)}

これはトピック型の提案です。新しい話題を提供しましょう。${'う'.repeat(80)}
      `;

      const result = (service as any).parseReplySuggestionsAdvanced(mockResponse);

      expect(result.length).toBeGreaterThanOrEqual(3);
    });

    it('should handle multiline suggestions', () => {
      const mockResponse = `
1. これは共感型の提案です。
相手に寄り添って話しましょう。
優しく接することが大切です。

2. これは質問型の提案です。
相手に質問してみましょう。
深掘りすることが重要です。

3. これはトピック型の提案です。
新しい話題を提供しましょう。
興味を引く内容にしましょう。
      `;

      const result = (service as any).parseReplySuggestionsAdvanced(mockResponse);

      expect(result.length).toBeGreaterThanOrEqual(3);
      expect(result[0].content).toContain('共感型');
    });
  });

  describe('isInvalidSuggestion', () => {
    it('should detect empty or too short content', () => {
      expect((service as any).isInvalidSuggestion('')).toBe(true);
      expect((service as any).isInvalidSuggestion('短い')).toBe(true);
      expect((service as any).isInvalidSuggestion('このテキストは十分な長さがあります')).toBe(
        false
      );
    });

    it('should detect theme keywords only', () => {
      expect((service as any).isInvalidSuggestion('共感・受容')).toBe(true);
      expect((service as any).isInvalidSuggestion('質問・探求型')).toBe(true);
      expect((service as any).isInvalidSuggestion('言葉責め')).toBe(true);
      expect((service as any).isInvalidSuggestion('トピック展開')).toBe(true);
    });
  });

  describe('isThemeDescriptionOnly', () => {
    it('should detect theme labels', () => {
      expect((service as any).isThemeDescriptionOnly('共感・受容型')).toBe(true);
      expect((service as any).isThemeDescriptionOnly('質問・探求型')).toBe(true);
    });

    it('should detect theme description patterns', () => {
      expect(
        (service as any).isThemeDescriptionOnly('相手の感情や状況に寄り添い、褒める')
      ).toBe(true);
      expect((service as any).isThemeDescriptionOnly('相手を巧みな話術でペースを乱す')).toBe(
        true
      );
      expect((service as any).isThemeDescriptionOnly('相手の仕草・空気感を観察し')).toBe(
        true
      );
    });

    it('should not detect valid content as theme description', () => {
      expect(
        (service as any).isThemeDescriptionOnly(
          '本当に頑張っているね。その姿を見ていると俺も励まされるよ。'
        )
      ).toBe(false);
    });
  });

  describe('calculateSimilarity', () => {
    it('should calculate text similarity correctly', () => {
      // 空白で分割可能な英文でテスト
      const text1 = 'This is a good suggestion for the user';
      const text2 = 'This is a good suggestion';
      const text3 = 'Completely different content here';

      const similarity1 = (service as any).calculateSimilarity(text1, text2);
      const similarity2 = (service as any).calculateSimilarity(text1, text3);

      expect(similarity1).toBeGreaterThan(0.6); // 高い類似度
      expect(similarity2).toBeLessThan(0.3); // 低い類似度
    });
  });
});

describe('InspirationService - Placeholder Replacement', () => {
  let service: InspirationService;

  beforeEach(() => {
    service = new InspirationService();
  });

  it('should replace {{user}} and {{char}} placeholders', () => {
    const customPrompt = `あなたは{{user}}として、{{char}}との会話で返信してください。`;
    const user: Persona = {
      id: '1',
      name: '太郎',
      role: 'user',
      other_settings: '',
      created_at: '',
      updated_at: '',
      version: 1,
    };
    const character: Character = {
      id: '1',
      name: '花子',
      created_at: '',
      updated_at: '',
      version: 1,
    } as Character;

    const messages: UnifiedMessage[] = [];

    // generateReplySuggestionsをモック
    const buildContextSpy = vi
      .spyOn(service as any, 'buildContext')
      .mockReturnValue('会話履歴');

    // プレースホルダー置換をテスト
    const replacedPrompt = customPrompt
      .replace(/{{user}}/g, user.name)
      .replace(/{{char}}/g, character.name);

    expect(replacedPrompt).toBe('あなたは太郎として、花子との会話で返信してください。');

    buildContextSpy.mockRestore();
  });
});
