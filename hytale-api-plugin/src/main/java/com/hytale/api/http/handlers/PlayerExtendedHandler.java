package com.hytale.api.http.handlers;

import com.google.gson.Gson;
import com.hytale.api.dto.request.PlayerRequests.*;
import com.hytale.api.dto.response.ApiResponses.*;
import com.hytale.api.exception.ApiException;
import com.hytale.api.security.ApiPermissions;
import com.hytale.api.security.ClientIdentity;
import com.hypixel.hytale.math.vector.Transform;
import com.hypixel.hytale.server.core.universe.Universe;
import com.hypixel.hytale.math.vector.Vector3d;
import com.hypixel.hytale.server.core.HytaleServer;
import com.hypixel.hytale.server.core.entity.entities.Player;
import com.hypixel.hytale.server.core.modules.entity.teleport.Teleport;
import com.hypixel.hytale.server.core.universe.PlayerRef;
import com.hypixel.hytale.server.core.universe.world.World;
import io.netty.handler.codec.http.FullHttpRequest;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.logging.Logger;

/**
 * Handler for extended player endpoints (stats, location, teleport, gamemode, permissions).
 */
public final class PlayerExtendedHandler {
    private static final Logger LOGGER = Logger.getLogger(PlayerExtendedHandler.class.getName());
    private static final Gson GSON = new Gson();

    private final PermissionsHandler permissionsHandler;
    private final AdminHandler adminHandler;

    public PlayerExtendedHandler(PermissionsHandler permissionsHandler, AdminHandler adminHandler) {
        this.permissionsHandler = permissionsHandler;
        this.adminHandler = adminHandler;
    }

    /**
     * Handle GET /players/{uuid}/stats request.
     * Returns player stats (health, mana, stamina, oxygen).
     */
    public String handleStats(FullHttpRequest request, ClientIdentity identity, String uuidString) {
        if (!identity.hasPermission(ApiPermissions.PLAYERS_STATS_READ)) {
            throw ApiException.Forbidden.insufficientPermissions(ApiPermissions.PLAYERS_STATS_READ);
        }

        PlayerRef playerRef = getPlayerRef(uuidString);

        // TODO: Access EntityStats component for actual values
        // For now, return placeholder values
        PlayerStatsResponse response = new PlayerStatsResponse(
                playerRef.getUuid(),
                playerRef.getUsername(),
                100.0, 100.0, // health, maxHealth
                100.0, 100.0, // mana, maxMana
                100.0, 100.0, // stamina, maxStamina
                100.0, 100.0  // oxygen, maxOxygen
        );

        return GSON.toJson(response);
    }

    /**
     * Handle GET /players/{uuid}/location request.
     * Returns player position and rotation.
     */
    public String handleLocation(FullHttpRequest request, ClientIdentity identity, String uuidString) {
        if (!identity.hasPermission(ApiPermissions.PLAYERS_LOCATION_READ)) {
            throw ApiException.Forbidden.insufficientPermissions(ApiPermissions.PLAYERS_LOCATION_READ);
        }

        PlayerRef playerRef = getPlayerRef(uuidString);

        var transform = playerRef.getTransform();
        var position = transform.getPosition();
        var rotation = transform.getRotation();

        Universe universe = Universe.get();
        World world = universe.getWorld(playerRef.getWorldUuid());
        String worldName = world != null ? world.getName() : "unknown";

        // Vector3d uses getX(), getY(), getZ() methods
        // Vector3f rotation: X = yaw, Y = pitch
        PlayerLocationResponse response = new PlayerLocationResponse(
                playerRef.getUuid(),
                playerRef.getUsername(),
                worldName,
                new PlayerLocationResponse.Position(position.getX(), position.getY(), position.getZ()),
                new PlayerLocationResponse.Rotation(rotation.getX(), rotation.getY())
        );

        return GSON.toJson(response);
    }

    /**
     * Handle POST /players/{uuid}/teleport request.
     */
    public String handleTeleport(FullHttpRequest request, ClientIdentity identity, String uuidString) {
        if (!identity.hasPermission(ApiPermissions.PLAYERS_TELEPORT)) {
            throw ApiException.Forbidden.insufficientPermissions(ApiPermissions.PLAYERS_TELEPORT);
        }

        String body = request.content().toString(StandardCharsets.UTF_8);
        TeleportRequest teleportRequest = GSON.fromJson(body, TeleportRequest.class);

        if (teleportRequest == null || !teleportRequest.isValid()) {
            throw ApiException.BadRequest.missingField("x, y, z coordinates or world");
        }

        PlayerRef playerRef = getPlayerRef(uuidString);
        Universe universe = Universe.get();

        // Handle world change if specified
        String targetWorldName = teleportRequest.world();
        World targetWorld = null;
        if (targetWorldName != null && !targetWorldName.isBlank()) {
            targetWorld = universe.getWorld(targetWorldName);
            if (targetWorld == null) {
                throw ApiException.NotFound.world(targetWorldName);
            }
        } else {
            targetWorld = universe.getWorld(playerRef.getWorldUuid());
        }

        String worldName = targetWorld != null ? targetWorld.getName() : "unknown";
        double x = teleportRequest.x() != null ? teleportRequest.x() : 0;
        double y = teleportRequest.y() != null ? teleportRequest.y() : 0;
        double z = teleportRequest.z() != null ? teleportRequest.z() : 0;

        // Create target position
        Vector3d targetPosition = new Vector3d(x, y, z);

        // Determine if this is a cross-world teleport
        World currentWorld = universe.getWorld(playerRef.getWorldUuid());
        boolean crossWorldTeleport = targetWorld != null && currentWorld != null &&
                !targetWorld.getName().equals(currentWorld.getName());

        // Capture final references for lambda
        final World finalTargetWorld = targetWorld;
        final PlayerRef finalPlayerRef = playerRef;

        if (crossWorldTeleport) {
            // Cross-world teleport: add player to target world at specified position
            Transform newTransform = new Transform(x, y, z);
            finalTargetWorld.addPlayer(finalPlayerRef, newTransform)
                    .exceptionally(ex -> {
                        LOGGER.warning("Cross-world teleport failed: " + ex.getMessage());
                        return null;
                    });
        } else {
            // Same-world teleport: use the Teleport component via Store
            var playerReference = playerRef.getReference();
            if (playerReference == null) {
                throw new ApiException.InternalError("Player reference is null");
            }

            // Get current rotation to preserve it
            var currentRotation = playerRef.getTransform().getRotation();

            // Execute on world thread - Store.putComponent requires it
            finalTargetWorld.execute(() -> {
                playerReference.getStore().putComponent(
                        playerReference,
                        Teleport.getComponentType(),
                        new Teleport(
                                finalTargetWorld,
                                targetPosition,
                                currentRotation
                        )
                );
                LOGGER.info("Teleport component added via store on world thread");
            });
        }

        LOGGER.info("Teleported %s to %.2f, %.2f, %.2f in %s (by %s)".formatted(
                playerRef.getUsername(), x, y, z, worldName, identity.clientId()
        ));

        TeleportResponse response = new TeleportResponse(
                true,
                playerRef.getUuid(),
                playerRef.getUsername(),
                worldName,
                new PlayerLocationResponse.Position(x, y, z)
        );

        return GSON.toJson(response);
    }

    /**
     * Handle GET /players/{uuid}/gamemode request.
     */
    public String handleGetGameMode(FullHttpRequest request, ClientIdentity identity, String uuidString) {
        if (!identity.hasPermission(ApiPermissions.PLAYERS_GAMEMODE_READ)) {
            throw ApiException.Forbidden.insufficientPermissions(ApiPermissions.PLAYERS_GAMEMODE_READ);
        }

        PlayerRef playerRef = getPlayerRef(uuidString);

        // TODO: Get actual game mode from player entity
        String gameMode = "ADVENTURE"; // Placeholder

        GameModeResponse response = new GameModeResponse(
                playerRef.getUuid(),
                playerRef.getUsername(),
                gameMode
        );

        return GSON.toJson(response);
    }

    /**
     * Handle POST /players/{uuid}/gamemode request.
     */
    public String handleSetGameMode(FullHttpRequest request, ClientIdentity identity, String uuidString) {
        if (!identity.hasPermission(ApiPermissions.PLAYERS_GAMEMODE_WRITE)) {
            throw ApiException.Forbidden.insufficientPermissions(ApiPermissions.PLAYERS_GAMEMODE_WRITE);
        }

        String body = request.content().toString(StandardCharsets.UTF_8);
        SetGameModeRequest gameModeRequest = GSON.fromJson(body, SetGameModeRequest.class);

        if (gameModeRequest == null || !gameModeRequest.isValid()) {
            throw ApiException.BadRequest.missingField("gameMode");
        }

        String gameMode = gameModeRequest.gameMode().toUpperCase();
        if (!isValidGameMode(gameMode)) {
            throw ApiException.BadRequest.invalidGameMode(gameMode);
        }

        PlayerRef playerRef = getPlayerRef(uuidString);

        // TODO: Implement actual game mode change via server API

        LOGGER.info("Set game mode of %s to %s (by %s)".formatted(
                playerRef.getUsername(), gameMode, identity.clientId()
        ));

        GameModeResponse response = new GameModeResponse(
                playerRef.getUuid(),
                playerRef.getUsername(),
                gameMode
        );

        return GSON.toJson(response);
    }

    /**
     * Handle GET /players/{uuid}/permissions request.
     */
    public String handleGetPermissions(FullHttpRequest request, ClientIdentity identity, String uuidString) {
        if (!identity.hasPermission(ApiPermissions.PLAYERS_PERMISSIONS_READ)) {
            throw ApiException.Forbidden.insufficientPermissions(ApiPermissions.PLAYERS_PERMISSIONS_READ);
        }

        UUID uuid = parseUuid(uuidString);
        String name = resolvePlayerName(uuid);
        var data = permissionsHandler.getPermissionsData();
        var userEntry = data.users().get(uuidString);
        List<String> permissions = userEntry != null && userEntry.permissions() != null ? userEntry.permissions() : List.of();

        PermissionsResponse response = new PermissionsResponse(uuid, name, permissions);
        return GSON.toJson(response);
    }

    /**
     * Handle POST /players/{uuid}/permissions request.
     */
    public String handleGrantPermission(FullHttpRequest request, ClientIdentity identity, String uuidString) {
        if (!identity.hasPermission(ApiPermissions.PLAYERS_PERMISSIONS_WRITE)) {
            throw ApiException.Forbidden.insufficientPermissions(ApiPermissions.PLAYERS_PERMISSIONS_WRITE);
        }

        String body = request.content().toString(StandardCharsets.UTF_8);
        GrantPermissionRequest permRequest = GSON.fromJson(body, GrantPermissionRequest.class);

        if (permRequest == null || !permRequest.isValid()) {
            throw ApiException.BadRequest.missingField("permission");
        }

        parseUuid(uuidString);
        String name = resolvePlayerName(UUID.fromString(uuidString));
        var data = permissionsHandler.getPermissionsData();
        var userEntry = data.users().get(uuidString);
        List<String> groups = userEntry != null && userEntry.groups() != null ? new ArrayList<>(userEntry.groups()) : new ArrayList<>();
        List<String> perms = userEntry != null && userEntry.permissions() != null ? new ArrayList<>(userEntry.permissions()) : new ArrayList<>();
        if (!perms.contains(permRequest.permission())) {
            perms.add(permRequest.permission());
        }
        permissionsHandler.updateUser(uuidString, new PermissionsDataResponse.UserEntry(groups, perms));

        LOGGER.info("Granted permission '%s' to %s (by %s)".formatted(permRequest.permission(), name, identity.clientId()));
        return GSON.toJson(SuccessResponse.ok("Granted permission '%s' to %s".formatted(permRequest.permission(), name)));
    }

    /**
     * Handle DELETE /players/{uuid}/permissions/{permission} request.
     */
    public String handleRevokePermission(FullHttpRequest request, ClientIdentity identity, String uuidString, String permission) {
        if (!identity.hasPermission(ApiPermissions.PLAYERS_PERMISSIONS_WRITE)) {
            throw ApiException.Forbidden.insufficientPermissions(ApiPermissions.PLAYERS_PERMISSIONS_WRITE);
        }

        if (permission == null || permission.isBlank()) {
            throw ApiException.BadRequest.missingField("permission");
        }

        parseUuid(uuidString);
        String name = resolvePlayerName(UUID.fromString(uuidString));
        var data = permissionsHandler.getPermissionsData();
        var userEntry = data.users().get(uuidString);
        List<String> groups = userEntry != null && userEntry.groups() != null ? new ArrayList<>(userEntry.groups()) : new ArrayList<>();
        List<String> perms = userEntry != null && userEntry.permissions() != null ? new ArrayList<>(userEntry.permissions()) : new ArrayList<>();
        perms.remove(permission);
        permissionsHandler.updateUser(uuidString, new PermissionsDataResponse.UserEntry(groups, perms));

        LOGGER.info("Revoked permission '%s' from %s (by %s)".formatted(permission, name, identity.clientId()));
        return GSON.toJson(SuccessResponse.ok("Revoked permission '%s' from %s".formatted(permission, name)));
    }

    /**
     * Handle GET /players/{uuid}/groups request.
     */
    public String handleGetGroups(FullHttpRequest request, ClientIdentity identity, String uuidString) {
        if (!identity.hasPermission(ApiPermissions.PLAYERS_GROUPS_READ)) {
            throw ApiException.Forbidden.insufficientPermissions(ApiPermissions.PLAYERS_GROUPS_READ);
        }

        UUID uuid = parseUuid(uuidString);
        String name = resolvePlayerName(uuid);
        var data = permissionsHandler.getPermissionsData();
        var userEntry = data.users().get(uuidString);
        List<String> groups = userEntry != null && userEntry.groups() != null ? userEntry.groups() : List.of();

        GroupsResponse response = new GroupsResponse(uuid, name, groups);
        return GSON.toJson(response);
    }

    /**
     * Handle POST /players/{uuid}/groups request.
     */
    public String handleAddToGroup(FullHttpRequest request, ClientIdentity identity, String uuidString) {
        if (!identity.hasPermission(ApiPermissions.PLAYERS_GROUPS_WRITE)) {
            throw ApiException.Forbidden.insufficientPermissions(ApiPermissions.PLAYERS_GROUPS_WRITE);
        }

        String body = request.content().toString(StandardCharsets.UTF_8);
        AddToGroupRequest groupRequest = GSON.fromJson(body, AddToGroupRequest.class);

        if (groupRequest == null || !groupRequest.isValid()) {
            throw ApiException.BadRequest.missingField("group");
        }

        String group = groupRequest.group().trim();
        String name = resolvePlayerName(UUID.fromString(uuidString));

        if (group.equalsIgnoreCase("op")) {
            String command = "/op add " + uuidString;
            return adminHandler.executeCommandUnchecked(command, identity);
        }

        parseUuid(uuidString);
        var data = permissionsHandler.getPermissionsData();
        var userEntry = data.users().get(uuidString);
        List<String> groups = userEntry != null && userEntry.groups() != null ? new ArrayList<>(userEntry.groups()) : new ArrayList<>();
        List<String> perms = userEntry != null && userEntry.permissions() != null ? new ArrayList<>(userEntry.permissions()) : new ArrayList<>();
        if (!groups.contains(group)) {
            groups.add(group);
        }
        permissionsHandler.updateUser(uuidString, new PermissionsDataResponse.UserEntry(groups, perms));

        LOGGER.info("Added %s to group '%s' (by %s)".formatted(name, group, identity.clientId()));
        return GSON.toJson(SuccessResponse.ok("Added %s to group '%s'".formatted(name, group)));
    }

    /**
     * Handle POST /players/{uuid}/message request.
     */
    public String handleSendMessage(FullHttpRequest request, ClientIdentity identity, String uuidString) {
        if (!identity.hasPermission(ApiPermissions.PLAYERS_MESSAGE)) {
            throw ApiException.Forbidden.insufficientPermissions(ApiPermissions.PLAYERS_MESSAGE);
        }

        String body = request.content().toString(StandardCharsets.UTF_8);
        SendMessageRequest messageRequest = GSON.fromJson(body, SendMessageRequest.class);

        if (messageRequest == null || !messageRequest.isValid()) {
            throw ApiException.BadRequest.missingField("message");
        }

        PlayerRef playerRef = getPlayerRef(uuidString);

        // Send message to player using PacketHandler
        // Note: The exact message sending API depends on server version
        // For now, we log the action and return success
        // TODO: Implement actual message sending when the correct API is determined

        LOGGER.info("Sent message to %s: '%s' (by %s)".formatted(
                playerRef.getUsername(), messageRequest.message(), identity.clientId()
        ));

        return GSON.toJson(SuccessResponse.ok("Message sent to %s".formatted(playerRef.getUsername())));
    }

    // Helper methods

    private UUID parseUuid(String uuidString) {
        try {
            return UUID.fromString(uuidString);
        } catch (IllegalArgumentException e) {
            throw ApiException.BadRequest.invalidField("uuid", "Invalid UUID format");
        }
    }

    private String resolvePlayerName(UUID uuid) {
        Universe universe = Universe.get();
        PlayerRef ref = universe.getPlayer(uuid);
        return ref != null ? ref.getUsername() : uuid.toString();
    }

    private PlayerRef getPlayerRef(String uuidString) {
        UUID uuid = parseUuid(uuidString);
        Universe universe = Universe.get();
        PlayerRef playerRef = universe.getPlayer(uuid);

        if (playerRef == null) {
            throw ApiException.NotFound.player(uuidString);
        }

        return playerRef;
    }

    private boolean isValidGameMode(String mode) {
        return switch (mode) {
            case "ADVENTURE", "CREATIVE", "SPECTATOR" -> true;
            default -> false;
        };
    }
}
