require_relative "renderer/traits"
require_relative "renderer/colors"
require_relative "renderer/paths"
require_relative "renderer/style"
require_relative "renderer/poses"

module Blobatar
  module Rails
    module Renderer
      STYLE = Style.new.freeze

      def self.svg(name, options = {}, expression: :idle)
        options = Options.render(options)
        expression = Options.expression(expression)
        traits = Traits.new(name.to_s, normalize: options.fetch("normalize", true), overrides: options["traits"])
        palette = Colors.palette(options.fetch("hue") { traits.num("hue", 0, 360) }, options.fetch("contrast", true),
                                 options.fetch("tone") { traits.value("tone") })
        palette["bg"] = options["backgroundColor"] if options.key?("backgroundColor")
        palette.merge!(options["palette"]) if options.key?("palette")
        palette = Colors.tinted(palette, expression)

        dimension = options["size"] == options["size"].to_i ? options["size"].to_i : options["size"] if options["size"]
        size = dimension ? %( width="#{dimension}" height="#{dimension}") : ""
        title = options["title"]&.gsub(/[&<>]/, "&" => "&amp;", "<" => "&lt;", ">" => "&gt;")
        inner = String.new(capacity: 256)
        inner << "<title>#{title}</title>" if title && !title.empty?
        if options.fetch("background", false) != false
          path = if options["background"] == "square"
                   "M0 0H100V100H0Z"
                 else
                   Paths.superellipse(cx: 50, cy: 50, rx: 50, ry: 50, n: options["background"] == "circle" ? 2 : 6)
                 end
          inner << %(<path d="#{path}" fill="#{palette.fetch('bg')}"/>)
        end
        layout, wrap = Poses.bake(STYLE.layout(traits), expression)
        body = STYLE.render(layout, palette)
        inner << (wrap ? %(<g transform="#{wrap}">#{body}</g>) : body)
        %(<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"#{size}>#{inner}</svg>)
      end
    end
  end
end
