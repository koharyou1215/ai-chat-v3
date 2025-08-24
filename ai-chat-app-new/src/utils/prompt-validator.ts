/**
 * プロンプト検証システム
 * ロールプレイ維持とメタ発言防止の確認
 */

interface PromptValidationResult {
  isValid: boolean;
  score: number;
  issues: string[];
  strengths: string[];
  recommendation: 'safe' | 'warning' | 'critical';
}

export class PromptValidator {
  /**
   * プロンプトの品質を検証
   */
  validatePrompt(prompt: string, characterName: string): PromptValidationResult {
    const issues: string[] = [];
    const strengths: string[] = [];
    let score = 100;

    // 1. ロールプレイ指示の確認
    if (!prompt.includes('AI={{char}}') && !prompt.includes(`{{char}}`)) {
      issues.push('キャラクター定義が不明確');
      score -= 30;
    } else {
      strengths.push('キャラクター定義が明確');
    }

    // 2. メタ発言禁止指示の確認
    if (!prompt.includes('メタ発言禁止') && !prompt.includes('AIである事実')) {
      issues.push('メタ発言禁止指示が欠落');
      score -= 25;
    } else {
      strengths.push('メタ発言禁止指示あり');
    }

    // 3. キャラクター一貫性指示の確認
    if (!prompt.includes('キャラクター一貫性') && !prompt.includes('性格・口調')) {
      issues.push('キャラクター一貫性指示が不足');
      score -= 20;
    } else {
      strengths.push('キャラクター一貫性指示あり');
    }

    // 4. 基本的なキャラクター情報の確認
    if (!prompt.includes(characterName)) {
      issues.push('キャラクター名が含まれていない');
      score -= 15;
    } else {
      strengths.push('キャラクター名が正しく含まれている');
    }

    // 5. システム指示構造の確認
    if (!prompt.includes('<system_instructions>')) {
      issues.push('システム指示の構造化が不足');
      score -= 10;
    } else {
      strengths.push('システム指示が構造化されている');
    }

    // 6. 代弁禁止指示の確認
    if (!prompt.includes('代弁禁止')) {
      issues.push('ユーザー代弁禁止指示が欠落');
      score -= 10;
    } else {
      strengths.push('代弁禁止指示あり');
    }

    // 推奨レベルの決定
    let recommendation: 'safe' | 'warning' | 'critical';
    if (score >= 80) {
      recommendation = 'safe';
    } else if (score >= 60) {
      recommendation = 'warning';
    } else {
      recommendation = 'critical';
    }

    return {
      isValid: score >= 60,
      score,
      issues,
      strengths,
      recommendation
    };
  }

  /**
   * 応答内容でメタ発言をチェック
   */
  checkResponseForMeta(response: string, _characterName: string): {
    hasMeta: boolean;
    metaIndicators: string[];
    severity: 'low' | 'medium' | 'high';
  } {
    const metaIndicators: string[] = [];
    
    const metaPatterns = [
      /AI/i,
      /システム/i,
      /プログラム/i,
      /設定/i,
      /キャラクター.*について/i,
      /物語.*中/i,
      /作品.*中/i,
      /未来.*行方/i,
      /どうなる.*思/i,
      /どう.*展開/i,
      /シナリオ/i,
      /ストーリー/i
    ];

    metaPatterns.forEach((pattern, index) => {
      if (pattern.test(response)) {
        switch(index) {
          case 0: metaIndicators.push('AI言及'); break;
          case 1: metaIndicators.push('システム言及'); break;
          case 2: metaIndicators.push('プログラム言及'); break;
          case 3: metaIndicators.push('設定言及'); break;
          case 4: metaIndicators.push('キャラクター分析'); break;
          case 5: metaIndicators.push('物語メタ言及'); break;
          case 6: metaIndicators.push('作品メタ言及'); break;
          case 7: metaIndicators.push('未来の行方言及'); break;
          case 8: metaIndicators.push('展開予測'); break;
          case 9: metaIndicators.push('展開議論'); break;
          case 10: metaIndicators.push('シナリオ言及'); break;
          case 11: metaIndicators.push('ストーリー言及'); break;
        }
      }
    });

    const severity = metaIndicators.length >= 3 ? 'high' : 
                     metaIndicators.length >= 1 ? 'medium' : 'low';

    return {
      hasMeta: metaIndicators.length > 0,
      metaIndicators,
      severity
    };
  }

  /**
   * 検証レポートを生成
   */
  generateReport(promptResult: PromptValidationResult, responseResult?: { hasMeta: boolean; metaIndicators: string[]; severity: string }): string {
    let report = '📋 プロンプト品質レポート\n';
    report += '========================\n\n';

    // スコアと推奨
    const scoreEmoji = promptResult.score >= 80 ? '✅' : promptResult.score >= 60 ? '⚠️' : '❌';
    report += `${scoreEmoji} 総合スコア: ${promptResult.score}/100\n`;
    report += `📊 推奨レベル: ${promptResult.recommendation}\n\n`;

    // 強み
    if (promptResult.strengths.length > 0) {
      report += '✅ 検出された強み:\n';
      promptResult.strengths.forEach(strength => {
        report += `  - ${strength}\n`;
      });
      report += '\n';
    }

    // 問題点
    if (promptResult.issues.length > 0) {
      report += '⚠️ 検出された問題:\n';
      promptResult.issues.forEach(issue => {
        report += `  - ${issue}\n`;
      });
      report += '\n';
    }

    // 応答チェック結果
    if (responseResult) {
      report += '🔍 応答メタチェック結果:\n';
      report += `  - メタ発言検出: ${responseResult.hasMeta ? '❌ あり' : '✅ なし'}\n`;
      report += `  - 重要度: ${responseResult.severity}\n`;
      if (responseResult.metaIndicators.length > 0) {
        report += `  - 検出項目: ${responseResult.metaIndicators.join(', ')}\n`;
      }
    }

    return report;
  }
}

export const promptValidator = new PromptValidator();

// デベロッパー用のテスト関数
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as Record<string, unknown>).validateCurrentPrompt = (prompt: string, characterName: string) => {
    const result = promptValidator.validatePrompt(prompt, characterName);
    console.log(promptValidator.generateReport(result));
    return result;
  };

  (window as Record<string, unknown>).checkResponse = (response: string, characterName: string) => {
    const result = promptValidator.checkResponseForMeta(response, characterName);
    console.log('🔍 Response Meta Check:', result);
    return result;
  };
}