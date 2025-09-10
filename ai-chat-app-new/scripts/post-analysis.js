#!/usr/bin/env node

/**
 * Post-Analysis Script
 * Runs after bundle analysis to generate additional reports and insights
 */

const fs = require('fs');
const path = require('path');

class PostAnalysis {
  constructor() {
    this.bundleAnalysisDir = path.join(__dirname, '../bundle-analysis');
    this.bundleStatsPath = path.join(this.bundleAnalysisDir, 'bundle-stats.json');
    this.summaryPath = path.join(this.bundleAnalysisDir, 'summary.json');
    this.reportsDir = path.join(this.bundleAnalysisDir, 'reports');
  }

  async run() {
    console.log('🔍 Running Post-Analysis...\n');

    if (!fs.existsSync(this.bundleStatsPath)) {
      console.log('⚠️ Bundle stats not found. Skipping post-analysis.');
      return;
    }

    try {
      const stats = JSON.parse(fs.readFileSync(this.bundleStatsPath, 'utf8'));
      
      const analysis = {
        timestamp: new Date().toISOString(),
        summary: this.generateSummary(stats),
        insights: this.generateInsights(stats),
        optimization_suggestions: this.generateOptimizationSuggestions(stats),
        health_score: this.calculateHealthScore(stats)
      };

      this.saveAnalysis(analysis);
      this.displaySummary(analysis);
      
      console.log('\n✅ Post-analysis complete!');
    } catch (error) {
      console.error('❌ Post-analysis failed:', error.message);
      process.exit(1);
    }
  }

  generateSummary(stats) {
    const summary = {
      total_size: 0,
      chunks_count: 0,
      largest_chunk: null,
      smallest_chunk: null,
      average_chunk_size: 0,
      asset_types: {
        js: { count: 0, size: 0 },
        css: { count: 0, size: 0 },
        images: { count: 0, size: 0 },
        fonts: { count: 0, size: 0 },
        other: { count: 0, size: 0 }
      }
    };

    if (stats.chunks) {
      const chunkSizes = [];
      
      stats.chunks.forEach(chunk => {
        summary.total_size += chunk.size;
        chunkSizes.push(chunk.size);
        
        if (!summary.largest_chunk || chunk.size > summary.largest_chunk.size) {
          summary.largest_chunk = {
            name: chunk.names ? chunk.names[0] : `chunk-${chunk.id}`,
            size: chunk.size
          };
        }
        
        if (!summary.smallest_chunk || chunk.size < summary.smallest_chunk.size) {
          summary.smallest_chunk = {
            name: chunk.names ? chunk.names[0] : `chunk-${chunk.id}`,
            size: chunk.size
          };
        }
      });
      
      summary.chunks_count = stats.chunks.length;
      summary.average_chunk_size = summary.total_size / summary.chunks_count;
    }

    // Analyze assets
    if (stats.assets) {
      stats.assets.forEach(asset => {
        const ext = path.extname(asset.name).toLowerCase();
        let type = 'other';
        
        if (['.js', '.jsx', '.ts', '.tsx'].includes(ext)) type = 'js';
        else if (['.css', '.scss', '.sass'].includes(ext)) type = 'css';
        else if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.svg'].includes(ext)) type = 'images';
        else if (['.woff', '.woff2', '.ttf', '.eot'].includes(ext)) type = 'fonts';
        
        summary.asset_types[type].count++;
        summary.asset_types[type].size += asset.size;
      });
    }

    return summary;
  }

  generateInsights(stats) {
    const insights = [];
    const summary = this.generateSummary(stats);

    // Bundle size insights
    if (summary.total_size > 1000000) { // > 1MB
      insights.push({
        type: 'warning',
        category: 'bundle_size',
        message: `Total bundle size is ${this.formatBytes(summary.total_size)} - consider optimization`,
        impact: 'high'
      });
    }

    // Chunk distribution insights
    if (summary.chunks_count > 20) {
      insights.push({
        type: 'info',
        category: 'chunks',
        message: `High number of chunks (${summary.chunks_count}) - may indicate good code splitting`,
        impact: 'medium'
      });
    }

    // Largest chunk analysis
    if (summary.largest_chunk && summary.largest_chunk.size > 300000) { // > 300KB
      insights.push({
        type: 'warning',
        category: 'large_chunk',
        message: `Largest chunk "${summary.largest_chunk.name}" is ${this.formatBytes(summary.largest_chunk.size)}`,
        impact: 'high'
      });
    }

    // Asset type analysis
    if (summary.asset_types.js.size > 500000) { // > 500KB JS
      insights.push({
        type: 'warning',
        category: 'javascript_size',
        message: `JavaScript assets total ${this.formatBytes(summary.asset_types.js.size)} - consider tree shaking`,
        impact: 'high'
      });
    }

    if (summary.asset_types.css.size > 100000) { // > 100KB CSS
      insights.push({
        type: 'warning',
        category: 'css_size',
        message: `CSS assets total ${this.formatBytes(summary.asset_types.css.size)} - consider purging unused styles`,
        impact: 'medium'
      });
    }

    if (summary.asset_types.images.size > 1000000) { // > 1MB images
      insights.push({
        type: 'info',
        category: 'images',
        message: `Image assets total ${this.formatBytes(summary.asset_types.images.size)} - ensure proper optimization`,
        impact: 'medium'
      });
    }

    return insights;
  }

  generateOptimizationSuggestions(stats) {
    const suggestions = [];
    const summary = this.generateSummary(stats);

    // Bundle size optimizations
    if (summary.total_size > 800000) {
      suggestions.push({
        priority: 'high',
        category: 'code_splitting',
        title: 'Implement Advanced Code Splitting',
        description: 'Split large chunks into smaller, route-based chunks for better loading performance',
        estimated_savings: '20-30%'
      });
    }

    // JavaScript optimizations
    if (summary.asset_types.js.size > 400000) {
      suggestions.push({
        priority: 'high',
        category: 'tree_shaking',
        title: 'Optimize Tree Shaking',
        description: 'Remove unused code and implement selective imports from large libraries',
        estimated_savings: '15-25%'
      });
    }

    // Dependency optimizations
    if (stats.chunks && stats.chunks.some(c => c.names && c.names[0] === 'vendors' && c.size > 400000)) {
      suggestions.push({
        priority: 'medium',
        category: 'dependencies',
        title: 'Optimize Dependencies',
        description: 'Review and potentially replace heavy dependencies with lighter alternatives',
        estimated_savings: '10-20%'
      });
    }

    // CSS optimizations
    if (summary.asset_types.css.size > 75000) {
      suggestions.push({
        priority: 'medium',
        category: 'css',
        title: 'CSS Optimization',
        description: 'Implement CSS purging and consider CSS-in-JS for component-scoped styles',
        estimated_savings: '30-50% of CSS'
      });
    }

    // Framer Motion specific optimization
    if (stats.chunks && stats.chunks.some(c => c.names && c.names[0] === 'framer-motion')) {
      suggestions.push({
        priority: 'medium',
        category: 'animation',
        title: 'Optimize Framer Motion Usage',
        description: 'Use selective imports and lazy load animation components',
        estimated_savings: '40-60% of animation bundle'
      });
    }

    return suggestions;
  }

  calculateHealthScore(stats) {
    let score = 100;
    const summary = this.generateSummary(stats);

    // Penalize large bundle size
    if (summary.total_size > 1500000) score -= 30; // > 1.5MB
    else if (summary.total_size > 1000000) score -= 20; // > 1MB
    else if (summary.total_size > 800000) score -= 10; // > 800KB

    // Penalize large individual chunks
    if (summary.largest_chunk && summary.largest_chunk.size > 400000) score -= 15;
    else if (summary.largest_chunk && summary.largest_chunk.size > 300000) score -= 10;

    // Penalize too many chunks (might indicate over-splitting)
    if (summary.chunks_count > 30) score -= 10;

    // Penalize large JavaScript
    if (summary.asset_types.js.size > 600000) score -= 15;
    else if (summary.asset_types.js.size > 400000) score -= 10;

    // Bonus for good chunk distribution
    if (summary.chunks_count >= 5 && summary.chunks_count <= 15) score += 5;

    // Ensure score stays within bounds
    score = Math.max(0, Math.min(100, score));

    return {
      score: Math.round(score),
      grade: this.getGrade(score),
      status: score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'needs_improvement' : 'critical'
    };
  }

  getGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  saveAnalysis(analysis) {
    // Ensure reports directory exists
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }

    // Save summary
    fs.writeFileSync(this.summaryPath, JSON.stringify(analysis, null, 2));

    // Save timestamped report
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const reportPath = path.join(this.reportsDir, `analysis-${timestamp}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(analysis, null, 2));

    console.log(`📄 Analysis saved to: ${this.summaryPath}`);
    console.log(`📄 Detailed report: ${reportPath}`);
  }

  displaySummary(analysis) {
    console.log('\n📊 Bundle Health Report');
    console.log('='.repeat(50));
    
    // Health Score
    const healthIcon = analysis.health_score.score >= 80 ? '✅' : 
                      analysis.health_score.score >= 60 ? '⚠️' : '❌';
    console.log(`${healthIcon} Health Score: ${analysis.health_score.score}/100 (Grade ${analysis.health_score.grade})`);
    console.log(`📈 Status: ${analysis.health_score.status.toUpperCase()}`);
    console.log('');

    // Key Metrics
    console.log('📏 Key Metrics:');
    console.log(`  📦 Total Size: ${this.formatBytes(analysis.summary.total_size)}`);
    console.log(`  🧩 Chunks: ${analysis.summary.chunks_count}`);
    console.log(`  📊 Average Chunk Size: ${this.formatBytes(analysis.summary.average_chunk_size)}`);
    if (analysis.summary.largest_chunk) {
      console.log(`  🎯 Largest Chunk: ${analysis.summary.largest_chunk.name} (${this.formatBytes(analysis.summary.largest_chunk.size)})`);
    }
    console.log('');

    // Asset Breakdown
    console.log('📋 Asset Breakdown:');
    Object.entries(analysis.summary.asset_types).forEach(([type, data]) => {
      if (data.count > 0) {
        console.log(`  ${this.getAssetIcon(type)} ${type.toUpperCase()}: ${data.count} files, ${this.formatBytes(data.size)}`);
      }
    });
    console.log('');

    // Top Insights
    const criticalInsights = analysis.insights.filter(i => i.impact === 'high');
    if (criticalInsights.length > 0) {
      console.log('🚨 Critical Insights:');
      criticalInsights.forEach(insight => {
        const icon = insight.type === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`  ${icon} ${insight.message}`);
      });
      console.log('');
    }

    // Top Suggestions
    const highPrioritySuggestions = analysis.optimization_suggestions.filter(s => s.priority === 'high');
    if (highPrioritySuggestions.length > 0) {
      console.log('💡 High Priority Optimizations:');
      highPrioritySuggestions.forEach((suggestion, index) => {
        console.log(`  ${index + 1}. ${suggestion.title} (${suggestion.estimated_savings} savings)`);
        console.log(`     ${suggestion.description}`);
      });
    }
  }

  getAssetIcon(type) {
    switch (type) {
      case 'js': return '📜';
      case 'css': return '🎨';
      case 'images': return '🖼️';
      case 'fonts': return '🔤';
      default: return '📄';
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
  const postAnalysis = new PostAnalysis();
  postAnalysis.run().catch(error => {
    console.error('❌ Post-analysis failed:', error);
    process.exit(1);
  });
}

module.exports = PostAnalysis;