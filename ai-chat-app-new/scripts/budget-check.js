#!/usr/bin/env node

/**
 * Performance Budget Checker
 * Validates bundle sizes against defined performance budgets
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob').sync || require('glob');

// Performance budget configuration
const BUDGET_CONFIG = {
  // Global budgets
  global: {
    totalJS: 800000,    // 800KB total JavaScript
    totalCSS: 150000,   // 150KB total CSS
    totalImages: 2000000, // 2MB total images
    totalFonts: 200000,  // 200KB total fonts
  },
  
  // Individual asset budgets
  assets: {
    js: 250000,         // 250KB per JS file
    css: 100000,        // 100KB per CSS file
    image: 500000,      // 500KB per image
    font: 100000,       // 100KB per font
  },
  
  // Route-specific budgets
  routes: {
    '/': 400000,        // 400KB for homepage
    '/chat': 500000,    // 500KB for chat page
    '/settings': 300000, // 300KB for settings
  },
  
  // Chunk-specific budgets
  chunks: {
    'main': 300000,
    'vendors': 400000,
    'framer-motion': 150000,
    'icons': 50000,
    'radix-ui': 100000,
    'ui-components': 75000,
    'effects': 100000,
    'galleries': 50000,
    'modals': 75000,
    'common': 25000,
  }
};

class BudgetChecker {
  constructor() {
    this.buildDir = path.join(__dirname, '../.next');
    this.staticDir = path.join(this.buildDir, 'static');
    this.bundleStatsPath = path.join(__dirname, '../bundle-analysis/bundle-stats.json');
    this.violations = [];
    this.warnings = [];
  }

  async check() {
    console.log('💰 Starting Performance Budget Check...\n');
    
    try {
      await this.checkGlobalBudgets();
      await this.checkAssetBudgets();
      await this.checkChunkBudgets();
      
      this.generateReport();
      
      if (this.violations.length > 0) {
        console.log('\n❌ Budget violations found!');
        process.exit(1);
      } else if (this.warnings.length > 0) {
        console.log('\n⚠️ Budget warnings found, but within acceptable limits.');
        process.exit(0);
      } else {
        console.log('\n✅ All budgets are within limits!');
        process.exit(0);
      }
    } catch (error) {
      console.error('❌ Budget check failed:', error.message);
      process.exit(1);
    }
  }

  async checkGlobalBudgets() {
    console.log('🌍 Checking Global Budgets...');
    
    if (!fs.existsSync(this.staticDir)) {
      throw new Error('Build directory not found. Run "npm run build" first.');
    }

    // Check total JavaScript size
    const jsFiles = this.findFiles(this.staticDir, '**/*.js');
    const totalJS = this.calculateTotalSize(jsFiles);
    this.checkBudget('Total JavaScript', totalJS, BUDGET_CONFIG.global.totalJS);

    // Check total CSS size
    const cssFiles = this.findFiles(this.staticDir, '**/*.css');
    const totalCSS = this.calculateTotalSize(cssFiles);
    this.checkBudget('Total CSS', totalCSS, BUDGET_CONFIG.global.totalCSS);

    // Check total images size (if any in static)
    const imageFiles = this.findFiles(this.staticDir, '**/*.{png,jpg,jpeg,webp,avif,svg,gif}');
    const totalImages = this.calculateTotalSize(imageFiles);
    this.checkBudget('Total Images', totalImages, BUDGET_CONFIG.global.totalImages);

    // Check total fonts size
    const fontFiles = this.findFiles(this.staticDir, '**/*.{woff,woff2,ttf,eot}');
    const totalFonts = this.calculateTotalSize(fontFiles);
    this.checkBudget('Total Fonts', totalFonts, BUDGET_CONFIG.global.totalFonts);

    console.log('');
  }

  async checkAssetBudgets() {
    console.log('📄 Checking Individual Asset Budgets...');

    // Check individual JS files
    const jsFiles = this.findFiles(this.staticDir, '**/*.js');
    jsFiles.forEach(file => {
      const size = fs.statSync(file).size;
      const filename = path.basename(file);
      this.checkBudget(`JS File: ${filename}`, size, BUDGET_CONFIG.assets.js);
    });

    // Check individual CSS files
    const cssFiles = this.findFiles(this.staticDir, '**/*.css');
    cssFiles.forEach(file => {
      const size = fs.statSync(file).size;
      const filename = path.basename(file);
      this.checkBudget(`CSS File: ${filename}`, size, BUDGET_CONFIG.assets.css);
    });

    console.log('');
  }

  async checkChunkBudgets() {
    console.log('🧩 Checking Chunk Budgets...');

    if (fs.existsSync(this.bundleStatsPath)) {
      const stats = JSON.parse(fs.readFileSync(this.bundleStatsPath, 'utf8'));
      
      if (stats.chunks) {
        stats.chunks.forEach(chunk => {
          const chunkName = chunk.names ? chunk.names[0] : `chunk-${chunk.id}`;
          const budget = BUDGET_CONFIG.chunks[chunkName];
          
          if (budget) {
            this.checkBudget(`Chunk: ${chunkName}`, chunk.size, budget);
          }
        });
      }
    } else {
      console.log('⚠️ Bundle stats not found. Skipping chunk budget check.');
      console.log('   Run "npm run analyze:prod" to generate stats.');
    }

    console.log('');
  }

  findFiles(dir, pattern) {
    try {
      if (typeof glob === 'function') {
        return glob(pattern, { cwd: dir, absolute: true });
      } else {
        // Fallback for basic file finding
        return this.findFilesRecursive(dir, pattern);
      }
    } catch (error) {
      console.warn(`Warning: Could not search for files with pattern ${pattern}:`, error.message);
      return [];
    }
  }

  findFilesRecursive(dir, pattern) {
    // Simple recursive file finder as fallback
    const files = [];
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...this.findFilesRecursive(fullPath, pattern));
      } else if (this.matchesPattern(item, pattern)) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  matchesPattern(filename, pattern) {
    // Simple pattern matching for file extensions
    if (pattern.includes('**/*.js')) return filename.endsWith('.js');
    if (pattern.includes('**/*.css')) return filename.endsWith('.css');
    if (pattern.includes('*.{png,jpg,jpeg,webp,avif,svg,gif}')) {
      return /\.(png|jpg|jpeg|webp|avif|svg|gif)$/i.test(filename);
    }
    if (pattern.includes('*.{woff,woff2,ttf,eot}')) {
      return /\.(woff|woff2|ttf|eot)$/i.test(filename);
    }
    return false;
  }

  calculateTotalSize(files) {
    return files.reduce((total, file) => {
      try {
        return total + fs.statSync(file).size;
      } catch (error) {
        console.warn(`Warning: Could not get size of ${file}`);
        return total;
      }
    }, 0);
  }

  checkBudget(name, actualSize, budgetSize) {
    const percentage = (actualSize / budgetSize) * 100;
    const overBudget = actualSize > budgetSize;
    const closeToLimit = percentage > 80; // Warning at 80% of budget

    const status = {
      name,
      actualSize,
      budgetSize,
      percentage: percentage.toFixed(1),
      overBudget,
      closeToLimit
    };

    if (overBudget) {
      this.violations.push({
        ...status,
        overBy: actualSize - budgetSize
      });
    } else if (closeToLimit) {
      this.warnings.push(status);
    }
  }

  generateReport() {
    console.log('📊 Performance Budget Report');
    console.log('='.repeat(50));

    if (this.violations.length === 0 && this.warnings.length === 0) {
      console.log('✅ All budgets are within acceptable limits!');
      return;
    }

    // Report violations
    if (this.violations.length > 0) {
      console.log('\n🚨 Budget Violations:');
      this.violations.forEach(violation => {
        console.log(`  ❌ ${violation.name}`);
        console.log(`     Actual: ${this.formatBytes(violation.actualSize)} (${violation.percentage}% of budget)`);
        console.log(`     Budget: ${this.formatBytes(violation.budgetSize)}`);
        console.log(`     Over by: ${this.formatBytes(violation.overBy)}`);
        console.log('');
      });
    }

    // Report warnings
    if (this.warnings.length > 0) {
      console.log('\n⚠️ Budget Warnings (>80% of limit):');
      this.warnings.forEach(warning => {
        console.log(`  ⚠️ ${warning.name}`);
        console.log(`     Actual: ${this.formatBytes(warning.actualSize)} (${warning.percentage}% of budget)`);
        console.log(`     Budget: ${this.formatBytes(warning.budgetSize)}`);
        console.log('');
      });
    }

    // Generate recommendations
    this.generateRecommendations();
  }

  generateRecommendations() {
    console.log('💡 Optimization Recommendations:');

    if (this.violations.length === 0) {
      console.log('  ✅ No immediate action required.');
      return;
    }

    // Specific recommendations based on violations
    this.violations.forEach(violation => {
      if (violation.name.includes('JavaScript')) {
        console.log('  🎯 JavaScript optimization:');
        console.log('     - Enable tree shaking for unused code');
        console.log('     - Use dynamic imports for route-based splitting');
        console.log('     - Consider replacing heavy dependencies');
      }

      if (violation.name.includes('CSS')) {
        console.log('  🎨 CSS optimization:');
        console.log('     - Remove unused CSS with PurgeCSS');
        console.log('     - Use CSS-in-JS for component-scoped styles');
        console.log('     - Minimize duplicate styles');
      }

      if (violation.name.includes('Images')) {
        console.log('  🖼️ Image optimization:');
        console.log('     - Use next/image for automatic optimization');
        console.log('     - Convert to WebP/AVIF formats');
        console.log('     - Implement lazy loading');
      }

      if (violation.name.includes('Chunk')) {
        console.log(`  📦 Optimize ${violation.name}:`);
        console.log('     - Review chunk splitting configuration');
        console.log('     - Consider lazy loading for non-critical chunks');
        console.log('     - Check for duplicate dependencies across chunks');
      }
    });
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
  const checker = new BudgetChecker();
  checker.check();
}

module.exports = BudgetChecker;