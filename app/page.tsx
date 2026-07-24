import type { Metadata } from "next";
import DiaryGame from "./DiaryGame";

const isGitHubPages = process.env.GITHUB_PAGES === "true";
const [repositoryOwner = "terryzouyi", repositoryName = "last-three-pages"] =
  process.env.GITHUB_REPOSITORY?.split("/") ?? [];
const origin = isGitHubPages
  ? repositoryName.endsWith(".github.io")
    ? `https://${repositoryOwner}.github.io`
    : `https://${repositoryOwner}.github.io/${repositoryName}`
  : "https://last-three-pages.sakurazou792501.chatgpt.site";
const image = `${origin}/og-diary-trace.jpg`;

export const metadata: Metadata = {
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

export default function Home() {
  return <DiaryGame />;
}
