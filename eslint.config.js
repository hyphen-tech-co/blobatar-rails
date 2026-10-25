import js from "@eslint/js";

export default [
  { ignores: ["app/javascript/blobatar/vendor/**", "vendor/**", "node_modules/**", "test/dummy/public/**", "playwright-report/**", "test-results/**"] },
  js.configs.recommended,
  {
    files: ["**/*.js", "**/*.mjs"],
    languageOptions: { globals: Object.fromEntries(["console", "window", "document", "globalThis", "CustomEvent", "EventTarget", "URL", "setTimeout", "clearTimeout", "process", "fetch", "requestAnimationFrame", "cancelAnimationFrame", "getComputedStyle"].map((name) => [name, "readonly"])) },
    rules: { "no-unused-vars": ["error", { argsIgnorePattern: "^_" }] }
  }
];
