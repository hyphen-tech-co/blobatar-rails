import { test, expect } from "@playwright/test";
import { blobatar } from "blobatar/blob";
import { readFile } from "node:fs/promises";
import { PNG } from "pngjs";

const ready = async (page, path = "/editor") => {
  await page.goto(path);
  await page.waitForFunction(() => window.Stimulus && document.querySelector("#studio-preview .mo-root"));
};
const paths = (svg) => [...svg.matchAll(/ d="([^"]*)"/g)].map((match) => match[1]);

test("official-style home has working name, named shapes, expressions, hue and background under CSP", async ({ page }) => {
  const errors = [], external = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => { if (!request.url().startsWith("http://127.0.0.1:3100")) external.push(request.url()); });
  await page.addInitScript(() => { window.violations = []; document.addEventListener("securitypolicyviolation", (event) => window.violations.push(event.violatedDirective)); });
  await ready(page, "/");
  await expect(page.locator("#seed")).toHaveValue("alain00");
  await expect(page.locator("#wall, [data-controller~=wall]")).toHaveCount(0);
  await page.locator("#seed").fill("a different name");
  await expect(page.locator("[data-studio-target=code]")).toContainText("a different name");
  await page.getByRole("button", { name: "Options", exact: true }).click();
  await page.locator('[data-shape="droplet"]').click();
  await page.getByRole("button", { name: "Hue 12", exact: true }).click();
  await page.locator('[data-background="circle"]').click();
  await page.locator('#hero-options [data-expression="mad"]').click();
  await expect(page.locator("#studio-preview")).toHaveAttribute("data-blobatar-current-expression", "mad");
  await expect(page.locator("[data-studio-target=code]")).toContainText('"shape" => 0.888');
  await expect(page).toHaveURL(/shape=droplet/);
  await page.reload();
  await expect(page.locator("#studio-preview")).toHaveAttribute("data-blobatar-current-expression", "mad");
  await expect(page.locator("#seed")).toHaveValue("a different name");
  const options = await page.locator("#studio-preview").getAttribute("data-blobatar-options-value");
  expect(JSON.parse(options)).toMatchObject({ traits: { shape: 0.888 }, hue: 12, background: "circle" });
  await page.getByRole("button", { name: "Options", exact: true }).click();
  await page.getByRole("button", { name: "10 more expressions", exact: true }).click();
  await page.locator('#all-expressions [data-expression="love"]').click();
  await expect(page.locator("#studio-preview")).toHaveAttribute("data-blobatar-current-expression", "love");
  expect(errors).toEqual([]); expect(external).toEqual([]); expect(await page.evaluate(() => window.violations)).toEqual([]);
});

test("editor multi-select, sliders, pinning, shuffle, preview, snippet and query all share state", async ({ page }) => {
  await ready(page);
  await expect(page.locator(".panel-heading")).toContainText("nothing pinned");
  await page.locator('[data-shape="round"]').click();
  await page.locator('[data-shape="sun"]').click();
  await page.locator('[data-tone="pastel"]').click();
  await page.locator('[data-tone="ink"]').click();
  const range = page.locator('input[data-axis="eye.gap"]');
  await range.evaluate((input) => { input.value = "0.82"; input.dispatchEvent(new window.Event("input", { bubbles: true })); });
  const code = page.locator("[data-studio-target=code]");
  await expect(code).toContainText('"shape" => [0.11, 0.965]');
  await expect(code).toContainText('"tone" => [0.1, 0.965]');
  await expect(code).toContainText('"eye.gap" => 0.82');
  await expect(page.locator('.axis[data-axis-row="sun.n"]')).toHaveAttribute("data-available", "true");
  await page.getByRole("button", { name: "Shuffle name", exact: true }).click();
  await expect(page.locator("#editor-name")).not.toHaveValue("alain00");
  await expect(code).toContainText('"eye.gap" => 0.82');
  const name = await page.locator("#editor-name").inputValue();
  const options = { traits: { shape: [0.11, 0.965], tone: [0.1, 0.965], "eye.gap": 0.82 } };
  await expect.poll(async () => paths(await page.locator("#studio-preview svg").evaluate((svg) => svg.outerHTML))).toEqual(paths(blobatar(name, options)));
  await page.reload();
  await expect(page.locator('[data-shape="round"]')).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('[data-shape="sun"]')).toHaveAttribute("aria-pressed", "true");
  await expect(range).toHaveValue("0.82");
  await page.locator('[data-pin="eye.gap"]').click();
  await expect(code).not.toContainText('"eye.gap"');
  await page.getByRole("button", { name: "unpin all", exact: true }).click();
  await expect(code).not.toContainText("traits:");
  await expect(page.locator('[data-shape="auto"]')).toHaveAttribute("aria-pressed", "true");
});

test("copy, Ruby/HTTP tabs and SVG/PNG downloads reflect the current config", async ({ page, context, request }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await ready(page, "/editor?name=alain00&traits=" + encodeURIComponent('{"shape":0.965,"tone":0.965}'));
  await page.locator('[data-format="ruby"]').click();
  await expect(page.locator("[data-studio-target=code]")).toContainText("Blobatar::Rails::Renderer.svg");
  await page.getByRole("button", { name: "Copy code", exact: true }).click();
  await expect(page.getByRole("button", { name: "Copied", exact: true })).toBeVisible();
  const clipboard = await page.evaluate(() => window.navigator.clipboard.readText());
  expect(clipboard).toContain('"shape" => 0.965');
  await page.locator('[data-format="http"]').click();
  const url = await page.locator("[data-studio-target=code]").textContent();
  const response = await request.get(url);
  expect(response.ok()).toBe(true);
  expect(await response.text()).toBe(blobatar("alain00", { traits: { shape: 0.965, tone: 0.965 } }));
  await page.getByRole("button", { name: "Export this blobatar", exact: true }).click();
  const svgDownload = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: "SVG scales to any size" }).click();
  const svg = await svgDownload;
  expect(await readFile(await svg.path(), "utf8")).toBe(blobatar("alain00", { traits: { shape: 0.965, tone: 0.965 } }));
  const pngDownload = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: "PNG 512 × 512 image" }).click();
  const png = PNG.sync.read(await readFile(await (await pngDownload).path()));
  expect([png.width, png.height]).toEqual([512, 512]);
});

test("mobile layouts fit and native popovers close with Escape; Turbo visits keep editor state", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page, "/");
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    const heading = await page.locator(".hero h1").boundingBox();
    const navigation = await page.locator(".site-nav").boundingBox();
    const avatar = await page.locator(".hero-avatar").boundingBox();
    expect(heading.y).toBe(48);
    expect(navigation.y + navigation.height).toBeLessThanOrEqual(heading.y);
    expect(avatar.width).toBeCloseTo(width * 0.26, 0);
  }
  await page.getByRole("button", { name: "Options", exact: true }).click();
  await expect(page.locator("#hero-options")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#hero-options")).toBeHidden();
  for (const path of ["/", "/editor", "/components", "/hotwire"]) {
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await ready(page);
  await page.locator("#editor-name").fill("cached-person");
  await page.locator('[data-shape="triangle"]').click();
  await expect(page.locator("[data-studio-target=code]")).toContainText("cached-person");
  await page.getByRole("link", { name: "← blobatar", exact: true }).click();
  await expect(page).toHaveURL("/");
  await page.goBack();
  await expect(page.locator("#editor-name")).toHaveValue("cached-person");
  await expect(page.locator('[data-shape="triangle"]')).toHaveAttribute("aria-pressed", "true");
});

test("official component compositions, agent selection and password privacy work without storage or requests", async ({ page }) => {
  const errors = [], requests = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/components");
  await page.waitForFunction(() => window.Stimulus && document.querySelector(".password-face .mo-root"));
  await expect(page.locator(".showcase-sidebar a")).toHaveCount(5);
  await expect(page.locator(".showcase-section")).toHaveCount(5);
  await expect(page.locator(".member-table tbody tr")).toHaveCount(5);
  await page.getByRole("button", { name: /scout.*reading 41 files/ }).click();
  await expect(page.getByRole("button", { name: /scout.*reading 41 files/ })).toHaveAttribute("aria-pressed", "true");
  const input = page.getByLabel("Password", { exact: true });
  await expect(input).toHaveValue("");
  page.on("request", (request) => requests.push(request.url()));
  await input.fill("not-a-real-secret");
  const face = page.locator(".password-face");
  await expect.poll(async () => JSON.parse(await face.getAttribute("data-blobatar-gaze-value")).target).toMatchObject({ x: expect.any(Number), y: expect.any(Number) });
  await page.getByRole("button", { name: "Show password" }).click();
  await expect(input).toHaveAttribute("type", "text");
  await expect(face).toHaveAttribute("data-blobatar-current-expression", "sleepy");
  await expect(face).toHaveAttribute("data-blobatar-gaze-value", '{"target":"rest"}');
  await page.getByRole("button", { name: "Hide password" }).click();
  await expect(input).toHaveAttribute("type", "password");
  await expect(face).toHaveAttribute("data-blobatar-current-expression", "idle");
  expect(requests).toEqual([]); expect(errors).toEqual([]);
  expect(await page.evaluate(() => window.location.href + JSON.stringify(window.localStorage) + JSON.stringify(window.sessionStorage))).not.toContain("not-a-real-secret");
  await page.getByRole("link", { name: "← blobatar", exact: true }).click();
  await expect(page).toHaveURL("/");
  await expect(page.locator("#seed")).toBeVisible();
  await page.goBack();
  await expect(input).toHaveValue("");
  await expect(input).toHaveAttribute("type", "password");
  for (const width of [320, 390, 1280]) { await page.setViewportSize({ width, height: 844 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true); }
});
