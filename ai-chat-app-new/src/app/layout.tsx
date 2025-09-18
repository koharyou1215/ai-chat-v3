import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ErrorBoundary from "@/components/ErrorBoundary";
import { StorageInitializer } from "@/components/utils/StorageInitializer";
import HydrationFix from "@/components/utils/HydrationFix";

// 日本語フォント対応
const inter = Inter({ 
  subsets: ["latin", "latin-ext"],
  display: 'swap',
  variable: '--font-inter'
});


export const metadata: Metadata = {
  title: "AI Chat V3 - 高度なAIチャットアプリケーション",
  description: "次世代のAI対話システム - キャラクターとペルソナを使った高度なチャット体験",
  keywords: ["AI", "チャット", "人工知能", "対話システム", "キャラクター"],
  authors: [{ name: "AI Chat V3 Team" }],
  robots: "index, follow",
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full">
      <body className={`${inter.className} text-white h-full`} suppressHydrationWarning>
        <HydrationFix />
        <ErrorBoundary>
          <StorageInitializer />
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
