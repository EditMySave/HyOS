package com.hytale.api.config;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;

import java.io.IOException;
import java.io.Reader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Main configuration record for the Hytale API Plugin.
 * Uses Java 21 records for immutable, type-safe configuration.
 */
public record ApiConfig(
        boolean enabled,
        int port,
        String bindAddress,
        TlsConfig tls,
        JwtConfig jwt,
        List<ClientConfig> clients,
        RateLimitConfig rateLimits,
        CorsConfig cors,
        WebSocketConfig websocket,
        AuditConfig audit
) {
    private static final Gson GSON = new GsonBuilder()
            .setPrettyPrinting()
            .create();

    /**
     * TLS/SSL configuration for HTTPS support.
     */
    public record TlsConfig(
            boolean enabled,
            String certPath,
            String keyPath,
            String keyPassword
    ) {
        public static TlsConfig defaults() {
            return new TlsConfig(false, "cert.pem", "key.pem", null);
        }
    }

    /**
     * JWT authentication configuration.
     */
    public record JwtConfig(
            String issuer,
            String audience,
            int tokenValiditySeconds,
            int refreshTokenValiditySeconds,
            String rsaKeyPath,
            String algorithm
    ) {
        public static JwtConfig defaults() {
            return new JwtConfig(
                    "hytale-api",
                    "hytale-server",
                    3600,
                    86400,
                    "jwt-keypair.pem",
                    "RS256"
            );
        }
    }

    /**
     * API client configuration for authentication.
     */
    public record ClientConfig(
            String id,
            String secret,
            String description,
            Set<String> permissions,
            boolean enabled
    ) {
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
            // Check wildcard patterns (e.g., "api.admin.*" matches "api.admin.kick")
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
    }

    /**
     * Rate limiting configuration.
     */
    public record RateLimitConfig(
            int defaultRequestsPerMinute,
            int burstSize,
            Map<String, EndpointRateLimit> endpoints
    ) {
        public record EndpointRateLimit(
                int requestsPerMinute,
                int burstSize
        ) {}

        public static RateLimitConfig defaults() {
            return new RateLimitConfig(
                    600,  // 600 requests per minute default
                    100,  // burst size 100
                    Map.of(
                            "/auth/token", new EndpointRateLimit(120, 20),  // 120/min, burst 20
                            "/admin/*", new EndpointRateLimit(300, 50)     // 300/min, burst 50
                    )
            );
        }

        public EndpointRateLimit getForEndpoint(String path) {
            // Check exact match first
            if (endpoints != null && endpoints.containsKey(path)) {
                return endpoints.get(path);
            }
            // Check wildcard patterns
            if (endpoints != null) {
                for (var entry : endpoints.entrySet()) {
                    String pattern = entry.getKey();
                    if (pattern.endsWith("/*")) {
                        String prefix = pattern.substring(0, pattern.length() - 1);
                        if (path.startsWith(prefix)) {
                            return entry.getValue();
                        }
                    }
                }
            }
            // Return default
            return new EndpointRateLimit(defaultRequestsPerMinute, burstSize);
        }
    }

    /**
     * CORS configuration.
     */
    public record CorsConfig(
            List<String> allowedOrigins,
            List<String> allowedMethods,
            List<String> allowedHeaders,
            List<String> exposedHeaders,
            boolean allowCredentials,
            int maxAge
    ) {
        public static CorsConfig defaults() {
            return new CorsConfig(
                    List.of("*"),
                    List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"),
                    List.of("Authorization", "Content-Type", "X-Request-ID"),
                    List.of("X-Request-ID", "X-RateLimit-Remaining"),
                    true,
                    86400
            );
        }

        public boolean isOriginAllowed(String origin) {
            if (allowedOrigins == null || allowedOrigins.isEmpty()) {
                return false;
            }
            return allowedOrigins.contains("*") || allowedOrigins.contains(origin);
        }
    }

    /**
     * WebSocket configuration.
     */
    public record WebSocketConfig(
            boolean enabled,
            String path,
            int maxConnections,
            int pingIntervalSeconds,
            int statusBroadcastIntervalSeconds
    ) {
        public static WebSocketConfig defaults() {
            return new WebSocketConfig(
                    true,
                    "/ws",
                    100,
                    30,
                    5
            );
        }
    }

    /**
     * Audit logging configuration.
     */
    public record AuditConfig(
            boolean enabled,
            boolean logRequests,
            boolean logResponses,
            boolean logAdminActions,
            Set<String> sensitiveFields
    ) {
        public static AuditConfig defaults() {
            return new AuditConfig(
                    true,
                    true,
                    false,
                    true,
                    Set.of("secret", "password", "token", "authorization")
            );
        }
    }

    /**
     * Load configuration from a JSON file.
     */
    public static ApiConfig load(Path path) throws IOException {
        if (!Files.exists(path)) {
            ApiConfig defaults = defaults();
            save(defaults, path);
            return defaults;
        }
        try (Reader reader = Files.newBufferedReader(path)) {
            ApiConfig loaded = GSON.fromJson(reader, ApiConfig.class);
            return loaded != null ? loaded.withDefaults() : defaults();
        }
    }

    /**
     * Save configuration to a JSON file.
     */
    public static void save(ApiConfig config, Path path) throws IOException {
        Files.createDirectories(path.getParent());
        Files.writeString(path, GSON.toJson(config));
    }

    /**
     * Create default configuration.
     */
    public static ApiConfig defaults() {
        return new ApiConfig(
                true,
                8080,
                "0.0.0.0",
                TlsConfig.defaults(),
                JwtConfig.defaults(),
                List.of(new ClientConfig(
                        "admin",
                        "$2a$12$CHANGE_THIS_HASH_BEFORE_USE", // Generate with: htpasswd -bnBC 12 "" yourpassword | tr -d ':'
                        "Default admin client",
                        Set.of("api.*"),
                        true
                )),
                RateLimitConfig.defaults(),
                CorsConfig.defaults(),
                WebSocketConfig.defaults(),
                AuditConfig.defaults()
        );
    }

    /**
     * Fill in any null nested configs with defaults.
     */
    public ApiConfig withDefaults() {
        return new ApiConfig(
                enabled,
                port > 0 ? port : 8080,
                bindAddress != null ? bindAddress : "0.0.0.0",
                tls != null ? tls : TlsConfig.defaults(),
                jwt != null ? jwt : JwtConfig.defaults(),
                clients != null ? clients : List.of(),
                rateLimits != null ? rateLimits : RateLimitConfig.defaults(),
                cors != null ? cors : CorsConfig.defaults(),
                websocket != null ? websocket : WebSocketConfig.defaults(),
                audit != null ? audit : AuditConfig.defaults()
        );
    }

    /**
     * Find a client configuration by ID.
     */
    public ClientConfig findClient(String clientId) {
        if (clients == null) return null;
        return clients.stream()
                .filter(c -> c.id().equals(clientId) && c.enabled())
                .findFirst()
                .orElse(null);
    }
}
