import "./loader.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { renderSVG, Avatar } from "../../app/javascript/blobatar/render.js";
import { EXPRESSIONS } from "../../app/javascript/blobatar/validation.js";
import { _parts } from "blobatar/internal";
import * as poses from "blobatar/expression";

test("every fixed SVG is byte-identical to the official npm renderer", () => {
  const fixtures = JSON.parse(readFileSync(new URL("../fixtures/official.json", import.meta.url)));
  for (const fixture of fixtures) assert.equal(renderSVG(fixture.name, fixture.options, fixture.expression), fixture.svg);
});

test("all 14 expressions and mode changes preserve the SVG and eye nodes", () => {
  const dom = new JSDOM('<span id="avatar"></span>');
  const element = dom.window.document.getElementById("avatar");
  const avatar = new Avatar(element);
  avatar.render("agent", { size: 96 }, "idle", "always");
  const eyes = avatar.svg.querySelector(".mo-eye");
  const root = avatar.root;
  for (const pose of EXPRESSIONS) for (const mode of [false, "hover", "always"]) {
    assert.equal(avatar.render("agent", { size: 96 }, pose, mode), false);
    assert.equal(avatar.svg.querySelector(".mo-eye"), eyes);
    assert.equal(avatar.root, root);
    assert.equal(element.dataset.blobatarCurrentExpression, pose);
    assert.equal(root.classList.contains("mo-still"), !mode);
    const expected = _parts("agent", { size: 96, expression: poses[pose], animate: mode || "hover" });
    for (const [key, value] of Object.entries(expected.vars)) assert.equal(avatar.svg.style.getPropertyValue(key), value);
  }
  avatar.render("agent", { size: 96 }, "idle", "always");
  assert.equal(avatar.svg.style.getPropertyValue("--mo-edy2"), "");
});

test("geometry changes replace only the inner markup; title is always text", () => {
  const dom = new JSDOM("<span></span>");
  const avatar = new Avatar(dom.window.document.querySelector("span"));
  avatar.render("agent", {}, "idle", false);
  const root = avatar.root;
  assert.equal(avatar.render("different", { title: '</title><script>alert(1)</script>', background: false }, "happy", false), true);
  assert.equal(avatar.root, root);
  assert.equal(avatar.svg.querySelectorAll("script").length, 0);
  assert.equal(avatar.svg.getAttribute("role"), "img");
  assert.equal(avatar.svg.querySelector(":scope > path"), null);
});

test("raw attribute injection, invalid modes, traits, and expressions are rejected", () => {
  for (const configuration of [{ palette: { head: 'red" onload="evil()' } }, { backgroundColor: "url(https://evil.test)" }, { size: NaN }, { traits: { shape: "x" } }, { unknown: true }]) assert.throws(() => renderSVG("x", configuration));
  assert.throws(() => renderSVG("x", {}, "invalid"));
});
