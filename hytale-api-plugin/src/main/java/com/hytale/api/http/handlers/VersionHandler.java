package com.hytale.api.http.handlers;

import com.google.gson.Gson;
import com.hytale.api.dto.response.ApiResponses.VersionResponse;
import com.hytale.api.exception.ApiException;
import com.hytale.api.security.ApiPermissions;
import com.hytale.api.security.ClientIdentity;
import com.hypixel.hytale.common.util.java.ManifestUtil;
import com.hypixel.hytale.protocol.ProtocolSettings;
import io.netty.handler.codec.http.FullHttpRequest;

/**
 * Handler for version information endpoint.
 * GET /server/version
 */
public final class VersionHandler {
    private static final Gson GSON = new Gson();
    private static final String PLUGIN_VERSION = "1.0.0";
    
    /**
     * Try to get PROTOCOL_HASH via reflection, as it may not exist in all versions.
     */
    private static String getProtocolHash() {
        try {
            var field = ProtocolSettings.class.getField("PROTOCOL_HASH");
            return (String) field.get(null);
        } catch (NoSuchFieldException | IllegalAccessException e) {
            return "unknown";
        }
    }

    /**
     * Handle GET /server/version request.
     * Returns game version, protocol version, and plugin version.
     */
    public String handle(FullHttpRequest request, ClientIdentity identity) {
        if (!identity.hasPermission(ApiPermissions.VERSION_READ)) {
            throw ApiException.Forbidden.insufficientPermissions(ApiPermissions.VERSION_READ);
        }

        String gameVersion = ManifestUtil.getImplementationVersion();
        String revisionId = ManifestUtil.getImplementationRevisionId();
        String patchline = ManifestUtil.getPatchline();

        // PROTOCOL_HASH constant may not exist in all Hytale versions
        String protocolHash = getProtocolHash();
        
        VersionResponse response = new VersionResponse(
                gameVersion != null ? gameVersion : "unknown",
                revisionId != null ? revisionId : "unknown",
                patchline != null ? patchline : "unknown",
                ProtocolSettings.PROTOCOL_VERSION,
                protocolHash,
                PLUGIN_VERSION
        );

        return GSON.toJson(response);
    }
}
