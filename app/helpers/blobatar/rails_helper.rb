module Blobatar
  module RailsHelper
    def blobatar_tag(name, expression: :idle, animate: false, gaze: false, status: nil, states: nil, **attributes)
      render_options = attributes.extract!(*Blobatar::Rails::Options::RENDER_KEYS.map(&:to_sym), :background_color)
      options = Blobatar::Rails::Options.render(render_options)
      expression = Blobatar::Rails::Options.expression(expression)
      mode = Blobatar::Rails::Options.animate(animate)
      target = Blobatar::Rails::Options.gaze(gaze)
      mapping = (states || Blobatar::Rails.configuration.states).transform_keys(&:to_s).transform_values { |value| Blobatar::Rails::Options.expression(value) }
      if status
        expression = mapping.fetch(status.to_s) { raise ArgumentError, "unknown status: #{status}" }
      end
      data = (attributes.delete(:data) || {}).dup
      data[:controller] = [data[:controller], "blobatar"].compact.join(" ")
      data.merge!(blobatar_name_value: name.to_s, blobatar_options_value: options.to_json,
                  blobatar_expression_value: expression, blobatar_animate_value: mode.to_s,
                  blobatar_gaze_value: { target: target }.to_json, blobatar_states_value: mapping.to_json,
                  blobatar_status_value: status.to_s)
      attributes[:class] = ["blobatar", attributes[:class]].compact.join(" ")
      svg = Blobatar::Rails::Renderer.svg(name, options, expression: expression)
      tag.span(svg.html_safe, **attributes, data: data)
    end
  end
end
