import { expression, has, update } from "blobatar-rails/validation";

export class AvatarState {
  constructor({ pose = "idle", status = "", states = {}, render, timers = globalThis }) {
    this.states = this.validateStates(states);
    this.base = expression(pose);
    this.status = "";
    this.render = render;
    this.timers = timers;
    this.generation = 0;
    if (status) this.setStatus(status);
    this.current = this.base;
  }

  validateStates(states) {
    if (!states || typeof states !== "object" || Array.isArray(states)) throw new TypeError("Invalid states map");
    for (const pose of Object.values(states)) expression(pose);
    return { ...states };
  }

  setStatus(status) {
    if (!has(this.states, status)) throw new TypeError(`Unknown status: ${status}`);
    this.base = expression(this.states[status]);
    this.status = status;
  }

  apply(payload) {
    const value = update(payload);
    if (has(value, "status") && !has(this.states, value.status)) throw new TypeError("Unknown status");
    if (!has(value, "status") && !has(value, "expression")) return;
    this.cancel();
    if (has(value, "duration")) {
      const generation = this.generation;
      this.current = value.expression;
      this.timer = this.timers.setTimeout(() => {
        if (generation !== this.generation) return;
        this.timer = null;
        if (has(value, "revert_to")) { this.base = value.revert_to; this.status = ""; }
        this.current = this.base;
        this.render(this.current);
      }, value.duration);
    } else {
      if (has(value, "status")) this.setStatus(value.status);
      else { this.base = value.expression; this.status = ""; }
      this.current = this.base;
    }
    this.render(this.current);
  }

  cancel() {
    this.generation += 1;
    if (this.timer != null) this.timers.clearTimeout(this.timer);
    this.timer = null;
  }

  stop() { this.cancel(); this.current = this.base; }
}
