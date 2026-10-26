module Blobatar
  module Rails
    module Renderer
      class Traits
        MASK = 0xffff_ffff

        def initialize(name, normalize:, overrides:)
          seed = normalize ? name.unicode_normalize(:nfc).strip.downcase : name
          @state = feed(1_779_033_703 ^ (seed.encode("UTF-16LE").bytesize / 2), seed.bytes)
          @overrides = overrides || {}
        end

        def value(key)
          sampled = stream(key)
          override = @overrides[key]
          override = override[(sampled * override.length).floor] if override.is_a?(Array) && !override.empty?
          return sampled if override.nil? || override.is_a?(Array)

          override.clamp(0, 0.999999)
        end

        def num(key, from, to)
          from + (value(key) * (to - from))
        end

        def int(key, from, to)
          from + (value(key) * (to - from + 1)).floor
        end

        def jitter(key, amplitude)
          ((value(key) * 2) - 1) * amplitude
        end

        private

        def feed(state, bytes)
          bytes.reduce(state) do |hash, byte|
            hash = ((hash ^ byte) * 3_432_918_353) & MASK
            ((hash << 13) | (hash >> 19)) & MASK
          end
        end

        def stream(key)
          hash = feed(feed(@state, [255]), key.bytes)
          hash = ((hash ^ (hash >> 16)) * 2_246_822_507) & MASK
          hash = ((hash ^ (hash >> 13)) * 3_266_489_909) & MASK
          (hash ^ (hash >> 16)).to_f / 4_294_967_296
        end
      end
    end
  end
end
