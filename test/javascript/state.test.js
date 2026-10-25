import "./loader.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { AvatarState } from "../../app/javascript/blobatar/state.js";

function fixture() {
  const callbacks = new Map(); let id = 0;
  const timers = { setTimeout: (callback) => { callbacks.set(++id, callback); return id; }, clearTimeout: (key) => callbacks.delete(key) };
  const rendered = [];
  const machine = new AvatarState({ states: { loading: "thinking", success: "happy", error: "sad" }, render: (pose) => rendered.push(pose), timers });
  return { machine, callbacks, rendered, tick: () => { const tasks = [...callbacks.values()]; callbacks.clear(); tasks.forEach((callback) => callback()); } };
}

test("a reaction temporarily wins, then restores the underlying status", () => {
  const f = fixture();
  f.machine.apply({ status: "loading" });
  f.machine.apply({ expression: "love", duration: 1500 });
  assert.equal(f.machine.current, "love"); assert.equal(f.machine.status, "loading");
  f.tick(); assert.equal(f.machine.current, "thinking");
});
test("new state and newer reaction cancel stale timer callbacks", () => {
  const f = fixture();
  f.machine.apply({ expression: "love", duration: 10, revert_to: "idle" });
  const stale = [...f.callbacks.values()][0];
  f.machine.apply({ status: "success" }); stale();
  assert.equal(f.machine.current, "happy"); assert.equal(f.callbacks.size, 0);
  f.machine.apply({ expression: "surprised", duration: 10 });
  f.machine.apply({ expression: "wink", duration: 10 }); f.tick();
  assert.equal(f.machine.current, "happy");
});
test("explicit revert changes the base; disconnect cancels reaction", () => {
  const f = fixture();
  f.machine.apply({ status: "success" });
  f.machine.apply({ expression: "mad", duration: 0, revert_to: "sleepy" }); f.tick();
  assert.equal(f.machine.current, "sleepy"); assert.equal(f.machine.status, "");
  f.machine.apply({ expression: "love", duration: 10 }); f.machine.stop();
  assert.equal(f.callbacks.size, 0); assert.equal(f.machine.current, "sleepy");
});
test("bad updates do not cancel a valid reaction or change state", () => {
  const f = fixture(); f.machine.apply({ expression: "love", duration: 10 });
  for (const payload of [{ status: "unknown" }, { expression: "unknown" }, { expression: "happy", duration: -1 }, { status: "success", expression: "happy" }]) assert.throws(() => f.machine.apply(payload));
  assert.equal(f.machine.current, "love"); assert.equal(f.callbacks.size, 1);
});
