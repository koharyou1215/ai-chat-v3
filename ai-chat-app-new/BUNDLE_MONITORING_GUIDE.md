# Bundle Monitoring & Performance Budget Guide

This guide provides comprehensive instructions for monitoring bundle sizes, analyzing performance, and maintaining optimal bundle health for the AI Chat Application.

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Available Scripts](#available-scripts)
- [Performance Budgets](#performance-budgets)
- [Monitoring Workflow](#monitoring-workflow)
- [Automated Analysis](#automated-analysis)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## 🚀 Quick Start

### 1. Production Bundle Analysis
```bash
# Generate production bundle with analysis
npm run analyze:prod

# This will:
# - Build the app for production
# - Generate bundle-stats.json
# - Create bundle-report.html
# - Run post-analysis scripts
```

### 2. View Analysis Results
```bash
# Open the generated HTML report
open bundle-analysis/bundle-report.html

# Or run the monitoring dashboard
npm run perf:monitor
```

### 3. Check Performance Budgets
```bash
# Validate against performance budgets
npm run budget:check

# Generate full budget report
npm run budget:report
```

## 📜 Available Scripts

### Analysis Scripts

| Script | Description | Output |
|--------|-------------|--------|
| `npm run analyze` | Development bundle analysis | Server on localhost:8888 |
| `npm run analyze:prod` | Production bundle analysis | Static HTML + JSON stats |
| `npm run analyze:compare` | Compare with previous builds | Comparison report |

### Monitoring Scripts

| Script | Description | Use Case |
|--------|-------------|----------|
| `npm run perf:monitor` | Bundle size monitoring | Daily monitoring |
| `npm run budget:check` | Budget validation | CI/CD pipeline |
| `npm run budget:report` | Full budget + analysis | Weekly reports |

### Development Scripts

| Script | Description | Purpose |
|--------|-------------|---------|
| `npm run perf:test` | Performance testing | Development QA |
| `npm run perf:build` | Build + performance test | Pre-deployment |

## 💰 Performance Budgets

### Global Budgets

```javascript
const BUDGETS = {
  totalJS: 800000,    // 800KB total JavaScript
  totalCSS: 150000,   // 150KB total CSS
  totalImages: 2000000, // 2MB total images
  totalFonts: 200000   // 200KB total fonts
}
```

### Chunk-Specific Budgets

| Chunk | Budget | Purpose |
|-------|--------|---------|
| `main` | 300KB | Main application bundle |
| `vendors` | 400KB | Third-party dependencies |
| `framer-motion` | 150KB | Animation library |
| `icons` | 50KB | Lucide React icons |
| `radix-ui` | 100KB | Radix UI components |
| `ui-components` | 75KB | Custom UI components |
| `effects` | 100KB | Chat effects & animations |
| `galleries` | 50KB | Gallery components |
| `modals` | 75KB | Modal components |
| `common` | 25KB | Shared utilities |

### Asset Budgets

| Asset Type | Per File | Description |
|------------|----------|-------------|
| JavaScript | 250KB | Individual JS files |
| CSS | 100KB | Individual CSS files |
| Images | 500KB | Individual images |
| Fonts | 100KB | Individual font files |

## 🔄 Monitoring Workflow

### Daily Monitoring
```bash
# 1. Check current bundle health
npm run perf:monitor

# 2. Review any warnings/errors
# 3. Compare with previous builds if needed
npm run analyze:compare
```

### Weekly Analysis
```bash
# 1. Generate full analysis report
npm run budget:report

# 2. Review trends and optimization opportunities
# 3. Plan optimization tasks if needed
```

### Pre-Deployment
```bash
# 1. Run full performance check
npm run perf:build

# 2. Validate budgets
npm run budget:check

# 3. Compare with main branch
npm run analyze:compare
```

## 🤖 Automated Analysis

### Bundle Health Score

The monitoring system calculates a health score (0-100) based on:

- **Bundle Size** (30 points): Total size vs. optimal thresholds
- **Chunk Distribution** (25 points): Proper code splitting
- **Individual Chunks** (25 points): No overly large chunks
- **Asset Optimization** (20 points): JavaScript/CSS efficiency

#### Score Interpretation

| Score | Grade | Status | Action |
|-------|-------|--------|---------|
| 90-100 | A | Excellent | Maintain current state |
| 80-89 | B | Good | Monitor trends |
| 70-79 | C | Acceptable | Plan optimizations |
| 60-69 | D | Needs Improvement | Optimize soon |
| 0-59 | F | Critical | Immediate action required |

### Automated Insights

The system generates insights for:

- **Bundle Size**: Warnings for bundles >1MB
- **Chunk Analysis**: Large chunks >300KB
- **Asset Distribution**: Heavy JavaScript/CSS
- **Growth Trends**: Consistent size increases

### Optimization Suggestions

Based on analysis, the system suggests:

1. **Code Splitting**: For large bundles
2. **Tree Shaking**: For heavy JavaScript
3. **CSS Optimization**: For large stylesheets
4. **Dependency Review**: For vendor chunks
5. **Lazy Loading**: For non-critical components

## 🔧 Configuration

### Webpack Bundle Analyzer

```typescript
// next.config.ts
if (process.env.ANALYZE === 'true') {
  config.plugins.push(
    new BundleAnalyzerPlugin({
      analyzerMode: dev ? 'server' : 'static',
      generateStatsFile: !dev,
      statsFilename: '../bundle-analysis/bundle-stats.json',
      reportFilename: '../bundle-analysis/bundle-report.html'
    })
  );
}
```

### Performance Budgets

```typescript
// Webpack performance configuration
config.performance = {
  hints: 'warning',
  maxAssetSize: 250000,     // 250KB per asset
  maxEntrypointSize: 500000, // 500KB per entrypoint
  assetFilter: (assetFilename) => /\.(js|css)$/.test(assetFilename)
};
```

## 🛠️ Troubleshooting

### Common Issues

#### 1. Bundle Analysis Files Not Found
```bash
Error: Bundle stats not found
```

**Solution:**
```bash
# Ensure build directory exists and run analysis
npm run clean
npm run analyze:prod
```

#### 2. Budget Violations
```bash
❌ Budget Violations: vendors chunk exceeds limit
```

**Solutions:**
- Review heavy dependencies
- Implement tree shaking
- Use dynamic imports
- Consider dependency alternatives

#### 3. Health Score Degradation
```bash
⚠️ Health score dropped to 65/100
```

**Actions:**
1. Run `npm run analyze:compare` to identify changes
2. Review recent commits for optimization opportunities
3. Implement suggested optimizations
4. Re-run analysis to verify improvements

### Debug Commands

```bash
# Verbose bundle analysis
ANALYZE=true npm run build -- --verbose

# Check specific chunk sizes
npm run budget:check -- --verbose

# Compare with specific build
npm run analyze:compare -- --baseline=bundle-analysis/reports/analysis-2024-01-01.json
```

## ✅ Best Practices

### 1. Regular Monitoring
- Run `npm run perf:monitor` daily
- Generate weekly budget reports
- Monitor health score trends

### 2. Budget Management
- Set realistic budgets based on user needs
- Review budgets quarterly
- Adjust based on feature requirements

### 3. Optimization Strategy
- Prioritize high-impact optimizations
- Use lazy loading for non-critical features
- Implement progressive enhancement

### 4. Development Workflow
- Check bundle impact before PR merge
- Include bundle analysis in code reviews
- Run budget checks in CI/CD

### 5. Documentation
- Document optimization decisions
- Track performance improvements
- Share insights with the team

## 📊 Report Structure

### Generated Files

```
bundle-analysis/
├── bundle-report.html          # Visual bundle analysis
├── bundle-stats.json          # Raw webpack stats
├── bundle-history.json        # Historical data
├── summary.json               # Latest analysis summary
└── reports/
    ├── analysis-YYYY-MM-DD.json     # Timestamped reports
    └── bundle-comparison-YYYY-MM-DD.json  # Comparison reports
```

### Report Contents

Each analysis report includes:

- **Summary**: Total size, chunk count, asset breakdown
- **Health Score**: 0-100 score with grade
- **Insights**: Automated analysis findings
- **Suggestions**: Prioritized optimization recommendations
- **Trends**: Historical size evolution
- **Budgets**: Budget compliance status

## 🎯 Performance Goals

### Target Metrics

| Metric | Target | Good | Needs Work |
|--------|--------|------|------------|
| Initial Bundle Size | <400KB | <600KB | >800KB |
| Total JavaScript | <500KB | <700KB | >1MB |
| Time to Interactive | <3s | <5s | >7s |
| First Contentful Paint | <1.5s | <2.5s | >4s |

### Continuous Improvement

1. **Monthly Reviews**: Assess bundle health trends
2. **Quarterly Optimization**: Plan major optimizations
3. **Performance Budget Updates**: Adjust based on requirements
4. **Tool Updates**: Keep analysis tools current

---

## 📞 Support

For questions about bundle monitoring:

1. Check this guide first
2. Review generated analysis reports
3. Run diagnostic commands
4. Consult team performance guidelines

**Remember**: Bundle monitoring is most effective when done consistently. Set up regular monitoring schedules and act on insights promptly for best results.