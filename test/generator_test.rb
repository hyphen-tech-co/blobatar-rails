require "test_helper"
require "rails/generators/test_case"
require "generators/blobatar/install/install_generator"

class GeneratorTest < Rails::Generators::TestCase
  tests Blobatar::Generators::InstallGenerator
  destination File.expand_path("dummy/tmp/generator", __dir__)
  setup do
    prepare_destination
    FileUtils.mkdir_p File.join(destination_root, "app/javascript")
    FileUtils.mkdir_p File.join(destination_root, "app/views/layouts")
    File.write File.join(destination_root, "app/javascript/application.js"), 'import "@hotwired/turbo-rails"'
    File.write File.join(destination_root, "app/views/layouts/application.html.erb"), "<html><head>\n</head></html>"
  end

  test "installer is idempotent and does not shell out to npm" do
    2.times { run_generator }
    assert_file "app/javascript/application.js" do |content|
      assert_equal 1, content.scan("registerBlobatar(stimulusApplication)").length
      assert_no_match(/npm|npx|yarn/, content)
    end
    assert_file "app/views/layouts/application.html.erb" do |content|
      assert_equal 1, content.scan('stylesheet_link_tag "blobatar"').length
    end
  end
end
