class DemoController < ActionController::Base
  layout "application"

  def index; end

  def update
    payload = params.permit(:expression, :status, :duration, :revert_to).to_h.symbolize_keys
    payload[:duration] = Integer(payload[:duration]) if payload.key?(:duration)
    render turbo_stream: turbo_stream.blobatar_update("agent-avatar", **payload)
  rescue ArgumentError => e
    render plain: e.message, status: :unprocessable_entity
  end

  def frame
    @seed = params.fetch(:seed, "new-agent")
  end

  def other; end
end
