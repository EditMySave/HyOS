package com.hytale.api.http.handlers;

import com.google.gson.Gson;
import com.hytale.api.dto.response.ApiResponses.*;
import com.hytale.api.exception.ApiException;
import com.hytale.api.security.ApiPermissions;
import com.hytale.api.security.ClientIdentity;
import com.hypixel.hytale.server.core.HytaleServer;
import com.hypixel.hytale.server.core.plugin.PluginBase;
import com.hypixel.hytale.server.core.plugin.PluginManager;
import io.netty.handler.codec.http.FullHttpRequest;

import java.util.ArrayList;
import java.util.List;

/**
 * Handler for extended server management endpoints (metrics, plugins, whitelist, save).
 */
public final class ServerExtendedHandler {
    private static final Gson GSON = new Gson();

    /**
     * Handle GET /server/metrics request.
     * Returns server performance metrics.
     */
    public String handleMetrics(FullHttpRequest request, ClientIdentity identity) {
        if (!identity.hasPermission(ApiPermissions.SERVER_METRICS_READ)) {
            throw ApiException.Forbidden.insufficientPermissions(ApiPermissions.SERVER_METRICS_READ);
        }

        // TODO: Implement when server exposes TPS, tick time, entity counts, and chunk metrics
        throw ApiException.NotImplemented.endpoint("/server/metrics");
    }

    /**
     * Handle GET /server/plugins request.
     * Returns list of loaded plugins.
     */
    public String handlePlugins(FullHttpRequest request, ClientIdentity identity) {
        if (!identity.hasPermission(ApiPermissions.SERVER_PLUGINS_READ)) {
            throw ApiException.Forbidden.insufficientPermissions(ApiPermissions.SERVER_PLUGINS_READ);
        }

        HytaleServer server = HytaleServer.get();
        PluginManager pluginManager = server.getPluginManager();

        List<PluginsResponse.PluginInfo> plugins = new ArrayList<>();

        // Get all loaded plugins
        for (PluginBase plugin : pluginManager.getPlugins()) {
            String name = plugin.getClass().getSimpleName();
            String version = "1.0.0"; // TODO: Get from plugin manifest
            String description = ""; // TODO: Get from plugin manifest
            String state = plugin.getState().name();
            List<String> authors = List.of(); // TODO: Get from plugin manifest

            plugins.add(new PluginsResponse.PluginInfo(
                    name,
                    version,
                    description,
                    state,
                    authors
            ));
        }

        PluginsResponse response = new PluginsResponse(plugins.size(), plugins);

        return GSON.toJson(response);
    }

    /**
     * Handle POST /server/whitelist request.
     * Manages server whitelist.
     */
    public String handleWhitelist(FullHttpRequest request, ClientIdentity identity) {
        if (!identity.hasPermission(ApiPermissions.SERVER_WHITELIST_WRITE)) {
            throw ApiException.Forbidden.insufficientPermissions(ApiPermissions.SERVER_WHITELIST_WRITE);
        }

        // TODO: Implement when server exposes AccessControl/whitelist management API
        throw ApiException.NotImplemented.endpoint("/server/whitelist");
    }

    /**
     * Handle POST /server/save request.
     * Forces a world save.
     */
    public String handleSave(FullHttpRequest request, ClientIdentity identity) {
        if (!identity.hasPermission(ApiPermissions.SERVER_SAVE)) {
            throw ApiException.Forbidden.insufficientPermissions(ApiPermissions.SERVER_SAVE);
        }

        // TODO: Implement when server exposes world save API
        throw ApiException.NotImplemented.endpoint("/server/save");
    }
}
