package com.hytale.api.http.handlers;

import com.google.gson.Gson;
import com.hytale.api.dto.response.ApiResponses.WorldDetailResponse;
import com.hytale.api.dto.response.ApiResponses.WorldDetailResponse.SpawnPosition;
import com.hytale.api.dto.response.ApiResponses.WorldsResponse;
import com.hytale.api.dto.response.ApiResponses.WorldsResponse.WorldInfo;
import com.hytale.api.exception.ApiException;
import com.hytale.api.security.ApiPermissions;
import com.hytale.api.security.ClientIdentity;
import com.hypixel.hytale.server.core.universe.Universe;
import com.hypixel.hytale.server.core.universe.world.World;
import io.netty.handler.codec.http.FullHttpRequest;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Handler for GET /worlds and GET /worlds/{uuid} endpoints.
 * Requires api.worlds.read permission.
 */
public final class WorldsHandler {
    private static final Gson GSON = new Gson();

    /**
     * Handle GET /worlds - list all worlds.
     */
    public String handleList(FullHttpRequest request, ClientIdentity identity) {
        if (!identity.hasPermission(ApiPermissions.WORLDS_READ)) {
            throw ApiException.Forbidden.insufficientPermissions(ApiPermissions.WORLDS_READ);
        }

        Universe universe = Universe.get();
        List<WorldInfo> worldInfos = new ArrayList<>();

        // getWorlds() returns Map<String, World>
        for (World world : universe.getWorlds().values()) {
            worldInfos.add(new WorldInfo(
                    null, // World UUID not directly accessible
                    world.getName(),
                    world.getPlayerCount(),
                    "default"
            ));
        }

        WorldsResponse response = new WorldsResponse(worldInfos.size(), worldInfos);
        return GSON.toJson(response);
    }

    /**
     * Handle GET /worlds/{name} - get single world details by name.
     */
    public String handleDetail(FullHttpRequest request, ClientIdentity identity, String nameOrUuid) {
        if (!identity.hasPermission(ApiPermissions.WORLDS_READ)) {
            throw ApiException.Forbidden.insufficientPermissions(ApiPermissions.WORLDS_READ);
        }

        Universe universe = Universe.get();
        World world = null;

        // Try UUID first
        try {
            UUID uuid = UUID.fromString(nameOrUuid);
            world = universe.getWorld(uuid);
        } catch (IllegalArgumentException e) {
            // Not a UUID, try by name
            world = universe.getWorld(nameOrUuid);
        }

        if (world == null) {
            throw ApiException.NotFound.world(nameOrUuid);
        }

        List<String> playerNames = world.getPlayerRefs().stream()
                .map(p -> p.getUsername())
                .toList();

        WorldDetailResponse response = new WorldDetailResponse(
                null, // World UUID
                world.getName(),
                world.getPlayerCount(),
                "default",
                playerNames,
                new SpawnPosition(0, 0, 0) // Spawn position - would need WorldConfig access
        );

        return GSON.toJson(response);
    }
}
