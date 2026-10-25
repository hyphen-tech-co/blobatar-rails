import { Controller } from "@hotwired/stimulus";
import { gaze } from "blobatar/gaze";
import { Avatar } from "blobatar-rails/render";
import { AvatarState } from "blobatar-rails/state";
import { animate, expression, gazeTarget, has, options, update } from "blobatar-rails/validation";

export default class extends Controller {
  static values = {
    name: String, options: { type: Object, default: {} },
    expression: { type: String, default: "idle" }, animate: { type: String, default: "false" },
    gaze: { type: Object, default: { target: false } }, states: { type: Object, default: {} },
    status: { type: String, default: "" }, reaction: Object
  };

  connect() {
    this.guard(() => {
      this.avatar = new Avatar(this.element);
      this.configuration = options(this.optionsValue);
      this.mode = animate(this.animateValue);
      this.target = gazeTarget(this.gazeValue.target, this.element.ownerDocument);
      this.machine = new AvatarState({ pose: this.expressionValue, status: this.statusValue, states: this.statesValue, render: () => this.paint() });
      this.seenExpression = this.expressionValue;
      this.seenStatus = this.statusValue;
      this.onUpdate = (event) => this.guard(() => this.applyUpdate(event.detail));
      this.onCache = () => this.suspend();
      this.onLoad = () => { if (!this.active) this.resume(); };
      this.element.addEventListener("blobatar:update", this.onUpdate);
      document.addEventListener("turbo:before-cache", this.onCache);
      document.addEventListener("turbo:load", this.onLoad);
      this.active = true;
      this.paint();
      if (this.hasReactionValue) this.applyUpdate(this.reactionValue);
    });
  }

  disconnect() {
    this.suspend();
    this.element.removeEventListener("blobatar:update", this.onUpdate);
    document.removeEventListener("turbo:before-cache", this.onCache);
    document.removeEventListener("turbo:load", this.onLoad);
  }

  suspend() {
    this.active = false;
    this.machine?.stop();
    this.driver?.stop(); this.driver = null;
    if (this.machine && this.avatar) this.avatar.render(this.nameValue, this.configuration, this.machine.base, false);
  }

  resume() { this.active = true; this.paint(); }

  paint() {
    if (!this.active) return;
    const changed = this.avatar.render(this.nameValue, this.configuration, this.machine.current, this.mode);
    if (changed) { this.driver?.stop(); this.driver = null; }
    this.syncGaze();
    this.seenExpression = this.machine.base;
    this.seenStatus = this.machine.status;
    this.expressionValue = this.machine.base;
    this.statusValue = this.machine.status;
    this.dispatch("change", { detail: { expression: this.machine.current, status: this.machine.status } });
  }

  syncGaze() {
    if (!this.mode || !this.target) { this.driver?.stop(); this.driver = null; return; }
    this.avatar.svg.style.setProperty("--mo-track-travel", "3px");
    if (!this.driver) this.driver = gaze(this.avatar.svg, { target: this.target });
    else this.driver.lookAt(this.target);
  }

  applyUpdate(payload) {
    const value = update(payload);
    if (has(value, "status") && !has(this.machine.states, value.status)) throw new TypeError("Unknown status");
    const target = has(value, "gaze") ? gazeTarget(value.gaze, this.element.ownerDocument) : this.target;
    const configuration = has(value, "options") ? options({ ...this.configuration, ...value.options }) : this.configuration;
    if (has(value, "animate")) { this.mode = value.animate; this.animateValue = String(this.mode); }
    if (has(value, "options")) { this.configuration = configuration; this.optionsValue = configuration; }
    if (has(value, "gaze")) { this.target = target; this.gazeValue = { target: value.gaze }; }
    this.machine.apply(value);
    this.paint();
  }

  nameValueChanged() { if (this.active) this.guard(() => this.paint()); }
  optionsValueChanged() { if (this.active) this.guard(() => { this.configuration = options(this.optionsValue); this.paint(); }); }
  animateValueChanged() { if (this.active) this.guard(() => { this.mode = animate(this.animateValue); this.paint(); }); }
  gazeValueChanged() { if (this.active) this.guard(() => { this.target = gazeTarget(this.gazeValue.target, this.element.ownerDocument); this.syncGaze(); }); }
  expressionValueChanged(value) {
    if (this.active && value !== this.seenExpression) this.guard(() => this.machine.apply({ expression: expression(value) }));
  }
  statusValueChanged(value) {
    if (this.active && value !== this.seenStatus) this.guard(() => this.machine.apply(value ? { status: value } : { expression: this.expressionValue }));
  }
  statesValueChanged() {
    if (this.active) this.guard(() => {
      const states = this.machine.validateStates(this.statesValue);
      if (this.machine.status && !has(states, this.machine.status)) throw new TypeError("Current status is missing from new map");
      this.machine.states = states;
      if (this.machine.status) this.machine.apply({ status: this.machine.status });
    });
  }
  reactionValueChanged(value) { if (this.active) this.guard(() => this.applyUpdate(value)); }
  guard(callback) { try { callback(); } catch (error) { this.dispatch("error", { detail: { error } }); } }
}
