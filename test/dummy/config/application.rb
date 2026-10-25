require_relative "boot"
require "rails"
require "action_controller/railtie"
require "action_view/railtie"
Bundler.require(*Rails.groups)

module BlobatarDemo
  class Application < Rails::Application
    config.load_defaults Gem::Version.new(Rails.version) >= Gem::Version.new("8.0") ? 8.0 : 7.1
    config.eager_load = false
    config.hosts = ["localhost", "127.0.0.1", "www.example.com"]
    config.assets.paths << root.join("app/javascript")
    config.assets.precompile += %w[application.js demo.js application.css] if config.assets.respond_to?(:precompile)
    config.action_controller.allow_forgery_protection = true
    config.content_security_policy do |policy|
      policy.default_src :self
      policy.script_src :self
      policy.style_src :self
      policy.img_src :self
      policy.connect_src :self
      policy.object_src :none
      policy.base_uri :self
    end
    config.content_security_policy_nonce_generator = ->(_request) { SecureRandom.base64(16) }
    config.content_security_policy_nonce_directives = %w[script-src style-src]
  end
end
