require "test_helper"

class DemoTest < ActionDispatch::IntegrationTest
  test "demo serves SSR SVG and only local importmap assets under CSP" do
    get "/"
    assert_response :success
    assert_select "svg", minimum: 40
    assert_select "script[type=importmap]", count: 1
    assert_match "script-src 'self' 'nonce-", response.headers["Content-Security-Policy"]
    assert_no_match(%r{unsafe-inline|unsafe-eval|https://}, response.headers["Content-Security-Policy"])
    imports = JSON.parse(Nokogiri::HTML(response.body).at_css('script[type="importmap"]').text).fetch("imports")
    %w[blobatar-rails blobatar-rails/controller blobatar/blob blobatar/gaze @hotwired/stimulus].each do |key|
      assert imports.fetch(key).start_with?("/assets/"), "missing local #{key}"
    end
  end

  test "Turbo stream updates and frame replacements are server generated" do
    post "/update", params: { status: "success" }, headers: { "Accept" => "text/vnd.turbo-stream.html" }
    assert_response :success
    assert_select 'turbo-stream[action="blobatar_update"][target="agent-avatar"]'
    get "/frame", params: { seed: "new" }
    assert_response :success
    assert_select 'turbo-frame#avatar-frame [data-blobatar-name-value="new"]'
  end
end
