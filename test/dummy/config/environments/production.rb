Rails.application.configure do
  config.eager_load = true
  config.public_file_server.enabled = true
  config.force_ssl = true
  config.ssl_options = { redirect: { exclude: ->(request) { request.path == "/up" } } }
  config.hosts << URI.parse(ENV.fetch("APP_URL")).host if ENV["APP_URL"].present?
  config.host_authorization = { exclude: ->(request) { request.path == "/up" } }
  config.logger = ActiveSupport::TaggedLogging.new(ActiveSupport::Logger.new($stdout))
  config.log_tags = [:request_id]
  config.assets.compile = false if config.assets.respond_to?(:compile)
end
