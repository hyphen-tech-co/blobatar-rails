Rails.application.routes.draw do
  get "up", to: "rails/health#show", as: :rails_health_check
  root "site#index"
  get "editor", to: "site#editor"
  get "components", to: "site#components"
  get "avatar", to: "site#avatar", defaults: { format: :svg }
  get "hotwire", to: "demo#index"
  post "update", to: "demo#update"
  get "frame", to: "demo#frame"
  get "other", to: "demo#other"
end
