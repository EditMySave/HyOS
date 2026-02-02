package com.hytale.api.websocket;

import com.google.gson.Gson;
import com.hytale.api.config.ApiConfig;
import com.hypixel.hytale.event.EventRegistry;
import com.hypixel.hytale.server.core.HytaleServer;
import com.hypixel.hytale.server.core.entity.entities.Player;
import com.hypixel.hytale.server.core.event.events.player.*;
import com.hypixel.hytale.server.core.event.events.entity.EntityRemoveEvent;
import com.hypixel.hytale.server.core.event.events.ecs.ChangeGameModeEvent;
import com.hypixel.hytale.server.core.universe.PlayerRef;
import com.hypixel.hytale.server.core.universe.Universe;

import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.logging.Logger;

/**
 * Bridges Hytale server events to WebSocket broadcasts.
 * Uses virtual threads for periodic status broadcasts.
 */
public final class EventBroadcaster {
    private static final Logger LOGGER = Logger.getLogger(EventBroadcaster.class.getName());
    private static final Gson GSON = new Gson();

    private final ApiConfig config;
    private final WebSocketSessionManager sessionManager;
    private final ScheduledExecutorService scheduler;
    private ScheduledFuture<?> statusBroadcastTask;

    public EventBroadcaster(ApiConfig config, WebSocketSessionManager sessionManager) {
        this.config = config;
        this.sessionManager = sessionManager;
        // Use virtual threads for efficiency (Java 21+)
        this.scheduler = Executors.newScheduledThreadPool(1, Thread.ofVirtual().factory());
    }

    /**
     * Register all event listeners.
     */
    public void registerEvents(EventRegistry eventRegistry) {
        // Player connection events
        eventRegistry.registerGlobal(PlayerConnectEvent.class, this::onPlayerConnect);
        eventRegistry.registerGlobal(PlayerDisconnectEvent.class, this::onPlayerDisconnect);
        eventRegistry.registerGlobal(PlayerReadyEvent.class, this::onPlayerReady);

        // Player chat event
        eventRegistry.registerGlobal(PlayerChatEvent.class, this::onPlayerChat);

        // Game mode change event
        eventRegistry.registerGlobal(ChangeGameModeEvent.class, this::onPlayerGameModeChange);

        // Entity events
        eventRegistry.registerGlobal(EntityRemoveEvent.class, this::onEntityRemove);

        // Note: Block events (PlaceBlockEvent, BreakBlockEvent) and inventory events
        // are not yet available in the current Hytale server SDK.
        // They will be added when the SDK supports them.

        LOGGER.info("Event listeners registered for WebSocket broadcast");

        // Start periodic status broadcast
        startStatusBroadcast();
    }

    /**
     * Start periodic server status broadcasts.
     */
    private void startStatusBroadcast() {
        int intervalSeconds = config.websocket().statusBroadcastIntervalSeconds();
        if (intervalSeconds <= 0) return;

        statusBroadcastTask = scheduler.scheduleAtFixedRate(
                this::broadcastServerStatus,
                intervalSeconds,
                intervalSeconds,
                TimeUnit.SECONDS
        );

        LOGGER.info("Status broadcast started with %d second interval".formatted(intervalSeconds));
    }

    /**
     * Handle player connection event.
     */
    private void onPlayerConnect(PlayerConnectEvent event) {
        var playerRef = event.getPlayerRef();

        String payload = """
                {"uuid":"%s","name":"%s"}"""
                .formatted(
                        playerRef.getUuid(),
                        escapeJson(playerRef.getUsername())
                );

        sessionManager.broadcast("player.connect", payload);
    }

    /**
     * Handle player ready event (fully joined).
     */
    @SuppressWarnings("removal") // Entity.getUuid() deprecated but no replacement available yet
    private void onPlayerReady(PlayerReadyEvent event) {
        Player player = event.getPlayer();
        var world = player.getWorld();

        String payload = """
                {"uuid":"%s","name":"%s","world":"%s"}"""
                .formatted(
                        player.getUuid(),
                        "Player", // Player entity may not have direct name access
                        world != null ? escapeJson(world.getName()) : "unknown"
                );

        sessionManager.broadcast("player.join", payload);
    }

    /**
     * Handle player disconnect event.
     */
    private void onPlayerDisconnect(PlayerDisconnectEvent event) {
        var playerRef = event.getPlayerRef();
        var reason = event.getDisconnectReason();

        String payload = """
                {"uuid":"%s","name":"%s","reason":"%s"}"""
                .formatted(
                        playerRef.getUuid(),
                        escapeJson(playerRef.getUsername()),
                        escapeJson(reason != null ? reason.toString() : "DISCONNECTED")
                );

        sessionManager.broadcast("player.leave", payload);
    }

    /**
     * Broadcast server status to all subscribed clients.
     */
    private void broadcastServerStatus() {
        try {
            if (sessionManager.getSessionCount() == 0) return;

            HytaleServer server = HytaleServer.get();
            Universe universe = Universe.get();
            Runtime runtime = Runtime.getRuntime();

            long uptime = System.currentTimeMillis() - server.getBoot().toEpochMilli();
            long usedMemory = runtime.totalMemory() - runtime.freeMemory();

            String payload = """
                    {"name":"%s","players":%d,"maxPlayers":%d,"uptime":%d,"memory":{"used":%d,"max":%d}}"""
                    .formatted(
                            escapeJson(server.getServerName()),
                            universe.getPlayerCount(),
                            server.getConfig().getMaxPlayers(),
                            uptime,
                            usedMemory,
                            runtime.maxMemory()
                    );

            sessionManager.broadcast("server.status", payload);

        } catch (Exception e) {
            LOGGER.warning("Status broadcast failed: " + e.getMessage());
        }
    }

    /**
     * Handle player chat event.
     */
    private void onPlayerChat(PlayerChatEvent event) {
        var playerRef = event.getSender();
        String content = event.getContent();

        String payload = """
                {"uuid":"%s","name":"%s","message":"%s"}"""
                .formatted(
                        playerRef.getUuid(),
                        escapeJson(playerRef.getUsername()),
                        escapeJson(content)
                );

        sessionManager.broadcast("player.chat", payload);
    }

    /**
     * Handle game mode change event.
     */
    private void onPlayerGameModeChange(ChangeGameModeEvent event) {
        // TODO: Extract player info and game mode from event
        String payload = """
                {"gameMode":"%s"}"""
                .formatted(escapeJson(event.getGameMode().name()));

        sessionManager.broadcast("player.gamemode", payload);
    }

    // Note: Block event handlers (onBlockPlace, onBlockBreak) will be added
    // when PlaceBlockEvent and BreakBlockEvent become available in the SDK.

    /**
     * Handle entity remove event.
     */
    @SuppressWarnings("removal")
    private void onEntityRemove(EntityRemoveEvent event) {
        var entity = event.getEntity();

        String payload = """
                {"uuid":"%s","type":"%s"}"""
                .formatted(
                        entity.getUuid(),
                        entity.getClass().getSimpleName()
                );

        sessionManager.broadcast("entity.remove", payload);
    }

    // Note: Inventory change event handler will be added when
    // LivingEntityInventoryChangeEvent becomes available in the SDK.

    /**
     * Shutdown the broadcaster.
     */
    public void shutdown() {
        if (statusBroadcastTask != null) {
            statusBroadcastTask.cancel(false);
        }
        scheduler.shutdown();
        try {
            if (!scheduler.awaitTermination(5, TimeUnit.SECONDS)) {
                scheduler.shutdownNow();
            }
        } catch (InterruptedException e) {
            scheduler.shutdownNow();
            Thread.currentThread().interrupt();
        }
        LOGGER.info("Event broadcaster shutdown complete");
    }

    // Utility methods

    private static String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }
}
