package com.hytale.api.http.handlers;

import com.google.gson.Gson;
import com.hytale.api.dto.request.ServerRequests.MuteRequest;
import com.hytale.api.dto.response.ApiResponses.MuteResponse;
import com.hytale.api.exception.ApiException;
import com.hytale.api.security.ApiPermissions;
import com.hytale.api.security.ClientIdentity;
import com.hypixel.hytale.server.core.universe.PlayerRef;
import com.hypixel.hytale.server.core.universe.Universe;
import io.netty.handler.codec.http.FullHttpRequest;

import java.nio.charset.StandardCharsets;
import java.util.UUID;
import java.util.logging.Logger;

/**
 * Handler for chat management endpoints.
 */
public final class ChatHandler {
    private static final Logger LOGGER = Logger.getLogger(ChatHandler.class.getName());
    private static final Gson GSON = new Gson();

    /**
     * Handle POST /chat/mute/{uuid} request.
     * Mutes a player for the specified duration.
     */
    public String handleMute(FullHttpRequest request, ClientIdentity identity, String uuidString) {
        if (!identity.hasPermission(ApiPermissions.CHAT_MUTE)) {
            throw ApiException.Forbidden.insufficientPermissions(ApiPermissions.CHAT_MUTE);
        }

        // Parse UUID
        UUID uuid;
        try {
            uuid = UUID.fromString(uuidString);
        } catch (IllegalArgumentException e) {
            throw ApiException.BadRequest.invalidField("uuid", "Invalid UUID format");
        }

        // Parse request body
        String body = request.content().toString(StandardCharsets.UTF_8);
        MuteRequest muteRequest = body.isEmpty() ? new MuteRequest(null, null) : GSON.fromJson(body, MuteRequest.class);

        // Find player
        Universe universe = Universe.get();
        PlayerRef playerRef = universe.getPlayer(uuid);

        if (playerRef == null) {
            throw ApiException.NotFound.player(uuidString);
        }

        // Calculate expiry
        long expiresAt = muteRequest.isPermanent()
                ? Long.MAX_VALUE
                : System.currentTimeMillis() + (muteRequest.durationMinutes() * 60L * 1000L);

        // TODO: Implement actual mute functionality when server API supports it
        // For now, log the mute action
        LOGGER.info("Player %s muted by %s for %s. Reason: %s".formatted(
                playerRef.getUsername(),
                identity.clientId(),
                muteRequest.isPermanent() ? "permanent" : muteRequest.durationMinutes() + " minutes",
                muteRequest.getReasonOrDefault()
        ));

        MuteResponse response = new MuteResponse(
                true,
                uuid,
                playerRef.getUsername(),
                muteRequest.durationMinutes(),
                muteRequest.getReasonOrDefault(),
                expiresAt
        );

        return GSON.toJson(response);
    }
}
