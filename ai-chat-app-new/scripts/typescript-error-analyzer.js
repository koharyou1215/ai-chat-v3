#!/usr/bin/env node
/**
 * 🔍 TypeScriptエラー分析器
 * Claude Code連携用のエラー分類・優先順位付けツール
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class TypeScriptErrorAnalyzer {
  constructor() {
    this.projectRoot = path.join(__dirname, '..');
    this.errorPatterns = this.defineErrorPatterns();
    this.results = {
      timestamp: new Date().toISOString(),
      totalErrors: 0,
      categorizedErrors: {},
      fileErrorCounts: {},
      prioritizedFixes: [],
      claudeCodeTasks: []
    };
  }

  // エラーパターン定義
  defineErrorPatterns() {
    return {
      // 🔴 CRITICAL - 基本機能に影響
      'missing_property': {
        pattern: /Property '([^']+)' does not exist on type/,
        priority: 1,
        autoFixable: true,
        description: 'プロパティが存在しない',
        strategy: 'Optional chaining or type assertion'
      },
      'cannot_find_name': {
        pattern: /Cannot find name '([^']+)'/,
        priority: 1,
        autoFixable: true,
        description: '変数・関数が見つからない',
        strategy: 'Import or variable definition'
      },
      'type_not_assignable': {
        pattern: /Type '([^']+)' is not assignable to type '([^']+)'/,
        priority: 2,
        autoFixable: true,
        description: '型の不一致',
        strategy: 'Type casting or interface update'
      },
      
      // 🟡 IMPORTANT - 型安全性に影響  
      'no_exported_member': {
        pattern: /Module '"([^"]+)"' has no exported member '([^']+)'/,
        priority: 2,
        autoFixable: true,
        description: 'エクスポートされていないメンバー',
        strategy: 'Update import or add export'
      },
      'undefined_assignable': {
        pattern: /Type 'undefined' is not assignable to type/,
        priority: 2,
        autoFixable: true,
        description: 'undefined の型エラー',
        strategy: 'Null safety with optional chaining'
      },
      
      // 🟢 LOW - 最適化・品質向上
      'implicit_any': {
        pattern: /Parameter '([^']+)' implicitly has an 'any' type/,
        priority: 3,
        autoFixable: true,
        description: '暗黙的any型',
        strategy: 'Add explicit type annotations'
      },
      'unused_variable': {
        pattern: /'([^']+)' is declared but its value is never read/,
        priority: 4,
        autoFixable: true,
        description: '未使用変数',
        strategy: 'Remove unused variables or add underscore prefix'
      }
    };
  }

  // TypeScriptエラー取得
  getTypeScriptErrors() {
    try {
      execSync('npx tsc --noEmit --skipLibCheck', { 
        cwd: this.projectRoot,
        encoding: 'utf8' 
      });
      return []; // エラーなし
    } catch (error) {
      const output = error.stdout || error.stderr || '';
      return this.parseErrors(output);
    }
  }

  // エラーを構造化して解析
  parseErrors(output) {
    const errorLines = output.split('\n').filter(line => 
      line.includes('error TS') && line.includes('): ')
    );

    return errorLines.map(line => {
      const match = line.match(/^(.+?)\((\d+),(\d+)\): error (TS\d+): (.+)$/);
      if (match) {
        return {
          file: match[1],
          line: parseInt(match[2]),
          column: parseInt(match[3]),
          code: match[4],
          message: match[5],
          fullLine: line
        };
      }
      return null;
    }).filter(Boolean);
  }

  // エラーをカテゴリ別に分類
  categorizeErrors(errors) {
    const categorized = {};
    const uncategorized = [];

    errors.forEach(error => {
      let matched = false;
      
      for (const [category, pattern] of Object.entries(this.errorPatterns)) {
        if (pattern.pattern.test(error.message)) {
          if (!categorized[category]) {
            categorized[category] = [];
          }
          categorized[category].push({
            ...error,
            category,
            priority: pattern.priority,
            autoFixable: pattern.autoFixable,
            strategy: pattern.strategy
          });
          matched = true;
          break;
        }
      }

      if (!matched) {
        uncategorized.push(error);
      }
    });

    return { categorized, uncategorized };
  }

  // ファイル別エラー集計
  aggregateByFile(errors) {
    const fileMap = {};
    
    errors.forEach(error => {
      const relativePath = path.relative(this.projectRoot, error.file);
      if (!fileMap[relativePath]) {
        fileMap[relativePath] = {
          count: 0,
          errors: [],
          priorities: { 1: 0, 2: 0, 3: 0, 4: 0 }
        };
      }
      
      fileMap[relativePath].count++;
      fileMap[relativePath].errors.push(error);
      fileMap[relativePath].priorities[error.priority || 5]++;
    });

    // エラー数順でソート
    return Object.entries(fileMap)
      .sort(([,a], [,b]) => b.count - a.count)
      .reduce((obj, [file, data]) => {
        obj[file] = data;
        return obj;
      }, {});
  }

  // Claude Code用タスク生成
  generateClaudeCodeTasks(categorizedErrors, fileErrorCounts) {
    const tasks = [];

    // Priority 1: Critical errors (file by file)
    const criticalFiles = Object.entries(fileErrorCounts)
      .filter(([, data]) => data.priorities[1] > 0)
      .slice(0, 5); // Top 5 files

    criticalFiles.forEach(([file, data]) => {
      const criticalErrors = data.errors.filter(e => e.priority === 1);
      tasks.push({
        priority: 1,
        type: 'critical_fixes',
        file: file,
        errorCount: criticalErrors.length,
        description: `${file} の重要なTypeScriptエラー修正`,
        errors: criticalErrors.slice(0, 10), // 最大10個
        estimatedTime: '15-30分',
        claudePrompt: this.generateClaudePrompt(file, criticalErrors.slice(0, 10))
      });
    });

    // Priority 2: Type safety improvements
    const typeSafetyFiles = Object.entries(fileErrorCounts)
      .filter(([, data]) => data.priorities[2] > 0)
      .slice(0, 3); // Top 3 files

    typeSafetyFiles.forEach(([file, data]) => {
      const typeErrors = data.errors.filter(e => e.priority === 2);
      tasks.push({
        priority: 2,
        type: 'type_safety',
        file: file,
        errorCount: typeErrors.length,
        description: `${file} の型安全性向上`,
        errors: typeErrors.slice(0, 8),
        estimatedTime: '10-20分',
        claudePrompt: this.generateClaudePrompt(file, typeErrors.slice(0, 8))
      });
    });

    return tasks.sort((a, b) => a.priority - b.priority);
  }

  // Claude用プロンプト生成
  generateClaudePrompt(file, errors) {
    const errorDescriptions = errors.map(error => 
      `Line ${error.line}: ${error.message}`
    ).join('\n');

    return `TypeScriptエラー修正タスク:

ファイル: ${file}
エラー数: ${errors.length}個

エラー詳細:
${errorDescriptions}

修正方針:
${errors.map(e => `- ${e.strategy}`).join('\n')}

安全な修正を行い、既存機能に影響を与えないよう注意してください。
修正後は機能テスト (node scripts/feature-test.js) を実行してください。`;
  }

  // メイン分析実行
  async analyze() {
    console.log('🔍 TypeScriptエラー分析を開始...\n');

    const errors = this.getTypeScriptErrors();
    this.results.totalErrors = errors.length;

    if (errors.length === 0) {
      console.log('🎉 TypeScriptエラーはありません！');
      return this.results;
    }

    console.log(`📊 総エラー数: ${errors.length}個\n`);

    // エラー分類
    const { categorized, uncategorized } = this.categorizeErrors(errors);
    this.results.categorizedErrors = categorized;

    // ファイル別集計
    const allCategorizedErrors = Object.values(categorized).flat();
    this.results.fileErrorCounts = this.aggregateByFile(allCategorizedErrors);

    // Claude Code タスク生成
    this.results.claudeCodeTasks = this.generateClaudeCodeTasks(
      categorized, 
      this.results.fileErrorCounts
    );

    this.printAnalysisResults();
    this.saveResults();

    return this.results;
  }

  // 分析結果表示
  printAnalysisResults() {
    console.log('📋 エラーカテゴリ別集計:');
    Object.entries(this.results.categorizedErrors).forEach(([category, errors]) => {
      const pattern = this.errorPatterns[category];
      console.log(`   ${this.getPriorityEmoji(pattern.priority)} ${category}: ${errors.length}個 - ${pattern.description}`);
    });
    
    console.log('\n📁 エラー数上位ファイル:');
    Object.entries(this.results.fileErrorCounts).slice(0, 10).forEach(([file, data]) => {
      console.log(`   ${data.count}個 - ${file}`);
    });

    console.log('\n🎯 Claude Code 修正タスク:');
    this.results.claudeCodeTasks.forEach((task, index) => {
      console.log(`   ${index + 1}. ${this.getPriorityEmoji(task.priority)} ${task.description}`);
      console.log(`      エラー: ${task.errorCount}個 | 推定時間: ${task.estimatedTime}`);
    });
  }

  getPriorityEmoji(priority) {
    const emojis = { 1: '🔴', 2: '🟡', 3: '🟢', 4: '⚪' };
    return emojis[priority] || '❓';
  }

  // 結果保存
  saveResults() {
    const resultsPath = path.join(this.projectRoot, 'claudedocs', 'typescript-error-analysis.json');
    fs.writeFileSync(resultsPath, JSON.stringify(this.results, null, 2));
    
    // Claude Code用の簡易タスクリストも生成
    const tasksPath = path.join(this.projectRoot, 'claudedocs', 'claude-code-tasks.md');
    this.generateTaskMarkdown(tasksPath);
    
    console.log(`\n📄 詳細分析結果: ${resultsPath}`);
    console.log(`📋 Claude Code タスクリスト: ${tasksPath}`);
  }

  // Claude Code用Markdownタスク生成
  generateTaskMarkdown(outputPath) {
    let markdown = `# 🤖 Claude Code TypeScriptエラー修正タスク

生成日時: ${new Date().toLocaleString('ja-JP')}
総エラー数: ${this.results.totalErrors}個

## 📋 修正タスクリスト

`;

    this.results.claudeCodeTasks.forEach((task, index) => {
      markdown += `### ${index + 1}. ${task.description}
- **優先度**: ${this.getPriorityEmoji(task.priority)} Priority ${task.priority}
- **ファイル**: \`${task.file}\`
- **エラー数**: ${task.errorCount}個
- **推定時間**: ${task.estimatedTime}

**Claude用プロンプト:**
\`\`\`
${task.claudePrompt}
\`\`\`

---

`;
    });

    markdown += `## 🎯 実行順序

1. Priority 1 (🔴) から順番に実行
2. 各タスク完了後に \`node scripts/feature-test.js\` で動作確認
3. \`node scripts/feature-diff.js\` で影響分析
4. 問題なければ次のタスクへ進む

## 📊 進捗追跡

- [ ] Task 1: ${this.results.claudeCodeTasks[0]?.description || 'N/A'}
- [ ] Task 2: ${this.results.claudeCodeTasks[1]?.description || 'N/A'}
- [ ] Task 3: ${this.results.claudeCodeTasks[2]?.description || 'N/A'}

完了したタスクにチェックを入れてください。`;

    fs.writeFileSync(outputPath, markdown);
  }
}

if (require.main === module) {
  const analyzer = new TypeScriptErrorAnalyzer();
  analyzer.analyze().catch(console.error);
}

module.exports = TypeScriptErrorAnalyzer;