# blobatar-rails

Official [blobatar](https://github.com/Alain00/blobatar) **2.7.0** for Rails + Hotwire. Deterministic server-rendered SVG, fourteen expressions, official motion/gaze, Stimulus Values and Turbo Streams. No React, Vue, CDN, Node/npm or JavaScript build step in consuming applications.

## Install from Git

```ruby
# Gemfile — main becomes available after the implementation PR is merged
gem "blobatar-rails",
    git: "git@github.com:hyphen-tech-co/blobatar-rails.git",
    branch: "main"
```

Not yet published to RubyGems. SSH requires GitHub SSH access; HTTPS (`https://github.com/hyphen-tech-co/blobatar-rails.git`) is also possible. Before [the implementation PR](https://github.com/hyphen-tech-co/blobatar-rails/pull/1) is merged, try `branch: "devin/1792945394-blobatar-hotwire"`. Bundler locks the resolved commit; update deliberately with `bundle update blobatar-rails`.

Start with Rails using **importmap-rails, stimulus-rails, turbo-rails** and Propshaft or Sprockets:

```sh
bundle install
bin/rails generate blobatar:install
```

The idempotent installer adds registration to application.js and a stylesheet link to the application layout. Engine pins automatically resolve to bundled local assets. It does not run npm or download JavaScript.

Equivalent manual registration, after Turbo:

```js
import "@hotwired/turbo-rails"
import { application } from "controllers/application"
import { registerBlobatar } from "blobatar-rails"
registerBlobatar(application)
```

```erb
<%= stylesheet_link_tag "blobatar", "data-turbo-track": "reload" %>
```

Keep the normal `javascript_importmap_tags`. With CSP, allow local assets and Rails-generated script nonces for importmap tags, plus style nonces for Turbo's progress bar (`config.content_security_policy_nonce_directives = %w[script-src style-src]` and `csp_meta_tag` in the layout). Upstream styles are applied through CSSOM; no `unsafe-inline` or `unsafe-eval` is required.

## View helper

```erb
<%= blobatar_tag current_user.id, size: 96, expression: :idle, animate: :always %>

<%= blobatar_tag "agent-1", id: "agent-avatar", size: 120,
    expression: :thinking, animate: :always, gaze: :pointer,
    background: :squircle, hue: 210, title: "Your assistant" %>
```

The outer span accepts standard Rails HTML attributes (`id`, `class`, `data`, `aria`, etc.) and can share other Stimulus controllers. SVG renders immediately without JavaScript. Identical names/options produce the official SVG, including Japanese, Unicode and emoji. Stimulus upgrades once to stable motion geometry.

| Option | Values / default |
| --- | --- |
| `size` | Width/height in px, 1–4096; omitted by default (set size or CSS) |
| `expression` | `:idle` (default), `:happy`, `:sad`, `:mad`, `:surprised`, `:wink`, `:sleepy`, `:smug`, `:unsure`, `:scared`, `:love`, `:shy`, `:sick`, `:thinking` |
| `animate` | `false` (default), `:hover`, `:always`; `true` is rejected |
| `background` | `false` (default), `true`, `:square`, `:circle`, `:squircle` |
| `background_color` / `backgroundColor` | Alias to `palette.bg`; explicit `palette.bg` wins |
| `palette` | Partial `{ bg:, head:, eye: }` |
| `hue`, `tone`, `traits` | Official numeric options; trait entries are numbers or `[min, max]` |
| `normalize`, `contrast` | Booleans, both default to true upstream |
| `title` | Accessible name escaped as text; otherwise decorative (`aria-hidden`) |
| `gaze` | `false` (default), `:pointer`, `:rest`, selector (`"#target"`, `".target"`, `"[data-target]"`), `{ x: 200, y: 120 }` in client coordinates |
| `status`, `states` | Initial state and optional per-avatar map |

Invalid expressions/modes/sizes/non-finite numbers/unsafe colors raise ArgumentError. Colors accept hex RGB, named colors, numeric rgb/rgba/hsl/hsla, not arbitrary CSS (`url()`, `var()`, declarations). Explicit palette overrides bypass official contrast guarantees. Defaults and trait behavior follow 2.7.0, not unreleased main.

## Motion and gaze

Official breathing, bobbing, blinking, random saccades, expression motion (including thinking) and morph timings are bundled unchanged. Expression changes retain SVG/eye nodes; geometry options may rebuild inner markup. Static mode disables animation/morphing; hover mode pauses loops off-hover. Prefer these modes for large lists.

Explicit gaze suppresses competing idle saccades. `:rest` faces forward; false releases gaze. JavaScript events can also pass an Element. Gaze requires animation and the official fine-pointer media query. Reduced motion disables gaze/CSS animations/transitions. Disconnect and Turbo before-cache stop listeners, observers, frames and timers. Cached previews show the base pose, not a reaction.

## Turbo Streams

```erb
<%= turbo_stream.blobatar_update "agent-avatar", expression: :thinking %>
<%= turbo_stream.blobatar_update "agent-avatar",
    expression: :happy, duration: 1500, revert_to: :idle %>
<%= turbo_stream.blobatar_status "agent-avatar", :success %>
<%= turbo_stream.blobatar_update "agent-avatar",
    options: { hue: 210, background_color: "#eef2e7" }, gaze: "#editor" %>
```

Streams contain inert escaped JSON, not scripts, and target only the existing avatar. Expression/status are mutually exclusive. Options merge at the top level (new palette/traits replace that entire nested object). Use normal `turbo_stream.replace` with blobatar_tag for a new avatar; Turbo Frame replacements naturally reconnect controllers.

## State and reactions

Default map: `idle → idle`, `thinking / loading → thinking`, `success → happy`, `error → sad`, `warning → unsure`.

```ruby
# config/initializers/blobatar.rb
Blobatar::Rails.configure do |config|
  config.states = {
    idle: :idle, processing: :thinking, completed: :happy, failed: :sad
  }
end
```

```erb
<%= blobatar_tag "agent", id: "agent-avatar", status: :processing, animate: :always %>
```

`states: { ready: :smug }` replaces the map just for one avatar. Stream state names are validated against the target's map, so per-avatar custom states work.

1. State/persistent expression sets a **base** pose, canceling any reaction.
2. An expression with `duration` temporarily wins (milliseconds, 0–86,400,000).
3. Timeout restores the base/status unless revert_to explicitly sets a new base and clears status.
4. New state/expression/reaction invalidates earlier timers. Disconnect/cache cancels them; one-shot reactions do not replay on reconnect.

## JavaScript / Stimulus Values

```js
document.getElementById("agent-avatar").dispatchEvent(new CustomEvent("blobatar:update", {
  detail: { expression: "love", duration: 1200 }
}))
```

`data-blobatar-*-value` names: `name` (String), `options` (Object), `expression` (String), `animate` (String: `"false"`, `"hover"`, `"always"`), `gaze` (Object: `{ target: ... }`), `status` (String), `states` (Object), `reaction` (one-shot Object with update payload). Object values use JSON. Base expression/status mirror back to values; `data-blobatar-current-expression` exposes the visible pose. Errors dispatch `blobatar:error` with detail.error; paints dispatch `blobatar:change` with expression/status.

Options/mode/gaze-only updates leave reaction timing intact; set a persistent expression/status to cancel deliberately.

## Demo and tests

```sh
bundle install
(cd test/dummy && bundle exec ruby bin/rails server)
```

From a repository checkout, the demo includes all expressions, animation modes, pointer/element/coordinate gaze, hue/background/traits, Turbo Stream loading → success/error reactions, Turbo Frame replacement and independent avatars. No npm or database is needed to run it. This is a development example, not a production app template.

CI defines Rails **7.1 / 7.2 / 8.0 / 8.1**, Propshaft/Sprockets, and Ruby 3.1/Rails 7.1 minimum checks. Browser/visual tests use Linux Chromium. See [CONTRIBUTING.md](CONTRIBUTING.md) for commands/test boundaries and [docs/upstream.md](docs/upstream.md) for API research and architecture.

Locally verified on Ruby **3.4.12**: Rails **7.1.6 / 7.2.4 / 8.0.5.1 / 8.1.4**, each with Propshaft and Sprockets (Ruby tests and production asset compilation). Full browser suites run on Rails 8.0.5.1 with both pipelines. Other patch versions are not claimed solely because dependency ranges permit them; CI exercises the currently resolved version in each supported minor.

### Known constraints

- Official 2.7.0 is fixed. Unpublished 2.8.0 functionality (including its native backgroundColor option) is not claimed; the stable palette alias supplies background color.
- MiniRacer/libv8-node is native: a supported prebuilt gem or native toolchain is required, but no Node executable/npm packages. Windows, JRuby, TruffleRuby have not been validated.
- Dependency ranges permit Ruby ≥3.1 and Rails ≥7.1,<9; validated combinations are limited to the CI matrix. MiniRacer versions may require newer Ruby; Bundler selects a compatible version.
- Only blob style from 2.7.0 is included. Framework-specific React/Vue hooks and unreleased features are not reimplemented; all fourteen expressions and listed motion/gaze targets are included.
- Firefox/Safari/touch hardware are not in the browser matrix. Older browsers without modern CSS custom-property/transform support cannot be promised full motion fidelity.
- Bounded lifecycle tests verify cleanup/listener stability, not an unbounded heap-leak proof.

## License

MIT. Bundled upstream: Copyright (c) 2026 Alain, MIT; full text in [vendor/blobatar/LICENSE](vendor/blobatar/LICENSE), see [NOTICE](NOTICE). This independent Rails adapter is not an official upstream package. No RubyGems publication or release tag without approval.
