package com.hytale.api.http.handlers;

import com.google.gson.Gson;
import com.hytale.api.dto.response.ApiResponses.ServerStatsResponse;
import com.hytale.api.dto.response.ApiResponses.ServerStatsResponse.MemoryStats;
import com.hytale.api.dto.response.ApiResponses.ServerStatsResponse.WorldStats;
import com.hytale.api.dto.response.ApiResponses.WorldStatsResponse;
import com.hytale.api.dto.response.ApiResponses.WorldStatsResponse.ChunkStats;
import com.hytale.api.dto.response.ApiResponses.WorldStatsResponse.EntityTypeCount;
import com.hytale.api.exception.ApiException;
import com.hytale.api.security.ApiPermissions;
import com.hytale.api.security.ClientIdentity;
import com.hypixel.hytale.server.core.HytaleServer;
import com.hypixel.hytale.server.core.universe.Universe;
import com.hypixel.hytale.server.core.universe.world.World;
import io.netty.handler.codec.http.FullHttpRequest;

import java.util.ArrayList;
import java.util.List;

/**
 * Handler for detailed statistics endpoints.
 * GET /server/stats - Comprehensive server statistics
 * GET /worlds/{name}/stats - World-specific statistics
 */
public final class StatsHandler {
    private static final Gson GSON = new Gson();

    /**
     * Handle GET /server/stats - comprehensive server statistics.
     */
    public String handleServerStats(FullHttpRequest request, ClientIdentity identity) {
        if (!identity.hasPermission(ApiPermissions.STATUS_READ)) {
            throw ApiException.Forbidden.insufficientPermissions(ApiPermissions.STATUS_READ);
        }

        HytaleServer server = HytaleServer.get();
        Universe universe = Universe.get();
        Runtime runtime = Runtime.getRuntime();

        long uptimeMs = System.currentTimeMillis() - server.getBoot().toEpochMilli();
        long usedMemory = runtime.totalMemory() - runtime.freeMemory();
        long maxMemory = runtime.maxMemory();
        double usedPercent = (double) usedMemory / maxMemory * 100;

        // Gather world statistics
        List<WorldStats> worldStatsList = new ArrayList<>();
        int totalEntities = 0;
        int totalChunksLoaded = 0;

        for (World world : universe.getWorlds().values()) {
            int entityCount = 0;
            int chunksLoaded = 0;
            int chunksGenerated = 0;

            try {
                var entityStore = world.getEntityStore();
                if (entityStore != null) {
                    var store = entityStore.getStore();
                    if (store != null) {
                        entityCount = store.getEntityCount();
                    }
                }

                var chunkStore = world.getChunkStore();
                if (chunkStore != null) {
                    chunksLoaded = chunkStore.getLoadedChunksCount();
                    chunksGenerated = chunkStore.getTotalGeneratedChunksCount();
                }
            } catch (Exception e) {
                // Ignore errors accessing stores
            }

            worldStatsList.add(new WorldStats(
                    world.getName(),
                    world.getPlayerCount(),
                    entityCount,
                    chunksLoaded,
                    chunksGenerated
            ));

            totalEntities += entityCount;
            totalChunksLoaded += chunksLoaded;
        }

        ServerStatsResponse response = new ServerStatsResponse(
                server.getServerName(),
                uptimeMs,
                universe.getPlayerCount(),
                server.getConfig().getMaxPlayers(),
                universe.getWorlds().size(),
                totalEntities,
                totalChunksLoaded,
                new MemoryStats(usedMemory, maxMemory, runtime.freeMemory(), usedPercent),
                worldStatsList
        );

        return GSON.toJson(response);
    }

    /**
     * Handle GET /worlds/{name}/stats - world-specific statistics.
     */
    public String handleWorldStats(FullHttpRequest request, ClientIdentity identity, String worldName) {
        if (!identity.hasPermission(ApiPermissions.WORLDS_READ)) {
            throw ApiException.Forbidden.insufficientPermissions(ApiPermissions.WORLDS_READ);
        }

        Universe universe = Universe.get();
        World world = universe.getWorld(worldName);

        if (world == null) {
            throw ApiException.NotFound.world(worldName);
        }

        int entityCount = 0;
        int chunksLoaded = 0;
        int chunksGenerated = 0;
        int totalChunks = 0;

        try {
            var entityStore = world.getEntityStore();
            if (entityStore != null) {
                var store = entityStore.getStore();
                if (store != null) {
                    entityCount = store.getEntityCount();
                }
            }

            var chunkStore = world.getChunkStore();
            if (chunkStore != null) {
                chunksLoaded = chunkStore.getLoadedChunksCount();
                chunksGenerated = chunkStore.getTotalGeneratedChunksCount();
                totalChunks = chunkStore.getTotalLoadedChunksCount();
            }
        } catch (Exception e) {
            // Ignore errors accessing stores
        }

        // Entity type breakdown (simplified - would need more complex query for full breakdown)
        List<EntityTypeCount> entityTypes = new ArrayList<>();
        entityTypes.add(new EntityTypeCount("total", entityCount));
        entityTypes.add(new EntityTypeCount("players", world.getPlayerCount()));
        entityTypes.add(new EntityTypeCount("other", entityCount - world.getPlayerCount()));

        WorldStatsResponse response = new WorldStatsResponse(
                world.getName(),
                world.getPlayerCount(),
                entityCount,
                new ChunkStats(chunksLoaded, chunksGenerated, totalChunks),
                entityTypes
        );

        return GSON.toJson(response);
    }
}
