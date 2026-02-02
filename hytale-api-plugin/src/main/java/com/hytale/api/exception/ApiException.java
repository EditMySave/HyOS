package com.hytale.api.exception;

import io.netty.handler.codec.http.HttpResponseStatus;

/**
 * Sealed exception hierarchy for API errors.
 * Uses Java 21 sealed classes for exhaustive pattern matching.
 */
@SuppressWarnings("serial")
public sealed abstract class ApiException extends RuntimeException
        permits ApiException.BadRequest,
                ApiException.Unauthorized,
                ApiException.Forbidden,
                ApiException.NotFound,
                ApiException.NotImplemented,
                ApiException.RateLimited,
                ApiException.InternalError {

    private final transient HttpResponseStatus status;
    private final String errorCode;

    protected ApiException(HttpResponseStatus status, String errorCode, String message) {
        super(message);
        this.status = status;
        this.errorCode = errorCode;
    }

    protected ApiException(HttpResponseStatus status, String errorCode, String message, Throwable cause) {
        super(message, cause);
        this.status = status;
        this.errorCode = errorCode;
    }

    public HttpResponseStatus status() {
        return status;
    }

    public String errorCode() {
        return errorCode;
    }

    /**
     * Convert exception to JSON response body.
     */
    public String toJson() {
        return """
                {"error":"%s","code":"%s","message":"%s"}"""
                .formatted(
                        status.reasonPhrase(),
                        errorCode,
                        escapeJson(getMessage())
                );
    }

    private static String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }

    // --- Concrete Exception Types ---

    /**
     * 400 Bad Request - Invalid input or malformed request.
     */
    public static final class BadRequest extends ApiException {
        public BadRequest(String message) {
            super(HttpResponseStatus.BAD_REQUEST, "BAD_REQUEST", message);
        }

        public BadRequest(String errorCode, String message) {
            super(HttpResponseStatus.BAD_REQUEST, errorCode, message);
        }

        public static BadRequest missingField(String field) {
            return new BadRequest("MISSING_FIELD", "Required field missing: " + field);
        }

        public static BadRequest invalidField(String field, String reason) {
            return new BadRequest("INVALID_FIELD", "Invalid field '%s': %s".formatted(field, reason));
        }

        public static BadRequest invalidJson(String details) {
            return new BadRequest("INVALID_JSON", "Invalid JSON: " + details);
        }

        public static BadRequest outOfBounds(String field, String reason) {
            return new BadRequest("OUT_OF_BOUNDS", "Value out of bounds for '%s': %s".formatted(field, reason));
        }

        public static BadRequest invalidItem(String reason) {
            return new BadRequest("INVALID_ITEM", "Invalid item: " + reason);
        }

        public static BadRequest invalidGameMode(String mode) {
            return new BadRequest("INVALID_GAMEMODE", "Invalid game mode: " + mode);
        }

        public static BadRequest invalidWeather(String weather) {
            return new BadRequest("INVALID_WEATHER", "Invalid weather type: " + weather);
        }

        public static BadRequest invalidCoordinates(String reason) {
            return new BadRequest("INVALID_COORDINATES", "Invalid coordinates: " + reason);
        }
    }

    /**
     * 401 Unauthorized - Missing or invalid authentication.
     */
    public static final class Unauthorized extends ApiException {
        public Unauthorized(String message) {
            super(HttpResponseStatus.UNAUTHORIZED, "UNAUTHORIZED", message);
        }

        public Unauthorized(String errorCode, String message) {
            super(HttpResponseStatus.UNAUTHORIZED, errorCode, message);
        }

        public static Unauthorized missingToken() {
            return new Unauthorized("MISSING_TOKEN", "Authorization header required");
        }

        public static Unauthorized invalidToken(String reason) {
            return new Unauthorized("INVALID_TOKEN", "Invalid token: " + reason);
        }

        public static Unauthorized expiredToken() {
            return new Unauthorized("EXPIRED_TOKEN", "Token has expired");
        }

        public static Unauthorized invalidCredentials() {
            return new Unauthorized("INVALID_CREDENTIALS", "Invalid client ID or secret");
        }
    }

    /**
     * 403 Forbidden - Valid auth but insufficient permissions.
     */
    public static final class Forbidden extends ApiException {
        public Forbidden(String message) {
            super(HttpResponseStatus.FORBIDDEN, "FORBIDDEN", message);
        }

        public Forbidden(String errorCode, String message) {
            super(HttpResponseStatus.FORBIDDEN, errorCode, message);
        }

        public static Forbidden insufficientPermissions(String required) {
            return new Forbidden("INSUFFICIENT_PERMISSIONS",
                    "Required permission: " + required);
        }

        public static Forbidden clientDisabled() {
            return new Forbidden("CLIENT_DISABLED", "API client is disabled");
        }
    }

    /**
     * 404 Not Found - Resource does not exist.
     */
    public static final class NotFound extends ApiException {
        public NotFound(String message) {
            super(HttpResponseStatus.NOT_FOUND, "NOT_FOUND", message);
        }

        public NotFound(String errorCode, String message) {
            super(HttpResponseStatus.NOT_FOUND, errorCode, message);
        }

        public static NotFound endpoint(String path) {
            return new NotFound("ENDPOINT_NOT_FOUND", "Endpoint not found: " + path);
        }

        public static NotFound player(String identifier) {
            return new NotFound("PLAYER_NOT_FOUND", "Player not found: " + identifier);
        }

        public static NotFound world(String identifier) {
            return new NotFound("WORLD_NOT_FOUND", "World not found: " + identifier);
        }

        public static NotFound entity(String identifier) {
            return new NotFound("ENTITY_NOT_FOUND", "Entity not found: " + identifier);
        }

        public static NotFound block(int x, int y, int z, String world) {
            return new NotFound("BLOCK_NOT_FOUND",
                    "Block not found at %d,%d,%d in world %s".formatted(x, y, z, world));
        }

        public static NotFound plugin(String name) {
            return new NotFound("PLUGIN_NOT_FOUND", "Plugin not found: " + name);
        }

        public static NotFound inventorySlot(int slot) {
            return new NotFound("SLOT_NOT_FOUND", "Inventory slot not found: " + slot);
        }
    }

    /**
     * 501 Not Implemented - Endpoint exists but functionality is not yet available.
     */
    public static final class NotImplemented extends ApiException {
        public NotImplemented(String message) {
            super(HttpResponseStatus.NOT_IMPLEMENTED, "NOT_IMPLEMENTED", message);
        }

        public NotImplemented(String errorCode, String message) {
            super(HttpResponseStatus.NOT_IMPLEMENTED, errorCode, message);
        }

        public static NotImplemented endpoint(String endpoint) {
            return new NotImplemented("ENDPOINT_NOT_IMPLEMENTED",
                    "Endpoint not yet implemented: " + endpoint);
        }

        public static NotImplemented feature(String feature) {
            return new NotImplemented("FEATURE_NOT_IMPLEMENTED",
                    "Feature not yet implemented: " + feature);
        }
    }

    /**
     * 429 Too Many Requests - Rate limit exceeded.
     */
    public static final class RateLimited extends ApiException {
        private final long retryAfterSeconds;

        public RateLimited(long retryAfterSeconds) {
            super(HttpResponseStatus.TOO_MANY_REQUESTS, "RATE_LIMITED",
                    "Rate limit exceeded. Retry after %d seconds".formatted(retryAfterSeconds));
            this.retryAfterSeconds = retryAfterSeconds;
        }

        public long retryAfterSeconds() {
            return retryAfterSeconds;
        }

        @Override
        public String toJson() {
            return """
                    {"error":"Too Many Requests","code":"RATE_LIMITED","message":"%s","retryAfter":%d}"""
                    .formatted(getMessage(), retryAfterSeconds);
        }
    }

    /**
     * 500 Internal Server Error - Unexpected server error.
     */
    public static final class InternalError extends ApiException {
        public InternalError(String message) {
            super(HttpResponseStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", message);
        }

        public InternalError(String message, Throwable cause) {
            super(HttpResponseStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", message, cause);
        }

        public static InternalError unexpected(Throwable cause) {
            return new InternalError("An unexpected error occurred", cause);
        }
    }
}
