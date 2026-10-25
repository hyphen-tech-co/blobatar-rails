import { Application } from "@hotwired/stimulus";
import { registerBlobatar, type Update } from "blobatar-rails";

registerBlobatar(Application.start());
const updates: Update[] = [{ expression: "thinking" }, { status: "success" }, { expression: "happy", duration: 1500, revert_to: "idle" }, { gaze: { x: 1, y: 2 }, options: { traits: { shape: [0.1, 0.9] }, palette: { bg: "#abc" } } }];
void updates;
// @ts-expect-error Unknown expressions must fail type checking.
const invalid: Update = { expression: "missing" };
void invalid;
