import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TelegramRoot } from "@/components/telegram-root";
import { TelegramUserProvider } from "@/components/telegram-user-provider";
import { AppShell } from "@/components/layout/app-shell";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Falcon Unlocker",
  description: "The first Telegram-native GSM Server.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <TelegramRoot>
          <TelegramUserProvider>
            <AppShell>{children}</AppShell>
          </TelegramUserProvider>
        </TelegramRoot>
      </body>
    </html>
  );
}
