import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { LayoutContent } from "@/components/LayoutContent";

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
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
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
    <html lang="ja" className="h-full" suppressHydrationWarning>
      <body className={`${inter.className} h-full`} suppressHydrationWarning>
        <LayoutContent>{children}</LayoutContent>
      </body>
    </html>
  );
}
