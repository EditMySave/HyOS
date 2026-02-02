package com.hytale.api.http.handlers;

import com.google.gson.Gson;
import com.hytale.api.dto.response.ApiResponses.PlayerDetailResponse;
import com.hytale.api.dto.response.ApiResponses.PlayerDetailResponse.Stats;
import com.hytale.api.dto.response.ApiResponses.PlayersResponse;
import com.hytale.api.dto.response.ApiResponses.PlayersResponse.PlayerInfo;
import com.hytale.api.dto.response.ApiResponses.PlayersResponse.PlayerInfo.Position;
import com.hytale.api.exception.ApiException;
import com.hytale.api.security.ApiPermissions;
import com.hytale.api.security.ClientIdentity;
import com.hypixel.hytale.server.core.universe.PlayerRef;
import com.hypixel.hytale.server.core.universe.Universe;
import io.netty.handler.codec.http.FullHttpRequest;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Handler for GET /players and GET /players/{uuid} endpoints.
 * Requires api.players.read permission.
 */
public final class PlayersHandler {
    private static final Gson GSON = new Gson();

    /**
     * Handle GET /players - list all online players.
     */
    public String handleList(FullHttpRequest request, ClientIdentity identity) {
        if (!identity.hasPermission(ApiPermissions.PLAYERS_READ)) {
            throw ApiException.Forbidden.insufficientPermissions(ApiPermissions.PLAYERS_READ);
        }

        Universe universe = Universe.get();
        List<PlayerInfo> playerInfos = new ArrayList<>();

        for (PlayerRef playerRef : universe.getPlayers()) {
            var transform = playerRef.getTransform();
            var pos = transform.getPosition();
            var worldUuid = playerRef.getWorldUuid();
            var world = worldUuid != null ? universe.getWorld(worldUuid) : null;

            playerInfos.add(new PlayerInfo(
                    playerRef.getUuid(),
                    playerRef.getUsername(),
                    world != null ? world.getName() : "unknown",
                    new Position(pos.getX(), pos.getY(), pos.getZ()),
                    0 // Connected time not easily accessible
            ));
        }

        PlayersResponse response = new PlayersResponse(playerInfos.size(), playerInfos);
        return GSON.toJson(response);
    }

    /**
     * Handle GET /players/{uuid} - get single player details.
     */
    public String handleDetail(FullHttpRequest request, ClientIdentity identity, String uuidStr) {
        if (!identity.hasPermission(ApiPermissions.PLAYERS_READ)) {
            throw ApiException.Forbidden.insufficientPermissions(ApiPermissions.PLAYERS_READ);
        }

        UUID uuid;
        try {
            uuid = UUID.fromString(uuidStr);
        } catch (IllegalArgumentException e) {
            throw ApiException.BadRequest.invalidField("uuid", "Invalid UUID format");
        }

        Universe universe = Universe.get();
        PlayerRef playerRef = universe.getPlayer(uuid);

        if (playerRef == null) {
            throw ApiException.NotFound.player(uuidStr);
        }

        var transform = playerRef.getTransform();
        var pos = transform.getPosition();
        var worldUuid = playerRef.getWorldUuid();
        var world = worldUuid != null ? universe.getWorld(worldUuid) : null;

        PlayerDetailResponse response = new PlayerDetailResponse(
                playerRef.getUuid(),
                playerRef.getUsername(),
                world != null ? world.getName() : "unknown",
                new Position(pos.getX(), pos.getY(), pos.getZ()),
                0, // Connected time
                new Stats(100, 0, 10), // Default stats - actual stats require more complex access
                "Adventure" // Default game mode
        );

        return GSON.toJson(response);
    }
}
