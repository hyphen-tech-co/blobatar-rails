source "https://rubygems.org"
gemspec
gem "json", "< 3"
gem "minitest", "~> 5.25"
gem "propshaft", "~> 1.0" if ENV.fetch("ASSET_PIPELINE", "propshaft") == "propshaft"
gem "puma", "~> 6.0"
gem "rails", ENV.fetch("RAILS_VERSION", "~> 8.0.0")
gem "rake", "~> 13.0"
gem "rubocop", "~> 1.75", require: false
gem "sprockets-rails", "~> 3.5" if ENV["ASSET_PIPELINE"] == "sprockets"
