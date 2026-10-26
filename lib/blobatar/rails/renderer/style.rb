module Blobatar
  module Rails
    module Renderer
      class Style
        BANDS = [
          ["round", 0.22, 1], ["organic", 0.48, 0.98], ["boxy", 0.6, 0.86],
          ["capsule", 0.7, 1.02], ["nub", 0.79, 0.88], ["cloud", 0.86, 0.78],
          ["droplet", 0.915, 0.78], ["hexagon", 0.95, 1.05], ["sun", 0.98, 0.7],
          ["triangle", 1, 1.15]
        ].freeze

        def layout(traits)
          shape, _, core = BANDS.find { |_, edge, _| traits.value("shape") < edge } || BANDS.last
          radius = traits.num("body.r", 31, 38) * core
          body = {
            cx: 50 + traits.jitter("body.x", 1.5), cy: 50 + traits.jitter("body.y", 1.5),
            rx: radius, ry: radius * traits.num("body.ratio", 0.92, 1.08),
            n: traits.num("body.n", 1.9, 2.5), rot: 0,
            radii: traits.int("body.pts", 6, 8).times.map { |index| 1 + traits.jitter("body.r#{index}", 0.16) }
          }
          petals = []
          extra = []
          customize(shape, traits, body, petals, extra)
          face = face_region(shape, body)
          { shape: shape, body: body, petals: petals, extra: extra, eyes: fit_eyes(traits, body, face) }
        end

        def render(layout, palette)
          body = layout.fetch(:body)
          head = layout.fetch(:petals).map do |petal|
            %(<circle cx="#{Paths.number(petal[:cx])}" cy="#{Paths.number(petal[:cy])}" r="#{Paths.number(petal[:r])}"/>)
          end.join
          head << layout.fetch(:extra).map { |path| %(<path d="#{path}"/>) }.join
          head << %(<path d="#{body_path(layout.fetch(:shape), body)}"/>)
          eyes = layout.fetch(:eyes).map { |eye| %(<path d="#{Paths.superellipse(**eye)}"/>) }.join
          %(<g fill="#{palette.fetch('head')}">#{head}</g><g fill="#{palette.fetch('eye')}">#{eyes}</g>)
        end

        private

        def customize(shape, traits, body, petals, extra)
          case shape
          when "boxy"
            body[:n] = traits.num("body.n", 3.4, 6)
            body[:rot] = traits.num("body.rot", -20, 20)
          when "capsule"
            body[:ry] *= traits.num("capsule.squat", 0.55, 0.68)
            [-1, 1].each { |sign| petals << { cx: body[:cx] + (sign * (body[:rx] - body[:ry])), cy: body[:cy], r: body[:ry] } }
          when "nub"
            traits.int("nub.n", 1, 2).times do |index|
              angle = traits.num("nub.a#{index}", 0, 2 * Math::PI)
              petals << {
                cx: body[:cx] + (Math.cos(angle) * body[:rx] * 0.88),
                cy: body[:cy] + (Math.sin(angle) * body[:rx] * 0.88),
                r: body[:rx] * traits.num("nub.r#{index}", 0.24, 0.4)
              }
            end
          when "cloud"
            count = traits.int("cloud.n", 4, 6)
            count.times do |index|
              angle = Math::PI + (Math::PI * (index + 0.5) / count)
              petals << {
                cx: body[:cx] + (Math.cos(angle) * body[:rx] * 0.8),
                cy: body[:cy] + (Math.sin(angle) * body[:rx] * 0.5),
                r: body[:rx] * traits.num("cloud.r#{index}", 0.44, 0.62)
              }
            end
          when "droplet"
            body[:cy] += 0.22 * body[:ry]
            body[:n] = 2
            extra << Paths.taper(body, traits.num("droplet.tip", 1.4, 1.65))
          when "hexagon", "triangle"
            body[:sides] = shape == "hexagon" ? 6 : 3
            body[:rot] = traits.num("body.rot", shape == "hexagon" ? -12 : -5, shape == "hexagon" ? 12 : 5)
            body[:round] = traits.num("poly.round", 0.24, 0.5)
          when "sun"
            count = traits.int("sun.n", 6, 9)
            distance = body[:rx] * traits.num("sun.dist", 1, 1.08)
            radius = body[:rx] * traits.num("sun.r", 0.2, 0.26)
            rotation = traits.num("sun.rot", 0, 2 * Math::PI)
            count.times do |index|
              angle = rotation + (2 * Math::PI * index / count)
              petals << { cx: body[:cx] + (Math.cos(angle) * distance), cy: body[:cy] + (Math.sin(angle) * distance), r: radius }
            end
          end
        end

        def face_region(shape, body)
          scale = case shape
                  when "organic", "cloud" then body[:radii].min * 0.95
                  when "capsule" then 0.94
                  when "hexagon" then 0.84
                  end
          return body if scale.nil? && !%w[droplet triangle].include?(shape)

          case shape
          when "droplet" then { cx: body[:cx], cy: body[:cy] + (body[:ry] * 0.05), rx: body[:rx] * 0.88, ry: body[:ry] * 0.88 }
          when "triangle" then { cx: body[:cx], cy: body[:cy] + (body[:ry] * 0.1), rx: body[:rx] * 0.54, ry: body[:ry] * 0.36 }
          else { cx: body[:cx], cy: body[:cy], rx: body[:rx] * scale, ry: body[:ry] * scale }
          end
        end

        def body_path(shape, body)
          case shape
          when "organic", "cloud" then Paths.spline(**body)
          when "capsule" then Paths.box(body)
          when "hexagon", "triangle" then Paths.polygon(**body)
          else Paths.superellipse(**body)
          end
        end

        def fit_eyes(traits, body, face)
          rx = body[:rx]
          original = traits.num("eye.rx", 0.075, 0.105) * rx
          ratio = traits.num("eye.ratio", 1.9, 3.2)
          scale = traits.num("eye.scale", 0.78, 1.24)
          stretch = traits.num("eye.stretch", 0.85, 1.18)
          clearance = traits.num("eye.gap", 0.1, 0.24) * rx
          wide = original * [1, scale].max
          tall = original * ratio * [1, scale * stretch].max
          initial_gap = wide + (rx * 0.03) + clearance
          gaze_x = traits.jitter("gaze.x", 0.09) * face[:rx]
          gaze_y = traits.num("gaze.y", -0.2, 0.08) * face[:ry]
          eye_dy = traits.jitter("eye.dy", 0.04) * face[:ry]
          reach = Math.hypot(wide, tall)
          needed = Math.hypot((gaze_x.abs + initial_gap + reach) / face[:rx],
                              (gaze_y.abs + eye_dy.abs + reach) / face[:ry])
          fit = needed > 0.9 ? 0.9 / needed : 1
          eye_rx = original * fit
          eye_ry = eye_rx * ratio
          gap = initial_gap * fit
          room = (clearance / tall).clamp(0, 1)
          bound = [12, Math.asin(room) * 180 / Math::PI].min
          lean = traits.num("eye.lean", -1, 1) * bound
          lean2 = (lean + traits.jitter("eye.lean2", 3.5)).clamp(-12, 12)
          cx = face[:cx] + (gaze_x * fit)
          cy = face[:cy] + (gaze_y * fit)
          [
            { cx: cx - gap, cy: cy, rx: eye_rx, ry: eye_ry, n: traits.num("eye.n", 3.5, 6), rot: lean },
            { cx: cx + gap, cy: cy + (eye_dy * fit), rx: eye_rx * scale, ry: eye_ry * scale * stretch,
              n: traits.num("eye.n", 3.5, 6), rot: lean2 }
          ]
        end
      end
    end
  end
end
