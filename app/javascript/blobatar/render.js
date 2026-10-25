import { blobatar } from "blobatar/blob";
import { _parts } from "blobatar/internal";
import * as poses from "blobatar/expression";
import { expression, animate, options } from "blobatar-rails/validation";

const NS = "http://www.w3.org/2000/svg";

export function renderSVG(name, configuration = {}, pose = "idle") {
  return blobatar(String(name), { ...options(configuration), expression: poses[expression(pose)] });
}

export class Avatar {
  constructor(element) {
    this.element = element;
    this.svg = element.querySelector(":scope > svg") || element.appendChild(element.ownerDocument.createElementNS(NS, "svg"));
    this.svg.setAttribute("xmlns", NS);
    this.svg.setAttribute("viewBox", "0 0 100 100");
    this.root = this.svg.querySelector(":scope > .mo-root");
    this.variables = new Set();
    this.markup = this.root?.innerHTML;
  }

  render(name, configuration, pose, mode) {
    const opts = options(configuration);
    mode = animate(mode);
    const parts = _parts(String(name), { ...opts, expression: poses[expression(pose)], animate: mode || "hover" });
    let geometryChanged = false;
    if (!this.root) {
      this.svg.replaceChildren();
      this.root = this.svg.ownerDocument.createElementNS(NS, "g");
      this.svg.appendChild(this.root);
    }
    if (this.markup !== parts.inner) {
      this.root.innerHTML = parts.inner;
      this.markup = parts.inner;
      geometryChanged = true;
    }
    this.root.setAttribute("class", `${parts.cls}${mode ? "" : " mo-still"}`);
    for (const key of this.variables) if (!(key in parts.vars)) this.svg.style.removeProperty(key);
    for (const [key, value] of Object.entries(parts.vars)) this.svg.style.setProperty(key, value);
    this.variables = new Set(Object.keys(parts.vars));
    let plate = this.svg.querySelector(":scope > path");
    if (parts.bg) {
      if (!plate) { plate = this.svg.ownerDocument.createElementNS(NS, "path"); this.svg.insertBefore(plate, this.root); }
      plate.setAttribute("d", parts.bg.d);
      plate.setAttribute("fill", parts.bg.fill);
    } else plate?.remove();
    for (const dimension of ["width", "height"]) {
      if (opts.size) this.svg.setAttribute(dimension, opts.size);
      else this.svg.removeAttribute(dimension);
    }
    let title = this.svg.querySelector(":scope > title");
    if (opts.title) {
      if (!title) { title = this.svg.ownerDocument.createElementNS(NS, "title"); this.svg.prepend(title); }
      title.textContent = opts.title;
      this.svg.setAttribute("role", "img");
      this.svg.removeAttribute("aria-hidden");
    } else {
      title?.remove(); this.svg.removeAttribute("role"); this.svg.setAttribute("aria-hidden", "true");
    }
    this.element.dataset.blobatarCurrentExpression = pose;
    return geometryChanged;
  }
}
