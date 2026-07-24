import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "最后三页",
    template: "%s｜最后三页",
  },
  description:
    "一本日记，三页被替她写下的结局。纯文字悬疑恐怖推理游戏。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
