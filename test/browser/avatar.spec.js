import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { blobatar } from "blobatar/blob";
import * as poses from "blobatar/expression";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

const expressions = ["idle", "happy", "sad", "mad", "surprised", "wink", "sleepy", "smug", "unsure", "scared", "love", "shy", "sick", "thinking"];
const ready = async (page) => { await page.goto("/"); await page.waitForFunction(() => window.Stimulus && document.querySelector("#agent-avatar .mo-root")); };
const send = async (page, id, payload) => page.evaluate(({ id, payload }) => { document.getElementById(id).dispatchEvent(new CustomEvent("blobatar:update", { detail: payload })); }, { id, payload });

test("importmap has no CDN or bundler requests, including under strict CSP", async ({ page }) => {
  await page.addInitScript(() => {
    window.cspViolations = [];
    document.addEventListener("securitypolicyviolation", (event) => window.cspViolations.push(event.violatedDirective));
  });
  const errors = []; const external = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => { if (!request.url().startsWith("http://127.0.0.1:3100")) external.push(request.url()); });
  await ready(page);
  await expect(page.locator(".expression-grid article")).toHaveCount(14);
  await expect(page.locator(".crowd svg")).toHaveCount(24);
  expect(errors).toEqual([]); expect(external).toEqual([]);
  expect(await page.evaluate(() => window.cspViolations)).toEqual([]);
});

test("every official expression morphs without replacing the SVG subtree", async ({ page }) => {
  await ready(page);
  await page.evaluate(() => { window.originalEye = document.querySelector("#expression-avatar .mo-eye"); window.originalSVG = document.querySelector("#expression-avatar svg"); });
  for (const pose of expressions) {
    await page.locator("#expression").selectOption(pose);
    await expect(page.locator("#expression-avatar")).toHaveAttribute("data-blobatar-current-expression", pose);
    expect(await page.evaluate(() => document.querySelector("#expression-avatar .mo-eye") === window.originalEye && document.querySelector("#expression-avatar svg") === window.originalSVG)).toBe(true);
  }
  const transition = await page.locator("#expression-avatar .mo-root").evaluate((root) => getComputedStyle(root).transitionDuration);
  expect(transition).not.toBe("0s");
});

test("static, hover and always modes respect motion and reduced-motion preferences", async ({ page }) => {
  await ready(page);
  const animations = (selector) => page.locator(selector).evaluate((root) => root.getAnimations({ subtree: true }).map((animation) => animation.playState));
  expect(await animations("#mode-false")).toEqual([]);
  expect(await animations("#mode-hover")).not.toContain("running");
  await page.locator("#mode-hover").hover();
  await expect.poll(() => animations("#mode-hover")).toContain("running");
  expect(await animations("#mode-always")).toContain("running");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(() => animations("#mode-always")).toEqual([]);
  await expect.poll(() => page.locator("#gaze-avatar svg").evaluate((svg) => svg.style.getPropertyValue("--mo-track-hold"))).toBe("");
});

test("Turbo Streams update states and reactions without a stale timer overriding newer state", async ({ page }) => {
  await ready(page);
  await page.getByRole("button", { name: "Run successful task" }).click();
  await expect(page.locator("#agent-avatar")).toHaveAttribute("data-blobatar-current-expression", "thinking");
  await expect(page.locator("#agent-avatar")).toHaveAttribute("data-blobatar-current-expression", "love");
  await expect(page.locator("#agent-avatar")).toHaveAttribute("data-blobatar-current-expression", "happy");
  await page.getByRole("button", { name: "Simulate error" }).click();
  await expect(page.locator("#agent-avatar")).toHaveAttribute("data-blobatar-current-expression", "scared");
  await send(page, "agent-avatar", { status: "success" });
  await page.waitForTimeout(1400);
  await expect(page.locator("#agent-avatar")).toHaveAttribute("data-blobatar-current-expression", "happy");
  await expect(page.locator("#expression-avatar")).toHaveAttribute("data-blobatar-current-expression", "idle");
});

test("Stimulus Values, geometry, custom states and one-shot reactions survive reconnect", async ({ page }) => {
  await ready(page);
  await page.locator("#expression-avatar").evaluate((element) => element.setAttribute("data-blobatar-expression-value", "wink"));
  await expect(page.locator("#expression-avatar")).toHaveAttribute("data-blobatar-current-expression", "wink");
  await page.locator("#expression-avatar").evaluate((element) => element.setAttribute("data-blobatar-options-value", JSON.stringify({ background: false, title: "New title", hue: 42 })));
  await expect(page.locator("#expression-avatar title")).toHaveText("New title");
  await page.locator("#expression-avatar").evaluate((element) => element.setAttribute("data-blobatar-states-value", JSON.stringify({ custom: "smug" })));
  await page.locator("#expression-avatar").evaluate((element) => element.setAttribute("data-blobatar-status-value", "custom"));
  await expect(page.locator("#expression-avatar")).toHaveAttribute("data-blobatar-current-expression", "smug");
  await page.locator("#expression-avatar").evaluate((element) => element.setAttribute("data-blobatar-reaction-value", JSON.stringify({ expression: "love", duration: 1500 })));
  await expect(page.locator("#expression-avatar")).toHaveAttribute("data-blobatar-current-expression", "love");
  await page.locator("#expression-avatar").evaluate((element) => { window.detachedAvatar = element; element.remove(); });
  await page.waitForTimeout(40);
  await page.evaluate(() => document.querySelector(".stage").prepend(window.detachedAvatar));
  await expect(page.locator("#expression-avatar")).toHaveAttribute("data-blobatar-current-expression", "smug");
  await expect(page.locator("#expression-avatar")).not.toHaveAttribute("data-blobatar-reaction-value");
});

test("gaze supports pointer, selector, coordinates, rest and release", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await ready(page);
  await page.locator("#gaze-avatar").scrollIntoViewIfNeeded();
  await page.mouse.move(1200, 600);
  await expect.poll(() => page.locator("#gaze-avatar svg").evaluate((svg) => svg.style.getPropertyValue("--mo-track-hold"))).not.toBe("");
  await page.getByRole("button", { name: "Button", exact: true }).click();
  await page.getByRole("button", { name: "Coordinate", exact: true }).click();
  await page.getByRole("button", { name: "Front", exact: true }).click();
  await page.getByRole("button", { name: "Release", exact: true }).click();
  await expect.poll(() => page.locator("#gaze-avatar svg").evaluate((svg) => svg.style.getPropertyValue("--mo-track-hold"))).toBe("");
});

test("Turbo Frame replacement disconnects old controller and initializes the new one", async ({ page }) => {
  await ready(page);
  await page.evaluate(() => { window.oldFrame = document.getElementById("frame-avatar"); window.oldController = window.Stimulus.getControllerForElementAndIdentifier(window.oldFrame, "blobatar"); });
  await page.getByRole("link", { name: "Replace frame" }).click();
  await expect(page.locator("#frame-avatar")).toHaveAttribute("data-blobatar-current-expression", "wink");
  expect(await page.evaluate(() => !window.oldController.active && !window.oldController.driver && window.oldFrame !== document.getElementById("frame-avatar"))).toBe(true);
});

test("Turbo cache suspends timers, gaze and listeners without growth across visits", async ({ page }) => {
  await page.addInitScript(() => {
    const originalAdd = EventTarget.prototype.addEventListener, originalRemove = EventTarget.prototype.removeEventListener;
    const registry = new Map();
    EventTarget.prototype.addEventListener = function (name, callback, options) {
      if (this === document || this === window) {
        const key = `${this === document ? "document" : "window"}:${name}`;
        if (!registry.has(key)) registry.set(key, new Set());
        registry.get(key).add(callback);
      }
      return originalAdd.call(this, name, callback, options);
    };
    EventTarget.prototype.removeEventListener = function (name, callback, options) {
      registry.get(`${this === document ? "document" : "window"}:${name}`)?.delete(callback);
      return originalRemove.call(this, name, callback, options);
    };
    window.listenerCounts = () => Object.fromEntries([...registry].filter(([name]) => /turbo:before-cache|turbo:load|pointermove|pointerleave|scroll|resize/.test(name)).map(([name, callbacks]) => [name, callbacks.size]));
  });
  await ready(page);
  const baseline = await page.evaluate(() => window.listenerCounts());
  for (let i = 0; i < 3; i++) {
    await send(page, "agent-avatar", { expression: "love", duration: 60000 });
    await page.evaluate(() => { window.beforeVisitControllers = [...document.querySelectorAll('[data-controller~="blobatar"]')].map((element) => window.Stimulus.getControllerForElementAndIdentifier(element, "blobatar")); });
    await page.getByRole("link", { name: "Test a Turbo visit" }).click();
    await expect(page).toHaveURL(/\/other$/);
    expect(await page.evaluate(() => window.beforeVisitControllers.every((controller) => !controller.active && !controller.driver && controller.machine.timer === null))).toBe(true);
    await page.goBack();
    await expect(page.locator("#agent-avatar")).toHaveAttribute("data-blobatar-current-expression", "idle");
    await expect.poll(() => page.evaluate(() => window.listenerCounts())).toEqual(baseline);
  }
});

test("all fourteen static expressions visually match official SVG and the stored regression images", async ({ page }) => {
  const officialCSS = readFileSync(new URL("../../node_modules/blobatar/dist/motion.css", import.meta.url), "utf8");
  const officialGazeCSS = readFileSync(new URL("../../node_modules/blobatar/dist/gaze.css", import.meta.url), "utf8");
  await page.route("**/official-reference?*", (route) => {
    const pose = new URL(route.request().url()).searchParams.get("pose");
    const svg = blobatar("visual-comparison", { size: 128, title: pose, expression: poses[pose] });
    return route.fulfill({ contentType: "text/html", body: `<style>${officialCSS}\n${officialGazeCSS}</style><body style="margin:0">${svg}</body>` });
  });
  await ready(page);
  for (const pose of expressions) {
    const uri = `/official-reference?pose=${pose}`;
    await page.evaluate(({ pose, uri }) => {
      const fixture = document.createElement("div"); fixture.id = "visual-fixture";
      fixture.style.background = "white";
      fixture.style.display = "flex";
      fixture.style.alignItems = "start";
      fixture.innerHTML = `<iframe width="128" height="128" title="Official ${pose}"></iframe>`;
      fixture.querySelector("iframe").style.border = "0";
      document.querySelector("main").prepend(fixture);
      fixture.querySelector("iframe").src = uri;
      const span = document.createElement("span"); span.id = "visual-adapter";
      span.className = "blobatar";
      span.dataset.controller = "blobatar"; span.dataset.blobatarNameValue = "visual-comparison";
      span.dataset.blobatarOptionsValue = JSON.stringify({ size: 128, title: pose });
      span.dataset.blobatarExpressionValue = pose; span.dataset.blobatarAnimateValue = "false";
      fixture.prepend(span);
    }, { pose, uri });
    await expect(page.locator("#visual-adapter")).toHaveAttribute("data-blobatar-current-expression", pose);
    const actual = await page.locator("#visual-adapter svg").screenshot();
    await expect(page.locator("#visual-adapter svg")).toHaveScreenshot(`${pose}.png`);
    const reference = await page.frameLocator("#visual-fixture iframe").locator("svg").screenshot();
    await test.info().attach(`official-${pose}`, { body: reference, contentType: "image/png" });
    const actualPNG = PNG.sync.read(actual), referencePNG = PNG.sync.read(reference);
    const differentPixels = pixelmatch(actualPNG.data, referencePNG.data, null, 128, 128, { threshold: 0.1 });
    expect(differentPixels, `official visual mismatch for ${pose}`).toBe(0);
    await page.locator("#visual-fixture").evaluate((element) => element.remove());
  }
});
