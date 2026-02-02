package com.hytale.api.http.handlers;

import com.google.gson.Gson;
import com.hytale.api.dto.request.WorldRequests.*;
import com.hytale.api.dto.response.ApiResponses.*;
import com.hytale.api.exception.ApiException;
import com.hytale.api.security.ApiPermissions;
import com.hytale.api.security.ClientIdentity;
import com.hypixel.hytale.server.core.universe.Universe;
import com.hypixel.hytale.server.core.universe.world.World;
import io.netty.handler.codec.http.FullHttpRequest;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Logger;

/**
 * Handler for extended world endpoints (time, weather, entities, blocks).
 */
public final class WorldExtendedHandler {
    private static final Logger LOGGER = Logger.getLogger(WorldExtendedHandler.class.getName());
    private static final Gson GSON = new Gson();

    // Time phases (ticks per day = 24000)
    private static final long DAY_START = 0;
    private static final long NOON = 6000;
    private static final long SUNSET = 12000;
    private static final long NIGHT = 13000;
    private static final long MIDNIGHT = 18000;
    private static final long SUNRISE = 23000;

    /**
     * Handle GET /worlds/{id}/time request.
     */
    public String handleGetTime(FullHttpRequest request, ClientIdentity identity, String worldId) {
        if (!identity.hasPermission(ApiPermissions.WORLDS_TIME_READ)) {
            throw ApiException.Forbidden.insufficientPermissions(ApiPermissions.WORLDS_TIME_READ);
        }

        World world = getWorld(worldId);

        // TODO: Get actual time from world's TimeResource
        long time = 0; // Placeholder - total world time
        long dayTime = time % 24000; // Time within current day cycle

        String phase = getTimePhase(dayTime);

        WorldTimeResponse response = new WorldTimeResponse(
                world.getName(),
                time,
                dayTime,
                phase
        );

        return GSON.toJson(response);
    }

    /**
     * Handle POST /worlds/{id}/time request.
     */
    public String handleSetTime(FullHttpRequest request, ClientIdentity identity, String worldId) {
        if (!identity.hasPermission(ApiPermissions.WORLDS_TIME_WRITE)) {
            throw ApiException.Forbidden.insufficientPermissions(ApiPermissions.WORLDS_TIME_WRITE);
        }

        String body = request.content().toString(StandardCharsets.UTF_8);
        SetTimeRequest timeRequest = GSON.fromJson(body, SetTimeRequest.class);

        if (timeRequest == null) {
            throw ApiException.BadRequest.missingField("time");
        }

        World world = getWorld(worldId);

        // TODO: Set actual time via world's TimeResource
        long newTime = timeRequest.time();
        long dayTime = newTime % 24000;

        LOGGER.info("Set time of world %s to %d (by %s)".formatted(
                world.getName(), newTime, identity.clientId()
        ));

        WorldTimeResponse response = new WorldTimeResponse(
                world.getName(),
                newTime,
                dayTime,
                getTimePhase(dayTime)
        );

        return GSON.toJson(response);
    }

    /**
     * Handle GET /worlds/{id}/weather request.
     */
    public String handleGetWeather(FullHttpRequest request, ClientIdentity identity, String worldId) {
        if (!identity.hasPermission(ApiPermissions.WORLDS_WEATHER_READ)) {
            throw ApiException.Forbidden.insufficientPermissions(ApiPermissions.WORLDS_WEATHER_READ);
        }

        World world = getWorld(worldId);

        // TODO: Get actual weather from world
        String weather = "clear"; // Placeholder
        int remainingTicks = 0;
        boolean isThundering = false;

        WorldWeatherResponse response = new WorldWeatherResponse(
                world.getName(),
                weather,
                remainingTicks,
                isThundering
        );

        return GSON.toJson(response);
    }

    /**
     * Handle POST /worlds/{id}/weather request.
     */
    public String handleSetWeather(FullHttpRequest request, ClientIdentity identity, String worldId) {
        if (!identity.hasPermission(ApiPermissions.WORLDS_WEATHER_WRITE)) {
            throw ApiException.Forbidden.insufficientPermissions(ApiPermissions.WORLDS_WEATHER_WRITE);
        }

        String body = request.content().toString(StandardCharsets.UTF_8);
        SetWeatherRequest weatherRequest = GSON.fromJson(body, SetWeatherRequest.class);

        if (weatherRequest == null || !weatherRequest.isValid()) {
            throw ApiException.BadRequest.missingField("weather");
        }

        String weather = weatherRequest.weather().toLowerCase();
        if (!isValidWeather(weather)) {
            throw ApiException.BadRequest.invalidWeather(weather);
        }

        World world = getWorld(worldId);

        // TODO: Set actual weather via world
        int duration = weatherRequest.getDurationOrDefault();

        LOGGER.info("Set weather of world %s to %s for %d ticks (by %s)".formatted(
                world.getName(), weather, duration, identity.clientId()
        ));

        WorldWeatherResponse response = new WorldWeatherResponse(
                world.getName(),
                weather,
                duration,
                weather.equals("thunder")
        );

        return GSON.toJson(response);
    }

    /**
     * Handle GET /worlds/{id}/entities request.
     */
    public String handleListEntities(FullHttpRequest request, ClientIdentity identity, String worldId) {
        if (!identity.hasPermission(ApiPermissions.WORLDS_ENTITIES_READ)) {
            throw ApiException.Forbidden.insufficientPermissions(ApiPermissions.WORLDS_ENTITIES_READ);
        }

        World world = getWorld(worldId);

        // TODO: Get actual entities from world's EntityStore
        List<EntitiesResponse.EntityInfo> entities = new ArrayList<>();

        // Example of how to populate when server API is available:
        // var entityStore = world.getEntityStore();
        // for each entity in entityStore:
        //   entities.add(new EntityInfo(...));

        EntitiesResponse response = new EntitiesResponse(
                world.getName(),
                entities.size(),
                entities
        );

        return GSON.toJson(response);
    }

    /**
     * Handle GET /worlds/{id}/blocks/{x}/{y}/{z} request.
     */
    public String handleGetBlock(FullHttpRequest request, ClientIdentity identity,
                                  String worldId, int x, int y, int z) {
        if (!identity.hasPermission(ApiPermissions.WORLDS_BLOCKS_READ)) {
            throw ApiException.Forbidden.insufficientPermissions(ApiPermissions.WORLDS_BLOCKS_READ);
        }

        World world = getWorld(worldId);

        // TODO: Get actual block from world's ChunkStore
        String blockId = "air"; // Placeholder
        Map<String, String> properties = new HashMap<>();

        // Example:
        // var chunkStore = world.getChunkStore();
        // var block = chunkStore.getBlock(x, y, z);
        // blockId = block.getBlockType().getId();

        BlockResponse response = new BlockResponse(
                world.getName(),
                x, y, z,
                blockId,
                properties
        );

        return GSON.toJson(response);
    }

    /**
     * Handle POST /worlds/{id}/blocks/{x}/{y}/{z} request.
     */
    public String handleSetBlock(FullHttpRequest request, ClientIdentity identity,
                                  String worldId, int x, int y, int z) {
        if (!identity.hasPermission(ApiPermissions.WORLDS_BLOCKS_WRITE)) {
            throw ApiException.Forbidden.insufficientPermissions(ApiPermissions.WORLDS_BLOCKS_WRITE);
        }

        String body = request.content().toString(StandardCharsets.UTF_8);
        SetBlockRequest blockRequest = GSON.fromJson(body, SetBlockRequest.class);

        if (blockRequest == null || !blockRequest.isValid()) {
            throw ApiException.BadRequest.missingField("blockId");
        }

        World world = getWorld(worldId);

        // TODO: Set actual block via world's ChunkStore
        String blockId = blockRequest.blockId();

        LOGGER.info("Set block at %d,%d,%d in world %s to %s (by %s)".formatted(
                x, y, z, world.getName(), blockId, identity.clientId()
        ));

        BlockResponse response = new BlockResponse(
                world.getName(),
                x, y, z,
                blockId,
                new HashMap<>()
        );

        return GSON.toJson(response);
    }

    // Helper methods

    private World getWorld(String worldId) {
        Universe universe = Universe.get();
        World world = universe.getWorld(worldId);

        if (world == null) {
            // Try by UUID
            try {
                var uuid = java.util.UUID.fromString(worldId);
                world = universe.getWorld(uuid);
            } catch (IllegalArgumentException ignored) {
                // Not a UUID, already tried by name
            }
        }

        if (world == null) {
            throw ApiException.NotFound.world(worldId);
        }

        return world;
    }

    private String getTimePhase(long dayTime) {
        if (dayTime >= SUNRISE || dayTime < DAY_START + 1000) {
            return "dawn";
        } else if (dayTime < NOON) {
            return "morning";
        } else if (dayTime < SUNSET) {
            return "afternoon";
        } else if (dayTime < NIGHT) {
            return "dusk";
        } else if (dayTime < MIDNIGHT) {
            return "night";
        } else {
            return "midnight";
        }
    }

    private boolean isValidWeather(String weather) {
        return switch (weather) {
            case "clear", "rain", "thunder" -> true;
            default -> false;
        };
    }
}
