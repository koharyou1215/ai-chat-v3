#!/usr/bin/env node

/**
 * Bundle Monitor
 * Monitors bundle sizes and provides warnings for significant changes
 */

const fs = require('fs');
const path = require('path');

// Performance budget thresholds (in bytes)
const PERFORMANCE_BUDGETS = {
  // Main bundle budgets
  'pages/_app': 300000, // 300KB
  'pages/index': 200000, // 200KB
  
  // Chunk budgets
  vendors: 400000, // 400KB for all vendor libraries
  'framer-motion': 150000, // 150KB for Framer Motion
  icons: 50000, // 50KB for Lucide icons
  'radix-ui': 100000, // 100KB for Radix UI
  'ui-components': 75000, // 75KB for UI components
  effects: 100000, // 100KB for effects
  galleries: 50000, // 50KB for galleries
  modals: 75000, // 75KB for modals
  common: 25000, // 25KB for common utilities
  
  // Asset budgets
  css: 100000, // 100KB for CSS
  images: 500000, // 500KB for images
};

// Critical thresholds (percentage increase)
const WARNING_THRESHOLD = 10; // 10% increase warning
const ERROR_THRESHOLD = 25; // 25% increase error

class BundleMonitor {
  constructor() {
    this.bundleStatsPath = path.join(__dirname, '../bundle-analysis/bundle-stats.json');
    this.historyPath = path.join(__dirname, '../bundle-analysis/bundle-history.json');
  }

  async monitor() {
    console.log('🔍 Starting Bundle Size Monitoring...\n');
    
    if (!fs.existsSync(this.bundleStatsPath)) {
      console.error('❌ Bundle stats not found. Run "npm run analyze:prod" first.');
      process.exit(1);
    }

    const currentStats = JSON.parse(fs.readFileSync(this.bundleStatsPath, 'utf8'));
    const history = this.loadHistory();
    
    const analysis = this.analyzeBundles(currentStats, history);
    this.generateReport(analysis);
    
    // Save current stats to history
    this.saveToHistory(currentStats, analysis);
    
    // Exit with error code if critical issues found
    if (analysis.hasErrors) {
      console.log('\n❌ Critical bundle size issues detected!');
      process.exit(1);
    }
    
    console.log('\n✅ Bundle monitoring complete!');
  }

  loadHistory() {
    if (fs.existsSync(this.historyPath)) {
      return JSON.parse(fs.readFileSync(this.historyPath, 'utf8'));
    }
    return [];
  }

  saveToHistory(currentStats, analysis) {
    const history = this.loadHistory();
    const entry = {
      timestamp: new Date().toISOString(),
      totalSize: analysis.totalSize,
      chunksCount: analysis.chunksCount,
      hasWarnings: analysis.hasWarnings,
      hasErrors: analysis.hasErrors,
      topChunks: analysis.chunks.slice(0, 10) // Top 10 chunks
    };
    
    history.push(entry);
    
    // Keep only last 50 entries
    if (history.length > 50) {
      history.splice(0, history.length - 50);
    }
    
    fs.writeFileSync(this.historyPath, JSON.stringify(history, null, 2));
  }

  analyzeBundles(currentStats, history) {
    const analysis = {
      totalSize: 0,
      chunksCount: 0,
      chunks: [],
      budgetViolations: [],
      sizeChanges: [],
      hasWarnings: false,
      hasErrors: false
    };

    // Analyze chunks
    if (currentStats.chunks) {
      currentStats.chunks.forEach(chunk => {
        const chunkInfo = {
          name: chunk.names ? chunk.names[0] : `chunk-${chunk.id}`,
          size: chunk.size,
          files: chunk.files || []
        };
        
        analysis.chunks.push(chunkInfo);
        analysis.totalSize += chunk.size;
      });
      
      analysis.chunksCount = currentStats.chunks.length;
    }

    // Sort chunks by size
    analysis.chunks.sort((a, b) => b.size - a.size);

    // Check budget violations
    analysis.chunks.forEach(chunk => {
      const budget = PERFORMANCE_BUDGETS[chunk.name];
      if (budget && chunk.size > budget) {
        const violation = {
          chunk: chunk.name,
          size: chunk.size,
          budget: budget,
          overBy: chunk.size - budget,
          percentage: ((chunk.size - budget) / budget * 100).toFixed(1)
        };
        analysis.budgetViolations.push(violation);
        analysis.hasErrors = true;
      }
    });

    // Compare with history if available
    if (history.length > 0) {
      const lastEntry = history[history.length - 1];
      const sizeChange = analysis.totalSize - lastEntry.totalSize;
      const changePercentage = (sizeChange / lastEntry.totalSize * 100);

      if (Math.abs(changePercentage) > WARNING_THRESHOLD) {
        analysis.sizeChanges.push({
          type: changePercentage > 0 ? 'increase' : 'decrease',
          change: sizeChange,
          percentage: changePercentage.toFixed(1),
          isWarning: Math.abs(changePercentage) > WARNING_THRESHOLD,
          isError: Math.abs(changePercentage) > ERROR_THRESHOLD
        });

        if (Math.abs(changePercentage) > WARNING_THRESHOLD) {
          analysis.hasWarnings = true;
        }
        if (Math.abs(changePercentage) > ERROR_THRESHOLD) {
          analysis.hasErrors = true;
        }
      }
    }

    return analysis;
  }

  generateReport(analysis) {
    console.log('📊 Bundle Analysis Report');
    console.log('='.repeat(50));
    
    // Overall stats
    console.log(`📦 Total Bundle Size: ${this.formatBytes(analysis.totalSize)}`);
    console.log(`🧩 Number of Chunks: ${analysis.chunksCount}`);
    console.log('');

    // Top 10 largest chunks
    console.log('📈 Largest Chunks:');
    analysis.chunks.slice(0, 10).forEach((chunk, index) => {
      const budget = PERFORMANCE_BUDGETS[chunk.name];
      const budgetInfo = budget ? ` (Budget: ${this.formatBytes(budget)})` : '';
      const status = budget && chunk.size > budget ? ' ❌' : ' ✅';
      console.log(`  ${index + 1}. ${chunk.name}: ${this.formatBytes(chunk.size)}${budgetInfo}${status}`);
    });
    console.log('');

    // Budget violations
    if (analysis.budgetViolations.length > 0) {
      console.log('🚨 Budget Violations:');
      analysis.budgetViolations.forEach(violation => {
        console.log(`  ❌ ${violation.chunk}: ${this.formatBytes(violation.size)} (${violation.percentage}% over budget)`);
        console.log(`      Budget: ${this.formatBytes(violation.budget)}, Over by: ${this.formatBytes(violation.overBy)}`);
      });
      console.log('');
    }

    // Size changes
    if (analysis.sizeChanges.length > 0) {
      console.log('📊 Size Changes:');
      analysis.sizeChanges.forEach(change => {
        const icon = change.isError ? '🚨' : change.isWarning ? '⚠️' : 'ℹ️';
        const direction = change.type === 'increase' ? '↗️' : '↘️';
        console.log(`  ${icon} ${direction} ${change.percentage}% (${this.formatBytes(Math.abs(change.change))})`);
      });
      console.log('');
    }

    // Recommendations
    this.generateRecommendations(analysis);
  }

  generateRecommendations(analysis) {
    console.log('💡 Recommendations:');
    
    if (analysis.budgetViolations.length === 0 && analysis.sizeChanges.length === 0) {
      console.log('  ✅ Bundle sizes are within acceptable limits!');
      return;
    }

    // Recommend specific optimizations based on largest chunks
    const largestChunk = analysis.chunks[0];
    if (largestChunk && largestChunk.size > 200000) { // > 200KB
      console.log(`  🎯 Consider optimizing "${largestChunk.name}" (${this.formatBytes(largestChunk.size)})`);
      
      if (largestChunk.name === 'vendors') {
        console.log('     - Consider tree-shaking unused dependencies');
        console.log('     - Use dynamic imports for heavy libraries');
        console.log('     - Check for duplicate dependencies');
      }
      
      if (largestChunk.name.includes('framer-motion')) {
        console.log('     - Use selective imports from framer-motion');
        console.log('     - Consider lazy loading animation components');
      }
    }

    // General recommendations
    if (analysis.chunksCount > 20) {
      console.log('  📦 Consider consolidating smaller chunks (current: ' + analysis.chunksCount + ')');
    }
    
    if (analysis.totalSize > 1000000) { // > 1MB
      console.log('  🎯 Total bundle size is large. Consider:');
      console.log('     - Implementing route-based code splitting');
      console.log('     - Using dynamic imports for non-critical features');
      console.log('     - Optimizing images and assets');
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Run if called directly
if (require.main === module) {
  const monitor = new BundleMonitor();
  monitor.monitor().catch(error => {
    console.error('❌ Bundle monitoring failed:', error);
    process.exit(1);
  });
}

module.exports = BundleMonitor;