package com.hytale.api.websocket;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.hytale.api.config.ApiConfig;
import com.hytale.api.security.ApiPermissions;
import com.hytale.api.security.ClientIdentity;
import com.hytale.api.security.TokenGenerator;
import com.hytale.api.security.TokenGenerator.ValidatedToken;
import io.netty.channel.ChannelHandler;
import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.SimpleChannelInboundHandler;
import io.netty.handler.codec.http.websocketx.TextWebSocketFrame;
import io.netty.handler.codec.http.websocketx.WebSocketServerProtocolHandler;

import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * WebSocket message handler.
 * Handles authentication, subscription management, and message routing.
 */
@ChannelHandler.Sharable
public final class WebSocketHandler extends SimpleChannelInboundHandler<TextWebSocketFrame> {
    private static final Logger LOGGER = Logger.getLogger(WebSocketHandler.class.getName());
    private static final Gson GSON = new Gson();

    private final ApiConfig config;
    private final TokenGenerator tokenGenerator;
    private final WebSocketSessionManager sessionManager;

    public WebSocketHandler(
            ApiConfig config,
            TokenGenerator tokenGenerator,
            WebSocketSessionManager sessionManager
    ) {
        this.config = config;
        this.tokenGenerator = tokenGenerator;
        this.sessionManager = sessionManager;
    }

    @Override
    public void userEventTriggered(ChannelHandlerContext ctx, Object evt) throws Exception {
        if (evt instanceof WebSocketServerProtocolHandler.HandshakeComplete) {
            LOGGER.fine("WebSocket handshake complete: " + ctx.channel().remoteAddress());
            // Session will be registered after auth message
        }
        super.userEventTriggered(ctx, evt);
    }

    @Override
    protected void channelRead0(ChannelHandlerContext ctx, TextWebSocketFrame frame) {
        String text = frame.text();

        try {
            JsonObject message = JsonParser.parseString(text).getAsJsonObject();
            String type = message.has("type") ? message.get("type").getAsString() : null;

            if (type == null) {
                sessionManager.sendError(ctx.channel(), "INVALID_MESSAGE", "Missing message type");
                return;
            }

            // Handle message based on type
            switch (type) {
                case "auth" -> handleAuth(ctx, message);
                case "subscribe" -> handleSubscribe(ctx, message);
                case "unsubscribe" -> handleUnsubscribe(ctx, message);
                case "ping" -> handlePing(ctx);
                default -> sessionManager.sendError(ctx.channel(), "UNKNOWN_TYPE", "Unknown message type: " + type);
            }

        } catch (Exception e) {
            LOGGER.log(Level.WARNING, "Error processing WebSocket message", e);
            sessionManager.sendError(ctx.channel(), "PARSE_ERROR", "Invalid message format");
        }
    }

    /**
     * Handle authentication message.
     */
    private void handleAuth(ChannelHandlerContext ctx, JsonObject message) {
        String token = message.has("token") ? message.get("token").getAsString() : null;

        if (token == null || token.isBlank()) {
            sessionManager.sendError(ctx.channel(), "AUTH_REQUIRED", "Token required for authentication");
            return;
        }

        // Validate token
        ValidatedToken result = tokenGenerator.validateToken(token);

        switch (result) {
            case ValidatedToken.Valid valid -> {
                // Check WebSocket permission
                if (!hasWsPermission(valid.permissions())) {
                    sessionManager.sendError(ctx.channel(), "FORBIDDEN",
                            "Missing permission: " + ApiPermissions.WEBSOCKET_CONNECT);
                    ctx.close();
                    return;
                }

                ClientIdentity identity = new ClientIdentity(
                        valid.clientId(),
                        valid.permissions(),
                        Instant.now(),
                        valid.expiry(),
                        valid.tokenId()
                );

                if (sessionManager.registerSession(ctx.channel(), identity)) {
                    // Send success response
                    String response = """
                            {"type":"auth_success","clientId":"%s","expiresIn":%d}"""
                            .formatted(identity.clientId(), identity.remainingSeconds());
                    ctx.writeAndFlush(new TextWebSocketFrame(response));

                    LOGGER.info("WebSocket authenticated: " + identity.clientId());
                } else {
                    sessionManager.sendError(ctx.channel(), "MAX_CONNECTIONS",
                            "Maximum WebSocket connections reached");
                    ctx.close();
                }
            }
            case ValidatedToken.Invalid invalid -> {
                sessionManager.sendError(ctx.channel(), "INVALID_TOKEN", invalid.reason());
                ctx.close();
            }
            case ValidatedToken.Expired expired -> {
                sessionManager.sendError(ctx.channel(), "EXPIRED_TOKEN", "Token has expired");
                ctx.close();
            }
        }
    }

    /**
     * Handle subscribe message.
     */
    private void handleSubscribe(ChannelHandlerContext ctx, JsonObject message) {
        var session = sessionManager.getSession(ctx.channel());
        if (session == null) {
            sessionManager.sendError(ctx.channel(), "NOT_AUTHENTICATED", "Authenticate first");
            return;
        }

        if (!message.has("events")) {
            sessionManager.sendError(ctx.channel(), "MISSING_FIELD", "events field required");
            return;
        }

        var eventsArray = message.getAsJsonArray("events");
        for (var event : eventsArray) {
            String eventType = event.getAsString();

            // Check permission for subscription
            if (!canSubscribe(session.identity(), eventType)) {
                sessionManager.sendError(ctx.channel(), "FORBIDDEN",
                        "No permission to subscribe to: " + eventType);
                continue;
            }

            sessionManager.subscribe(ctx.channel(), eventType);
        }

        // Confirm subscription
        String response = """
                {"type":"subscribed","events":%s}"""
                .formatted(GSON.toJson(session.subscriptions()));
        ctx.writeAndFlush(new TextWebSocketFrame(response));
    }

    /**
     * Handle unsubscribe message.
     */
    private void handleUnsubscribe(ChannelHandlerContext ctx, JsonObject message) {
        var session = sessionManager.getSession(ctx.channel());
        if (session == null) {
            sessionManager.sendError(ctx.channel(), "NOT_AUTHENTICATED", "Authenticate first");
            return;
        }

        if (!message.has("events")) {
            sessionManager.sendError(ctx.channel(), "MISSING_FIELD", "events field required");
            return;
        }

        var eventsArray = message.getAsJsonArray("events");
        for (var event : eventsArray) {
            sessionManager.unsubscribe(ctx.channel(), event.getAsString());
        }

        // Confirm unsubscription
        String response = """
                {"type":"unsubscribed","events":%s}"""
                .formatted(GSON.toJson(session.subscriptions()));
        ctx.writeAndFlush(new TextWebSocketFrame(response));
    }

    /**
     * Handle ping message.
     */
    private void handlePing(ChannelHandlerContext ctx) {
        String response = """
                {"type":"pong","timestamp":%d}"""
                .formatted(System.currentTimeMillis());
        ctx.writeAndFlush(new TextWebSocketFrame(response));
    }

    /**
     * Check if identity has WebSocket connect permission.
     */
    private boolean hasWsPermission(Set<String> permissions) {
        return permissions.contains("api.*")
                || permissions.contains(ApiPermissions.WEBSOCKET_CONNECT)
                || permissions.contains(ApiPermissions.ALL);
    }

    /**
     * Check if identity can subscribe to event type.
     */
    private boolean canSubscribe(ClientIdentity identity, String eventType) {
        // Map event types to permissions
        String requiredPermission = switch (eventType) {
            case "player.join", "player.leave", "player.*" -> ApiPermissions.WEBSOCKET_SUBSCRIBE_PLAYERS;
            case "player.chat", "chat.*" -> ApiPermissions.WEBSOCKET_SUBSCRIBE_CHAT;
            case "server.status", "server.*" -> ApiPermissions.WEBSOCKET_SUBSCRIBE_STATUS;
            case "server.log", "server.logs", "logs.*" -> ApiPermissions.WEBSOCKET_SUBSCRIBE_LOGS;
            case "*" -> ApiPermissions.WEBSOCKET_SUBSCRIBE_ALL;
            default -> {
                if (eventType.startsWith("player.")) yield ApiPermissions.WEBSOCKET_SUBSCRIBE_PLAYERS;
                if (eventType.startsWith("server.log")) yield ApiPermissions.WEBSOCKET_SUBSCRIBE_LOGS;
                if (eventType.startsWith("server.")) yield ApiPermissions.WEBSOCKET_SUBSCRIBE_STATUS;
                yield ApiPermissions.WEBSOCKET_SUBSCRIBE_ALL;
            }
        };

        return identity.hasPermission(requiredPermission);
    }

    @Override
    public void channelInactive(ChannelHandlerContext ctx) throws Exception {
        sessionManager.removeSession(ctx.channel());
        super.channelInactive(ctx);
    }

    @Override
    public void exceptionCaught(ChannelHandlerContext ctx, Throwable cause) {
        LOGGER.log(Level.WARNING, "WebSocket error", cause);
        sessionManager.removeSession(ctx.channel());
        ctx.close();
    }
}
