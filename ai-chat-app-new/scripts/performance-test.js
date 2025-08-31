#!/usr/bin/env node

/**
 * Performance testing script for AI Chat V3
 * Tests bundle size improvements and loading performance
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('📊 AI Chat V3 Performance Testing Script');
console.log('=========================================\n');

// ===== BUNDLE SIZE ANALYSIS =====

function analyzeBundleSize() {
  console.log('🔍 Analyzing bundle size...\n');
  
  try {
    // Build the application
    console.log('Building application...');
    execSync('npm run build', { stdio: 'inherit' });
    
    // Get .next directory stats
    const nextDir = path.join(process.cwd(), '.next');
    if (fs.existsSync(nextDir)) {
      const getDirectorySize = (dirPath) => {
        let totalSize = 0;
        const files = fs.readdirSync(dirPath);
        
        for (const file of files) {
          const filePath = path.join(dirPath, file);
          const stats = fs.statSync(filePath);
          
          if (stats.isDirectory()) {
            totalSize += getDirectorySize(filePath);
          } else {
            totalSize += stats.size;
          }
        }
        
        return totalSize;
      };
      
      const staticDir = path.join(nextDir, 'static');
      const staticSize = fs.existsSync(staticDir) ? getDirectorySize(staticDir) : 0;
      
      console.log('📦 Bundle Analysis:');
      console.log(`Total .next directory: ${(getDirectorySize(nextDir) / 1024 / 1024).toFixed(2)} MB`);
      console.log(`Static assets: ${(staticSize / 1024 / 1024).toFixed(2)} MB`);
      
      // Analyze individual chunk sizes
      const chunksDir = path.join(staticDir, 'chunks');
      if (fs.existsSync(chunksDir)) {
        const chunks = fs.readdirSync(chunksDir)
          .filter(file => file.endsWith('.js'))
          .map(file => {
            const filePath = path.join(chunksDir, file);
            const size = fs.statSync(filePath).size;
            return { name: file, size };
          })
          .sort((a, b) => b.size - a.size);
        
        console.log('\n📊 Largest chunks:');
        chunks.slice(0, 10).forEach(chunk => {
          console.log(`  ${chunk.name}: ${(chunk.size / 1024).toFixed(2)} KB`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Bundle analysis failed:', error.message);
  }
}

// ===== LAZY LOADING VERIFICATION =====

function verifyLazyLoading() {
  console.log('\n🔍 Verifying lazy loading implementation...\n');
  
  const lazyComponentsFile = path.join(process.cwd(), 'src', 'components', 'lazy', 'LazyComponents.tsx');
  const lazyEffectsFile = path.join(process.cwd(), 'src', 'components', 'lazy', 'LazyEffects.tsx');
  
  const checks = [
    {
      name: 'LazyComponents.tsx exists',
      check: () => fs.existsSync(lazyComponentsFile),
    },
    {
      name: 'LazyEffects.tsx exists',
      check: () => fs.existsSync(lazyEffectsFile),
    },
    {
      name: 'ChatInterface uses lazy imports',
      check: () => {
        const chatInterfaceFile = path.join(process.cwd(), 'src', 'components', 'chat', 'ChatInterface.tsx');
        if (!fs.existsSync(chatInterfaceFile)) return false;
        const content = fs.readFileSync(chatInterfaceFile, 'utf8');
        return content.includes('from \'../lazy/LazyComponents\'');
      },
    },
    {
      name: 'MessageBubble uses lazy effects',
      check: () => {
        const messageBubbleFile = path.join(process.cwd(), 'src', 'components', 'chat', 'MessageBubble.tsx');
        if (!fs.existsSync(messageBubbleFile)) return false;
        const content = fs.readFileSync(messageBubbleFile, 'utf8');
        return content.includes('from \'../lazy/LazyEffects\'');
      },
    },
    {
      name: 'Suspense boundaries present',
      check: () => {
        const chatInterfaceFile = path.join(process.cwd(), 'src', 'components', 'chat', 'ChatInterface.tsx');
        if (!fs.existsSync(chatInterfaceFile)) return false;
        const content = fs.readFileSync(chatInterfaceFile, 'utf8');
        return content.includes('<Suspense') && content.includes('fallback');
      },
    },
  ];
  
  checks.forEach(check => {
    const result = check.check();
    console.log(`${result ? '✅' : '❌'} ${check.name}`);
  });
}

// ===== IMPORT OPTIMIZATION VERIFICATION =====

function verifyImportOptimizations() {
  console.log('\n🔍 Verifying import optimizations...\n');
  
  const componentDirs = [
    'src/components/chat',
    'src/components/character',
    'src/components/persona',
    'src/components/settings',
  ];
  
  const issues = [];
  
  componentDirs.forEach(dir => {
    const dirPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) return;
    
    const files = fs.readdirSync(dirPath)
      .filter(file => file.endsWith('.tsx') || file.endsWith('.ts'))
      .filter(file => !file.endsWith('.d.ts'));
    
    files.forEach(file => {
      const filePath = path.join(dirPath, file);
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Check for barrel imports
      if (content.includes('from \'@/types\'') && !content.includes('type {')) {
        issues.push(`${dir}/${file}: Uses barrel import for types`);
      }
      
      // Check for unused framer-motion imports
      if (content.includes('import { motion') && !content.includes('<motion.')) {
        issues.push(`${dir}/${file}: Imports motion but doesn't use it`);
      }
      
      // Check for heavy dependencies without lazy loading
      if (content.includes('framer-motion') && !content.includes('lazy') && !content.includes('Suspense')) {
        issues.push(`${dir}/${file}: Uses framer-motion without lazy loading`);
      }
    });
  });
  
  if (issues.length === 0) {
    console.log('✅ No import optimization issues found');
  } else {
    console.log('⚠️ Import optimization issues:');
    issues.forEach(issue => console.log(`  - ${issue}`));
  }
}

// ===== PERFORMANCE RECOMMENDATIONS =====

function generateRecommendations() {
  console.log('\n💡 Performance Optimization Recommendations:');
  console.log('===========================================\n');
  
  const recommendations = [
    '1. Monitor bundle size regularly with ANALYZE=true npm run build',
    '2. Use lazy loading for components >15KB',
    '3. Implement virtual scrolling for large lists (>100 items)',
    '4. Consider image optimization and lazy loading for character avatars',
    '5. Use React.memo for components with expensive render cycles',
    '6. Implement intersection observer for off-screen components',
    '7. Consider service worker for caching strategy',
    '8. Monitor Core Web Vitals in production',
    '9. Use dynamic imports for route-level code splitting',
    '10. Consider preloading critical components on hover/focus',
  ];
  
  recommendations.forEach(rec => console.log(rec));
}

// ===== MAIN EXECUTION =====

async function main() {
  try {
    verifyLazyLoading();
    verifyImportOptimizations();
    analyzeBundleSize();
    generateRecommendations();
    
    console.log('\n✅ Performance testing completed!');
    console.log('\nTo run bundle analyzer:');
    console.log('  ANALYZE=true npm run build');
    console.log('\nTo monitor performance in development:');
    console.log('  Open browser DevTools → Performance tab');
    console.log('  Look for lazy loading logs in Console');
    
  } catch (error) {
    console.error('❌ Performance testing failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}