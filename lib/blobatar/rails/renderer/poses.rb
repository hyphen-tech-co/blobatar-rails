module Blobatar
  module Rails
    module Renderer
      module Poses
        # Only the baked geometry is needed in SSR. Motion-only shake/rock and CSS variables stay in the official browser bundle.
        KEYS = %i[esx esy tilt edy edx esx2 esy2 tilt2 edy2 lock bdy].freeze
        VALUES = {
          "idle" => [1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          "happy" => [1.72, 0.3, 8, -1.5, 1.5, 0.08, 0.05, -16, 0, 1, -2.2],
          "sad" => [0.6, 0.56, 26, 3.6, 1.9, -0.05, -0.07, -7, 0, 1, 2.6],
          "mad" => [1.85, 0.26, -33, 0.4, 0.6, 0, -0.03, 5, 0, 1, 0.8],
          "surprised" => [1.34, 1.2, -6, -1.05, 0.5, 0.05, 0.07, 3, 0, 1, -1.4],
          "wink" => [1.32, 0.76, 5, -0.6, 0.8, 0.26, -0.56, -11, 0, 1, -1.1],
          "sleepy" => [1.14, 0.22, 0, 2.4, 0.3, -0.04, 0.03, 4, 0, 1, 1.2],
          "smug" => [1.3, 0.42, 18, -0.5, 0.5, 0.06, -0.06, -36, 0, 1, -1],
          "unsure" => [0.95, 1.02, 4, -0.2, 0.3, 0.24, -0.44, -18, 0, 1, 0],
          "scared" => [0.78, 0.96, -12, -1.5, -0.8, -0.04, 0.05, 4, 0, 1, -0.6],
          "love" => [0.86, 1.28, -14, -0.5, -0.35, 0.05, 0.06, 6, 0, 1, -1.6],
          "shy" => [0.62, 0.5, 10, 1.4, -0.2, -0.05, -0.04, -8, 0, 1, 0.9],
          "sick" => [1.25, 0.34, 20, 1.8, 0.8, 0.05, -0.05, -6, 0, 1, 1.4],
          "thinking" => [1.15, 0.62, 0, 4.2, 0.4, 0.02, 0.06, 0, -8.4, 1, -0.4]
        }.transform_values { |values| KEYS.zip(values).to_h.freeze }.freeze

        module_function

        def bake(layout, expression)
          pose = VALUES.fetch(expression)
          eyes = layout.fetch(:eyes).each_with_index.map do |eye, index|
            right = index == 1
            eye.merge(
              cx: eye[:cx] + (pose[:edx] * (right ? 1 : -1)),
              cy: eye[:cy] + pose[:edy] + (right ? pose[:edy2] : 0),
              rx: eye[:rx] * (pose[:esx] + (right ? pose[:esx2] : 0)),
              ry: eye[:ry] * (pose[:esy] + (right ? pose[:esy2] : 0)),
              rot: (eye[:rot] * (1 - pose[:lock])) + ((pose[:tilt] + (right ? pose[:tilt2] : 0)) * (right ? 1 : -1))
            )
          end
          shift = pose[:bdy]
          wrap = shift.zero? ? nil : "translate(0 #{format_pose_number(shift)})"
          [layout.merge(eyes: eyes), wrap]
        end

        def format_pose_number(number)
          rounded = ((number * 1000) + 0.5).floor / 1000.0
          rounded == rounded.to_i ? rounded.to_i.to_s : rounded.to_s
        end
      end
    end
  end
end
