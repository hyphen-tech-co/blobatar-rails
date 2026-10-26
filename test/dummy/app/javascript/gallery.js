import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  static targets = ["password", "face", "reveal", "privacy", "status"];
  connect() {
    this.abort = new window.AbortController();
    this.observer = new window.IntersectionObserver((entries) => {
      const current = entries.find((entry) => entry.isIntersecting);
      if (current) for (const link of this.element.querySelectorAll(".showcase-sidebar a")) {
        if (link.hash === `#${current.target.id}`) link.setAttribute("aria-current", "location"); else link.removeAttribute("aria-current");
      }
    }, { rootMargin: "0px 0px -70% 0px" });
    for (const section of this.element.querySelectorAll(".showcase-section")) this.observer.observe(section);
    window.addEventListener("resize", () => this.aim(), { signal: this.abort.signal });
    window.addEventListener("scroll", () => this.aim(), { capture: true, passive: true, signal: this.abort.signal });
    document.addEventListener("turbo:before-cache", () => { this.passwordTarget.value = ""; this.passwordTarget.type = "password"; this.syncReveal(); this.aim(); }, { signal: this.abort.signal });
    this.syncReveal(); this.aim();
  }
  disconnect() { this.abort.abort(); this.observer.disconnect(); clearTimeout(this.timer); }
  agent(event) { for (const button of this.element.querySelectorAll(".agent-list button")) button.setAttribute("aria-pressed", String(button === event.currentTarget)); }
  reveal() { this.passwordTarget.type = this.passwordTarget.type === "password" ? "text" : "password"; this.syncReveal(); this.passwordTarget.focus(); this.aim(); }
  syncReveal() {
    const shown = this.passwordTarget.type === "text";
    this.revealTarget.textContent = shown ? "Hide" : "Show"; this.revealTarget.setAttribute("aria-label", shown ? "Hide password" : "Show password");
    this.revealTarget.setAttribute("aria-pressed", String(shown));
    this.privacyTarget.textContent = shown ? "Not looking. Your password is visible." : "Watching the caret. This demo never submits or stores your input.";
  }
  aim() {
    const input = this.passwordTarget, shown = input.type === "text";
    let target = shown ? "rest" : "pointer";
    if (!shown && document.activeElement === input) {
      const mirror = document.createElement("span"), style = window.getComputedStyle(input), box = input.getBoundingClientRect();
      for (const key of ["fontFamily", "fontSize", "fontWeight", "letterSpacing"]) mirror.style[key] = style[key];
      mirror.style.position = "absolute"; mirror.style.visibility = "hidden"; mirror.style.whiteSpace = "pre";
      mirror.textContent = "•".repeat(input.selectionStart ?? 0); this.element.appendChild(mirror);
      const start = box.left + parseFloat(style.paddingLeft), end = box.right - parseFloat(style.paddingRight);
      target = { x: Math.max(start, Math.min(start + mirror.getBoundingClientRect().width - input.scrollLeft, end)), y: box.top + box.height / 2 }; mirror.remove();
    }
    this.faceTarget.dataset.blobatarExpressionValue = shown ? "sleepy" : "idle";
    this.faceTarget.dataset.blobatarGazeValue = JSON.stringify({ target });
  }
  async copy(event) {
    const button = event.currentTarget;
    try { await window.navigator.clipboard.writeText(button.dataset.copy); button.dataset.copied = "true"; this.statusTarget.textContent = "Copied"; clearTimeout(this.timer); this.timer = setTimeout(() => delete button.dataset.copied, 1600); }
    catch { this.statusTarget.textContent = "Clipboard unavailable. Select the command to copy it."; }
  }
}
