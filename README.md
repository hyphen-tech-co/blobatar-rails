# blobatar-rails

Official blobatar 2.7.0 rendering for Rails + Hotwire, without Node or a JavaScript bundler in the consuming application.

Implementation is in progress. See [the design and upstream research](docs/upstream.md).

```ruby
gem "blobatar-rails"
```

```sh
bin/rails generate blobatar:install
```

```erb
<%= blobatar_tag "agent", size: 96, expression: :thinking, animate: :always %>
```
