#!/usr/bin/env node
/**
 * 🎯 直接TypeScriptエラー分析
 * 明確なエラーリストからClaude Code用タスクを生成
 */

const fs = require('fs');
const path = require('path');

// 現在確認されているエラー（手動入力）
const knownErrors = [
  {
    file: "src/components/character/CharacterGalleryModal.tsx",
    line: 102,
    column: 64,
    code: "TS2345",
    message: "Argument of type 'null' is not assignable to parameter of type 'Character'",
    priority: 1,
    category: "null_safety"
  },
  {
    file: "src/components/chat/CharacterReselectionModal.tsx", 
    line: 123,
    column: 5,
    code: "TS18046",
    message: "'updateSessionCharacters' is of type 'unknown'",
    priority: 1,
    category: "unknown_type"
  },
  {
    file: "src/components/chat/CharacterReselectionModal.tsx",
    line: 305,
    column: 29,
    code: "TS2322",
    message: "Type 'string | undefined' is not assignable to type 'string | StaticImport'",
    priority: 1,
    category: "undefined_type"
  },
  {
    file: "src/components/chat/ChatInterface.tsx",
    line: 403,
    column: 65,
    code: "TS2339",
    message: "Property 'characters' does not exist on type 'never'",
    priority: 1,
    category: "missing_property"
  },
  {
    file: "src/components/chat/ChatSidebar.tsx",
    line: 401,
    column: 44,
    code: "TS2345",
    message: "Type mismatch for UnifiedChatSession",
    priority: 2,
    category: "type_mismatch"
  },
  {
    file: "src/components/chat/ScenarioSetupModal.tsx",
    line: 28,
    column: 11,
    code: "TS2740",
    message: "Missing properties from type 'GroupChatScenario'",
    priority: 2,
    category: "missing_properties"
  },
  {
    file: "src/components/emotion/SoloEmotionalEffects.tsx",
    line: 32,
    column: 26,
    code: "TS2304",
    message: "Cannot find name 'EmotionIntelligenceSystem'",
    priority: 3,
    category: "missing_import"
  }
];

class DirectErrorAnalyzer {
  constructor() {
    this.projectRoot = path.join(__dirname, '..');
  }

  // ファイル別にグループ化
  groupByFile(errors) {
    const groups = {};
    errors.forEach(error => {
      if (!groups[error.file]) {
        groups[error.file] = [];
      }
      groups[error.file].push(error);
    });
    return groups;
  }

  // 優先度別にソート
  sortByPriority(errors) {
    return errors.sort((a, b) => a.priority - b.priority);
  }

  // Claude Code用タスク生成
  generateClaudeCodeTasks() {
    const fileGroups = this.groupByFile(knownErrors);
    const tasks = [];

    // Priority 1 ファイルを優先
    const priority1Files = Object.entries(fileGroups)
      .filter(([, errors]) => errors.some(e => e.priority === 1))
      .sort(([, a], [, b]) => 
        a.filter(e => e.priority === 1).length - b.filter(e => e.priority === 1).length
      );

    priority1Files.forEach(([file, errors], index) => {
      const criticalErrors = errors.filter(e => e.priority === 1);
      const taskNumber = index + 1;
      
      tasks.push({
        id: `task_${taskNumber}`,
        priority: 1,
        file: file,
        errorCount: criticalErrors.length,
        totalErrors: errors.length,
        title: `【Priority 1】${path.basename(file)} の重要エラー修正`,
        description: this.generateTaskDescription(file, criticalErrors),
        claudePrompt: this.generateClaudePrompt(file, criticalErrors),
        estimatedTime: "15-25分",
        errors: criticalErrors
      });
    });

    return tasks;
  }

  // タスク説明生成
  generateTaskDescription(file, errors) {
    const fileName = path.basename(file);
    const categories = [...new Set(errors.map(e => e.category))];
    return `${fileName}の${errors.length}個の重要なTypeScriptエラーを修正。主な問題: ${categories.join(', ')}`;
  }

  // Claude用詳細プロンプト生成
  generateClaudePrompt(file, errors) {
    const fileName = path.basename(file);
    const errorList = errors.map((error, i) => 
      `${i + 1}. Line ${error.line}: ${error.message} (${error.code})`
    ).join('\n');

    const fixStrategies = this.getFixStrategies(errors);

    return `## TypeScriptエラー修正タスク

**ファイル**: \`${file}\`
**エラー数**: ${errors.length}個

### エラー詳細:
${errorList}

### 修正方針:
${fixStrategies}

### 重要事項:
1. 既存機能を損なわない安全な修正を行う
2. 型安全性を確保する（any型の使用は最小限に）
3. null/undefined チェックを適切に実装
4. 修正後は \`node scripts/feature-test.js\` で動作確認

### 期待する成果:
- ${fileName} の TypeScript エラーがゼロになる
- 機能テストがすべて通る
- 既存機能が正常動作する

**注意**: このファイルは${this.getFileImportance(file)}なので、慎重に修正してください。`;
  }

  // 修正戦略を生成
  getFixStrategies(errors) {
    const strategies = [];
    const categories = [...new Set(errors.map(e => e.category))];

    categories.forEach(category => {
      switch (category) {
        case 'null_safety':
          strategies.push('• null チェック: optional chaining (?.) や null チェックを追加');
          break;
        case 'unknown_type':
          strategies.push('• 型定義: unknown型を適切な型にキャストまたは型定義を追加');
          break;
        case 'undefined_type':
          strategies.push('• undefined対応: デフォルト値設定や条件分岐を追加');
          break;
        case 'missing_property':
          strategies.push('• プロパティ存在確認: 型ガードやオプショナルプロパティの使用');
          break;
        case 'type_mismatch':
          strategies.push('• 型変換: 適切な型アサーションやインターフェース修正');
          break;
        case 'missing_import':
          strategies.push('• インポート修正: 不足しているインポートの追加または代替実装');
          break;
      }
    });

    return strategies.join('\n');
  }

  // ファイル重要度判定
  getFileImportance(file) {
    if (file.includes('ChatInterface')) return '主要チャット機能';
    if (file.includes('CharacterGallery')) return 'キャラクター管理機能';
    if (file.includes('ChatSidebar')) return 'サイドバー表示機能';
    if (file.includes('emotion')) return '感情知能機能（現在無効化中）';
    return '重要な機能';
  }

  // メイン実行
  run() {
    console.log('🎯 Claude Code 連携 TypeScript エラー修正タスク生成\n');

    const tasks = this.generateClaudeCodeTasks();
    
    console.log('📋 生成されたタスク一覧:\n');
    tasks.forEach((task, index) => {
      console.log(`${index + 1}. ${task.title}`);
      console.log(`   ファイル: ${path.basename(task.file)}`);
      console.log(`   エラー数: ${task.errorCount}個`);
      console.log(`   推定時間: ${task.estimatedTime}`);
      console.log();
    });

    // タスクファイル生成
    this.generateTaskFiles(tasks);
    
    console.log('✅ Claude Code用タスクファイルが生成されました！');
    console.log('\n🚀 次のステップ:');
    console.log('1. claudedocs/claude-code-tasks/ フォルダを確認');
    console.log('2. task_1.md から順番にClaude Codeで実行');
    console.log('3. 各タスク完了後は feature-test.js で確認');
  }

  // 個別タスクファイル生成
  generateTaskFiles(tasks) {
    const taskDir = path.join(this.projectRoot, 'claudedocs', 'claude-code-tasks');
    
    // ディレクトリ作成
    if (!fs.existsSync(taskDir)) {
      fs.mkdirSync(taskDir, { recursive: true });
    }

    // 各タスクファイル生成
    tasks.forEach(task => {
      const taskFile = path.join(taskDir, `${task.id}.md`);
      fs.writeFileSync(taskFile, task.claudePrompt);
    });

    // インデックスファイル生成
    const indexContent = this.generateIndexFile(tasks);
    fs.writeFileSync(path.join(taskDir, 'README.md'), indexContent);
  }

  // インデックスファイル生成
  generateIndexFile(tasks) {
    return `# 🤖 Claude Code TypeScriptエラー修正プロジェクト

生成日時: ${new Date().toLocaleString('ja-JP')}

## 📊 概要
- 総タスク数: ${tasks.length}個
- 修正対象エラー: ${knownErrors.length}個
- 推定総作業時間: ${tasks.length * 20}分

## 📋 実行順序

${tasks.map((task, index) => 
  `### ${index + 1}. ${task.title}
- **ファイル**: \`${task.file}\`
- **エラー数**: ${task.errorCount}個
- **推定時間**: ${task.estimatedTime}
- **タスクファイル**: \`${task.id}.md\`

`).join('')}

## 🎯 実行手順

1. **task_1.md** をClaude Codeで開く
2. プロンプト内容をコピーして実行
3. 修正完了後、以下を実行:
   \`\`\`bash
   node scripts/feature-test.js
   node scripts/feature-diff.js
   \`\`\`
4. 問題なければ次のタスクへ

## ✅ 進捗管理

完了したタスクにチェック:

${tasks.map((task, index) => `- [ ] Task ${index + 1}: ${task.title}`).join('\n')}

## 🔄 問題発生時

エラーが発生した場合:
1. \`git status\` で変更内容確認
2. \`git diff\` で詳細な差分確認  
3. 必要に応じて \`git checkout -- filename\` でリセット
4. Claude Codeで別のアプローチを試す`;
  }
}

if (require.main === module) {
  const analyzer = new DirectErrorAnalyzer();
  analyzer.run();
}

module.exports = DirectErrorAnalyzer;