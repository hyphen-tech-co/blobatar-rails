require "test_helper"

class SiteTest < ActionDispatch::IntegrationTest
  test "landing page is local SSR under CSP without a wall" do
    get "/"
    assert_response :success
    assert_select "h1", text: "blobatar-rails"
    assert_select "title", text: "blobatar-rails / Rails + Hotwire"
    assert_select "#studio-preview svg[role=img]", count: 1
    assert_select "#hero-options button[data-shape]", count: 11
    assert_select "button[data-hue]", count: 9
    assert_select "button[data-background]", count: 4
    assert_select "#all-expressions button[data-expression]", count: 14
    assert_select ".chat-message", count: 5
    assert_select "[data-controller*=wall], #wall, form", count: 0
    assert_no_match(%r{unsafe-inline|unsafe-eval|https://}, response.headers["Content-Security-Policy"])
  end

  test "query state is rendered before JavaScript, including multiple shapes and tones" do
    traits = { "shape" => [0.11, 0.965], "tone" => [0.1, 0.965], "eye.gap" => 0.82 }
    get "/editor", params: { name: "Unicode ΟΣ", traits: traits.to_json, motion: "none" }
    assert_response :success
    assert_select "#studio-preview[data-blobatar-animate-value=false]"
    assert_select "[data-shape=round][aria-pressed=true]"
    assert_select "[data-shape=sun][aria-pressed=true]"
    assert_select "[data-tone=pastel][aria-pressed=true]"
    assert_select "[data-tone=ink][aria-pressed=true]"
    svg = Nokogiri::HTML.fragment(response.body).at_css("#studio-preview svg")
    expected = Nokogiri::XML(Blobatar::Rails::Renderer.svg("Unicode ΟΣ", { traits: traits })).at_css("svg")
    assert_equal(expected.css("path").map { |path| path["d"] }, svg.css("path").map { |path| path["d"] })
  end

  test "SVG endpoint is independent of JavaScript and rejects invalid options" do
    options = { traits: { shape: 0.965, tone: 0.965 }, hue: 12 }
    get "/avatar", params: { name: "alain00", options: options.to_json, expression: "happy" }
    assert_response :success
    assert_equal "image/svg+xml", response.media_type
    assert_equal Blobatar::Rails::Renderer.svg("alain00", options, expression: "happy"), response.body
    get "/avatar", params: { options: '{"title":"<script>"}', expression: "unknown" }
    assert_response :unprocessable_entity
    get "/editor", params: { traits: '{"shape":"bad"}' }
    assert_response :unprocessable_entity
  end

  test "component examples and the usage guide still serve" do
    get "/components"
    assert_response :success
    assert_select ".showcase-section", count: 5
    %w[presence-avatar agent-list user-table password-field group-chat].each { |id| assert_select "##{id}" }
    assert_select "#demo-password[type=password]"
    get "/hotwire"
    assert_response :success
    assert_select "#agent-avatar svg", count: 1
    assert_select ".expression-grid article", count: 14
  end

  test "editor serves a Ruby-rendered preview and all named shape controls without JavaScript" do
    get "/editor"
    assert_response :success
    assert_select "#editor-name[value='alain00']"
    assert_select "#studio-preview svg", count: 1
    %w[round organic boxy capsule nub cloud droplet hexagon sun triangle].each do |shape|
      assert_select "button[data-shape='#{shape}']"
    end
    %w[pastel pale mid deep bright ink].each { |tone| assert_select "button[data-tone='#{tone}']" }
  end
end
