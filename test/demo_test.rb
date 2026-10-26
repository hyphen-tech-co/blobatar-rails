require "test_helper"

class DemoTest < ActionDispatch::IntegrationTest
  test "usage guide serves readable code, SSR examples and only local assets under CSP" do
    get "/hotwire"
    assert_response :success
    assert_select "h1", text: "Usage guide"
    assert_select "title", text: "Usage guide · blobatar-rails"
    assert_select 'link[rel=stylesheet][href*="site-"]'
    assert_select 'link[rel=stylesheet][href*="application-"]', count: 0
    assert_select '.guide-toc a[href^="#"]', count: 9
    assert_select ".guide-code pre code", count: 12
    assert_select ".guide-code code", text: %r{bin/rails generate blobatar:install}
    assert_select ".guide-code code", text: /<%= blobatar_tag/
    assert_select ".guide-code code", text: /turbo_stream.blobatar_status/
    assert_select "#agent-avatar svg", count: 1
    assert_select ".expression-grid article", count: 14
    assert_select ".crowd svg", count: 6
    assert_no_match "A little more", response.body
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
