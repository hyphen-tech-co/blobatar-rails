require "rails/generators"

module Blobatar
  module Generators
    class InstallGenerator < ::Rails::Generators::Base
      def install
        application = "app/javascript/application.js"
        line = 'import { registerBlobatar } from "blobatar-rails"'
        unless File.read(application).include?(line)
          append_to_file application, "\n#{line}\nimport { application as stimulusApplication } from \"controllers/application\"\nregisterBlobatar(stimulusApplication)\n"
        end
        stylesheet = "app/assets/stylesheets/application.css"
        css = ' *= require blobatar'
        if File.exist?(stylesheet) && File.read(stylesheet).include?("*/")
          inject_into_file stylesheet, "#{css}\n", before: " */", unless: css
        else
          say 'Add stylesheet_link_tag "blobatar" to your application layout.', :yellow
        end
        layout = "app/views/layouts/application.html.erb"
        if File.exist?(layout) && !File.read(layout).include?('stylesheet_link_tag "blobatar"')
          inject_into_file layout, "    <%= stylesheet_link_tag \"blobatar\", \"data-turbo-track\": \"reload\" %>\n", before: /[ \t]*<\/head>/
        end
      end
    end
  end
end
