# Deploying the demo to Laravel Cloud

The repository's `test/dummy` application is a database-free public demonstration, not a general-purpose production application template. No Node/npm install, JavaScript build, database, cache, bucket or worker is required. The gem and its vendored renderer are loaded from the surrounding repository using a Bundler path dependency.

Follow Laravel Cloud's official [Ruby and Rails guide](https://laravel.com/cloud/docs/deploy-guides/ruby). Select this GitHub repository and set **Root directory** to **test/dummy**. Cloud keeps the parent repository available to the path gem. The selected directory has conventional Rails files and a production Gemfile/lockfile, including the ARM64 Linux platform. Its `.ruby-version` selects Ruby 3.4; Cloud chooses the supported patch release.

Use a branch containing these deployment files. New application imports inspect the repository's default branch, so merge this deployment setup before importing it.

## Environment settings

| Setting | Value |
| --- | --- |
| Build command | `SECRET_KEY_BASE_DUMMY=1 bundle exec ruby bin/rails assets:precompile` |
| Deploy command | Empty; there is no database to prepare |
| Start command | `bundle exec ruby bin/rails server -b :: -p $PORT` |
| Startup/readiness probe | `/up` |
| Runtime | Ruby 3.4, production |

Cloud automatically installs the frozen Ruby bundle using the committed lockfile's Bundler version. Keep its defaults for `RAILS_ENV=production`, `RACK_ENV=production`, `BUNDLE_WITHOUT=development:test` and the generated **SECRET_KEY_BASE**. Keep that secret stable across redeployments; never commit it. Do not add `SECRET_KEY_BASE_DUMMY` as a persistent variable: it is only for the build command.

Server-side SVG rendering is implemented in Ruby. The demo does not install MiniRacer or libv8-node; it has no extra native JavaScript engine to build on Cloud's ARM64 image. CI verifies the frozen production bundle, asset compilation and expression rendering on ARM64 Debian Bookworm (glibc 2.36).

Cloud provides **APP_URL**. The demo allows that hostname, retains Host Authorization and forces HTTPS using the proxy's `X-Forwarded-Proto` header. The Rails health endpoint bypasses host validation and HTTPS redirects so private IPv6 probes work. Runtime logging goes to stdout. If a custom domain is added, ensure APP_URL uses it.

Choose the desired region and compute size before deploying; compute is billed while awake. For this small demo, a single Flex instance with 512 MiB RAM and scale-to-zero is a reasonable starting point, not a benchmarked capacity guarantee. Keep autoscaling and extra infrastructure off unless needed. Scale-to-zero causes cold-start delay.

## Verify the deployment

- Confirm `/up`, `/`, `/editor`, `/components` and `/hotwire` return 200 over HTTPS, including the initial Ruby-rendered previews without JavaScript.
- Verify CSS and all importmap modules return successfully from `/assets/`, without a CDN or npm service.
- Operate shapes, hue, tone multi-select, trait sliders, URL restoration, code/copy and SVG/PNG downloads. On `/components`, test password Show/Hide without submitting anything. On the `/hotwire` usage guide, check section links, code copying, Turbo Stream success/error and Turbo Frame replacement. Check for JavaScript errors and CSP violations.
- Test hover and pointer gaze on a browser reporting a fine pointer. Shared desktop environments can report `hover:none / pointer:none`, which intentionally suppresses these upstream features.

When switching local asset pipelines or returning from production asset compilation, clear precompiled output before starting development:

```sh
cd test/dummy
bundle exec ruby bin/rails assets:clobber
```

For lockfile updates, use Ruby 3.4, run `bundle update` deliberately within `test/dummy`, retain `bundle lock --add-platform aarch64-linux`, and commit its lockfile. Do not update dependencies during deployment.
