import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "奶牛行为智能检测系统",
  description: "YOLOv11 AI detection system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}