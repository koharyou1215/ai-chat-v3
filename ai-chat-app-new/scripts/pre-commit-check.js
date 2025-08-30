#!/usr/bin/env node
/**
 * 🔧 Pre-commit Hook: 変更前の状態記録
 * コミット前に現在の状態をスナップショット
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class PreCommitChecker {
  constructor() {
    this.timestamp = new Date().toISOString();
    this.projectRoot = path.join(__dirname, '..');
  }

  // TypeScriptエラー数をカウント
  getTypeScriptErrors() {
    try {
      const output = execSync('npx tsc --noEmit', { 
        cwd: this.projectRoot,
        encoding: 'utf8' 
      });
      return 0; // エラーなし
    } catch (error) {
      const errorLines = error.stdout.split('\n').filter(line => 
        line.includes('error TS')
      );
      return errorLines.length;
    }
  }

  // 変更されたファイルリストを取得
  getChangedFiles() {
    try {
      const output = execSync('git diff --cached --name-only', {
        cwd: this.projectRoot,
        encoding: 'utf8'
      });
      return output.trim().split('\n').filter(file => file.length > 0);
    } catch (error) {
      return [];
    }
  }

  // プロジェクト統計情報を収集
  getProjectStats() {
    const stats = {
      timestamp: this.timestamp,
      typeScriptErrors: this.getTypeScriptErrors(),
      changedFiles: this.getChangedFiles(),
      totalFiles: 0,
      totalLines: 0
    };

    try {
      // ファイル数とライン数をカウント
      const output = execSync('find src -name "*.ts" -o -name "*.tsx" | xargs wc -l', {
        cwd: this.projectRoot,
        encoding: 'utf8'
      });
      
      const lines = output.trim().split('\n');
      const lastLine = lines[lines.length - 1];
      const match = lastLine.match(/(\d+)\s+total/);
      if (match) {
        stats.totalLines = parseInt(match[1]);
        stats.totalFiles = lines.length - 1; // 最後のtotal行を除く
      }
    } catch (error) {
      console.warn('Failed to get project stats:', error.message);
    }

    return stats;
  }

  // スナップショットを保存
  saveSnapshot() {
    const stats = this.getProjectStats();
    const snapshotPath = path.join(this.projectRoot, 'claudedocs', 'project-snapshots.jsonl');
    
    // JSONL形式で追記（時系列データとして）
    const snapshot = JSON.stringify(stats) + '\n';
    
    fs.appendFileSync(snapshotPath, snapshot);
    
    console.log('📸 Project snapshot saved:');
    console.log(`   TypeScript errors: ${stats.typeScriptErrors}`);
    console.log(`   Changed files: ${stats.changedFiles.length}`);
    console.log(`   Total lines: ${stats.totalLines}`);
    
    return stats;
  }

  // 状態追跡ドキュメントを更新
  updateStateTracker() {
    const trackerPath = path.join(this.projectRoot, 'claudedocs', 'project-state-tracker.md');
    
    if (!fs.existsSync(trackerPath)) {
      console.warn('State tracker not found, skipping update');
      return;
    }

    const stats = this.getProjectStats();
    const updateNote = `
### ${this.timestamp.split('T')[0]}: Pre-commit State
**技術指標更新:**
- TypeScriptエラー数: ${stats.typeScriptErrors}個
- 変更ファイル: ${stats.changedFiles.length}個
- 総ライン数: ${stats.totalLines}行

**変更されたファイル:**
${stats.changedFiles.map(file => `- ${file}`).join('\n')}

`;

    // ドキュメントに追記
    fs.appendFileSync(trackerPath, updateNote);
    console.log('📝 State tracker updated');
  }

  run() {
    console.log('🔍 Pre-commit check starting...');
    
    const stats = this.saveSnapshot();
    this.updateStateTracker();
    
    // TypeScriptエラーが増えすぎている場合は警告
    if (stats.typeScriptErrors > 500) {
      console.warn('⚠️  WARNING: TypeScript errors exceed 500. Consider fixing before commit.');
    }
    
    console.log('✅ Pre-commit check completed');
    return true; // コミットを続行
  }
}

if (require.main === module) {
  const checker = new PreCommitChecker();
  const success = checker.run();
  process.exit(success ? 0 : 1);
}

module.exports = PreCommitChecker;