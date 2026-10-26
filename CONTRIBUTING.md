# Development

Ruby 3.4, Bundler, Node 22 and npm are development tools only. Consumers need no Node/npm or JavaScript build tools.

Upstream itself defaults to Bun. This independent adapter uses Node's native ESM loader/test runner to test the same importmap modules without bundling them; Bun is not a consumer dependency either.

```sh
bundle install
npm install
npx playwright install chromium
bundle exec rake test
bundle exec rubocop
npm test
npm run lint
npm run typecheck
npm run test:browser
```

TypeScript checks the public declaration contract and its usage fixture; implementation is JavaScript verified by the JS/browser suites. Start the demo with `(cd test/dummy && bundle install && bundle exec ruby bin/rails server)`; it needs no database/auth/CDN. Its own Gemfile/lockfile is separate from the root development bundle. See [deployment.md](docs/deployment.md) for public demo hosting, not an application template.

## Compatibility matrix

```sh
BUNDLE_GEMFILE=gemfiles/rails71.gemfile ASSET_PIPELINE=sprockets bundle install
BUNDLE_GEMFILE=gemfiles/rails71.gemfile ASSET_PIPELINE=sprockets bundle exec rake test
```

Repeat for rails72, rails80, rails81 and propshaft/sprockets. Precompile from `test/dummy` with an absolute BUNDLE_GEMFILE, RAILS_ENV=production and SECRET_KEY_BASE_DUMMY=1 (asset compilation only). Run `assets:clobber` before returning to development to avoid serving stale precompiled assets. The development and demo Gemfiles pin json < 3 because tested Rails encoders use the removed `quirks_mode` option. This is not an extra runtime dependency restriction imposed by the gem.

## Updating upstream

1. Review the official release/source and adapter seam in [upstream.md](docs/upstream.md).
2. Deliberately update pins in npm, vendor script, Ruby version constant, documentation and notice.
3. Run `npm install` and `npm run vendor`; review checksums/license and commit generated assets.
4. Run existing goldens before replacing them. Explain deterministic output changes.
5. Deliberately regenerate byte fixtures with `node script/fixtures.mjs --write` and visual snapshots with `npm run test:browser -- --update-snapshots` on Linux Chromium only after reviewing differences.
6. Run both pipelines and the matrix. Never accept a version bump just because regeneration passed.

Byte fixtures are generated independently from the pinned npm renderer, not the Ruby renderer under test. Browser tests compare 14 static poses with that official renderer in a separate document: pixelmatch threshold 0.1, zero non-antialiased different pixels. Baked path rounding and CSS transforms produce tiny rasterization differences, so raw PNG byte equality is not required. Stored Linux Chromium snapshots independently detect regressions.

Lifecycle tests verify timer/driver cancellation and listener-count stability across repeated Turbo visits and detached controllers. This bounded test does not prove that browser heap growth is impossible. Static/hover lists avoid unnecessary continuously running loops.

PRs are the release gate. Do not publish gems or create release tags without approval.
