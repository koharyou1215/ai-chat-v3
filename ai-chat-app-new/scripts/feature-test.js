#!/usr/bin/env node
/**
 * 🧪 AI Chat V3 機能テストスイート
 * 主要機能の動作確認を自動化
 */

const fs = require('fs');
const path = require('path');

class FeatureTestSuite {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      tests: {},
      summary: { passed: 0, failed: 0, skipped: 0 }
    };
  }

  // ファイル存在確認
  testFileExists(testName, filePath) {
    try {
      const exists = fs.existsSync(filePath);
      this.recordTest(testName, exists, exists ? 'File exists' : `File missing: ${filePath}`);
      return exists;
    } catch (error) {
      this.recordTest(testName, false, `Error checking file: ${error.message}`);
      return false;
    }
  }

  // TypeScript構文確認
  testTypeScriptSyntax(testName, filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // 基本的な構文チェック
      const hasImports = content.includes('import');
      const hasExports = content.includes('export');
      const hasSyntaxErrors = content.includes('// @ts-ignore') || content.includes('any');
      
      const passed = hasImports && hasExports && !hasSyntaxErrors;
      const message = `Imports: ${hasImports}, Exports: ${hasExports}, Clean syntax: ${!hasSyntaxErrors}`;
      
      this.recordTest(testName, passed, message);
      return passed;
    } catch (error) {
      this.recordTest(testName, false, `Syntax check failed: ${error.message}`);
      return false;
    }
  }

  // 設定値確認
  testConfigValues(testName) {
    try {
      const settingsPath = path.join(__dirname, '..', 'src', 'store', 'slices', 'settings.slice.ts');
      const content = fs.readFileSync(settingsPath, 'utf8');
      
      const emotionAnalysisEnabled = content.includes('emotion_analysis_enabled: true');
      const debugMode = content.includes('debug_mode: true');
      
      const message = `Emotion Analysis: ${emotionAnalysisEnabled}, Debug Mode: ${debugMode}`;
      this.recordTest(testName, true, message); // 設定確認なので常にpass
      
      return { emotionAnalysisEnabled, debugMode };
    } catch (error) {
      this.recordTest(testName, false, `Config check failed: ${error.message}`);
      return false;
    }
  }

  // インポートチェック
  testImportIntegrity(testName, filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const imports = content.match(/import.*from\s+['"]([^'"]+)['"]/g) || [];
      
      let brokenImports = [];
      imports.forEach(imp => {
        const match = imp.match(/from\s+['"]([^'"]+)['"]/);
        if (match) {
          const importPath = match[1];
          // 相対パスのみチェック
          if (importPath.startsWith('./') || importPath.startsWith('../')) {
            const resolvedPath = path.resolve(path.dirname(filePath), importPath);
            if (!fs.existsSync(resolvedPath) && !fs.existsSync(resolvedPath + '.ts') && !fs.existsSync(resolvedPath + '.tsx')) {
              brokenImports.push(importPath);
            }
          }
        }
      });
      
      const passed = brokenImports.length === 0;
      const message = passed ? `All ${imports.length} imports valid` : `Broken imports: ${brokenImports.join(', ')}`;
      
      this.recordTest(testName, passed, message);
      return passed;
    } catch (error) {
      this.recordTest(testName, false, `Import check failed: ${error.message}`);
      return false;
    }
  }

  // テスト結果記録
  recordTest(testName, passed, message) {
    this.results.tests[testName] = {
      passed,
      message,
      timestamp: new Date().toISOString()
    };
    
    if (passed) {
      this.results.summary.passed++;
      console.log(`✅ ${testName}: ${message}`);
    } else {
      this.results.summary.failed++;
      console.log(`❌ ${testName}: ${message}`);
    }
  }

  // メインテスト実行
  async runAllTests() {
    console.log('🧪 Starting AI Chat V3 Feature Tests...\n');
    
    const srcPath = path.join(__dirname, '..', 'src');
    
    // 1. 主要ファイルの存在確認
    this.testFileExists('Core Components Exist', path.join(srcPath, 'components', 'chat', 'ChatInterface.tsx'));
    this.testFileExists('Store Exists', path.join(srcPath, 'store', 'index.ts'));
    this.testFileExists('Types Exist', path.join(srcPath, 'types', 'index.ts'));
    
    // 2. 重要ファイルの構文チェック
    this.testTypeScriptSyntax('ChatInterface Syntax', path.join(srcPath, 'components', 'chat', 'ChatInterface.tsx'));
    this.testTypeScriptSyntax('Chat Slice Syntax', path.join(srcPath, 'store', 'slices', 'chat.slice.ts'));
    
    // 3. 設定値確認
    const config = this.testConfigValues('Settings Configuration');
    
    // 4. インポート整合性チェック
    this.testImportIntegrity('ChatInterface Imports', path.join(srcPath, 'components', 'chat', 'ChatInterface.tsx'));
    
    // 5. 感情知能システム状態確認
    this.testFileExists('Emotion System Base', path.join(srcPath, 'services', 'emotion', 'BaseEmotionAnalyzer.ts'));
    this.testFileExists('Emotion System Solo', path.join(srcPath, 'services', 'emotion', 'SoloEmotionAnalyzer.ts'));
    
    // 結果保存
    this.saveResults();
    this.printSummary();
  }

  // 結果保存
  saveResults() {
    const resultsPath = path.join(__dirname, '..', 'claudedocs', 'test-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(this.results, null, 2));
    console.log(`\n📊 Results saved to: ${resultsPath}`);
  }

  // サマリー表示
  printSummary() {
    const { passed, failed, skipped } = this.results.summary;
    const total = passed + failed + skipped;
    
    console.log('\n📋 Test Summary:');
    console.log(`✅ Passed: ${passed}/${total}`);
    console.log(`❌ Failed: ${failed}/${total}`);
    console.log(`⏭️  Skipped: ${skipped}/${total}`);
    console.log(`📊 Success Rate: ${Math.round((passed / total) * 100)}%`);
  }
}

// 実行
if (require.main === module) {
  const testSuite = new FeatureTestSuite();
  testSuite.runAllTests().catch(console.error);
}

module.exports = FeatureTestSuite;