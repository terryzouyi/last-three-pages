import type { Metadata } from "next";
import { headers } from "next/headers";
import DiaryGame from "./DiaryGame";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  const origin = host ? `${protocol}://${host}` : "http://localhost:3000";
  const image = `${origin}/og.png`;

  return {
    title: {
      absolute: "最后三页｜文字推理游戏",
    },
    description:
      "阅读顾澄留下的日记，从称呼、时间与前后矛盾中摘录证据，判断最后三页究竟是谁写的。",
    openGraph: {
      title: "最后三页",
      description: "一本日记，三页被替她写下的结局。",
      type: "website",
      images: [{ url: image, width: 1675, height: 941, alt: "最后三页" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "最后三页",
      description: "一本日记，三页被替她写下的结局。",
      images: [image],
    },
  };
}

export default function Home() {
  return <DiaryGame />;
}
