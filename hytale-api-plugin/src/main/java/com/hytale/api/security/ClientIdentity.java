package com.hytale.api.security;

import com.hytale.api.config.ApiConfig.ClientConfig;
import io.netty.util.AttributeKey;

import java.time.Instant;
import java.util.Set;

/**
 * Represents an authenticated API client's identity.
 * Attached to Netty channel attributes after successful authentication.
 */
public record ClientIdentity(
        String clientId,
        Set<String> permissions,
        Instant authenticatedAt,
        Instant tokenExpiry,
        String tokenId
) {
    /**
     * Netty attribute key for storing identity on channels.
     */
    public static final AttributeKey<ClientIdentity> ATTR_KEY =
            AttributeKey.valueOf("api.client.identity");

    /**
     * Create identity from a client configuration and JWT claims.
     */
    public static ClientIdentity from(ClientConfig client, String tokenId, Instant expiry) {
        return new ClientIdentity(
                client.id(),
                client.permissions(),
                Instant.now(),
                expiry,
                tokenId
        );
    }

    /**
     * Check if this identity has the specified permission.
     */
    public boolean hasPermission(String permission) {
        if (permissions == null || permissions.isEmpty()) {
            return false;
        }
        if (permissions.contains("api.*") || permissions.contains("*")) {
            return true;
        }
        if (permissions.contains(permission)) {
            return true;
        }
        // Check wildcard patterns
        String[] parts = permission.split("\\.");
        StringBuilder pattern = new StringBuilder();
        for (int i = 0; i < parts.length - 1; i++) {
            if (i > 0) pattern.append(".");
            pattern.append(parts[i]);
            if (permissions.contains(pattern + ".*")) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if the token has expired.
     */
    public boolean isExpired() {
        return tokenExpiry != null && Instant.now().isAfter(tokenExpiry);
    }

    /**
     * Get remaining token validity in seconds.
     */
    public long remainingSeconds() {
        if (tokenExpiry == null) {
            return Long.MAX_VALUE;
        }
        long remaining = tokenExpiry.getEpochSecond() - Instant.now().getEpochSecond();
        return Math.max(0, remaining);
    }
}
