class SiteController < ActionController::Base
  layout "application"
  before_action :configure_studio, only: %i[index editor]

  def index; end
  def editor; end
  def components; end

  def avatar
    options = Blobatar::Rails::Options.render(JSON.parse(params.fetch(:options, "{}")))
    svg = Blobatar::Rails::Renderer.svg(params.fetch(:name, "alain00"), options,
                                        expression: params.fetch(:expression, "idle"))
    response.headers["X-Content-Type-Options"] = "nosniff"
    send_data svg, type: "image/svg+xml", disposition: "inline"
  rescue JSON::ParserError, ArgumentError, TypeError
    render plain: "Invalid avatar options", status: :unprocessable_entity
  end

  private

  def configure_studio
    @name = params.fetch(:name, "alain00").to_s
    @pinned = Blobatar::Rails::Options.render("traits" => JSON.parse(params.fetch(:traits, "{}"))).fetch("traits")
    @pinned["shape"] = SiteHelper::SHAPES.fetch(params[:shape].to_sym) if params[:shape] && SiteHelper::SHAPES.key?(params[:shape].to_sym)
    @options = { "traits" => @pinned }
    @options["hue"] = Float(params[:hue]) if params[:hue]
    @options["background"] = params[:background] if %w[circle square squircle].include?(params[:background])
    @options = Blobatar::Rails::Options.render(@options)
    @expression = Blobatar::Rails::Options.expression(params.fetch(:expression, "idle"))
    @motion = params.fetch(:motion, "hover")
    @motion = Blobatar::Rails::Options.animate(@motion == "none" ? false : @motion)
    @reader = Blobatar::Rails::Renderer::Traits.new(@name, normalize: true, overrides: @pinned)
  rescue JSON::ParserError, ArgumentError, TypeError
    render plain: "Invalid studio options", status: :unprocessable_entity
  end
end
