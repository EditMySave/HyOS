package com.hytale.api.dto.request;

/**
 * Request DTOs for inventory operations.
 */
public final class InventoryRequests {
    private InventoryRequests() {}

    /**
     * Request to give an item to a player.
     */
    public record GiveItemRequest(
            String itemId,
            int amount,
            String slot
    ) {
        public boolean isValid() {
            return itemId != null && !itemId.isBlank() && amount > 0;
        }
    }

    /**
     * Request to clear a player's inventory.
     * Section can be: "all", "hotbar", "armor", "storage", or null for all.
     */
    public record ClearInventoryRequest(String section) {
        public boolean isValid() {
            return section == null ||
                    section.equals("all") ||
                    section.equals("hotbar") ||
                    section.equals("armor") ||
                    section.equals("storage") ||
                    section.equals("utility") ||
                    section.equals("tools");
        }
    }
}
