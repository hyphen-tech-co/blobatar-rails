import { writeFile } from "node:fs/promises";
import { blobatar } from "blobatar/blob";
import * as poses from "blobatar/expression";

if (!process.argv.includes("--write")) throw new Error("Pass --write to deliberately replace official fixtures");
const expressions = ["idle", "happy", "sad", "mad", "surprised", "wink", "sleepy", "smug", "unsure", "scared", "love", "shy", "sick", "thinking"];
const cases = [
  { name: "alice@example.com", options: {} },
  { name: "日本語😀", options: { size: 96, background: false, hue: 210, tone: 0.7 } },
  { name: " E\u0301COLE 🧑🏽‍💻 ", options: { size: 64, background: "circle", normalize: false, contrast: false, title: '<Hello & "world">', traits: { shape: [0.1, 0.95], "eye.gap": 0.8 }, palette: { bg: "#c4c4c4" } } },
  ...["\u00a0Alice\u00a0", "\u3000Alice\u3000", "\ufeffAlice\ufeff", "\u0000Alice\u0000", "ΟΣ", "ΟΔΥΣΣΕΥΣ", "Σ", "İ", "\u0085Alice\u0085", "\u2028Alice\u2029"].flatMap((name) => [true, false].map((normalize) => ({ name, options: { normalize } }))),
  ...[0.1, 0.25, 0.52, 0.63, 0.73, 0.82, 0.89, 0.93, 0.96, 0.99].map((shape, index) => ({
    name: `shape-${index} É😀`,
    options: {
      size: 80.5, hue: 32 + index * 36, tone: index / 10,
      background: [true, "square", "squircle", "circle"][index % 4],
      traits: { shape, "body.pts": [0.1, 0.9], "eye.gap": 0.35 },
      ...(index % 2 ? { palette: { head: "#123456", eye: "#fedcba", bg: "#ddeeff" } } : {})
    }
  }))
];
const fixtures = cases.flatMap((entry) => expressions.map((expression) => ({ ...entry, expression, svg: blobatar(entry.name, { ...entry.options, expression: poses[expression] }) })));
await writeFile(new URL("../test/fixtures/official.json", import.meta.url), JSON.stringify(fixtures, null, 2) + "\n");
