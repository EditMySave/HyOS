package com.hytale.api.dto.request;

/**
 * Request body for token authentication.
 */
public record AuthRequest(
        String clientId,
        String secret
) {
    public boolean isValid() {
        return clientId != null && !clientId.isBlank()
                && secret != null && !secret.isBlank();
    }
}
