module Blobatar
  module Rails
    module Renderer
      module Colors
        RAMP = [
          [0.2, 0.86, 0.085], [0.36, 0.9, 0.028], [0.62, 0.73, 0.135],
          [0.8, 0.62, 0.165], [0.93, 0.87, 0.16], [1, 0.34, 0.035]
        ].freeze
        INK = { l: 0.145, c: 0, h: 0 }.freeze
        HOT = {
          "mad" => { h: 27, l: 0.58, pull: 0.6, c: 0.18 },
          "love" => { h: 358, l: 0.72, pull: 0.55, c: 0.16 },
          "shy" => { h: 12, l: 0.84, pull: 0.4, c: 0.1 },
          "sick" => { h: 142, l: 0.66, pull: 0.6, c: 0.13 }
        }.freeze

        module_function

        def palette(hue, contrast, tone)
          _, lightness, chroma = RAMP.find { |edge, _| tone < edge } || RAMP.first
          head = ensure_contrast({ l: lightness, c: chroma, h: hue }, INK, 1.5)
          bg = { l: 0.965, c: 0.01, h: hue }
          eye = head[:l] >= 0.5 ? { l: 0.17, c: 0.02, h: hue } : { l: 0.97, c: 0.012, h: hue }
          if contrast
            head = ensure_contrast(head, bg, 1.25)
            eye = ensure_contrast(eye, head, 4.5)
          end
          { "bg" => to_hex(bg), "head" => to_hex(head), "eye" => to_hex(eye) }
        end

        def tinted(palette, expression)
          target = HOT[expression]
          return palette unless target

          original = from_hex(palette.fetch("head"))
          eye = from_hex(palette.fetch("eye"))
          hot = {
            l: original[:l] + ((target[:l] - original[:l]) * target[:pull]),
            c: [original[:c], target[:c]].max, h: target[:h]
          }
          hot = ensure_contrast(hot, INK, 1.5)
          hot_eye = ensure_contrast(eye, hot, 4.55)
          direction = hot_eye[:l] >= hot[:l] ? 1 : -1
          head_hex = to_hex(hot)

          40.times do
            eye_hex = to_hex(hot_eye)
            minimum = (0..10).map do |step|
              fraction = step / 10.0
              contrast_ratio(from_hex(mix_hex(palette.fetch("eye"), eye_hex, fraction)),
                             from_hex(mix_hex(palette.fetch("head"), head_hex, fraction)))
            end.min
            if minimum >= 4.55
              return palette.merge("head" => mix_hex(palette.fetch("head"), head_hex, target_heat(expression)),
                                   "eye" => mix_hex(palette.fetch("eye"), eye_hex, target_heat(expression)))
            end

            new_lightness = clamp(hot_eye[:l] + (direction * 0.02))
            if new_lightness == hot_eye[:l]
              return palette.merge("head" => mix_hex(palette.fetch("head"), head_hex, target_heat(expression)),
                                   "eye" => mix_hex(palette.fetch("eye"), eye_hex, target_heat(expression)))
            end

            hot_eye = hot_eye.merge(l: new_lightness)
          end

          palette.merge("head" => mix_hex(palette.fetch("head"), head_hex, target_heat(expression)),
                        "eye" => mix_hex(palette.fetch("eye"), to_hex(hot_eye), target_heat(expression)))
        end

        def target_heat(expression)
          { "mad" => 0.62, "love" => 0.6, "shy" => 0.55, "sick" => 0.6 }.fetch(expression)
        end

        def clamp(value)
          value.clamp(0, 1)
        end

        def linear(color)
          angle = color[:h] * Math::PI / 180
          a = color[:c] * Math.cos(angle)
          b = color[:c] * Math.sin(angle)
          light = color[:l] + (0.3963377774 * a) + (0.2158037573 * b)
          mid = color[:l] - (0.1055613458 * a) - (0.0638541728 * b)
          dark = color[:l] - (0.0894841775 * a) - (1.291485548 * b)
          l, m, s = [light, mid, dark].map { |channel| channel * channel * channel }
          [
            (4.0767416621 * l) - (3.3077115913 * m) + (0.2309699292 * s),
            (-1.2684380046 * l) + (2.6097574011 * m) - (0.3413193965 * s),
            (-0.0041960863 * l) - (0.7034186147 * m) + (1.707614701 * s)
          ]
        end

        def resolve(color)
          rgb = linear(color)
          unless rgb.all? { |channel| channel.between?(-0.0001, 1.0001) }
            low = 0
            high = color[:c]
            12.times do
              middle = (low + high) / 2
              if linear(color.merge(c: middle)).all? { |channel| channel.between?(-0.0001, 1.0001) }
                low = middle
              else
                high = middle
              end
            end
            rgb = linear(color.merge(c: low))
          end
          rgb.map { |channel| clamp(channel) }
        end

        def contrast_ratio(left, right)
          luma = ->(color) { resolve(color).zip([0.2126, 0.7152, 0.0722]).sum { |channel, weight| channel * weight } }
          l1 = luma.call(left)
          l2 = luma.call(right)
          ([l1, l2].max + 0.05) / ([l1, l2].min + 0.05)
        end

        def ensure_contrast(foreground, background, minimum)
          return foreground if contrast_ratio(foreground, background) >= minimum

          lean = foreground[:l] >= background[:l] ? 1 : -1
          [lean, -lean].each do |direction|
            probe = foreground.dup
            60.times do
              probe[:l] = clamp(probe[:l] + (direction * 0.02))
              return probe if contrast_ratio(probe, background) >= minimum
              break if [0, 1].include?(probe[:l])
            end
          end
          black = foreground.merge(l: 0, c: 0)
          white = foreground.merge(l: 1, c: 0)
          contrast_ratio(black, background) >= contrast_ratio(white, background) ? black : white
        end

        def to_hex(color)
          channels = resolve(color).map do |channel|
            value = channel <= 0.0031308 ? 12.92 * channel : (1.055 * (channel**(1 / 2.4))) - 0.055
            ((value * 255) + 0.5).floor.to_s(16).rjust(2, "0")
          end
          "##{channels.join}"
        end

        def from_hex(hex)
          numeric = hex[1..].match(/\A[0-9a-fA-F]+/)&.to_s&.to_i(16) || 0
          r, g, b = [(numeric >> 16) & 255, (numeric >> 8) & 255, numeric & 255].map do |channel|
            value = channel / 255.0
            value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055)**2.4
          end
          l = Math.cbrt((0.4122214708 * r) + (0.5363325363 * g) + (0.0514459929 * b))
          m = Math.cbrt((0.2119034982 * r) + (0.6806995451 * g) + (0.1073969566 * b))
          s = Math.cbrt((0.0883024619 * r) + (0.2817188376 * g) + (0.6299787005 * b))
          a = (1.9779984951 * l) - (2.428592205 * m) + (0.4505937099 * s)
          b_axis = (0.0259040371 * l) + (0.7827717662 * m) - (0.808675766 * s)
          { l: (0.2104542553 * l) + (0.793617785 * m) - (0.0040720468 * s),
            c: Math.hypot(a, b_axis), h: Math.atan2(b_axis, a) * 180 / Math::PI }
        end

        def mix_hex(from, to, fraction)
          a, b = [from, to].map { |color| from_hex(color) }
          ax = a[:c] * Math.cos(a[:h] * Math::PI / 180)
          ay = a[:c] * Math.sin(a[:h] * Math::PI / 180)
          bx = b[:c] * Math.cos(b[:h] * Math::PI / 180)
          by = b[:c] * Math.sin(b[:h] * Math::PI / 180)
          x = ax + ((bx - ax) * fraction)
          y = ay + ((by - ay) * fraction)
          to_hex(l: a[:l] + ((b[:l] - a[:l]) * fraction), c: Math.hypot(x, y), h: Math.atan2(y, x) * 180 / Math::PI)
        end
      end
    end
  end
end
