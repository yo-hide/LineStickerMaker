import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LINEスタンプファイル整理ツール",
  description: "Simple tool to create LINE stickers from images",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#06c755",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
