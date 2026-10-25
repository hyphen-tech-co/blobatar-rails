import { registerHooks } from "node:module";
registerHooks({
  resolve(specifier, context, nextResolve) {
    const modules = { "blobatar-rails/validation": "validation", "blobatar-rails/state": "state", "blobatar-rails/render": "render", "blobatar-rails/controller": "controller" };
    if (modules[specifier]) return { url: new URL(`../../app/javascript/blobatar/${modules[specifier]}.js`, import.meta.url).href, shortCircuit: true };
    return nextResolve(specifier, context);
  }
});
