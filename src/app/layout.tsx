import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: { template: "%s | GEO 监测平台", default: "GEO AI 搜索可见度监测平台" },
  description: "面向国内 AI 搜索和问答平台的 GEO 可见度监测系统",
  robots: { index: false, follow: false },
  openGraph: {
    title: "GEO AI 搜索可见度监测平台",
    description: "面向国内 AI 搜索和问答平台的 GEO 可见度监测系统",
    locale: "zh_CN",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full bg-slate-100 text-slate-950">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
