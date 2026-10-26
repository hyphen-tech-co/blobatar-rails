import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  connect() { this.timers = new Set(); }
  disconnect() { this.beforeCache(); }
  beforeCache() {
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
    for (const status of this.element.querySelectorAll(".guide-copy-status")) status.textContent = "";
  }
  async copy(event) {
    const block = event.currentTarget.closest(".guide-code");
    const status = block.querySelector(".guide-copy-status");
    try {
      await window.navigator.clipboard.writeText(block.querySelector("code").textContent);
      status.textContent = "Copied";
    } catch {
      status.textContent = "Copy unavailable. Select the code to copy it manually.";
    }
  }
  update(event) {
    const avatar = document.getElementById(event.currentTarget.dataset.avatar || "expression-avatar");
    avatar.dispatchEvent(new CustomEvent("blobatar:update", { detail: JSON.parse(event.currentTarget.dataset.update) }));
  }
  expression(event) { this.send({ expression: event.target.value }); }
  mode(event) { this.send({ animate: event.target.value === "false" ? false : event.target.value }); }
  send(payload) { document.getElementById("expression-avatar").dispatchEvent(new CustomEvent("blobatar:update", { detail: payload })); }
  async request(payload) {
    const response = await fetch("/update", { method: "POST", headers: { "Content-Type": "application/json", "Accept": "text/vnd.turbo-stream.html", "X-CSRF-Token": document.querySelector('meta[name="csrf-token"]').content }, body: JSON.stringify(payload) });
    if (!response.ok) throw new Error(`Update failed: ${response.status}`);
    window.Turbo.renderStreamMessage(await response.text());
  }
  async scenario(event) {
    const outcome = event.currentTarget.dataset.outcome;
    await this.request({ status: "loading" });
    document.getElementById("agent-status").textContent = "Processing…";
    const timer = setTimeout(async () => {
      this.timers.delete(timer);
      await this.request({ status: outcome });
      await this.request({ expression: outcome === "success" ? "love" : "scared", duration: 1200 });
      document.getElementById("agent-status").textContent = outcome === "success" ? "Completed successfully" : "Could not complete the request";
    }, 800);
    this.timers.add(timer);
  }
}
