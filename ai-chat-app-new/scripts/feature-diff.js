#!/usr/bin/env node
/**
 * 🔍 機能差分分析ツール
 * 変更前後の機能差分を自動検出・レポート
 */

const fs = require('fs');
const path = require('path');

class FeatureDiffAnalyzer {
  constructor() {
    this.projectRoot = path.join(__dirname, '..');
    this.snapshotsPath = path.join(this.projectRoot, 'claudedocs', 'project-snapshots.jsonl');
  }

  // スナップショット履歴を読み込み
  loadSnapshots() {
    if (!fs.existsSync(this.snapshotsPath)) {
      return [];
    }

    const content = fs.readFileSync(this.snapshotsPath, 'utf8');
    return content.trim().split('\n')
      .filter(line => line.length > 0)
      .map(line => JSON.parse(line))
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  // 2つのスナップショット間の差分を分析
  analyzeDiff(before, after) {
    const diff = {
      timestamp: {
        before: before.timestamp,
        after: after.timestamp
      },
      metrics: {
        typeScriptErrors: {
          before: before.typeScriptErrors,
          after: after.typeScriptErrors,
          change: after.typeScriptErrors - before.typeScriptErrors
        },
        totalLines: {
          before: before.totalLines,
          after: after.totalLines,
          change: after.totalLines - before.totalLines
        },
        totalFiles: {
          before: before.totalFiles,
          after: after.totalFiles,
          change: after.totalFiles - before.totalFiles
        }
      },
      assessment: this.assessChanges(before, after)
    };

    return diff;
  }

  // 変更の評価
  assessChanges(before, after) {
    const assessment = {
      overall: 'neutral',
      details: [],
      recommendations: []
    };

    // TypeScriptエラーの変化
    const errorDiff = after.typeScriptErrors - before.typeScriptErrors;
    if (errorDiff < 0) {
      assessment.details.push(`✅ TypeScriptエラーが${Math.abs(errorDiff)}個減少`);
      assessment.overall = 'positive';
    } else if (errorDiff > 0) {
      assessment.details.push(`❌ TypeScriptエラーが${errorDiff}個増加`);
      assessment.overall = 'negative';
      assessment.recommendations.push('新しいTypeScriptエラーの修正を検討');
    }

    // ファイル数の変化
    const fileDiff = after.totalFiles - before.totalFiles;
    if (fileDiff > 0) {
      assessment.details.push(`📁 ファイルが${fileDiff}個追加`);
    } else if (fileDiff < 0) {
      assessment.details.push(`📁 ファイルが${Math.abs(fileDiff)}個削除`);
    }

    // コード量の変化
    const lineDiff = after.totalLines - before.totalLines;
    if (lineDiff > 100) {
      assessment.details.push(`📈 コード量が大幅増加（+${lineDiff}行）`);
      assessment.recommendations.push('大きな変更の場合は機能テストを実行');
    } else if (lineDiff < -100) {
      assessment.details.push(`📉 コード量が大幅減少（${lineDiff}行）`);
      assessment.recommendations.push('削除された機能の影響確認を推奨');
    }

    return assessment;
  }

  // 最新の差分レポートを生成
  generateLatestDiffReport() {
    const snapshots = this.loadSnapshots();
    
    if (snapshots.length < 2) {
      console.log('📊 差分分析には最低2つのスナップショットが必要です');
      return null;
    }

    const latest = snapshots[snapshots.length - 1];
    const previous = snapshots[snapshots.length - 2];
    
    const diff = this.analyzeDiff(previous, latest);
    
    console.log('🔍 最新の変更分析レポート');
    console.log('================================');
    console.log(`期間: ${previous.timestamp.split('T')[0]} → ${latest.timestamp.split('T')[0]}`);
    console.log();
    
    console.log('📊 変更指標:');
    console.log(`   TypeScriptエラー: ${diff.metrics.typeScriptErrors.before} → ${diff.metrics.typeScriptErrors.after} (${diff.metrics.typeScriptErrors.change >= 0 ? '+' : ''}${diff.metrics.typeScriptErrors.change})`);
    console.log(`   総ファイル数: ${diff.metrics.totalFiles.before} → ${diff.metrics.totalFiles.after} (${diff.metrics.totalFiles.change >= 0 ? '+' : ''}${diff.metrics.totalFiles.change})`);
    console.log(`   総ライン数: ${diff.metrics.totalLines.before} → ${diff.metrics.totalLines.after} (${diff.metrics.totalLines.change >= 0 ? '+' : ''}${diff.metrics.totalLines.change})`);
    console.log();
    
    console.log('🎯 変更評価:');
    diff.assessment.details.forEach(detail => console.log(`   ${detail}`));
    console.log();
    
    if (diff.assessment.recommendations.length > 0) {
      console.log('💡 推奨事項:');
      diff.assessment.recommendations.forEach(rec => console.log(`   • ${rec}`));
      console.log();
    }

    // レポートをファイルに保存
    this.saveDiffReport(diff);
    
    return diff;
  }

  // 差分レポートをファイルに保存
  saveDiffReport(diff) {
    const reportPath = path.join(this.projectRoot, 'claudedocs', 'latest-diff-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(diff, null, 2));
    console.log(`📄 詳細レポートを保存: ${reportPath}`);
  }

  // 機能テストとの比較
  compareWithFunctionTests() {
    const testResultsPath = path.join(this.projectRoot, 'claudedocs', 'test-results.json');
    
    if (!fs.existsSync(testResultsPath)) {
      console.log('⚠️  機能テスト結果が見つかりません。scripts/feature-test.js を実行してください。');
      return;
    }

    const testResults = JSON.parse(fs.readFileSync(testResultsPath, 'utf8'));
    const snapshots = this.loadSnapshots();
    
    if (snapshots.length === 0) {
      console.log('⚠️  スナップショットが見つかりません。');
      return;
    }

    const latest = snapshots[snapshots.length - 1];
    
    console.log('\n🧪 機能テスト vs プロジェクト指標:');
    console.log(`   テスト成功率: ${Math.round((testResults.summary.passed / (testResults.summary.passed + testResults.summary.failed)) * 100)}%`);
    console.log(`   TypeScriptエラー: ${latest.typeScriptErrors}個`);
    
    if (testResults.summary.failed > 0 && latest.typeScriptErrors > 0) {
      console.log('   📋 TypeScriptエラー修正が機能テストの改善に寄与する可能性があります');
    }
  }
}

if (require.main === module) {
  const analyzer = new FeatureDiffAnalyzer();
  
  console.log('🔍 機能差分分析を開始...\n');
  
  const diff = analyzer.generateLatestDiffReport();
  analyzer.compareWithFunctionTests();
  
  console.log('\n✅ 分析完了');
}

module.exports = FeatureDiffAnalyzer;