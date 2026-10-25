require "test_helper"
require "open3"

class ProductionTest < ActiveSupport::TestCase
  test "production uses its runtime secret, HTTPS and allowed Cloud host with an HTTP health probe" do
    script = <<~RUBY
      require "rack/mock"
      abort "runtime secret ignored" unless Rails.application.secret_key_base == ENV.fetch("SECRET_KEY_BASE")
      request = Rack::MockRequest.new(Rails.application)
      abort "health probe rejected" unless request.get("/up", "HTTP_HOST" => "probe.internal").status == 200
      redirect = request.get("/", "HTTP_HOST" => "demo.laravel.cloud")
      abort "HTTPS redirect missing" unless redirect.status == 301 && redirect["location"] == "https://demo.laravel.cloud/"
      abort "unknown host accepted" unless request.get("/", "HTTP_HOST" => "untrusted.invalid", "HTTPS" => "on").status == 403
    RUBY
    env = {
      "RAILS_ENV" => "production",
      "APP_URL" => "https://demo.laravel.cloud",
      "SECRET_KEY_BASE" => SecureRandom.hex(64),
      "SECRET_KEY_BASE_DUMMY" => nil
    }
    output, status = Open3.capture2e(env, RbConfig.ruby, "-r", File.expand_path("dummy/config/environment", __dir__), "-e", script)
    assert status.success?, output
  end
end
