import { Controller } from "@hotwired/stimulus";
import { traits, palette } from "blobatar";
import { _layout } from "blobatar/internal";
import { renderSVG } from "blobatar-rails/render";

const ruby = (value) => {
  if (Array.isArray(value)) return `[${value.map(ruby).join(", ")}]`;
  if (value && typeof value === "object") return `{ ${Object.entries(value).map(([key, entry]) => `${JSON.stringify(key)} => ${ruby(entry)}`).join(", ")} }`;
  return typeof value === "string" ? JSON.stringify(value).replace(/#(?=[{@$])/g, "\\#") : JSON.stringify(value);
};
const rounded = (value) => Math.round(value * 1000) / 1000;

export default class extends Controller {
  static targets = ["name", "measure", "preview", "tile", "swatch", "code", "note", "install", "status", "count", "reset", "shapeNote", "toneNote", "decorationNote"];
  static values = { editor: Boolean, catalog: Object, name: String, pinned: Object, options: Object, expression: String, motion: String };

  connect() {
    this.pinned = { ...this.pinnedValue }; this.configuration = { ...this.optionsValue };
    this.pose = this.expressionValue || "idle"; this.mode = this.motionValue === "false" ? false : this.motionValue;
    this.seed = this.nameValue; this.formatName = "erb"; this.timers = new Set();
    this.abort = new window.AbortController();
    document.addEventListener("turbo:before-cache", () => this.cache(), { signal: this.abort.signal });
    this.paint();
  }
  disconnect() { this.abort.abort(); cancelAnimationFrame(this.frame); for (const timer of this.timers) clearTimeout(timer); }
  cache() {
    this.nameValue = this.seed; this.pinnedValue = this.pinned; this.optionsValue = this.configuration;
    this.expressionValue = this.pose; this.motionValue = String(this.mode);
    for (const popover of this.element.querySelectorAll(":popover-open")) popover.hidePopover();
  }
  schedule() { cancelAnimationFrame(this.frame); this.frame = requestAnimationFrame(() => { this.paint(); this.remember(); }); }
  name(event) { this.seed = event.target.value; this.schedule(); }
  other(event) { this.seed = event.currentTarget.dataset.name; this.schedule(); }
  shuffle() {
    const names = this.catalogValue.names.filter((name) => name !== this.seed);
    this.seed = names[Math.floor(Math.random() * names.length)]; this.schedule();
  }
  select(key, value, order) {
    if (value === "") delete this.pinned[key];
    else if (!this.editorValue) this.pinned[key] = Number(value);
    else {
      const chosen = [].concat(this.pinned[key] ?? []);
      const selected = order.filter((entry) => entry === Number(value) ? !chosen.includes(entry) : chosen.includes(entry));
      if (selected.length === 0) delete this.pinned[key];
      else this.pinned[key] = selected.length === 1 ? selected[0] : selected;
    }
    this.schedule();
  }
  shape(event) { this.select("shape", event.currentTarget.dataset.value, Object.values(this.catalogValue.shapes)); }
  tone(event) { this.select("tone", event.currentTarget.dataset.value, Object.values(this.catalogValue.tones)); }
  axis(event) {
    const input = event.currentTarget, bands = Number(input.dataset.bands);
    this.pinned[input.dataset.axis] = rounded(bands ? (Number(input.value) + 0.5) / bands : Number(input.value)); this.schedule();
  }
  pin(event) {
    const key = event.currentTarget.dataset.pin;
    if (Object.hasOwn(this.pinned, key)) delete this.pinned[key];
    else this.pinned[key] = rounded(traits(this.seed, true, this.pinned)(key));
    this.schedule();
  }
  reset() { this.pinned = {}; this.schedule(); }
  expression(event) { this.pose = event.currentTarget.dataset.expression; this.schedule(); document.getElementById("all-expressions")?.hidePopover(); }
  background(event) {
    const value = event.currentTarget.dataset.background;
    if (value === "none") delete this.configuration.background; else this.configuration.background = value;
    this.schedule();
  }
  hue(event) {
    const value = event.currentTarget.dataset.hue;
    if (value === "auto") delete this.configuration.hue; else this.configuration.hue = Number(value);
    this.schedule();
  }
  motion(event) { this.mode = event.currentTarget.dataset.motion === "none" ? false : event.currentTarget.dataset.motion; this.schedule(); }
  format(event) { this.formatName = event.currentTarget.dataset.format; this.paintCode(); }
  react() { this.previewTarget.dispatchEvent(new CustomEvent("blobatar:update", { detail: { expression: "happy", duration: 900 } })); }
  options() { return { ...this.configuration, traits: this.pinned }; }

  paint() {
    const options = this.options(), read = traits(this.seed, true, this.pinned), layout = _layout(this.seed, options);
    for (const input of this.nameTargets) if (input.value !== this.seed) input.value = this.seed;
    for (const measure of this.measureTargets) measure.textContent = this.seed || "someone";
    const avatar = this.previewTarget;
    avatar.dataset.blobatarNameValue = this.seed;
    avatar.dataset.blobatarOptionsValue = JSON.stringify({ ...options, title: `Blobatar for ${this.seed}` });
    avatar.dataset.blobatarExpressionValue = this.pose; avatar.dataset.blobatarAnimateValue = String(this.mode);
    for (const tile of this.tileTargets) {
      const { kind, value } = tile.dataset;
      let opts = options, seed = this.seed, expression = "idle";
      if (kind === "shape") { const pins = { ...this.pinned }; if (value === "") delete pins.shape; else pins.shape = Number(value); opts = { ...options, traits: pins }; }
      if (kind === "expression") expression = value;
      if (kind === "crowd") seed = value;
      tile.innerHTML = renderSVG(seed, opts, expression);
    }
    for (const button of this.element.querySelectorAll("[data-shape], [data-tone]")) {
      const key = button.hasAttribute("data-shape") ? "shape" : "tone", value = button.dataset.value;
      button.setAttribute("aria-pressed", String(value === "" ? !Object.hasOwn(this.pinned, key) : [].concat(this.pinned[key] ?? []).includes(Number(value))));
    }
    for (const [attribute, selected] of [["expression", this.pose], ["background", this.configuration.background || "none"], ["hue", String(this.configuration.hue ?? "auto")], ["motion", this.mode || "none"]]) {
      for (const button of this.element.querySelectorAll(`[data-${attribute}]`)) button.setAttribute("aria-pressed", String(button.dataset[attribute] === selected));
    }
    const candidates = [].concat(this.pinned.shape ?? []).map((value) => Object.keys(this.catalogValue.shapes).find((key) => this.catalogValue.shapes[key] === value)).filter(Boolean);
    if (!candidates.length) candidates.push(layout.shape);
    for (const row of this.element.querySelectorAll("[data-axis-row]")) {
      const key = row.dataset.axisRow, input = row.querySelector("input"), pin = row.querySelector("[data-pin]");
      const available = !row.dataset.when || candidates.some((name) => row.dataset.when.split(" ").includes(name));
      row.dataset.available = String(available); input.disabled = !available; pin.disabled = !available;
      const value = rounded(read(key)), bands = Number(input.dataset.bands);
      input.value = String(bands ? Math.min(bands - 1, Math.floor(read(key) * bands)) : value);
      input.style.setProperty("--progress", `${Number(input.value) / Number(input.max) * 100}%`);
      row.querySelector("output").textContent = value.toFixed(3);
      pin.setAttribute("aria-pressed", String(Object.hasOwn(this.pinned, key)));
      pin.setAttribute("aria-label", `${Object.hasOwn(this.pinned, key) ? "Unpin" : "Pin"} ${row.closest("[data-group]").dataset.group} ${row.querySelector("label").textContent}`);
    }
    for (const swatch of this.swatchTargets) swatch.style.backgroundColor = palette(this.configuration.hue ?? read("hue") * 360, true, swatch.dataset.value === "" ? read("tone") : Number(swatch.dataset.value)).head;
    const count = Object.keys(this.pinned).length;
    for (const target of this.countTargets) target.textContent = count ? `${count} pinned` : "nothing pinned";
    for (const target of this.resetTargets) target.disabled = count === 0;
    for (const key of ["shape", "tone"]) for (const target of this[`${key}NoteTargets`]) target.textContent = Array.isArray(this.pinned[key]) ? `${this.pinned[key].length} selected — each name gets one of them.` : "";
    const decoration = this.element.querySelector('[data-group="decoration"]');
    if (decoration) {
      decoration.querySelectorAll(".decoration-summary").forEach((summary) => summary.remove());
      const groups = new Map();
      for (const row of decoration.querySelectorAll("[data-axis-row]")) {
        const available = row.dataset.available === "true"; row.hidden = !available;
        if (!available) { const key = row.dataset.when; if (!groups.has(key)) groups.set(key, []); groups.get(key).push(row.querySelector("label").textContent); }
      }
      for (const [shape, labels] of groups) { const summary = document.createElement("p"); summary.className = "decoration-summary"; summary.textContent = `${labels.join(", ")} — ${shape} only`; decoration.appendChild(summary); }
    }
    this.paintCode();
  }
  paintCode() {
    const options = this.options(); if (!Object.keys(options.traits).length) delete options.traits;
    const entries = Object.entries(options).map(([key, value]) => `${key}: ${ruby(value)}`);
    if (this.pose !== "idle") entries.push(`expression: :${this.pose}`);
    if (this.mode) entries.push(`animate: :${this.mode}`);
    const argumentsText = [ruby(this.seed), ...entries].join(",\n  ");
    const code = this.formatName === "http" ? `${window.location.origin}/avatar?${new window.URLSearchParams({ name: this.seed, options: JSON.stringify(options), expression: this.pose })}` : this.formatName === "ruby" ? `Blobatar::Rails::Renderer.svg(\n  ${ruby(this.seed)},\n  ${ruby(options)}${this.pose === "idle" ? "" : `,\n  expression: :${this.pose}`}\n)` : `<%= blobatar_tag ${argumentsText}\n%>`;
    this.codeTarget.replaceChildren();
    for (const token of code.match(/"(?:\\.|[^"\\])*"|\b(?:blobatar_tag|animate|traits|expression|background|hue|Blobatar|Rails|Renderer)\b|[^"\w]+|\w+/g) || []) {
      const span = document.createElement("span"); span.textContent = token;
      if (token.startsWith('"')) span.className = "code-str";
      else if (/^(blobatar_tag|animate|traits|expression|background|hue|Blobatar|Rails|Renderer)$/.test(token)) span.className = "code-key";
      this.codeTarget.appendChild(span);
    }
    for (const button of this.element.querySelectorAll("[data-format]")) button.setAttribute("aria-pressed", String(button.dataset.format === this.formatName));
    const count = Object.keys(this.pinned).length;
    this.noteTarget.textContent = this.editorValue ? count ? `${count} pinned ${count === 1 ? "axis is" : "axes are"} fixed for every name; everything else still comes from the one you pass.` : "Nothing is pinned, so this blobatar is entirely the name — which is the default, and usually the right one. Pin an axis to fix it for everybody." : "Every option is optional except the name. Initial SVG is rendered by Ruby; Stimulus adds motion and reactions.";
  }
  remember() {
    const url = new URL(window.location.href); url.search = "";
    if (this.seed !== "alain00") url.searchParams.set("name", this.seed);
    if (Object.keys(this.pinned).length) {
      const shape = Object.entries(this.catalogValue.shapes).find(([, value]) => value === this.pinned.shape)?.[0];
      if (!this.editorValue && shape) url.searchParams.set("shape", shape); else url.searchParams.set("traits", JSON.stringify(this.pinned));
    }
    if (this.configuration.hue !== undefined) url.searchParams.set("hue", this.configuration.hue);
    if (this.configuration.background) url.searchParams.set("background", this.configuration.background);
    if (this.pose !== "idle") url.searchParams.set("expression", this.pose);
    if (this.mode !== "hover") url.searchParams.set("motion", this.mode || "none");
    window.history.replaceState(window.history.state, "", url);
  }
  position(event) {
    const trigger = event.currentTarget, panel = document.getElementById(trigger.getAttribute("popovertarget"));
    requestAnimationFrame(() => {
      const rect = trigger.getBoundingClientRect(), wide = window.innerWidth >= 1024, width = panel.offsetWidth;
      let left = wide && panel.id === "hero-options" ? this.previewTarget.getBoundingClientRect().right + 28 : rect.right - width;
      left = Math.max(16, Math.min(left, window.innerWidth - width - 16));
      panel.style.left = `${left}px`; panel.style.top = `${Math.max(16, Math.min(rect.bottom + 12, window.innerHeight - panel.offsetHeight - 16))}px`;
    });
  }
  later(callback, delay) { const timer = setTimeout(() => { this.timers.delete(timer); callback(); }, delay); this.timers.add(timer); }
  async copied(text, button) {
    const label = button.getAttribute("aria-label");
    try {
      await window.navigator.clipboard.writeText(text); button.setAttribute("aria-label", "Copied"); button.dataset.copied = "true";
      this.statusTarget.textContent = "Copied";
      this.later(() => { button.setAttribute("aria-label", label); delete button.dataset.copied; }, 1600);
    }
    catch { this.statusTarget.textContent = "Clipboard unavailable. Select and copy the text manually."; }
  }
  copy(event) { return this.copied(this.codeTarget.textContent, event.currentTarget); }
  copyInstall(event) { return this.copied(this.installTarget.textContent, event.currentTarget); }
  save(blob, extension) {
    const url = URL.createObjectURL(blob), link = document.createElement("a");
    link.href = url; link.download = `${this.seed.replace(/[^a-z0-9_-]/gi, "-").slice(0, 80) || "blobatar"}.${extension}`;
    document.body.appendChild(link); link.click(); link.remove(); this.later(() => URL.revokeObjectURL(url), 1000);
  }
  exportSvg() { this.save(new window.Blob([renderSVG(this.seed, this.options(), this.pose)], { type: "image/svg+xml" }), "svg"); }
  async exportPng() {
    const url = URL.createObjectURL(new window.Blob([renderSVG(this.seed, { ...this.options(), size: 512 }, this.pose)], { type: "image/svg+xml" }));
    try {
      const image = new window.Image(); image.src = url; await image.decode();
      const canvas = document.createElement("canvas"); canvas.width = canvas.height = 512;
      canvas.getContext("2d").drawImage(image, 0, 0);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("PNG encoding failed"); this.save(blob, "png");
    } catch { this.statusTarget.textContent = "Could not encode the PNG — the SVG still works."; }
    finally { URL.revokeObjectURL(url); }
  }
}
