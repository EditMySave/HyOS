package com.hytale.api.http.handlers;

import com.google.gson.Gson;
import com.hytale.api.dto.response.ApiResponses.HealthResponse;
import io.netty.handler.codec.http.FullHttpRequest;

/**
 * Handler for GET /health endpoint.
 * No authentication required.
 */
public final class HealthHandler {
    private static final Gson GSON = new Gson();

    public String handle(FullHttpRequest request) {
        return GSON.toJson(HealthResponse.ok());
    }
}
