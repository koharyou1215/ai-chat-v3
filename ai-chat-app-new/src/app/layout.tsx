import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { EffectSettingsProvider } from "@/contexts/EffectSettingsContext";
import { ErrorBoundary } from "@/components/utils/ErrorBoundary";

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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning className="h-full">
      <body className={`${inter.className} bg-slate-900 text-white h-full`} suppressHydrationWarning>
        <ErrorBoundary>
          <EffectSettingsProvider>
            {children}
          </EffectSettingsProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
