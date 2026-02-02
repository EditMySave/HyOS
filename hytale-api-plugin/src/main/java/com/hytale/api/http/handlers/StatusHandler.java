package com.hytale.api.http.handlers;

import com.google.gson.Gson;
import com.hytale.api.dto.response.ApiResponses.StatusResponse;
import com.hytale.api.dto.response.ApiResponses.StatusResponse.MemoryInfo;
import com.hytale.api.exception.ApiException;
import com.hytale.api.security.ApiPermissions;
import com.hytale.api.security.ClientIdentity;
import com.hypixel.hytale.server.core.HytaleServer;
import com.hypixel.hytale.server.core.universe.Universe;
import io.netty.handler.codec.http.FullHttpRequest;

/**
 * Handler for GET /server/status endpoint.
 * Requires api.status.read permission.
 */
public final class StatusHandler {
    private static final Gson GSON = new Gson();

    public String handle(FullHttpRequest request, ClientIdentity identity) {
        // Check permission
        if (!identity.hasPermission(ApiPermissions.STATUS_READ)) {
            throw ApiException.Forbidden.insufficientPermissions(ApiPermissions.STATUS_READ);
        }

        HytaleServer server = HytaleServer.get();
        Universe universe = Universe.get();
        Runtime runtime = Runtime.getRuntime();

        // getBoot() returns Instant of when server started
        long uptimeMs = System.currentTimeMillis() - server.getBoot().toEpochMilli();
        long usedMemory = runtime.totalMemory() - runtime.freeMemory();

        StatusResponse response = new StatusResponse(
                server.getServerName(),
                server.getServerName(), // MOTD if available
                universe.getPlayerCount(),
                server.getConfig().getMaxPlayers(),
                uptimeMs,
                new MemoryInfo(usedMemory, runtime.maxMemory(), runtime.freeMemory()),
                true
        );

        return GSON.toJson(response);
    }
}
