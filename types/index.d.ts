declare module "blobatar-rails" {
  import type { Application, Controller } from "@hotwired/stimulus";
  export type Expression = "idle" | "happy" | "sad" | "mad" | "surprised" | "wink" | "sleepy" | "smug" | "unsure" | "scared" | "love" | "shy" | "sick" | "thinking";
  export type AnimationMode = false | "hover" | "always";
  export type GazeTarget = false | null | "pointer" | "rest" | string | Element | { x: number; y: number };
  export interface Options {
    size?: number;
    background?: boolean | "circle" | "square" | "squircle";
    backgroundColor?: string;
    background_color?: string;
    hue?: number;
    tone?: number;
    traits?: Record<string, number | [number, number]>;
    palette?: { bg?: string; head?: string; eye?: string };
    normalize?: boolean;
    contrast?: boolean;
    title?: string;
  }
  export interface Update {
    expression?: Expression;
    status?: string;
    duration?: number;
    revert_to?: Expression;
    animate?: AnimationMode;
    gaze?: GazeTarget;
    options?: Options;
  }
  export class BlobatarController extends Controller { applyUpdate(payload: Update): void; }
  export function registerBlobatar(application: Application, turbo?: { StreamActions: Record<string, unknown> }): void;
}
