import { writeFile } from "node:fs/promises";
import { blobatar } from "blobatar/blob";
import * as poses from "blobatar/expression";

if (!process.argv.includes("--write")) throw new Error("Pass --write to deliberately replace official fixtures");
const expressions = ["idle", "happy", "sad", "mad", "surprised", "wink", "sleepy", "smug", "unsure", "scared", "love", "shy", "sick", "thinking"];
const cases = [
  { name: "alice@example.com", options: {} },
  { name: "日本語😀", options: { size: 96, background: false, hue: 210, tone: 0.7 } },
  { name: " E\u0301COLE 🧑🏽‍💻 ", options: { size: 64, background: "circle", normalize: false, contrast: false, title: '<Hello & "world">', traits: { shape: [0.1, 0.95], "eye.gap": 0.8 }, palette: { bg: "#c4c4c4" } } }
];
const fixtures = cases.flatMap((entry) => expressions.map((expression) => ({ ...entry, expression, svg: blobatar(entry.name, { ...entry.options, expression: poses[expression] }) })));
await writeFile(new URL("../test/fixtures/official.json", import.meta.url), JSON.stringify(fixtures, null, 2) + "\n");
