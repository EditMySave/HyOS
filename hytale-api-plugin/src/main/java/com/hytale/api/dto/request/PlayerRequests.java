package com.hytale.api.dto.request;

/**
 * Request DTOs for player operations.
 */
public final class PlayerRequests {
    private PlayerRequests() {}

    /**
     * Request to teleport a player.
     */
    public record TeleportRequest(
            Double x,
            Double y,
            Double z,
            String world,
            Float yaw,
            Float pitch
    ) {
        public boolean isValid() {
            return (x != null && y != null && z != null) || world != null;
        }

        public boolean hasCoordinates() {
            return x != null && y != null && z != null;
        }

        public boolean hasRotation() {
            return yaw != null && pitch != null;
        }
    }

    /**
     * Request to set a player's game mode.
     */
    public record SetGameModeRequest(String gameMode) {
        public boolean isValid() {
            return gameMode != null && !gameMode.isBlank();
        }
    }

    /**
     * Request to grant a permission to a player.
     */
    public record GrantPermissionRequest(String permission) {
        public boolean isValid() {
            return permission != null && !permission.isBlank();
        }
    }

    /**
     * Request to add a player to a group.
     */
    public record AddToGroupRequest(String group) {
        public boolean isValid() {
            return group != null && !group.isBlank();
        }
    }

    /**
     * Request to send a message to a player.
     */
    public record SendMessageRequest(String message) {
        public boolean isValid() {
            return message != null && !message.isBlank();
        }
    }
}
