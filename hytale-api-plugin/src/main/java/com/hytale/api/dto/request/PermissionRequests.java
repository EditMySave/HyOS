package com.hytale.api.dto.request;

import java.util.List;

/**
 * Request DTOs for permission and group operations.
 */
public final class PermissionRequests {
    private PermissionRequests() {}

    /**
     * Request to add or remove an operator (player identifier: UUID or username).
     */
    public record OpRequest(String player) {
        public boolean isValid() {
            return player != null && !player.isBlank();
        }
    }

    /**
     * Request to create a new permission group.
     */
    public record CreateGroupRequest(String name, List<String> permissions) {
        public boolean isValid() {
            return name != null && !name.isBlank();
        }

        public List<String> effectivePermissions() {
            return permissions != null ? permissions : List.of();
        }
    }

    /**
     * Request to update a group's permissions.
     */
    public record UpdateGroupRequest(List<String> permissions) {
        public List<String> effectivePermissions() {
            return permissions != null ? permissions : List.of();
        }
    }
}
