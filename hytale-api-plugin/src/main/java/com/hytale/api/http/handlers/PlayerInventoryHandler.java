package com.hytale.api.http.handlers;

import com.google.gson.Gson;
import com.hytale.api.dto.request.InventoryRequests.ClearInventoryRequest;
import com.hytale.api.dto.request.InventoryRequests.GiveItemRequest;
import com.hytale.api.dto.response.ApiResponses.*;
import com.hytale.api.exception.ApiException;
import com.hytale.api.security.ApiPermissions;
import com.hytale.api.security.ClientIdentity;
import com.hypixel.hytale.server.core.universe.PlayerRef;
import com.hypixel.hytale.server.core.universe.Universe;
import io.netty.handler.codec.http.FullHttpRequest;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.logging.Logger;

/**
 * Handler for player inventory endpoints.
 */
public final class PlayerInventoryHandler {
    private static final Logger LOGGER = Logger.getLogger(PlayerInventoryHandler.class.getName());
    private static final Gson GSON = new Gson();

    // Inventory section IDs from Hytale server
    private static final int SECTION_HOTBAR = -1;
    private static final int SECTION_STORAGE = -2;
    private static final int SECTION_ARMOR = -3;
    private static final int SECTION_UTILITY = -5;
    private static final int SECTION_TOOLS = -8;

    /**
     * Handle GET /players/{uuid}/inventory request.
     * Returns full inventory contents.
     *
     * Note: Full inventory access requires getting the Player entity and its inventory.
     * The exact API depends on how the server exposes inventory data.
     */
    public String handleFullInventory(FullHttpRequest request, ClientIdentity identity, String uuidString) {
        if (!identity.hasPermission(ApiPermissions.PLAYERS_INVENTORY_READ)) {
            throw ApiException.Forbidden.insufficientPermissions(ApiPermissions.PLAYERS_INVENTORY_READ);
        }

        PlayerRef playerRef = getPlayerRef(uuidString);

        // TODO: Access actual inventory when Player entity access is available
        // For now, return empty inventory structure
        List<InventoryResponse.ItemSlot> items = new ArrayList<>();

        InventoryResponse response = new InventoryResponse(
                playerRef.getUuid(),
                playerRef.getUsername(),
                0,
                items
        );

        LOGGER.fine("Inventory read for player %s (by %s)".formatted(
                playerRef.getUsername(), identity.clientId()
        ));

        return GSON.toJson(response);
    }

    /**
     * Handle GET /players/{uuid}/inventory/hotbar request.
     */
    public String handleHotbar(FullHttpRequest request, ClientIdentity identity, String uuidString) {
        if (!identity.hasPermission(ApiPermissions.PLAYERS_INVENTORY_READ)) {
            throw ApiException.Forbidden.insufficientPermissions(ApiPermissions.PLAYERS_INVENTORY_READ);
        }

        PlayerRef playerRef = getPlayerRef(uuidString);

        // TODO: Access actual hotbar when Player entity access is available
        List<HotbarResponse.HotbarSlot> slots = new ArrayList<>();
        for (int i = 0; i < 9; i++) {
            slots.add(new HotbarResponse.HotbarSlot(i, null, 0, null, i == 0));
        }

        HotbarResponse response = new HotbarResponse(
                playerRef.getUuid(),
                playerRef.getUsername(),
                0,
                slots
        );

        return GSON.toJson(response);
    }

    /**
     * Handle GET /players/{uuid}/inventory/armor request.
     */
    public String handleArmor(FullHttpRequest request, ClientIdentity identity, String uuidString) {
        if (!identity.hasPermission(ApiPermissions.PLAYERS_INVENTORY_READ)) {
            throw ApiException.Forbidden.insufficientPermissions(ApiPermissions.PLAYERS_INVENTORY_READ);
        }

        PlayerRef playerRef = getPlayerRef(uuidString);

        // TODO: Access actual armor when Player entity access is available
        ArmorResponse response = new ArmorResponse(
                playerRef.getUuid(),
                playerRef.getUsername(),
                ArmorResponse.ArmorSlot.empty(),
                ArmorResponse.ArmorSlot.empty(),
                ArmorResponse.ArmorSlot.empty(),
                ArmorResponse.ArmorSlot.empty()
        );

        return GSON.toJson(response);
    }

    /**
     * Handle GET /players/{uuid}/inventory/storage request.
     */
    public String handleStorage(FullHttpRequest request, ClientIdentity identity, String uuidString) {
        if (!identity.hasPermission(ApiPermissions.PLAYERS_INVENTORY_READ)) {
            throw ApiException.Forbidden.insufficientPermissions(ApiPermissions.PLAYERS_INVENTORY_READ);
        }

        PlayerRef playerRef = getPlayerRef(uuidString);

        // TODO: Access actual storage when Player entity access is available
        List<InventoryResponse.ItemSlot> items = new ArrayList<>();

        StorageResponse response = new StorageResponse(
                playerRef.getUuid(),
                playerRef.getUsername(),
                36,
                0,
                items
        );

        return GSON.toJson(response);
    }

    /**
     * Handle POST /players/{uuid}/inventory/give request.
     */
    public String handleGiveItem(FullHttpRequest request, ClientIdentity identity, String uuidString) {
        if (!identity.hasPermission(ApiPermissions.PLAYERS_INVENTORY_WRITE)) {
            throw ApiException.Forbidden.insufficientPermissions(ApiPermissions.PLAYERS_INVENTORY_WRITE);
        }

        String body = request.content().toString(StandardCharsets.UTF_8);
        GiveItemRequest giveRequest = GSON.fromJson(body, GiveItemRequest.class);

        if (giveRequest == null || !giveRequest.isValid()) {
            throw ApiException.BadRequest.missingField("itemId and amount");
        }

        PlayerRef playerRef = getPlayerRef(uuidString);

        // TODO: Implement actual item giving when inventory access is available
        LOGGER.info("Give item request: %dx %s to %s (by %s)".formatted(
                giveRequest.amount(),
                giveRequest.itemId(),
                playerRef.getUsername(),
                identity.clientId()
        ));

        return GSON.toJson(SuccessResponse.ok("Give item command sent for %dx %s to %s".formatted(
                giveRequest.amount(),
                giveRequest.itemId(),
                playerRef.getUsername()
        )));
    }

    /**
     * Handle POST /players/{uuid}/inventory/clear request.
     */
    public String handleClearInventory(FullHttpRequest request, ClientIdentity identity, String uuidString) {
        if (!identity.hasPermission(ApiPermissions.PLAYERS_INVENTORY_WRITE)) {
            throw ApiException.Forbidden.insufficientPermissions(ApiPermissions.PLAYERS_INVENTORY_WRITE);
        }

        String body = request.content().toString(StandardCharsets.UTF_8);
        ClearInventoryRequest clearRequest = body.isEmpty()
                ? new ClearInventoryRequest("all")
                : GSON.fromJson(body, ClearInventoryRequest.class);

        if (clearRequest != null && !clearRequest.isValid()) {
            throw ApiException.BadRequest.invalidField("section", "Invalid section. Use: all, hotbar, armor, storage, utility, tools");
        }

        PlayerRef playerRef = getPlayerRef(uuidString);

        String section = clearRequest != null ? clearRequest.section() : "all";
        if (section == null) section = "all";

        // TODO: Implement actual inventory clearing when inventory access is available
        LOGGER.info("Clear inventory request: %s inventory of %s (by %s)".formatted(
                section,
                playerRef.getUsername(),
                identity.clientId()
        ));

        return GSON.toJson(SuccessResponse.ok("Clear inventory command sent for %s inventory of %s".formatted(section, playerRef.getUsername())));
    }

    // Helper methods

    private PlayerRef getPlayerRef(String uuidString) {
        UUID uuid;
        try {
            uuid = UUID.fromString(uuidString);
        } catch (IllegalArgumentException e) {
            throw ApiException.BadRequest.invalidField("uuid", "Invalid UUID format");
        }

        Universe universe = Universe.get();
        PlayerRef playerRef = universe.getPlayer(uuid);

        if (playerRef == null) {
            throw ApiException.NotFound.player(uuidString);
        }

        return playerRef;
    }
}
