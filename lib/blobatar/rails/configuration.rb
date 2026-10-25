module Blobatar
  module Rails
    class Configuration
      attr_accessor :states

      def initialize
        @states = { idle: :idle, thinking: :thinking, loading: :thinking, success: :happy, error: :sad, warning: :unsure }
      end

      def validate!
        raise ArgumentError, "states must be a Hash" unless states.is_a?(Hash)

        states.each_value { |value| Options.expression(value) }
      end
    end
  end
end
