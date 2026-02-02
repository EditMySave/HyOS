package com.hytale.api.security;

/**
 * Permission node constants for the API.
 * Follows hierarchical permission structure with wildcards.
 */
public final class ApiPermissions {
    private ApiPermissions() {}

    // Root wildcard
    public static final String ALL = "api.*";

    // Version
    public static final String VERSION_READ = "api.version.read";

    // Status/Server Info
    public static final String STATUS_READ = "api.status.read";

    // Server Management (Extended)
    public static final String SERVER_ALL = "api.server.*";
    public static final String SERVER_METRICS_READ = "api.server.metrics.read";
    public static final String SERVER_PLUGINS_READ = "api.server.plugins.read";
    public static final String SERVER_WHITELIST_WRITE = "api.server.whitelist.write";
    public static final String SERVER_SAVE = "api.server.save";
    public static final String SERVER_PERMISSIONS_READ = "api.server.permissions.read";
    public static final String SERVER_PERMISSIONS_WRITE = "api.server.permissions.write";

    // Player Management
    public static final String PLAYERS_READ = "api.players.read";
    public static final String PLAYERS_ALL = "api.players.*";

    // Player Inventory
    public static final String PLAYERS_INVENTORY_READ = "api.players.inventory.read";
    public static final String PLAYERS_INVENTORY_WRITE = "api.players.inventory.write";
    public static final String PLAYERS_INVENTORY_ALL = "api.players.inventory.*";

    // Player Stats & Location
    public static final String PLAYERS_STATS_READ = "api.players.stats.read";
    public static final String PLAYERS_LOCATION_READ = "api.players.location.read";
    public static final String PLAYERS_TELEPORT = "api.players.teleport";
    public static final String PLAYERS_GAMEMODE_READ = "api.players.gamemode.read";
    public static final String PLAYERS_GAMEMODE_WRITE = "api.players.gamemode.write";
    public static final String PLAYERS_MESSAGE = "api.players.message";

    // Player Permissions
    public static final String PLAYERS_PERMISSIONS_READ = "api.players.permissions.read";
    public static final String PLAYERS_PERMISSIONS_WRITE = "api.players.permissions.write";
    public static final String PLAYERS_GROUPS_READ = "api.players.groups.read";
    public static final String PLAYERS_GROUPS_WRITE = "api.players.groups.write";

    // World Management
    public static final String WORLDS_READ = "api.worlds.read";
    public static final String WORLDS_ALL = "api.worlds.*";

    // World Time & Weather
    public static final String WORLDS_TIME_READ = "api.worlds.time.read";
    public static final String WORLDS_TIME_WRITE = "api.worlds.time.write";
    public static final String WORLDS_WEATHER_READ = "api.worlds.weather.read";
    public static final String WORLDS_WEATHER_WRITE = "api.worlds.weather.write";

    // World Entities & Blocks
    public static final String WORLDS_ENTITIES_READ = "api.worlds.entities.read";
    public static final String WORLDS_BLOCKS_READ = "api.worlds.blocks.read";
    public static final String WORLDS_BLOCKS_WRITE = "api.worlds.blocks.write";

    // Admin Operations
    public static final String ADMIN_ALL = "api.admin.*";
    public static final String ADMIN_COMMAND = "api.admin.command";
    public static final String ADMIN_KICK = "api.admin.kick";
    public static final String ADMIN_BAN = "api.admin.ban";
    public static final String ADMIN_BROADCAST = "api.admin.broadcast";

    // Chat
    public static final String CHAT_MUTE = "api.chat.mute";

    // WebSocket
    public static final String WEBSOCKET_CONNECT = "api.websocket.connect";
    public static final String WEBSOCKET_SUBSCRIBE_PLAYERS = "api.websocket.subscribe.players";
    public static final String WEBSOCKET_SUBSCRIBE_CHAT = "api.websocket.subscribe.chat";
    public static final String WEBSOCKET_SUBSCRIBE_STATUS = "api.websocket.subscribe.status";
    public static final String WEBSOCKET_SUBSCRIBE_ENTITIES = "api.websocket.subscribe.entities";
    public static final String WEBSOCKET_SUBSCRIBE_BLOCKS = "api.websocket.subscribe.blocks";
    public static final String WEBSOCKET_SUBSCRIBE_INVENTORY = "api.websocket.subscribe.inventory";
    public static final String WEBSOCKET_SUBSCRIBE_LOGS = "api.websocket.subscribe.logs";
    public static final String WEBSOCKET_SUBSCRIBE_ALL = "api.websocket.subscribe.*";

    /**
     * Check if a permission string matches a required permission.
     * Supports wildcards like "api.*" and "api.admin.*"
     */
    public static boolean matches(String granted, String required) {
        if (granted == null || required == null) {
            return false;
        }
        if (granted.equals(required)) {
            return true;
        }
        if (granted.equals("*") || granted.equals("api.*")) {
            return required.startsWith("api.");
        }
        if (granted.endsWith(".*")) {
            String prefix = granted.substring(0, granted.length() - 1);
            return required.startsWith(prefix);
        }
        return false;
    }
}
