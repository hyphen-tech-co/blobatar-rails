Rails.application.routes.draw do
  get "up", to: "rails/health#show", as: :rails_health_check
  root "demo#index"
  post "update", to: "demo#update"
  get "frame", to: "demo#frame"
  get "other", to: "demo#other"
end
