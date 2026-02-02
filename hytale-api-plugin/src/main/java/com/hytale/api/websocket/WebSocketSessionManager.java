package com.hytale.api.websocket;

import com.hytale.api.config.ApiConfig.WebSocketConfig;
import com.hytale.api.security.ClientIdentity;
import io.netty.channel.Channel;
import io.netty.channel.group.ChannelGroup;
import io.netty.channel.group.DefaultChannelGroup;
import io.netty.handler.codec.http.websocketx.TextWebSocketFrame;
import io.netty.util.concurrent.GlobalEventExecutor;

import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;
import java.util.logging.Logger;

/**
 * Manages WebSocket sessions and subscriptions.
 * Thread-safe for concurrent access from event loops.
 */
public final class WebSocketSessionManager {
    private static final Logger LOGGER = Logger.getLogger(WebSocketSessionManager.class.getName());

    private final WebSocketConfig config;
    private final ChannelGroup allChannels;
    private final Map<Channel, WebSocketSession> sessions;
    private final Map<String, Set<Channel>> subscriptions;

    public WebSocketSessionManager(WebSocketConfig config) {
        this.config = config;
        this.allChannels = new DefaultChannelGroup("ws-sessions", GlobalEventExecutor.INSTANCE);
        this.sessions = new ConcurrentHashMap<>();
        this.subscriptions = new ConcurrentHashMap<>();
    }

    /**
     * WebSocket session information.
     */
    public record WebSocketSession(
            Channel channel,
            ClientIdentity identity,
            Set<String> subscriptions
    ) {
        public boolean isSubscribedTo(String event) {
            if (subscriptions.isEmpty()) return false;
            if (subscriptions.contains("*")) return true;

            // Check exact match
            if (subscriptions.contains(event)) return true;

            // Check wildcard patterns (e.g., "player.*" matches "player.join")
            for (String sub : subscriptions) {
                if (sub.endsWith(".*")) {
                    String prefix = sub.substring(0, sub.length() - 1);
                    if (event.startsWith(prefix)) return true;
                }
            }
            return false;
        }
    }

    /**
     * Register a new authenticated session.
     */
    public boolean registerSession(Channel channel, ClientIdentity identity) {
        if (sessions.size() >= config.maxConnections()) {
            LOGGER.warning("Max WebSocket connections reached: " + config.maxConnections());
            return false;
        }

        var session = new WebSocketSession(channel, identity, new CopyOnWriteArraySet<>());
        sessions.put(channel, session);
        allChannels.add(channel);

        LOGGER.info("WebSocket session registered for client: " + identity.clientId());
        return true;
    }

    /**
     * Remove a session when channel closes.
     */
    public void removeSession(Channel channel) {
        var session = sessions.remove(channel);
        allChannels.remove(channel);

        if (session != null) {
            // Remove from all subscription lists
            for (String event : session.subscriptions()) {
                var channels = subscriptions.get(event);
                if (channels != null) {
                    channels.remove(channel);
                }
            }
            LOGGER.info("WebSocket session removed for client: " + session.identity().clientId());
        }
    }

    /**
     * Subscribe a session to an event type.
     */
    public void subscribe(Channel channel, String eventType) {
        var session = sessions.get(channel);
        if (session == null) return;

        session.subscriptions().add(eventType);
        subscriptions.computeIfAbsent(eventType, k -> new CopyOnWriteArraySet<>()).add(channel);

        LOGGER.fine("Client %s subscribed to: %s".formatted(session.identity().clientId(), eventType));
    }

    /**
     * Unsubscribe a session from an event type.
     */
    public void unsubscribe(Channel channel, String eventType) {
        var session = sessions.get(channel);
        if (session == null) return;

        session.subscriptions().remove(eventType);
        var channels = subscriptions.get(eventType);
        if (channels != null) {
            channels.remove(channel);
        }
    }

    /**
     * Get session for a channel.
     */
    public WebSocketSession getSession(Channel channel) {
        return sessions.get(channel);
    }

    /**
     * Broadcast an event to all subscribed sessions.
     */
    public void broadcast(String eventType, String jsonPayload) {
        String message = """
                {"type":"%s","data":%s,"timestamp":%d}"""
                .formatted(eventType, jsonPayload, System.currentTimeMillis());

        TextWebSocketFrame frame = new TextWebSocketFrame(message);

        int sentCount = 0;
        for (var entry : sessions.entrySet()) {
            var channel = entry.getKey();
            var session = entry.getValue();

            if (session.isSubscribedTo(eventType) && channel.isActive()) {
                channel.writeAndFlush(frame.retainedDuplicate());
                sentCount++;
            }
        }

        frame.release();

        if (sentCount > 0) {
            LOGGER.fine("Broadcast '%s' to %d sessions".formatted(eventType, sentCount));
        }
    }

    /**
     * Send a message to a specific session.
     */
    public void sendTo(Channel channel, String eventType, String jsonPayload) {
        if (!channel.isActive()) return;

        String message = """
                {"type":"%s","data":%s,"timestamp":%d}"""
                .formatted(eventType, jsonPayload, System.currentTimeMillis());

        channel.writeAndFlush(new TextWebSocketFrame(message));
    }

    /**
     * Send an error message to a session.
     */
    public void sendError(Channel channel, String code, String message) {
        if (!channel.isActive()) return;

        String payload = """
                {"type":"error","code":"%s","message":"%s","timestamp":%d}"""
                .formatted(code, escapeJson(message), System.currentTimeMillis());

        channel.writeAndFlush(new TextWebSocketFrame(payload));
    }

    /**
     * Get count of active sessions.
     */
    public int getSessionCount() {
        return sessions.size();
    }

    /**
     * Get all active channels (for server shutdown).
     */
    public ChannelGroup getAllChannels() {
        return allChannels;
    }

    private static String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n");
    }
}
