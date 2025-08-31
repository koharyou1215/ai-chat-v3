import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // TypeScript設定 - ✅ エラー修正完了により正常化
  typescript: {
    // ignoreBuildErrors: false, // デフォルト値なので削除
  },
  // ESLint設定 - ✅ 主要エラー修正完了
  eslint: {
    // ignoreDuringBuilds: false, // デフォルト値なので削除
  },
  
  // ビルド最適化設定 - ✅ 安定化により有効化
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
  
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
      
      // Three.jsの最適化（使用時のみロード）
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks?.cacheGroups,
          threejs: {
            test: /[\\/]node_modules[\\/](three|@react-three)[\\/]/,
            name: 'threejs',
            chunks: 'async',
            priority: 10,
          },
        },
      };
    }
    return config;
  },
  
  // 画像最適化
  images: {
    formats: ['image/webp', 'image/avif'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'example.com',
      },
    ],
  },
  
  // Railway デプロイ用設定
  env: {
    PORT: process.env.PORT || '3000',
  },
  
  // 出力設定
  output: 'standalone',
};

export default nextConfig;
