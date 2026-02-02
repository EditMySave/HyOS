package com.hytale.api.dto.request;

/**
 * Request DTOs for admin operations.
 */
public final class AdminRequests {
    private AdminRequests() {}

    /**
     * Request to execute a server command.
     */
    public record CommandRequest(String command) {
        public boolean isValid() {
            return command != null && !command.isBlank();
        }
    }

    /**
     * Request to kick a player.
     */
    public record KickRequest(String player, String reason) {
        public boolean isValid() {
            return player != null && !player.isBlank();
        }

        public String effectiveReason() {
            return reason != null ? reason : "Kicked by administrator";
        }
    }

    /**
     * Request to ban a player.
     */
    public record BanRequest(String player, String reason, Long durationMinutes) {
        public boolean isValid() {
            return player != null && !player.isBlank();
        }

        public String effectiveReason() {
            return reason != null ? reason : "Banned by administrator";
        }

        public boolean isPermanent() {
            return durationMinutes == null || durationMinutes <= 0;
        }
    }

    /**
     * Request to broadcast a message.
     */
    public record BroadcastRequest(String message) {
        public boolean isValid() {
            return message != null && !message.isBlank();
        }
    }
}
