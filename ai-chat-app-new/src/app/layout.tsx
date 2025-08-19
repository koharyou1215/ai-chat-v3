import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { EffectSettingsProvider } from "@/contexts/EffectSettingsContext";
import { ErrorBoundary } from "@/components/utils/ErrorBoundary";
import { EmergencyReset } from "@/components/utils/EmergencyReset";

const inter = Inter({ subsets: ["latin"] });


export const metadata: Metadata = {
  title: "AI Chat V3",
  description: "Advanced AI Chat Application",
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
            <EmergencyReset />
          </EffectSettingsProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
