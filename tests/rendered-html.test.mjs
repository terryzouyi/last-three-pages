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

async function loadDiarySource() {
  return readFile(new URL("../app/DiaryGame.tsx", import.meta.url), "utf8");
}

async function loadAudioSource() {
  return readFile(new URL("../app/useDiaryAudio.ts", import.meta.url), "utf8");
}

function extractPages(source) {
  const marker = "const pages: GamePage[] = ";
  const start = source.indexOf(marker) + marker.length;
  assert.ok(start >= marker.length, "pages data should exist");

  let depth = 0;
  let quote = null;
  let escaped = false;
  let end = -1;

  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = null;
      continue;
    }

    if (character === '"' || character === "'" || character === "`") {
      quote = character;
      continue;
    }

    if (character === "[" || character === "{" || character === "(") depth += 1;
    if (character === "]" || character === "}" || character === ")") {
      depth -= 1;
      if (depth === 0 && character === "]") {
        end = index + 1;
        break;
      }
    }
  }

  assert.ok(end > start, "pages data should be a complete array");
  return Function(`"use strict"; return (${source.slice(start, end)});`)();
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
  const source = await loadDiarySource();

  assert.match(source, /voice-smallboat/);
  assert.match(source, /lock-bolt/);
  assert.match(source, /three-tickets/);
  assert.match(source, /forged-alone/);
  assert.match(source, /最后三页不是顾澄写的/);
  assert.match(source, /划掉伪造的结局/);
  assert.match(source, /不要回来。不是你丢下我/);
  assert.match(source, /重新读一次结局/);
  assert.match(source, /trace-erased-boat/);
  assert.match(source, /trace-new-ink-fold/);
  assert.match(source, /从书签处继续/);
  assert.match(source, /我在页边停了一下/);
  assert.match(source, /last-three-pages-diary-v1/);
  assert.match(source, /reader-location/);
  assert.match(source, /trace-trigger/);
  assert.match(source, /page-turn/);
  assert.doesNotMatch(source, /corner-action/);
  assert.doesNotMatch(source, /tagOptions/);
  assert.doesNotMatch(source, />归类</);
  assert.match(source, /当前推理已选/);
  assert.match(source, /移出推理/);
  assert.match(source, /usedEvidence/);
  assert.match(source, /setTimeout\(\(\) => setResetArmed\(false\), 5000\)/);
  assert.doesNotMatch(source, /forged-weather/);
  assert.doesNotMatch(source, /顾明海在火灾之后替死去的顾澄/);
  assert.doesNotMatch(source, /我们今晚是要离开/);
  assert.match(source, /不能仅凭这些文字确定代写者/);
});

test("the diary has adaptive horror ambience, interaction sounds, and persistent controls", async () => {
  const [source, audioSource] = await Promise.all([
    loadDiarySource(),
    loadAudioSource(),
  ]);

  assert.match(source, /<SoundControl/);
  assert.match(source, /声音将在首次互动后开启/);
  assert.match(source, /diaryAudio\.play\("page"\)/);
  assert.match(source, /diaryAudio\.play\("collect"\)/);
  assert.match(source, /diaryAudio\.play\("correct"\)/);
  assert.match(source, /diaryAudio\.play\("crossout"\)/);
  assert.match(audioSource, /last-three-pages-audio-v1/);
  assert.match(audioSource, /new AudioContext\(\)/);
  assert.match(audioSource, /quiet:/);
  assert.match(audioSource, /uneasy:/);
  assert.match(audioSource, /dread:/);
  assert.match(audioSource, /ending:/);
  assert.match(audioSource, /playAmbientTexture/);
  assert.match(audioSource, /duckRoom/);
  assert.match(audioSource, /playKnock/);
  assert.doesNotMatch(audioSource, /motif:/);
});

test("every puzzle is solvable from earlier, internally consistent evidence", async () => {
  const source = await loadDiarySource();
  const pages = extractPages(source);
  const seenPageIds = new Set();
  const seenSegmentIds = new Set();
  const availableEvidence = new Set();
  const weekdayNames = [
    "星期日",
    "星期一",
    "星期二",
    "星期三",
    "星期四",
    "星期五",
    "星期六",
  ];

  for (const page of pages) {
    assert.ok(!seenPageIds.has(page.id), `duplicate page id: ${page.id}`);
    seenPageIds.add(page.id);

    if (page.kind === "reading") {
      for (const entry of page.entries) {
        const dateParts = entry.date.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
        if (dateParts) {
          const date = new Date(
            Date.UTC(
              Number(dateParts[1]),
              Number(dateParts[2]) - 1,
              Number(dateParts[3]),
            ),
          );
          assert.equal(
            entry.weekday,
            weekdayNames[date.getUTCDay()],
            `${entry.date} has the wrong weekday`,
          );
        }

        for (const segment of entry.segments) {
          assert.ok(
            !seenSegmentIds.has(segment.id),
            `duplicate segment id: ${segment.id}`,
          );
          seenSegmentIds.add(segment.id);
          availableEvidence.add(segment.id);
        }
      }
    }

    if (page.kind === "deduction" || page.kind === "final") {
      assert.equal(page.maxPins, page.requiredIds.length, `${page.id} required evidence`);
      assert.equal(
        page.maxPins,
        page.acceptedGroups.length,
        `${page.id} accepted evidence groups`,
      );

      for (const evidenceId of page.requiredIds) {
        assert.ok(
          availableEvidence.has(evidenceId),
          `${page.id} requires unavailable evidence: ${evidenceId}`,
        );
      }
      for (const group of page.acceptedGroups) {
        assert.ok(group.length > 0, `${page.id} has an empty evidence group`);
        for (const evidenceId of group) {
          assert.ok(
            availableEvidence.has(evidenceId),
            `${page.id} accepts unavailable evidence: ${evidenceId}`,
          );
        }
      }
    }
  }

  const authorPuzzle = pages.find((page) => page.id === "author");
  assert.ok(authorPuzzle.requiredIds.includes("oct08-clock"));
  assert.ok(authorPuzzle.requiredIds.includes("forged-time"));

  const finalPuzzle = pages.find((page) => page.id === "final");
  assert.ok(!finalPuzzle.requiredIds.includes("mother-bedroom"));
  assert.ok(!finalPuzzle.requiredIds.includes("nov18-key"));
});
