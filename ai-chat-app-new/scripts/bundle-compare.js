#!/usr/bin/env node

/**
 * Bundle Comparison Tool
 * Compares current bundle with previous builds to track size changes
 */

const fs = require('fs');
const path = require('path');

class BundleComparator {
  constructor() {
    this.bundleStatsPath = path.join(__dirname, '../bundle-analysis/bundle-stats.json');
    this.historyPath = path.join(__dirname, '../bundle-analysis/bundle-history.json');
    this.reportsDir = path.join(__dirname, '../bundle-analysis/reports');
  }

  async compare() {
    console.log('🔍 Starting Bundle Comparison...\n');

    if (!fs.existsSync(this.bundleStatsPath)) {
      console.error('❌ Current bundle stats not found. Run "npm run analyze:prod" first.');
      process.exit(1);
    }

    const currentStats = JSON.parse(fs.readFileSync(this.bundleStatsPath, 'utf8'));
    const history = this.loadHistory();

    if (history.length === 0) {
      console.log('ℹ️ No previous builds found. This will be the baseline.');
      this.generateBaselineReport(currentStats);
      return;
    }

    const lastBuild = history[history.length - 1];
    const comparison = this.generateComparison(currentStats, lastBuild, history);
    
    this.generateComparisonReport(comparison);
    this.saveComparisonReport(comparison);

    if (comparison.hasSignificantChanges) {
      console.log('\n⚠️ Significant bundle changes detected!');
      if (comparison.hasNegativeChanges) {
        process.exit(1);
      }
    } else {
      console.log('\n✅ Bundle changes are within normal limits.');
    }
  }

  loadHistory() {
    if (fs.existsSync(this.historyPath)) {
      return JSON.parse(fs.readFileSync(this.historyPath, 'utf8'));
    }
    return [];
  }

  generateComparison(currentStats, lastBuild, history) {
    const comparison = {
      timestamp: new Date().toISOString(),
      current: this.extractBuildInfo(currentStats),
      previous: lastBuild,
      changes: [],
      chunkChanges: [],
      hasSignificantChanges: false,
      hasNegativeChanges: false,
      trends: this.analyzeTrends(history)
    };

    // Compare overall size
    const sizeDiff = comparison.current.totalSize - comparison.previous.totalSize;
    const sizeChangePercent = (sizeDiff / comparison.previous.totalSize) * 100;

    comparison.changes.push({
      metric: 'Total Bundle Size',
      current: comparison.current.totalSize,
      previous: comparison.previous.totalSize,
      diff: sizeDiff,
      percentage: sizeChangePercent.toFixed(2),
      significant: Math.abs(sizeChangePercent) > 5,
      negative: sizeDiff > 0 && Math.abs(sizeChangePercent) > 10
    });

    // Compare chunk count
    const chunkDiff = comparison.current.chunksCount - comparison.previous.chunksCount;
    comparison.changes.push({
      metric: 'Chunk Count',
      current: comparison.current.chunksCount,
      previous: comparison.previous.chunksCount,
      diff: chunkDiff,
      percentage: ((chunkDiff / comparison.previous.chunksCount) * 100).toFixed(2),
      significant: Math.abs(chunkDiff) > 2,
      negative: chunkDiff > 5
    });

    // Compare individual chunks
    this.compareChunks(comparison, currentStats);

    // Determine overall status
    comparison.hasSignificantChanges = comparison.changes.some(c => c.significant) || 
                                     comparison.chunkChanges.some(c => c.significant);
    comparison.hasNegativeChanges = comparison.changes.some(c => c.negative) || 
                                  comparison.chunkChanges.some(c => c.negative);

    return comparison;
  }

  compareChunks(comparison, currentStats) {
    if (!currentStats.chunks || !comparison.previous.topChunks) return;

    const currentChunksMap = new Map();
    currentStats.chunks.forEach(chunk => {
      const name = chunk.names ? chunk.names[0] : `chunk-${chunk.id}`;
      currentChunksMap.set(name, chunk.size);
    });

    const previousChunksMap = new Map();
    comparison.previous.topChunks.forEach(chunk => {
      previousChunksMap.set(chunk.name, chunk.size);
    });

    // Find changes in existing chunks
    for (const [chunkName, currentSize] of currentChunksMap) {
      const previousSize = previousChunksMap.get(chunkName);
      if (previousSize !== undefined) {
        const diff = currentSize - previousSize;
        const percentage = (diff / previousSize) * 100;

        if (Math.abs(percentage) > 1) { // Only report changes > 1%
          comparison.chunkChanges.push({
            name: chunkName,
            current: currentSize,
            previous: previousSize,
            diff: diff,
            percentage: percentage.toFixed(2),
            significant: Math.abs(percentage) > 10,
            negative: diff > 0 && Math.abs(percentage) > 20
          });
        }
      }
    }

    // Find new chunks
    for (const [chunkName, size] of currentChunksMap) {
      if (!previousChunksMap.has(chunkName)) {
        comparison.chunkChanges.push({
          name: chunkName,
          current: size,
          previous: 0,
          diff: size,
          percentage: 'NEW',
          significant: size > 50000, // New chunks > 50KB are significant
          negative: size > 200000, // New chunks > 200KB might be concerning
          isNew: true
        });
      }
    }

    // Find removed chunks
    for (const [chunkName, size] of previousChunksMap) {
      if (!currentChunksMap.has(chunkName)) {
        comparison.chunkChanges.push({
          name: chunkName,
          current: 0,
          previous: size,
          diff: -size,
          percentage: 'REMOVED',
          significant: true,
          negative: false,
          isRemoved: true
        });
      }
    }

    // Sort chunk changes by significance
    comparison.chunkChanges.sort((a, b) => {
      if (a.significant && !b.significant) return -1;
      if (!a.significant && b.significant) return 1;
      return Math.abs(b.diff) - Math.abs(a.diff);
    });
  }

  analyzeTrends(history) {
    if (history.length < 3) return null;

    const recentBuilds = history.slice(-5); // Last 5 builds
    const trends = {
      sizeGrowth: 0,
      averageSize: 0,
      volatility: 0
    };

    // Calculate average growth rate
    const sizes = recentBuilds.map(build => build.totalSize);
    const growthRates = [];
    
    for (let i = 1; i < sizes.length; i++) {
      const rate = (sizes[i] - sizes[i-1]) / sizes[i-1];
      growthRates.push(rate);
    }

    trends.sizeGrowth = growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length;
    trends.averageSize = sizes.reduce((sum, size) => sum + size, 0) / sizes.length;

    // Calculate volatility (standard deviation)
    const variance = sizes.reduce((sum, size) => sum + Math.pow(size - trends.averageSize, 2), 0) / sizes.length;
    trends.volatility = Math.sqrt(variance);

    return trends;
  }

  extractBuildInfo(stats) {
    let totalSize = 0;
    let chunksCount = 0;
    const chunks = [];

    if (stats.chunks) {
      stats.chunks.forEach(chunk => {
        totalSize += chunk.size;
        chunks.push({
          name: chunk.names ? chunk.names[0] : `chunk-${chunk.id}`,
          size: chunk.size
        });
      });
      chunksCount = stats.chunks.length;
    }

    return { totalSize, chunksCount, chunks };
  }

  generateBaselineReport(currentStats) {
    const info = this.extractBuildInfo(currentStats);
    
    console.log('📊 Baseline Bundle Report');
    console.log('='.repeat(40));
    console.log(`📦 Total Size: ${this.formatBytes(info.totalSize)}`);
    console.log(`🧩 Chunks: ${info.chunksCount}`);
    console.log('\n📈 Top Chunks:');
    
    info.chunks
      .sort((a, b) => b.size - a.size)
      .slice(0, 10)
      .forEach((chunk, index) => {
        console.log(`  ${index + 1}. ${chunk.name}: ${this.formatBytes(chunk.size)}`);
      });

    console.log('\n✅ Baseline established! Future builds will be compared against this.');
  }

  generateComparisonReport(comparison) {
    console.log('📊 Bundle Comparison Report');
    console.log('='.repeat(50));
    console.log(`🕐 Current Build: ${new Date(comparison.timestamp).toLocaleString()}`);
    console.log(`🕐 Previous Build: ${new Date(comparison.previous.timestamp).toLocaleString()}`);
    console.log('');

    // Overall changes
    console.log('📈 Overall Changes:');
    comparison.changes.forEach(change => {
      const icon = change.significant ? (change.negative ? '🚨' : '⚠️') : 'ℹ️';
      const direction = change.diff > 0 ? '↗️' : change.diff < 0 ? '↘️' : '➡️';
      
      console.log(`  ${icon} ${change.metric}: ${this.formatBytes(change.current)} ${direction}`);
      if (change.diff !== 0) {
        console.log(`      Change: ${change.diff > 0 ? '+' : ''}${this.formatBytes(change.diff)} (${change.diff > 0 ? '+' : ''}${change.percentage}%)`);
      }
    });
    console.log('');

    // Significant chunk changes
    const significantChunkChanges = comparison.chunkChanges.filter(c => c.significant);
    if (significantChunkChanges.length > 0) {
      console.log('🧩 Significant Chunk Changes:');
      significantChunkChanges.slice(0, 10).forEach(change => {
        const icon = change.negative ? '🚨' : change.isNew ? '🆕' : change.isRemoved ? '🗑️' : '⚠️';
        
        console.log(`  ${icon} ${change.name}`);
        if (change.isNew) {
          console.log(`      New chunk: ${this.formatBytes(change.current)}`);
        } else if (change.isRemoved) {
          console.log(`      Removed chunk: ${this.formatBytes(change.previous)}`);
        } else {
          const direction = change.diff > 0 ? '↗️' : '↘️';
          console.log(`      ${this.formatBytes(change.current)} ${direction} (${change.diff > 0 ? '+' : ''}${change.percentage}%)`);
        }
      });
      console.log('');
    }

    // Trends analysis
    if (comparison.trends) {
      console.log('📊 Trends Analysis:');
      const growthIcon = comparison.trends.sizeGrowth > 0.05 ? '📈' : comparison.trends.sizeGrowth < -0.05 ? '📉' : '➡️';
      console.log(`  ${growthIcon} Average Growth Rate: ${(comparison.trends.sizeGrowth * 100).toFixed(2)}% per build`);
      console.log(`  📊 Average Bundle Size: ${this.formatBytes(comparison.trends.averageSize)}`);
      console.log(`  📊 Size Volatility: ${this.formatBytes(comparison.trends.volatility)}`);
      console.log('');
    }

    // Recommendations
    this.generateRecommendations(comparison);
  }

  generateRecommendations(comparison) {
    console.log('💡 Recommendations:');

    if (!comparison.hasSignificantChanges) {
      console.log('  ✅ Bundle changes are within normal limits.');
      return;
    }

    const sizeIncrease = comparison.changes.find(c => c.metric === 'Total Bundle Size' && c.diff > 0);
    if (sizeIncrease && sizeIncrease.significant) {
      console.log('  🎯 Bundle size has increased significantly:');
      console.log('     - Review recent code changes for optimization opportunities');
      console.log('     - Check for new dependencies that might be adding weight');
      console.log('     - Consider lazy loading for non-critical features');
    }

    const newChunks = comparison.chunkChanges.filter(c => c.isNew && c.significant);
    if (newChunks.length > 0) {
      console.log('  🆕 New significant chunks detected:');
      newChunks.forEach(chunk => {
        console.log(`     - ${chunk.name} (${this.formatBytes(chunk.current)}): Consider optimization`);
      });
    }

    const growingChunks = comparison.chunkChanges.filter(c => !c.isNew && c.diff > 0 && c.significant);
    if (growingChunks.length > 0) {
      console.log('  📈 Growing chunks that need attention:');
      growingChunks.slice(0, 5).forEach(chunk => {
        console.log(`     - ${chunk.name}: +${chunk.percentage}% (${this.formatBytes(chunk.diff)})`);
      });
    }

    if (comparison.trends && comparison.trends.sizeGrowth > 0.1) {
      console.log('  📊 Bundle size is growing consistently:');
      console.log('     - Implement regular bundle analysis reviews');
      console.log('     - Consider setting up automated size monitoring');
      console.log('     - Review dependency management strategy');
    }
  }

  saveComparisonReport(comparison) {
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const reportPath = path.join(this.reportsDir, `bundle-comparison-${timestamp}.json`);
    
    fs.writeFileSync(reportPath, JSON.stringify(comparison, null, 2));
    console.log(`📄 Detailed comparison saved to: ${reportPath}`);
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
  const comparator = new BundleComparator();
  comparator.compare().catch(error => {
    console.error('❌ Bundle comparison failed:', error);
    process.exit(1);
  });
}

module.exports = BundleComparator;