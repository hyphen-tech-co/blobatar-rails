require "rails/engine"
require "importmap-rails"
require "stimulus-rails"
require "turbo-rails"
require "blobatar/rails/streams"

module Blobatar
  module Rails
    class Engine < ::Rails::Engine
      initializer "blobatar.helpers" do
        ActiveSupport.on_load(:action_view) { include Blobatar::RailsHelper }
      end

      initializer "blobatar.assets" do |app|
        app.config.assets.paths << root.join("app/javascript")
        app.config.assets.precompile += %w[blobatar.css blobatar_manifest.js] if app.config.assets.respond_to?(:precompile)
      end

      initializer "blobatar.importmap", before: "importmap" do |app|
        app.config.importmap.paths << root.join("config/importmap.rb")
        app.config.importmap.cache_sweepers << root.join("app/javascript")
      end

      initializer "blobatar.streams" do
        ActiveSupport.on_load(:turbo_streams_tag_builder) { include Blobatar::Rails::Streams }
      end
    end
  end
end
