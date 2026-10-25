require "test_helper"

class RendererTest < ActiveSupport::TestCase
  test "server output exactly equals fixed official npm SVG fixtures" do
    JSON.parse(File.read(File.expand_path("fixtures/official.json", __dir__))).each do |fixture|
      assert_equal fixture.fetch("svg"), Blobatar::Rails::Renderer.svg(fixture.fetch("name"), fixture.fetch("options"), expression: fixture.fetch("expression"))
    end
  end

  test "shared V8 renderer supports concurrent callers" do
    expected = Blobatar::Rails::Renderer.svg("concurrent", { size: 64 })
    threads = 8.times.map { Thread.new { 10.times.map { Blobatar::Rails::Renderer.svg("concurrent", { size: 64 }) } } }
    assert(threads.flat_map(&:value).all? { |value| value == expected })
  end
end
