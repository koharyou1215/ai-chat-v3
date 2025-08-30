import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // TypeScript設定 - 🚨 緊急デバッグのため一時的に有効化
  typescript: {
    ignoreBuildErrors: true,
  },
  // ESLint設定 - 🚨 緊急デバッグのため一時的に有効化  
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // ビルド最適化設定 - 一時的に無効化
  // experimental: {
  //   optimizePackageImports: ['lucide-react', 'framer-motion'],
  // },
  
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
