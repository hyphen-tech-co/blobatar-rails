export const EXPRESSIONS = Object.freeze(["idle", "happy", "sad", "mad", "surprised", "wink", "sleepy", "smug", "unsure", "scared", "love", "shy", "sick", "thinking"]);
const COLORS = /^(?:#[\da-f]{3}(?:[\da-f]{3})?|[a-z]+|(?:rgb|rgba|hsl|hsla)\([\d\s.,%+\-/]+\))$/i;
const KEYS = ["size", "background", "backgroundColor", "hue", "tone", "traits", "palette", "normalize", "contrast", "title"];
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
export const has = own;

export function expression(value) {
  if (!EXPRESSIONS.includes(value)) throw new TypeError("Unknown blobatar expression");
  return value;
}
export function animate(value) {
  if (value === "false") return false;
  if (![false, "hover", "always"].includes(value)) throw new TypeError("Invalid animation mode");
  return value;
}
function number(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new TypeError("Expected a finite number");
}
function color(value) {
  if (typeof value !== "string" || !COLORS.test(value)) throw new TypeError("Unsafe or unsupported color");
}
export function options(value = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("Expected options object");
  const result = { ...value };
  if (own(result, "background_color")) { result.backgroundColor = result.background_color; delete result.background_color; }
  for (const [key, entry] of Object.entries(result)) {
    if (!KEYS.includes(key)) throw new TypeError(`Unknown option: ${key}`);
    switch (key) {
    case "size": number(entry); if (entry < 1 || entry > 4096) throw new TypeError("Invalid size"); break;
    case "hue": case "tone": number(entry); break;
    case "background": if (![true, false, "square", "circle", "squircle"].includes(entry)) throw new TypeError("Invalid background"); break;
    case "backgroundColor": color(entry); break;
    case "palette":
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new TypeError("Invalid palette");
      for (const [slot, fill] of Object.entries(entry)) {
        if (!["bg", "head", "eye"].includes(slot)) throw new TypeError("Unknown palette slot");
        color(fill);
      }
      break;
    case "traits":
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new TypeError("Invalid traits");
      for (const trait of Object.values(entry)) (Array.isArray(trait) ? trait : [trait]).forEach(number);
      break;
    case "normalize": case "contrast": if (typeof entry !== "boolean") throw new TypeError("Expected boolean"); break;
    case "title": result[key] = String(entry); break;
    }
  }
  if (result.backgroundColor) result.palette = { bg: result.backgroundColor, ...result.palette };
  delete result.backgroundColor;
  return result;
}

export function gazeTarget(value, document) {
  if (value == null || value === false) return null;
  if (value === "pointer" || value === "rest") return value;
  if (typeof value === "string") return document.querySelector(value);
  if (value && typeof value.getBoundingClientRect === "function") return value;
  if (value && typeof value === "object" && Object.keys(value).sort().join() === "x,y") {
    number(value.x); number(value.y); return { x: value.x, y: value.y };
  }
  throw new TypeError("Invalid gaze target");
}

export function update(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("Expected update object");
  const result = { ...value };
  for (const key of Object.keys(result)) {
    if (!["expression", "status", "duration", "revert_to", "animate", "gaze", "options"].includes(key)) throw new TypeError(`Unknown update: ${key}`);
  }
  if (own(result, "expression") && own(result, "status")) throw new TypeError("Expression and status are mutually exclusive");
  if (own(result, "expression")) expression(result.expression);
  if (own(result, "revert_to")) expression(result.revert_to);
  if (own(result, "animate")) result.animate = animate(result.animate);
  if (own(result, "options")) result.options = options(result.options);
  if (own(result, "duration")) {
    number(result.duration);
    if (result.duration < 0 || result.duration > 86400000 || !own(result, "expression")) throw new TypeError("Invalid reaction duration");
  } else if (own(result, "revert_to")) throw new TypeError("revert_to requires duration");
  return result;
}
