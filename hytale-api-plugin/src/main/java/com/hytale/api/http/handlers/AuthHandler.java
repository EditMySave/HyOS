package com.hytale.api.http.handlers;

import com.google.gson.Gson;
import com.hytale.api.config.ApiConfig;
import com.hytale.api.config.ApiConfig.ClientConfig;
import com.hytale.api.dto.request.AuthRequest;
import com.hytale.api.exception.ApiException;
import com.hytale.api.security.TokenGenerator;
import io.netty.handler.codec.http.FullHttpRequest;
import org.mindrot.jbcrypt.BCrypt;

import java.nio.charset.StandardCharsets;
import java.util.logging.Logger;

/**
 * Handler for POST /auth/token endpoint.
 * Validates client credentials and returns JWT token.
 */
public final class AuthHandler {
    private static final Logger LOGGER = Logger.getLogger(AuthHandler.class.getName());
    private static final Gson GSON = new Gson();

    private final ApiConfig config;
    private final TokenGenerator tokenGenerator;

    public AuthHandler(ApiConfig config, TokenGenerator tokenGenerator) {
        this.config = config;
        this.tokenGenerator = tokenGenerator;
    }

    public String handle(FullHttpRequest request) {
        // Parse request body
        String body = request.content().toString(StandardCharsets.UTF_8);
        AuthRequest authRequest;

        try {
            authRequest = GSON.fromJson(body, AuthRequest.class);
        } catch (Exception e) {
            throw ApiException.BadRequest.invalidJson(e.getMessage());
        }

        if (authRequest == null || !authRequest.isValid()) {
            throw ApiException.BadRequest.missingField("clientId and secret required");
        }

        // Find client
        ClientConfig client = config.findClient(authRequest.clientId());
        if (client == null) {
            LOGGER.warning("Auth attempt with unknown client: " + authRequest.clientId());
            throw ApiException.Unauthorized.invalidCredentials();
        }

        // Verify password
        if (!verifyPassword(authRequest.secret(), client.secret())) {
            LOGGER.warning("Auth attempt with invalid secret for client: " + authRequest.clientId() + " " + authRequest.secret());
            LOGGER.warning("Stored hash: " + client.secret());
            throw ApiException.Unauthorized.invalidCredentials();
        }

        // Generate token
        LOGGER.info("Successful authentication for client: " + authRequest.clientId());
        var tokenResult = tokenGenerator.generateAccessToken(client);

        return tokenResult.toJson();
    }

    /**
     * Verify password against bcrypt hash using jBCrypt.
     * Compatible with hashes from htpasswd, bcryptjs, etc.
     */
    private boolean verifyPassword(String password, String storedHash) {
        if (password == null || storedHash == null) {
            return false;
        }

        try {
            // Only accept bcrypt hashes for security
            if (!storedHash.startsWith("$2")) {
                LOGGER.warning("Invalid password hash format - must be bcrypt");
                return false;
            }
            
            // jBCrypt.checkpw handles $2a$, $2b$, $2y$ prefixes
            return BCrypt.checkpw(password, storedHash);
        } catch (Exception e) {
            LOGGER.warning("Password verification failed: " + e.getMessage());
            return false;
        }
    }
}
