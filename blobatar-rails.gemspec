require_relative "lib/blobatar/rails/version"

Gem::Specification.new do |spec|
  spec.name = "blobatar-rails"
  spec.version = Blobatar::Rails::VERSION
  spec.authors = ["Hyphen Technologies"]
  spec.summary = "Official blobatar rendering and motion for Rails + Hotwire"
  spec.homepage = "https://github.com/hyphen-tech-co/blobatar-rails"
  spec.license = "MIT"
  spec.required_ruby_version = ">= 3.1"
  spec.files = Dir["{app,config,lib,types}/**/*", "vendor/blobatar/*", "README.md", "LICENSE", "NOTICE", "docs/*.md"].select { |file| File.file?(file) }
  spec.metadata["source_code_uri"] = spec.homepage
  spec.metadata["rubygems_mfa_required"] = "true"
  spec.add_dependency "actionview", ">= 7.1", "< 9"
  spec.add_dependency "importmap-rails", "~> 2.0"
  spec.add_dependency "railties", ">= 7.1", "< 9"
  spec.add_dependency "stimulus-rails", "~> 1.3"
  spec.add_dependency "turbo-rails", ">= 2.0", "< 3"
end
