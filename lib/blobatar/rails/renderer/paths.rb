module Blobatar
  module Rails
    module Renderer
      module Paths
        module_function

        def number(value)
          rounded = ((value * 100) + 0.5).floor / 100.0
          rounded == rounded.to_i ? rounded.to_i.to_s : rounded.to_s
        end

        def point(horizontal, vertical)
          "#{number(horizontal)} #{number(vertical)}"
        end

        def superellipse(**ellipse)
          cx, cy, rx, ry = ellipse.values_at(:cx, :cy, :rx, :ry)
          n = ellipse.fetch(:n, 4)
          rot = ellipse.fetch(:rot, 0)
          factor = [1, ((8 * (2**(-1.0 / n))) - 4) / 3].min
          x = rx * factor
          y = ry * factor
          points = [[rx, 0], [rx, y], [x, ry], [0, ry], [-x, ry], [-rx, y],
                    [-rx, 0], [-rx, -y], [-x, -ry], [0, -ry], [x, -ry], [rx, -y], [rx, 0]]
          angle = rot * Math::PI / 180
          cosine = Math.cos(angle)
          sine = Math.sin(angle)
          points.map! { |px, py| point(cx + (px * cosine) - (py * sine), cy + (px * sine) + (py * cosine)) }
          "M#{points.first}#{(1..10).step(3).map { |index| "C#{points[index]} #{points[index + 1]} #{points[index + 2]}" }.join}Z"
        end

        def spline(**body)
          cx, cy, rx, ry, radii = body.values_at(:cx, :cy, :rx, :ry, :radii)
          rot = body.fetch(:rot, 0)
          count = radii.length
          angle = rot * Math::PI / 180
          vertices = radii.each_with_index.map do |radius, index|
            theta = angle + (2 * Math::PI * index / count)
            [cx + (rx * radius * Math.cos(theta)), cy + (ry * radius * Math.sin(theta))]
          end
          path = "M#{point(*vertices.first)}"
          count.times do |index|
            x0, y0 = vertices[(index - 1) % count]
            x1, y1 = vertices[index]
            x2, y2 = vertices[(index + 1) % count]
            x3, y3 = vertices[(index + 2) % count]
            path << "C#{point(x1 + ((x2 - x0) / 6), y1 + ((y2 - y0) / 6))} "
            path << "#{point(x2 - ((x3 - x1) / 6), y2 - ((y3 - y1) / 6))} #{point(x2, y2)}"
          end
          path << "Z"
        end

        def polygon(**body)
          cx, cy, rx, ry, sides = body.values_at(:cx, :cy, :rx, :ry, :sides)
          round = body.fetch(:round, 0.3)
          rot = body.fetch(:rot, 0)
          cut = round.positive? ? [round / 2, 0.5].min : 0
          start = (rot * Math::PI / 180) - (Math::PI / 2)
          vertices = sides.times.map do |index|
            angle = start + (2 * Math::PI * index / sides)
            [cx + (rx * Math.cos(angle)), cy + (ry * Math.sin(angle))]
          end
          trimmed = lambda do |from, to|
            x0, y0 = vertices[from % sides]
            x1, y1 = vertices[to % sides]
            point(x0 + ((x1 - x0) * cut), y0 + ((y1 - y0) * cut))
          end
          path = "M#{trimmed.call(0, -1)}"
          sides.times do |index|
            path << "Q#{point(*vertices[index])} #{trimmed.call(index, index + 1)}"
            path << "L#{trimmed.call(index + 1, index)}" if cut < 0.5
          end
          path << "Z"
        end

        def box(body)
          left = number(body[:cx] - (body[:rx] - body[:ry]))
          right = number(body[:cx] + (body[:rx] - body[:ry]))
          "M#{left} #{number(body[:cy] - body[:ry])}H#{right}V#{number(body[:cy] + body[:ry])}H#{left}Z"
        end

        def taper(body, tip)
          cx, cy, rx, ry = body.values_at(:cx, :cy, :rx, :ry)
          height = [1.05, tip].max
          tangent_x = rx * Math.sqrt(1 - (1 / (height * height)))
          tangent_y = cy - (ry / height)
          apex = cy - (height * ry)
          eased_x = tangent_x * 0.14
          eased_y = tangent_y + (0.86 * (apex - tangent_y))
          "M#{point(cx - tangent_x, tangent_y)}L#{point(cx - eased_x, eased_y)}" \
            "Q#{point(cx, apex)} #{point(cx + eased_x, eased_y)}L#{point(cx + tangent_x, tangent_y)}Z"
        end
      end
    end
  end
end
