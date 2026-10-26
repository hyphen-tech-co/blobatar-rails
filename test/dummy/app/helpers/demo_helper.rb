module DemoHelper
  USAGE_CODE = {
    gemfile: <<~RUBY,
      gem "blobatar-rails",
          git: "git@github.com:hyphen-tech-co/blobatar-rails.git",
          branch: "main"
    RUBY
    install: <<~SHELL,
      bundle install
      bin/rails generate blobatar:install
    SHELL
    basic: <<~ERB,
      <%= blobatar_tag "agent-1", size: 96,
          title: "Your assistant" %>
    ERB
    appearance: <<~ERB,
      <%= blobatar_tag "agent-1", size: 96, hue: 12,
          background: :squircle, title: "Your assistant" %>
    ERB
    expression: <<~ERB,
      <%= blobatar_tag "agent-1", size: 128,
          expression: :idle, animate: :always,
          title: "Expression preview" %>
    ERB
    gaze: <<~ERB,
      <%= blobatar_tag "gaze", size: 96, animate: :always,
          gaze: :pointer, title: "Gaze follower" %>
    ERB
    agent: <<~ERB,
      <%= blobatar_tag "agent-avatar", id: "agent-avatar",
          size: 96, status: :idle, animate: :always,
          title: "Agent status" %>
    ERB
    loading: <<~ERB,
      <%= turbo_stream.blobatar_status "agent-avatar", :loading %>
    ERB
    stream: <<~ERB,
      <%= turbo_stream.blobatar_status "agent-avatar", :success %>
      <%= turbo_stream.blobatar_update "agent-avatar",
          expression: :love, duration: 1200 %>
    ERB
    frame: <<~ERB,
      <%= turbo_frame_tag "avatar-frame" do %>
        <%= blobatar_tag "frame-first", id: "frame-avatar",
            size: 96, animate: :hover, title: "Frame avatar" %>
        <%= link_to "Replace frame", frame_path(seed: "frame-next") %>
      <% end %>
    ERB
    list: <<~ERB,
      <% @users.each do |user| %>
        <%= blobatar_tag user.id, size: 40,
            animate: :hover, title: user.name %>
      <% end %>
    ERB
    javascript: <<~JS
      document.getElementById("agent-avatar").dispatchEvent(
        new CustomEvent("blobatar:update", {
          detail: { expression: "love", duration: 1200 }
        })
      )
    JS
  }.freeze

  def usage_code(key)
    USAGE_CODE.fetch(key).strip
  end
end
