package com.hytale.api.dto.request;

import java.util.List;

/**
 * Request DTOs for server management operations.
 */
public final class ServerRequests {
    private ServerRequests() {}

    /**
     * Request to manage whitelist.
     * Actions: "add", "remove", "enable", "disable"
     */
    public record WhitelistRequest(String action, List<String> players) {
        public boolean isValid() {
            if (action == null) return false;
            return switch (action.toLowerCase()) {
                case "enable", "disable" -> true;
                case "add", "remove" -> players != null && !players.isEmpty();
                default -> false;
            };
        }

        public String normalizedAction() {
            return action != null ? action.toLowerCase() : "";
        }
    }

    /**
     * Request to mute a player.
     * Duration in minutes, null for permanent.
     */
    public record MuteRequest(Integer durationMinutes, String reason) {
        public boolean isPermanent() {
            return durationMinutes == null || durationMinutes <= 0;
        }

        public String getReasonOrDefault() {
            return reason != null && !reason.isBlank() ? reason : "Muted by administrator";
        }
    }
}
