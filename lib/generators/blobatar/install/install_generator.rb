require "rails/generators"

module Blobatar
  module Generators
    class InstallGenerator < ::Rails::Generators::Base
      def install
        application = "app/javascript/application.js"
        line = 'import { registerBlobatar } from "blobatar-rails"'
        unless File.read(File.join(destination_root, application)).include?(line)
          append_to_file application,
                         "\n#{line}\nimport { application as stimulusApplication } from \"controllers/application\"\nregisterBlobatar(stimulusApplication)\n"
        end
        layout = "app/views/layouts/application.html.erb"
        layout_path = File.join(destination_root, layout)
        return unless File.exist?(layout_path) && !File.read(layout_path).include?('stylesheet_link_tag "blobatar"')

        inject_into_file layout, "    <%= stylesheet_link_tag \"blobatar\", \"data-turbo-track\": \"reload\" %>\n", before: %r{[ \t]*</head>}
      end
    end
  end
end
