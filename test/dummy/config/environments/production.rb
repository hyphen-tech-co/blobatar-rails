Rails.application.configure do
  config.eager_load = true
  config.public_file_server.enabled = true
  config.force_ssl = false
  config.assets.compile = false if config.assets.respond_to?(:compile)
end
