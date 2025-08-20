import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // TypeScript設定
  typescript: {
    ignoreBuildErrors: true,
  },
  // ESLint設定
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // ビルド最適化設定
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
};

export default nextConfig;
