import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server renders the finished diary game shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>最后三页｜文字推理游戏<\/title>/);
  assert.match(html, /纸页正在晾干/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/);
});

test("the diary contains the complete evidence and conclusion loop", async () => {
  const source = await readFile(
    new URL("../app/DiaryGame.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /voice-smallboat/);
  assert.match(source, /lock-bolt/);
  assert.match(source, /three-tickets/);
  assert.match(source, /forged-alone/);
  assert.match(source, /最后三页不是顾澄写的/);
  assert.match(source, /划掉伪造的结局/);
  assert.match(source, /不要回来。不是你丢下我/);
  assert.match(source, /重新读一次结局/);
  assert.match(source, /last-three-pages-diary-v1/);
});
