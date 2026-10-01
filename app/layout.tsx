import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import AppShell from "@/components/AppShell";

// 字体自托管（app/fonts/），国内访问更快，构建不依赖 Google Fonts
const sans = localFont({
  variable: "--font-body",
  display: "swap",
  src: [
    { path: "./fonts/noto-sans-sc-chinese-simplified-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/noto-sans-sc-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/noto-sans-sc-chinese-simplified-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/noto-sans-sc-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/noto-sans-sc-chinese-simplified-700-normal.woff2", weight: "700", style: "normal" },
    { path: "./fonts/noto-sans-sc-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
});

const serif = localFont({
  variable: "--font-display",
  display: "swap",
  src: [
    { path: "./fonts/noto-serif-sc-chinese-simplified-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/noto-serif-sc-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/noto-serif-sc-chinese-simplified-700-normal.woff2", weight: "700", style: "normal" },
    { path: "./fonts/noto-serif-sc-latin-700-normal.woff2", weight: "700", style: "normal" },
    { path: "./fonts/noto-serif-sc-chinese-simplified-900-normal.woff2", weight: "900", style: "normal" },
    { path: "./fonts/noto-serif-sc-latin-900-normal.woff2", weight: "900", style: "normal" },
  ],
});

export const metadata: Metadata = {
  title: "hzx的工作台",
  description: "hzx 的个人效率工作台 — 任务、番茄钟、背单词、笔记",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN" className={`${sans.variable} ${serif.variable}`}>
      <body className="aurora-grain">
        <div className="aurora-field" aria-hidden>
          <div
            className="aurora-blob animate-aurora-drift"
            style={{
              width: 560, height: 560, left: "-8%", top: "-12%",
              background: "radial-gradient(circle, rgba(139,92,246,0.5), transparent 70%)",
            }}
          />
          <div
            className="aurora-blob animate-aurora-drift-2"
            style={{
              width: 620, height: 620, right: "-10%", top: "22%",
              background: "radial-gradient(circle, rgba(34,211,238,0.32), transparent 70%)",
            }}
          />
          <div
            className="aurora-blob animate-aurora-drift"
            style={{
              width: 480, height: 480, left: "30%", bottom: "-18%",
              background: "radial-gradient(circle, rgba(45,212,191,0.22), transparent 70%)",
              animationDelay: "-12s",
            }}
          />
        </div>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
