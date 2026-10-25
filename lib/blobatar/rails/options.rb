module Blobatar
  module Rails
    module Options
      EXPRESSIONS = %w[idle happy sad mad surprised wink sleepy smug unsure scared love shy sick thinking].freeze
      RENDER_KEYS = %w[size background backgroundColor hue tone traits palette normalize contrast title].freeze
      ALIASES = { "background_color" => "backgroundColor" }.freeze
      COLORS = %r{\A(?:\#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?|[a-zA-Z]+|(?:rgb|rgba|hsl|hsla)\([\d\s.,%+\-/]+\))\z}

      def self.expression(value)
        value = value.to_s
        raise ArgumentError, "unknown expression: #{value}" unless EXPRESSIONS.include?(value)

        value
      end

      def self.animate(value)
        return false if value == false

        value = value.to_s
        raise ArgumentError, "animate must be false, :hover or :always" unless %w[hover always].include?(value)

        value
      end

      def self.number(value, key, min: nil, max: nil)
        raise ArgumentError, "invalid #{key}" unless value.is_a?(Numeric) && value.finite? && (!min || value >= min) && (!max || value <= max)

        value
      end

      def self.color(value)
        raise ArgumentError, "unsafe or unsupported color" unless value.is_a?(String) && COLORS.match?(value)

        value
      end

      def self.render(values)
        result = values.to_h.transform_keys { |key| ALIASES.fetch(key.to_s, key.to_s) }
        unknown = result.keys - RENDER_KEYS
        raise ArgumentError, "unknown options: #{unknown.join(', ')}" unless unknown.empty?

        result.each do |key, value|
          case key
          when "size" then number(value, key, min: 1, max: 4096)
          when "hue", "tone" then number(value, key)
          when "background"
            result[key] = value.to_s if value.is_a?(Symbol)
            raise ArgumentError, "invalid background" unless [true, false, "square", "circle", "squircle"].include?(result[key])
          when "backgroundColor" then color(value)
          when "palette"
            raise ArgumentError, "palette must be a Hash" unless value.is_a?(Hash)

            result[key] = value.transform_keys(&:to_s)
            raise ArgumentError, "unknown palette slot" unless (result[key].keys - %w[bg head eye]).empty?

            result[key].each_value { |entry| color(entry) }
          when "traits"
            raise ArgumentError, "traits must be a Hash" unless value.is_a?(Hash)

            result[key] = value.transform_keys(&:to_s)
            result[key].each_value { |entry| Array(entry).each { |item| number(item, "trait") } }
          when "normalize", "contrast"
            raise ArgumentError, "#{key} must be boolean" unless [true, false].include?(value)
          when "title" then result[key] = value.to_s
          end
        end
        result
      end

      def self.gaze(value)
        return value if value == false || value.nil?
        return value.to_s if %w[pointer rest].include?(value.to_s)
        return value if value.is_a?(String) && value.start_with?("#", ".", "[")
        if value.is_a?(Hash) && value.keys.map(&:to_s).sort == %w[x y]
          return value.transform_keys(&:to_s).transform_values { |coordinate| number(coordinate, "gaze coordinate") }
        end

        raise ArgumentError, "gaze must be :pointer, :rest, a selector, {x:, y:}, or false"
      end

      def self.update(values)
        values = values.to_h.transform_keys(&:to_s)
        unknown = values.keys - %w[expression status duration revert_to animate gaze options]
        raise ArgumentError, "unknown update keys: #{unknown.join(', ')}" unless unknown.empty?
        raise ArgumentError, "expression and status are mutually exclusive" if values.key?("expression") && values.key?("status")

        values["expression"] = expression(values["expression"]) if values.key?("expression")
        values["revert_to"] = expression(values["revert_to"]) if values.key?("revert_to")
        values["animate"] = animate(values["animate"]) if values.key?("animate")
        values["gaze"] = gaze(values["gaze"]) if values.key?("gaze")
        values["options"] = render(values["options"]) if values.key?("options")
        if values.key?("status")
          values["status"] = values["status"].to_s
          raise ArgumentError, "status must not be empty" if values["status"].empty?
        end
        if values.key?("duration")
          number(values["duration"], "duration", min: 0, max: 86_400_000)
          raise ArgumentError, "duration requires expression" unless values.key?("expression")
        elsif values.key?("revert_to")
          raise ArgumentError, "revert_to requires duration"
        end
        values
      end
    end
  end
end
