require "mini_racer"

module Blobatar
  module Rails
    module Renderer
      MUTEX = Mutex.new

      def self.svg(name, options = {}, expression: :idle)
        options = Options.render(options)
        options["expression"] = Options.expression(expression)
        MUTEX.synchronize do
          if @pid != Process.pid
            @context = MiniRacer::Context.new(timeout: 1000, max_memory: 32 * 1024 * 1024)
            @context.eval(File.read(File.expand_path("../../../vendor/blobatar/renderer.js", __dir__)))
            @pid = Process.pid
          end
          @context.call("BlobatarRenderer.render", name.to_s, options)
        end
      end
    end
  end
end
