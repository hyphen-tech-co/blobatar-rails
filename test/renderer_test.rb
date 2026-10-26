require "test_helper"
require "open3"

class RendererTest < ActiveSupport::TestCase
  test "server output exactly equals fixed official npm SVG fixtures" do
    JSON.parse(File.read(File.expand_path("fixtures/official.json", __dir__))).each do |fixture|
      assert_equal fixture.fetch("svg"), Blobatar::Rails::Renderer.svg(fixture.fetch("name"), fixture.fetch("options"), expression: fixture.fetch("expression"))
    end
  end

  test "SVG rendering needs only Ruby, without installed gems or a JavaScript runtime" do
    svg, error, status = Open3.capture3(
      { "RUBYOPT" => nil, "RUBYLIB" => nil }, RbConfig.ruby, "--disable-gems", "-I#{File.expand_path('../lib', __dir__)}",
      "-rblobatar/rails/options", "-rblobatar/rails/renderer",
      "-e", 'print Blobatar::Rails::Renderer.svg("alice@example.com")'
    )
    assert status.success?, error
    fixture = JSON.parse(File.read(File.expand_path("fixtures/official.json", __dir__))).first
    assert_equal fixture.fetch("svg"), svg
  end

  test "renderer supports concurrent callers" do
    expected = Blobatar::Rails::Renderer.svg("concurrent", { size: 64 })
    threads = 8.times.map { Thread.new { 10.times.map { Blobatar::Rails::Renderer.svg("concurrent", { size: 64 }) } } }
    assert(threads.flat_map(&:value).all? { |value| value == expected })
  end
end
