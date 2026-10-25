# Upstream research and architecture

Investigated 2026-10-25 using the npm **2.7.0 tarball**, its included sources, the [official docs](https://blobatar.dev/docs), [LLM spec](https://blobatar.dev/llms.txt), and [upstream](https://github.com/Alain00/blobatar). GitHub main already describes 2.8.0; it is NOT the published npm release (2.8.0 returned 404). Online documentation can describe newer features than our pin.

## Verified seams

- [`blobatar/blob`](https://unpkg.com/blobatar@2.7.0/src/blob.ts) exports `blobatar(name, options)` and numeric `layout`. It is the dependency-free string renderer. `animate` does not make this function emit motion markup.
- [`blobatar/internal`](https://unpkg.com/blobatar@2.7.0/src/internal.ts) exports `_parts`, `_layout`, `_marks`, `_posed`, `serializeVars`, `fadeHex`, `lerpPose`, `poseTransforms`. It is an adapter-only contract, not general public API: additions in minors, removals/changes in majors, lockstep with official adapters. We pin the entire release and test its invariants rather than trusting the underscore.
- [`_parts`](https://unpkg.com/blobatar@2.7.0/src/blobatar.ts) returns `{cls, bg: {d, fill} | undefined, inner, vars}`. With animate enabled, `inner` is invariant across expressions. CSS custom properties on the SVG and a class on its direct child root morph without replacing descendants.
- [`blobatar/expression`](https://unpkg.com/blobatar@2.7.0/src/expression.ts) exports all 14 requested poses. Each is an object `{p, vars, bake, tint?}`, NOT a string. `p` is numeric pose data; `vars(p)` emits custom properties; `bake(layout,p)` applies static geometry. The adapter translates validated names to these objects.
- [`motion.css`](https://unpkg.com/blobatar@2.7.0/dist/motion.css) owns seeded breathing (2.8s), bob (3.4s), blink, saccades, expression-specific shake/rock and custom-property morphs (~300ms entering, ~400ms leaving). `gaze.css` composes gaze with expression and damps idle saccades with `--mo-track-hold`. Both are shipped unchanged inside our generated stylesheet.
- [`gaze(svg, options)`](https://unpkg.com/blobatar@2.7.0/src/gaze.ts) returns `{lookAt(target), remeasure(), stop()}`; options include `target`, `settle`, `snap`. Targets are `"pointer"`, `"rest"`, `Element`, client `{x,y}`, or `null`. `null` releases idle saccades, `rest` suppresses them. `stop()` tears down listeners, observers, rAF and custom properties. Travel is a CSS length (default upstream zero); our adapter opts in at 3px viewBox travel. The driver watches reduced motion and fine-pointer media queries.
- Published dist entrypoints are self-contained ESM bundles, with **no relative or external imports** in the four files we ship. Importmap pins bare names to local pipeline assets, so fingerprinting cannot break chunk imports. No CDN, React or Vue runtime is required.
- [`render.ts`](https://unpkg.com/blobatar@2.7.0/src/render.ts) defines size, background, palette, hue, tone, traits, normalize=true, contrast=true, title, expression. The blob style defaults to background=false; true requests the default backdrop shape. **backgroundColor exists only in unpublished 2.8.0**; our background_color/backgroundColor alias maps to palette.bg (explicit palette.bg wins), with the same contrast-guarantee bypass as palette overrides.

## Decision

| Approach | Fidelity | Maintenance / costs |
| --- | --- | --- |
| Port hash, geometry, palettes and poses to Ruby | Requires cross-language Unicode and floating point parity | Two implementations, substantial drift risk |
| Browser-only official renderer | Exact official rendering | No server-side SVG, blank until JS starts |
| **Vendor official ESM/CSS + build the same renderer for embedded V8** | **Exact upstream SVG and motion; server rendering** | **Chosen.** MiniRacer/libv8-node are native dependencies, but the consumer does not need Node/npm or a running JS service. |

The Ruby renderer serializes validated arguments via MiniRacer#call; it never evaluates user input. A mutex protects the bounded, lazily initialized V8 context; PID changes recreate it for pre-fork servers. No names are inserted into SVG; titles are escaped by upstream; colors are constrained before invoking upstream's raw attribute serializer. Ruby returns static SVG even without JS. Stimulus upgrades once to stable motion geometry; static mode disables animation rather than running zero-amplitude loops. Only geometry configuration changes rebuild the inner group.

Upstream MIT redistribution requires copyright and permission text: retained in vendor/blobatar/LICENSE and the gem. The generated V8 bundle also contains upstream code. `script/vendor.mjs` records SHA-256 of exact shipped npm files. Version changes must explicitly update the pin, regenerate, compare fixed SVG fixtures and visual comparisons, then review this seam again.
