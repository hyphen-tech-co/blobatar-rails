module Blobatar
  module Rails
    module Streams
      def blobatar_update(target, **values)
        payload = Options.update(values)
        template = @view_context.tag.template(payload.to_json)
        @view_context.tag.turbo_stream(template, action: "blobatar_update", target: target)
      end

      def blobatar_status(target, status)
        blobatar_update(target, status: status)
      end
    end
  end
end
