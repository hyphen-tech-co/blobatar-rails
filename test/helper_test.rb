require "test_helper"

class HelperTest < ActionView::TestCase
  include Blobatar::RailsHelper

  test "SSR includes safe SVG and serialized values, preserving caller attributes" do
    html = blobatar_tag("日本語😀<script>", id: "avatar", size: 96, title: '<img onerror="alert(1)">',
                                        background_color: "#abc", expression: :happy, animate: :always,
                                        data: { controller: "other", custom: "yes" }, aria: { label: "Person" })
    doc = Nokogiri::HTML.fragment(html)
    assert_equal "other blobatar", doc.at_css("span")["data-controller"]
    assert_equal "96", doc.at_css("svg")["width"]
    assert_equal "img", doc.at_css("svg")["role"]
    assert_equal '<img onerror="alert(1)">', doc.at_css("title").text
    assert_empty doc.css("script, img")
    assert_equal "happy", doc.at_css("span")["data-blobatar-expression-value"]
    assert_equal "#abc", JSON.parse(doc.at_css("span")["data-blobatar-options-value"])["backgroundColor"]
    assert_equal "Person", doc.at_css("span")["aria-label"]
  end

  test "defaults are static and decorative" do
    doc = Nokogiri::HTML.fragment(blobatar_tag("agent"))
    assert_equal "false", doc.at_css("span")["data-blobatar-animate-value"]
    assert_equal "true", doc.at_css("svg")["aria-hidden"]
  end

  test "state mapping can be configured globally or per avatar" do
    old = Blobatar::Rails.configuration.states
    Blobatar::Rails.configure { |config| config.states = { completed: :love } }
    assert_includes blobatar_tag("x", status: :completed), 'data-blobatar-expression-value="love"'
    assert_includes blobatar_tag("x", status: :ready, states: { ready: :smug }), 'data-blobatar-expression-value="smug"'
  ensure
    Blobatar::Rails.configuration.states = old
  end

  test "invalid configuration and unsafe input are rejected" do
    [{ expression: :fake }, { animate: true }, { background: :fake }, { size: -1 },
     { hue: Float::NAN }, { palette: { head: 'red" onload="alert(1)' } },
     { background_color: "url(https://evil.test)" }, { normalize: "false" },
     { gaze: { x: 1 } }, { traits: { shape: "bad" } }, { status: :unknown }].each do |options|
      assert_raises(ArgumentError) { blobatar_tag("x", **options) }
    end
    assert_raises(ArgumentError) { Blobatar::Rails::Options.render(unknown: 1) }
  end

  test "all expressions and options render deterministically" do
    Blobatar::Rails::Options::EXPRESSIONS.each do |expression|
      value = Blobatar::Rails::Renderer.svg("é\u{1f600}", { background: false, traits: { shape: [0.1, 0.95] }, tone: 0.8, contrast: false },
                                            expression: expression)
      assert_match(/\A<svg /, value)
      assert_equal value,
                   Blobatar::Rails::Renderer.svg("é\u{1f600}", { background: false, traits: { shape: [0.1, 0.95] }, tone: 0.8, contrast: false },
                                                 expression: expression)
    end
  end
end
