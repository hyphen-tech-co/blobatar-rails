Rails.application.routes.draw do
  root "demo#index"
  post "update", to: "demo#update"
  get "frame", to: "demo#frame"
  get "other", to: "demo#other"
end
