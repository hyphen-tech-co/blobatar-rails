require "test_helper"

class StreamsTest < ActionView::TestCase
  include Turbo::StreamsHelper

  def turbo_stream
    view.turbo_stream
  end

  test "update uses escaped inert JSON, never HTML from the payload" do
    html = turbo_stream.blobatar_update("agent", expression: :happy, duration: 1500, revert_to: :idle)
    stream = Nokogiri::HTML.fragment(html).at_css("turbo-stream")
    assert_equal "blobatar_update", stream["action"]
    assert_equal "agent", stream["target"]
    assert_equal({ "expression" => "happy", "duration" => 1500, "revert_to" => "idle" }, JSON.parse(stream.at_css("template").text))
    hostile = turbo_stream.blobatar_update("agent", options: { title: "</template><script>alert(1)</script>" })
    assert_empty Nokogiri::HTML.fragment(hostile).css("script")
  end

  test "status remains distinct from expression" do
    assert_equal({ "status" => "success" }, JSON.parse(Nokogiri::HTML.fragment(turbo_stream.blobatar_status("agent", :success)).at_css("template").text))
    [{ expression: :fake }, { expression: :happy, status: :success }, { duration: 1 },
     { expression: :happy, duration: -1 }, { revert_to: :idle }, { status: "" }].each do |values|
      assert_raises(ArgumentError) { turbo_stream.blobatar_update("agent", **values) }
    end
  end

  test "per-avatar state names are passed to client-side validation" do
    assert_includes turbo_stream.blobatar_status("agent", :custom_state), "custom_state"
  end
end
