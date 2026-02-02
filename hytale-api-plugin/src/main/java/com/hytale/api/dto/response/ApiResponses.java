package com.hytale.api.dto.response;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Response DTOs for API endpoints.
 * All responses are JSON-serializable records.
 */
public final class ApiResponses {
    private ApiResponses() {}

    /**
     * Health check response.
     */
    public record HealthResponse(String status, long timestamp) {
        public static HealthResponse ok() {
            return new HealthResponse("ok", System.currentTimeMillis());
        }
    }

    /**
     * Server status response.
     */
    public record StatusResponse(
            String name,
            String motd,
            int playerCount,
            int maxPlayers,
            long uptime,
            MemoryInfo memory,
            boolean online
    ) {
        public record MemoryInfo(long used, long max, long free) {}
    }

    /**
     * Player list response.
     */
    public record PlayersResponse(
            int count,
            List<PlayerInfo> players
    ) {
        public record PlayerInfo(
                UUID uuid,
                String name,
                String world,
                Position position,
                long connectedAt
        ) {
            public record Position(double x, double y, double z) {}
        }
    }

    /**
     * Single player details response.
     */
    public record PlayerDetailResponse(
            UUID uuid,
            String name,
            String world,
            PlayersResponse.PlayerInfo.Position position,
            long connectedAt,
            Stats stats,
            String gameMode
    ) {
        public record Stats(int health, int mana, int stamina) {}
    }

    /**
     * World list response.
     */
    public record WorldsResponse(
            int count,
            List<WorldInfo> worlds
    ) {
        public record WorldInfo(
                UUID uuid,
                String name,
                int playerCount,
                String type
        ) {}
    }

    /**
     * Single world details response.
     */
    public record WorldDetailResponse(
            UUID uuid,
            String name,
            int playerCount,
            String type,
            List<String> players,
            SpawnPosition spawn
    ) {
        public record SpawnPosition(double x, double y, double z) {}
    }

    /**
     * Command execution response.
     */
    public record CommandResponse(
            boolean success,
            String output
    ) {}

    /**
     * Admin action response (kick, ban, broadcast).
     */
    public record AdminActionResponse(
            boolean success,
            String action,
            String target,
            String message
    ) {}

    /**
     * Generic success response.
     */
    public record SuccessResponse(boolean success, String message) {
        public static SuccessResponse ok(String message) {
            return new SuccessResponse(true, message);
        }
    }

    /**
     * Detailed server statistics response.
     */
    public record ServerStatsResponse(
            String name,
            long uptime,
            int playerCount,
            int maxPlayers,
            int worldCount,
            int totalEntities,
            int totalChunksLoaded,
            MemoryStats memory,
            List<WorldStats> worlds
    ) {
        public record MemoryStats(
                long used,
                long max,
                long free,
                double usedPercent
        ) {}

        public record WorldStats(
                String name,
                int playerCount,
                int entityCount,
                int chunksLoaded,
                int chunksGenerated
        ) {}
    }

    /**
     * Detailed world statistics response.
     */
    public record WorldStatsResponse(
            String name,
            int playerCount,
            int entityCount,
            ChunkStats chunks,
            List<EntityTypeCount> entityTypes
    ) {
        public record ChunkStats(
                int loaded,
                int generated,
                int total
        ) {}

        public record EntityTypeCount(
                String type,
                int count
        ) {}
    }

    // ============== NEW RESPONSE TYPES ==============

    /**
     * Version information response.
     */
    public record VersionResponse(
            String gameVersion,
            String revisionId,
            String patchline,
            int protocolVersion,
            String protocolHash,
            String pluginVersion
    ) {}

    /**
     * Full inventory response.
     */
    public record InventoryResponse(
            UUID playerUuid,
            String playerName,
            int totalSlots,
            List<ItemSlot> items
    ) {
        public record ItemSlot(
                String section,
                int slot,
                String itemId,
                int amount,
                String displayName,
                Double durability,
                Double maxDurability
        ) {}
    }

    /**
     * Hotbar inventory response.
     */
    public record HotbarResponse(
            UUID playerUuid,
            String playerName,
            int activeSlot,
            List<HotbarSlot> slots
    ) {
        public record HotbarSlot(
                int slot,
                String itemId,
                int amount,
                String displayName,
                boolean isActive
        ) {}
    }

    /**
     * Armor inventory response.
     */
    public record ArmorResponse(
            UUID playerUuid,
            String playerName,
            ArmorSlot helmet,
            ArmorSlot chestplate,
            ArmorSlot leggings,
            ArmorSlot boots
    ) {
        public record ArmorSlot(
                String itemId,
                int amount,
                String displayName,
                Double durability,
                Double maxDurability
        ) {
            public static ArmorSlot empty() {
                return new ArmorSlot(null, 0, null, null, null);
            }
        }
    }

    /**
     * Storage inventory response.
     */
    public record StorageResponse(
            UUID playerUuid,
            String playerName,
            int capacity,
            int usedSlots,
            List<InventoryResponse.ItemSlot> items
    ) {}

    /**
     * Player stats response.
     */
    public record PlayerStatsResponse(
            UUID uuid,
            String name,
            double health,
            double maxHealth,
            double mana,
            double maxMana,
            double stamina,
            double maxStamina,
            double oxygen,
            double maxOxygen
    ) {}

    /**
     * Player location response.
     */
    public record PlayerLocationResponse(
            UUID uuid,
            String name,
            String world,
            Position position,
            Rotation rotation
    ) {
        public record Position(double x, double y, double z) {}
        public record Rotation(float yaw, float pitch) {}
    }

    /**
     * Game mode response.
     */
    public record GameModeResponse(
            UUID uuid,
            String name,
            String gameMode
    ) {}

    /**
     * Player permissions response.
     */
    public record PermissionsResponse(
            UUID uuid,
            String name,
            List<String> permissions
    ) {}

    /**
     * Player groups response.
     */
    public record GroupsResponse(
            UUID uuid,
            String name,
            List<String> groups
    ) {}

    /**
     * World time response.
     */
    public record WorldTimeResponse(
            String world,
            long time,
            long dayTime,
            String phase
    ) {}

    /**
     * World weather response.
     */
    public record WorldWeatherResponse(
            String world,
            String weather,
            int remainingTicks,
            boolean isThundering
    ) {}

    /**
     * Entities list response.
     */
    public record EntitiesResponse(
            String world,
            int count,
            List<EntityInfo> entities
    ) {
        public record EntityInfo(
                String uuid,
                String type,
                String name,
                Position position,
                boolean isAlive
        ) {
            public record Position(double x, double y, double z) {}
        }
    }

    /**
     * Block at coordinates response.
     */
    public record BlockResponse(
            String world,
            int x,
            int y,
            int z,
            String blockId,
            Map<String, String> properties
    ) {}

    /**
     * Server metrics response.
     */
    public record MetricsResponse(
            double tps,
            long tickTimeMs,
            long avgTickTimeMs,
            MemoryMetrics memory,
            int totalPlayers,
            int totalEntities,
            int totalChunks,
            List<WorldMetrics> worlds
    ) {
        public record MemoryMetrics(
                long used,
                long max,
                long free,
                double usedPercent
        ) {}

        public record WorldMetrics(
                String name,
                int players,
                int entities,
                int chunks,
                long tickTimeMs
        ) {}
    }

    /**
     * Plugins list response.
     */
    public record PluginsResponse(
            int count,
            List<PluginInfo> plugins
    ) {
        public record PluginInfo(
                String name,
                String version,
                String description,
                String state,
                List<String> authors
        ) {}
    }

    /**
     * Whitelist status response.
     */
    public record WhitelistResponse(
            boolean enabled,
            int playerCount,
            List<String> players
    ) {}

    /**
     * Teleport result response.
     */
    public record TeleportResponse(
            boolean success,
            UUID uuid,
            String name,
            String world,
            PlayerLocationResponse.Position position
    ) {}

    /**
     * Mute result response.
     */
    public record MuteResponse(
            boolean success,
            UUID uuid,
            String name,
            Integer durationMinutes,
            String reason,
            long expiresAt
    ) {}

    /**
     * Full permissions data (permissions.json structure).
     */
    public record PermissionsDataResponse(
            Map<String, GroupEntry> groups,
            Map<String, UserEntry> users
    ) {
        public record GroupEntry(List<String> permissions) {}

        public record UserEntry(List<String> groups, List<String> permissions) {}
    }

    /**
     * Single group response (name + permissions).
     */
    public record GroupResponse(String name, List<String> permissions) {}
}
