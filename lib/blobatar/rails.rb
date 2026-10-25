require "blobatar/rails/version"
require "blobatar/rails/options"
require "blobatar/rails/configuration"
require "blobatar/rails/renderer"
require "blobatar/rails/engine"

module Blobatar
  module Rails
    def self.configuration
      @configuration ||= Configuration.new
    end

    def self.configure
      yield configuration
      configuration.validate!
    end
  end
end
