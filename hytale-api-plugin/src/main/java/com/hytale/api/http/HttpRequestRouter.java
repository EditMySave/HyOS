package com.hytale.api.http;

import com.hytale.api.config.ApiConfig;
import com.hytale.api.exception.ApiException;
import com.hytale.api.http.handlers.*;
import com.hytale.api.ratelimit.RateLimitMiddleware;
import com.hytale.api.security.ClientIdentity;
import com.hytale.api.security.TokenGenerator;
import com.hytale.api.security.TokenGenerator.ValidatedToken;
import io.netty.buffer.Unpooled;
import io.netty.channel.ChannelFutureListener;
import io.netty.channel.ChannelHandler;
import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.SimpleChannelInboundHandler;
import io.netty.handler.codec.http.*;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Main HTTP request router using Java 21 pattern matching.
 * Routes requests to appropriate handlers based on method and path.
 */
@ChannelHandler.Sharable
public final class HttpRequestRouter extends SimpleChannelInboundHandler<FullHttpRequest> {
    private static final Logger LOGGER = Logger.getLogger(HttpRequestRouter.class.getName());

    // Path patterns for UUID extraction
    private static final Pattern PLAYERS_DETAIL = Pattern.compile("^/players/([a-fA-F0-9-]+)$");
    private static final Pattern WORLDS_DETAIL = Pattern.compile("^/worlds/([^/]+)$");
    private static final Pattern WORLDS_STATS = Pattern.compile("^/worlds/([^/]+)/stats$");
    private static final Pattern ADMIN_PATTERN = Pattern.compile("^/admin/(command|kick|ban|broadcast)$");

    // Extended player patterns (more specific patterns first)
    private static final Pattern PLAYERS_INVENTORY_HOTBAR = Pattern.compile("^/players/([a-fA-F0-9-]+)/inventory/hotbar$");
    private static final Pattern PLAYERS_INVENTORY_ARMOR = Pattern.compile("^/players/([a-fA-F0-9-]+)/inventory/armor$");
    private static final Pattern PLAYERS_INVENTORY_STORAGE = Pattern.compile("^/players/([a-fA-F0-9-]+)/inventory/storage$");
    private static final Pattern PLAYERS_INVENTORY_GIVE = Pattern.compile("^/players/([a-fA-F0-9-]+)/inventory/give$");
    private static final Pattern PLAYERS_INVENTORY_CLEAR = Pattern.compile("^/players/([a-fA-F0-9-]+)/inventory/clear$");
    private static final Pattern PLAYERS_INVENTORY = Pattern.compile("^/players/([a-fA-F0-9-]+)/inventory$");
    private static final Pattern PLAYERS_STATS = Pattern.compile("^/players/([a-fA-F0-9-]+)/stats$");
    private static final Pattern PLAYERS_LOCATION = Pattern.compile("^/players/([a-fA-F0-9-]+)/location$");
    private static final Pattern PLAYERS_TELEPORT = Pattern.compile("^/players/([a-fA-F0-9-]+)/teleport$");
    private static final Pattern PLAYERS_GAMEMODE = Pattern.compile("^/players/([a-fA-F0-9-]+)/gamemode$");
    private static final Pattern PLAYERS_PERMISSIONS = Pattern.compile("^/players/([a-fA-F0-9-]+)/permissions$");
    private static final Pattern PLAYERS_PERMISSIONS_REVOKE = Pattern.compile("^/players/([a-fA-F0-9-]+)/permissions/(.+)$");
    private static final Pattern PLAYERS_GROUPS = Pattern.compile("^/players/([a-fA-F0-9-]+)/groups$");
    private static final Pattern PLAYERS_MESSAGE = Pattern.compile("^/players/([a-fA-F0-9-]+)/message$");

    // Extended world patterns
    private static final Pattern WORLDS_TIME = Pattern.compile("^/worlds/([^/]+)/time$");
    private static final Pattern WORLDS_WEATHER = Pattern.compile("^/worlds/([^/]+)/weather$");
    private static final Pattern WORLDS_ENTITIES = Pattern.compile("^/worlds/([^/]+)/entities$");
    private static final Pattern WORLDS_BLOCK = Pattern.compile("^/worlds/([^/]+)/blocks/(-?\\d+)/(-?\\d+)/(-?\\d+)$");

    // Chat pattern
    private static final Pattern CHAT_MUTE = Pattern.compile("^/chat/mute/([a-fA-F0-9-]+)$");

    // Permissions patterns
    private static final Pattern SERVER_PERMISSIONS = Pattern.compile("^/server/permissions$");
    private static final Pattern SERVER_PERMISSIONS_GROUPS = Pattern.compile("^/server/permissions/groups$");
    private static final Pattern SERVER_PERMISSIONS_GROUPS_NAME = Pattern.compile("^/server/permissions/groups/([^/]+)$");
    private static final Pattern SERVER_PERMISSIONS_OP = Pattern.compile("^/server/permissions/op$");
    private static final Pattern SERVER_PERMISSIONS_OP_PLAYER = Pattern.compile("^/server/permissions/op/(.+)$");

    private final ApiConfig config;
    private final TokenGenerator tokenGenerator;

    // Handlers
    private final HealthHandler healthHandler;
    private final AuthHandler authHandler;
    private final StatusHandler statusHandler;
    private final PlayersHandler playersHandler;
    private final WorldsHandler worldsHandler;
    private final AdminHandler adminHandler;
    private final StatsHandler statsHandler;

    // Extended handlers
    private final VersionHandler versionHandler;
    private final PlayerInventoryHandler playerInventoryHandler;
    private final PlayerExtendedHandler playerExtendedHandler;
    private final WorldExtendedHandler worldExtendedHandler;
    private final ServerExtendedHandler serverExtendedHandler;
    private final ChatHandler chatHandler;
    private final PermissionsHandler permissionsHandler;

    public HttpRequestRouter(ApiConfig config, TokenGenerator tokenGenerator, java.nio.file.Path serverRoot) {
        this.config = config;
        this.tokenGenerator = tokenGenerator;

        // Initialize handlers
        this.healthHandler = new HealthHandler();
        this.authHandler = new AuthHandler(config, tokenGenerator);
        this.statusHandler = new StatusHandler();
        this.playersHandler = new PlayersHandler();
        this.worldsHandler = new WorldsHandler();
        this.adminHandler = new AdminHandler();
        this.statsHandler = new StatsHandler();

        // Initialize extended handlers
        this.versionHandler = new VersionHandler();
        this.playerInventoryHandler = new PlayerInventoryHandler();
        this.worldExtendedHandler = new WorldExtendedHandler();
        this.serverExtendedHandler = new ServerExtendedHandler();
        this.chatHandler = new ChatHandler();
        this.permissionsHandler = new PermissionsHandler(serverRoot, adminHandler);
        this.playerExtendedHandler = new PlayerExtendedHandler(permissionsHandler, adminHandler);
    }

    @Override
    protected void channelRead0(ChannelHandlerContext ctx, FullHttpRequest request) {
        String path = getPath(request.uri());
        HttpMethod method = request.method();

        LOGGER.fine(() -> "Request: %s %s".formatted(method, path));

        try {
            // Handle CORS preflight
            if (method == HttpMethod.OPTIONS) {
                handleCors(ctx, request);
                return;
            }

            // Route request
            String response = route(ctx, request, method, path);

            // Send successful response
            sendResponse(ctx, HttpResponseStatus.OK, response, request);

        } catch (ApiException e) {
            LOGGER.log(Level.FINE, "API error: " + e.getMessage(), e);
            sendErrorResponse(ctx, e, request);
        } catch (Exception e) {
            LOGGER.log(Level.WARNING, "Unexpected error handling request", e);
            sendErrorResponse(ctx, new ApiException.InternalError("Internal server error"), request);
        }
    }

    /**
     * Route request to appropriate handler using pattern matching.
     */
    private String route(ChannelHandlerContext ctx, FullHttpRequest request, HttpMethod method, String path) {
        // Public endpoints (no auth required)
        if (path.equals("/health") && method == HttpMethod.GET) {
            return healthHandler.handle(request);
        }

        if (path.equals("/auth/token") && method == HttpMethod.POST) {
            return authHandler.handle(request);
        }

        // Protected endpoints - require authentication
        ClientIdentity identity = authenticate(request);

        // Server status
        if (path.equals("/server/status") && method == HttpMethod.GET) {
            return statusHandler.handle(request, identity);
        }

        // Server detailed stats
        if (path.equals("/server/stats") && method == HttpMethod.GET) {
            return statsHandler.handleServerStats(request, identity);
        }

        // Server version
        if (path.equals("/server/version") && method == HttpMethod.GET) {
            return versionHandler.handle(request, identity);
        }

        // Server metrics
        if (path.equals("/server/metrics") && method == HttpMethod.GET) {
            return serverExtendedHandler.handleMetrics(request, identity);
        }

        // Server plugins
        if (path.equals("/server/plugins") && method == HttpMethod.GET) {
            return serverExtendedHandler.handlePlugins(request, identity);
        }

        // Server whitelist
        if (path.equals("/server/whitelist") && method == HttpMethod.POST) {
            return serverExtendedHandler.handleWhitelist(request, identity);
        }

        // Server save
        if (path.equals("/server/save") && method == HttpMethod.POST) {
            return serverExtendedHandler.handleSave(request, identity);
        }

        // Server permissions - more specific patterns first
        Matcher permGroupsNameMatcher = SERVER_PERMISSIONS_GROUPS_NAME.matcher(path);
        if (permGroupsNameMatcher.matches()) {
            String groupName = permGroupsNameMatcher.group(1);
            if (method == HttpMethod.PUT) {
                return permissionsHandler.handleUpdateGroup(request, identity, groupName);
            }
            if (method == HttpMethod.DELETE) {
                return permissionsHandler.handleDeleteGroup(request, identity, groupName);
            }
        }

        Matcher permOpPlayerMatcher = SERVER_PERMISSIONS_OP_PLAYER.matcher(path);
        if (permOpPlayerMatcher.matches() && method == HttpMethod.DELETE) {
            return permissionsHandler.handleRemoveOp(request, identity, permOpPlayerMatcher.group(1));
        }

        if (path.equals("/server/permissions") && method == HttpMethod.GET) {
            return permissionsHandler.handleGetPermissions(request, identity);
        }

        if (path.equals("/server/permissions/groups")) {
            if (method == HttpMethod.GET) {
                return permissionsHandler.handleGetGroups(request, identity);
            }
            if (method == HttpMethod.POST) {
                return permissionsHandler.handleCreateGroup(request, identity);
            }
        }

        if (path.equals("/server/permissions/op") && method == HttpMethod.POST) {
            return permissionsHandler.handleAddOp(request, identity);
        }

        // Players list
        if (path.equals("/players") && method == HttpMethod.GET) {
            return playersHandler.handleList(request, identity);
        }

        // Player inventory - specific endpoints first
        Matcher inventoryHotbarMatcher = PLAYERS_INVENTORY_HOTBAR.matcher(path);
        if (inventoryHotbarMatcher.matches() && method == HttpMethod.GET) {
            return playerInventoryHandler.handleHotbar(request, identity, inventoryHotbarMatcher.group(1));
        }

        Matcher inventoryArmorMatcher = PLAYERS_INVENTORY_ARMOR.matcher(path);
        if (inventoryArmorMatcher.matches() && method == HttpMethod.GET) {
            return playerInventoryHandler.handleArmor(request, identity, inventoryArmorMatcher.group(1));
        }

        Matcher inventoryStorageMatcher = PLAYERS_INVENTORY_STORAGE.matcher(path);
        if (inventoryStorageMatcher.matches() && method == HttpMethod.GET) {
            return playerInventoryHandler.handleStorage(request, identity, inventoryStorageMatcher.group(1));
        }

        Matcher inventoryGiveMatcher = PLAYERS_INVENTORY_GIVE.matcher(path);
        if (inventoryGiveMatcher.matches() && method == HttpMethod.POST) {
            return playerInventoryHandler.handleGiveItem(request, identity, inventoryGiveMatcher.group(1));
        }

        Matcher inventoryClearMatcher = PLAYERS_INVENTORY_CLEAR.matcher(path);
        if (inventoryClearMatcher.matches() && method == HttpMethod.POST) {
            return playerInventoryHandler.handleClearInventory(request, identity, inventoryClearMatcher.group(1));
        }

        Matcher inventoryMatcher = PLAYERS_INVENTORY.matcher(path);
        if (inventoryMatcher.matches() && method == HttpMethod.GET) {
            return playerInventoryHandler.handleFullInventory(request, identity, inventoryMatcher.group(1));
        }

        // Player stats
        Matcher playerStatsMatcher = PLAYERS_STATS.matcher(path);
        if (playerStatsMatcher.matches() && method == HttpMethod.GET) {
            return playerExtendedHandler.handleStats(request, identity, playerStatsMatcher.group(1));
        }

        // Player location
        Matcher playerLocationMatcher = PLAYERS_LOCATION.matcher(path);
        if (playerLocationMatcher.matches() && method == HttpMethod.GET) {
            return playerExtendedHandler.handleLocation(request, identity, playerLocationMatcher.group(1));
        }

        // Player teleport
        Matcher playerTeleportMatcher = PLAYERS_TELEPORT.matcher(path);
        if (playerTeleportMatcher.matches() && method == HttpMethod.POST) {
            return playerExtendedHandler.handleTeleport(request, identity, playerTeleportMatcher.group(1));
        }

        // Player game mode
        Matcher playerGameModeMatcher = PLAYERS_GAMEMODE.matcher(path);
        if (playerGameModeMatcher.matches()) {
            String uuid = playerGameModeMatcher.group(1);
            if (method == HttpMethod.GET) {
                return playerExtendedHandler.handleGetGameMode(request, identity, uuid);
            } else if (method == HttpMethod.POST) {
                return playerExtendedHandler.handleSetGameMode(request, identity, uuid);
            }
        }

        // Player permissions - revoke first (more specific)
        Matcher playerPermRevokeMatcher = PLAYERS_PERMISSIONS_REVOKE.matcher(path);
        if (playerPermRevokeMatcher.matches() && method == HttpMethod.DELETE) {
            return playerExtendedHandler.handleRevokePermission(request, identity,
                    playerPermRevokeMatcher.group(1), playerPermRevokeMatcher.group(2));
        }

        // Player permissions - list/grant
        Matcher playerPermsMatcher = PLAYERS_PERMISSIONS.matcher(path);
        if (playerPermsMatcher.matches()) {
            String uuid = playerPermsMatcher.group(1);
            if (method == HttpMethod.GET) {
                return playerExtendedHandler.handleGetPermissions(request, identity, uuid);
            } else if (method == HttpMethod.POST) {
                return playerExtendedHandler.handleGrantPermission(request, identity, uuid);
            }
        }

        // Player groups
        Matcher playerGroupsMatcher = PLAYERS_GROUPS.matcher(path);
        if (playerGroupsMatcher.matches()) {
            String uuid = playerGroupsMatcher.group(1);
            if (method == HttpMethod.GET) {
                return playerExtendedHandler.handleGetGroups(request, identity, uuid);
            } else if (method == HttpMethod.POST) {
                return playerExtendedHandler.handleAddToGroup(request, identity, uuid);
            }
        }

        // Player message
        Matcher playerMessageMatcher = PLAYERS_MESSAGE.matcher(path);
        if (playerMessageMatcher.matches() && method == HttpMethod.POST) {
            return playerExtendedHandler.handleSendMessage(request, identity, playerMessageMatcher.group(1));
        }

        // Player detail (must come after more specific player routes)
        Matcher playerMatcher = PLAYERS_DETAIL.matcher(path);
        if (playerMatcher.matches() && method == HttpMethod.GET) {
            return playersHandler.handleDetail(request, identity, playerMatcher.group(1));
        }

        // Worlds list
        if (path.equals("/worlds") && method == HttpMethod.GET) {
            return worldsHandler.handleList(request, identity);
        }

        // World time
        Matcher worldTimeMatcher = WORLDS_TIME.matcher(path);
        if (worldTimeMatcher.matches()) {
            String worldId = worldTimeMatcher.group(1);
            if (method == HttpMethod.GET) {
                return worldExtendedHandler.handleGetTime(request, identity, worldId);
            } else if (method == HttpMethod.POST) {
                return worldExtendedHandler.handleSetTime(request, identity, worldId);
            }
        }

        // World weather
        Matcher worldWeatherMatcher = WORLDS_WEATHER.matcher(path);
        if (worldWeatherMatcher.matches()) {
            String worldId = worldWeatherMatcher.group(1);
            if (method == HttpMethod.GET) {
                return worldExtendedHandler.handleGetWeather(request, identity, worldId);
            } else if (method == HttpMethod.POST) {
                return worldExtendedHandler.handleSetWeather(request, identity, worldId);
            }
        }

        // World entities
        Matcher worldEntitiesMatcher = WORLDS_ENTITIES.matcher(path);
        if (worldEntitiesMatcher.matches() && method == HttpMethod.GET) {
            return worldExtendedHandler.handleListEntities(request, identity, worldEntitiesMatcher.group(1));
        }

        // World block
        Matcher worldBlockMatcher = WORLDS_BLOCK.matcher(path);
        if (worldBlockMatcher.matches()) {
            String worldId = worldBlockMatcher.group(1);
            int x = Integer.parseInt(worldBlockMatcher.group(2));
            int y = Integer.parseInt(worldBlockMatcher.group(3));
            int z = Integer.parseInt(worldBlockMatcher.group(4));
            if (method == HttpMethod.GET) {
                return worldExtendedHandler.handleGetBlock(request, identity, worldId, x, y, z);
            } else if (method == HttpMethod.POST) {
                return worldExtendedHandler.handleSetBlock(request, identity, worldId, x, y, z);
            }
        }

        // World stats - must come before worlds detail to avoid conflict
        Matcher worldStatsMatcher = WORLDS_STATS.matcher(path);
        if (worldStatsMatcher.matches() && method == HttpMethod.GET) {
            return statsHandler.handleWorldStats(request, identity, worldStatsMatcher.group(1));
        }

        // World detail (must come after more specific world routes)
        Matcher worldMatcher = WORLDS_DETAIL.matcher(path);
        if (worldMatcher.matches() && method == HttpMethod.GET) {
            return worldsHandler.handleDetail(request, identity, worldMatcher.group(1));
        }

        // Chat mute
        Matcher chatMuteMatcher = CHAT_MUTE.matcher(path);
        if (chatMuteMatcher.matches() && method == HttpMethod.POST) {
            return chatHandler.handleMute(request, identity, chatMuteMatcher.group(1));
        }

        // Admin endpoints
        Matcher adminMatcher = ADMIN_PATTERN.matcher(path);
        if (adminMatcher.matches() && method == HttpMethod.POST) {
            String action = adminMatcher.group(1).toUpperCase();
            return adminHandler.handle(request, identity, AdminHandler.AdminAction.valueOf(action));
        }

        // No match
        throw ApiException.NotFound.endpoint(path);
    }

    /**
     * Authenticate request and return client identity.
     */
    private ClientIdentity authenticate(FullHttpRequest request) {
        String authHeader = request.headers().get(HttpHeaderNames.AUTHORIZATION);

        if (authHeader == null || authHeader.isBlank()) {
            throw ApiException.Unauthorized.missingToken();
        }

        // Parse Bearer token
        if (!authHeader.startsWith("Bearer ")) {
            throw ApiException.Unauthorized.invalidToken("Expected Bearer token");
        }

        String token = authHeader.substring(7);

        // Validate token
        ValidatedToken result = tokenGenerator.validateToken(token);

        return switch (result) {
            case ValidatedToken.Valid valid -> new ClientIdentity(
                    valid.clientId(),
                    valid.permissions(),
                    Instant.now(),
                    valid.expiry(),
                    valid.tokenId()
            );
            case ValidatedToken.Invalid invalid -> throw ApiException.Unauthorized.invalidToken(invalid.reason());
            case ValidatedToken.Expired expired -> throw ApiException.Unauthorized.expiredToken();
        };
    }

    /**
     * Handle CORS preflight request.
     */
    private void handleCors(ChannelHandlerContext ctx, FullHttpRequest request) {
        FullHttpResponse response = new DefaultFullHttpResponse(
                HttpVersion.HTTP_1_1,
                HttpResponseStatus.NO_CONTENT
        );

        addCorsHeaders(response, request);

        ctx.writeAndFlush(response).addListener(ChannelFutureListener.CLOSE);
    }

    /**
     * Send successful JSON response.
     */
    private void sendResponse(ChannelHandlerContext ctx, HttpResponseStatus status,
                              String body, FullHttpRequest request) {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);

        FullHttpResponse response = new DefaultFullHttpResponse(
                HttpVersion.HTTP_1_1,
                status,
                Unpooled.wrappedBuffer(bytes)
        );

        response.headers().set(HttpHeaderNames.CONTENT_TYPE, "application/json; charset=utf-8");
        response.headers().set(HttpHeaderNames.CONTENT_LENGTH, bytes.length);

        // Add rate limit headers
        Integer remaining = ctx.channel().attr(RateLimitMiddleware.REMAINING_TOKENS_KEY).get();
        if (remaining != null) {
            response.headers().set("X-RateLimit-Remaining", remaining);
        }

        addCorsHeaders(response, request);

        ctx.writeAndFlush(response).addListener(ChannelFutureListener.CLOSE);
    }

    /**
     * Send error response.
     */
    private void sendErrorResponse(ChannelHandlerContext ctx, ApiException error, FullHttpRequest request) {
        byte[] bytes = error.toJson().getBytes(StandardCharsets.UTF_8);

        FullHttpResponse response = new DefaultFullHttpResponse(
                HttpVersion.HTTP_1_1,
                error.status(),
                Unpooled.wrappedBuffer(bytes)
        );

        response.headers().set(HttpHeaderNames.CONTENT_TYPE, "application/json; charset=utf-8");
        response.headers().set(HttpHeaderNames.CONTENT_LENGTH, bytes.length);

        // Add retry-after for rate limiting
        if (error instanceof ApiException.RateLimited rateLimited) {
            response.headers().set("Retry-After", rateLimited.retryAfterSeconds());
        }

        addCorsHeaders(response, request);

        ctx.writeAndFlush(response).addListener(ChannelFutureListener.CLOSE);
    }

    /**
     * Add CORS headers to response.
     */
    private void addCorsHeaders(FullHttpResponse response, FullHttpRequest request) {
        var cors = config.cors();

        String origin = request.headers().get(HttpHeaderNames.ORIGIN);
        if (origin != null && cors.isOriginAllowed(origin)) {
            response.headers().set(HttpHeaderNames.ACCESS_CONTROL_ALLOW_ORIGIN, origin);
        } else if (cors.allowedOrigins().contains("*")) {
            response.headers().set(HttpHeaderNames.ACCESS_CONTROL_ALLOW_ORIGIN, "*");
        }

        response.headers().set(HttpHeaderNames.ACCESS_CONTROL_ALLOW_METHODS,
                String.join(", ", cors.allowedMethods()));
        response.headers().set(HttpHeaderNames.ACCESS_CONTROL_ALLOW_HEADERS,
                String.join(", ", cors.allowedHeaders()));

        if (!cors.exposedHeaders().isEmpty()) {
            response.headers().set(HttpHeaderNames.ACCESS_CONTROL_EXPOSE_HEADERS,
                    String.join(", ", cors.exposedHeaders()));
        }

        if (cors.allowCredentials()) {
            response.headers().set(HttpHeaderNames.ACCESS_CONTROL_ALLOW_CREDENTIALS, "true");
        }

        response.headers().set(HttpHeaderNames.ACCESS_CONTROL_MAX_AGE, cors.maxAge());
    }

    /**
     * Extract path from URI (remove query string).
     */
    private String getPath(String uri) {
        int queryStart = uri.indexOf('?');
        return queryStart > 0 ? uri.substring(0, queryStart) : uri;
    }

    @Override
    public void exceptionCaught(ChannelHandlerContext ctx, Throwable cause) {
        LOGGER.log(Level.WARNING, "Channel exception", cause);
        ctx.close();
    }
}
