import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // TypeScript設定 - 一時的にエラーを無視
  typescript: {
    ignoreBuildErrors: true,
  },
  // ESLint設定 - ✅ 主要エラー修正完了
  eslint: {
    // ignoreDuringBuilds: false, // デフォルト値なので削除
  },

  // ビルド最適化設定 - ✅ 安定化により有効化 + Performance enhancements
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-tabs",
    ],
    // Optimize CSS
    optimizeCss: true,
  },

  webpack: (config, { isServer, dev, buildId }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        net: false,
        tls: false,
      };

      // Enhanced code splitting and chunk optimization
      config.optimization.splitChunks = {
        chunks: "all",
        cacheGroups: {
          // Vendor chunk for stable dependencies
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: "vendors",
            chunks: "all",
            priority: 10,
            reuseExistingChunk: true,
          },
          // Framer Motion chunk (heavy animation library)
          framerMotion: {
            test: /[\\/]node_modules[\\/]framer-motion[\\/]/,
            name: "framer-motion",
            chunks: "all",
            priority: 15,
            reuseExistingChunk: true,
          },
          // Lucide icons chunk
          icons: {
            test: /[\\/]node_modules[\\/]lucide-react[\\/]/,
            name: "icons",
            chunks: "all",
            priority: 12,
            reuseExistingChunk: true,
          },
          // Radix UI components
          radix: {
            test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
            name: "radix-ui",
            chunks: "all",
            priority: 11,
            reuseExistingChunk: true,
          },
          // UI components chunk
          ui: {
            test: /[\\/]src[\\/]components[\\/]ui[\\/]/,
            name: "ui-components",
            chunks: "all",
            priority: 8,
            reuseExistingChunk: true,
          },
          // Effects and animations chunk
          effects: {
            test: /[\\/]src[\\/]components[\\/](chat[\\/](AdvancedEffects|MessageEffects)|emotion|lazy[\\/]LazyEffects)[\\/]/,
            name: "effects",
            chunks: "async",
            priority: 6,
            minSize: 20000,
            reuseExistingChunk: true,
          },
          // Gallery components chunk
          galleries: {
            test: /[\\/]src[\\/]components[\\/](character[\\/].*Gallery|persona[\\/].*Gallery|memory[\\/].*Gallery)[\\/]/,
            name: "galleries",
            chunks: "async",
            priority: 5,
            minSize: 10000,
            reuseExistingChunk: true,
          },
          // Modal components chunk
          modals: {
            test: /[\\/]src[\\/]components[\\/](settings[\\/].*Modal|voice[\\/].*Modal|character[\\/].*Form|history[\\/].*Modal)[\\/]/,
            name: "modals",
            chunks: "async",
            priority: 4,
            minSize: 15000,
            reuseExistingChunk: true,
          },
          // Common chunk for shared utilities
          common: {
            name: "common",
            minChunks: 2,
            chunks: "all",
            priority: 1,
            reuseExistingChunk: true,
          },
        },
      };

      // Bundle analyzer configuration for both dev and production
      if (process.env.ANALYZE === "true") {
        try {
          const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");
          config.plugins.push(
            new BundleAnalyzerPlugin({
              analyzerMode: dev ? "server" : "static",
              openAnalyzer: false, // Don't auto-open in browser
              analyzerPort: dev ? 8888 : undefined,
              reportFilename: dev
                ? undefined
                : "../bundle-analysis/bundle-report.html",
              generateStatsFile: !dev,
              statsFilename: "../bundle-analysis/bundle-stats.json",
              logLevel: "info",
            })
          );
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          console.warn("Bundle analyzer not available:", errorMessage);
        }
      }

      // Performance budgets enforcement
      if (!dev && process.env.NODE_ENV === "production") {
        config.performance = {
          hints: "warning",
          maxAssetSize: 250000, // 250KB per asset
          maxEntrypointSize: 500000, // 500KB per entrypoint
          assetFilter: function (assetFilename: string) {
            // Only monitor JS and CSS files
            return /\.(js|css)$/.test(assetFilename);
          },
        };
      }
    }
    return config;
  },

  // 画像最適化 - Enhanced for performance with mobile support
  images: {
    formats: ["image/webp", "image/avif"],
    minimumCacheTTL: 31536000, // 1 year cache
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "example.com",
      },
      // Add more remote patterns as needed
    ],
    // モバイル対応の画像最適化
    loader: "default",
    unoptimized: false,
    // ローカルアップロードファイルの最適化を無効化
    domains: [],
  },

  // ===== COMPRESSION AND CACHING =====
  compress: true,
  poweredByHeader: false,

  // ===== PERFORMANCE HEADERS =====
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
          // モバイル対応のヘッダー
          {
            key: "X-Viewport-Meta",
            value:
              "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no",
          },
        ],
      },
      {
        // Cache static assets aggressively
        source: "/(_next/static|images|icons)/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Don't cache API routes
        source: "/api/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },

  // Railway デプロイ用設定
  env: {
    PORT: process.env.PORT || "3000",
    ANALYZE: process.env.ANALYZE,
  },

  // 出力設定
  output: "standalone",
};

export default nextConfig;
