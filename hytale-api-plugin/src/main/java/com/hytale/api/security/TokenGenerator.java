package com.hytale.api.security;

import com.hytale.api.config.ApiConfig;
import com.hytale.api.config.ApiConfig.ClientConfig;
import com.nimbusds.jose.*;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.crypto.RSASSAVerifier;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.interfaces.RSAPublicKey;
import java.text.ParseException;
import java.time.Instant;
import java.util.Date;
import java.util.Set;
import java.util.UUID;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * JWT token generation and validation using RSA256.
 * Uses Nimbus JOSE library bundled with Hytale server.
 */
public final class TokenGenerator {
    private static final Logger LOGGER = Logger.getLogger(TokenGenerator.class.getName());

    private final ApiConfig.JwtConfig config;
    private final RSAKey rsaKey;
    private final JWSSigner signer;
    private final JWSVerifier verifier;

    public TokenGenerator(ApiConfig.JwtConfig config, Path keyPath) throws Exception {
        this.config = config;

        // Load or generate RSA key pair
        if (Files.exists(keyPath)) {
            LOGGER.info("Loading existing RSA key from " + keyPath);
            String keyJson = Files.readString(keyPath);
            this.rsaKey = RSAKey.parse(keyJson);
        } else {
            LOGGER.info("Generating new RSA key pair");
            this.rsaKey = new RSAKeyGenerator(2048)
                    .keyID(UUID.randomUUID().toString())
                    .generate();
            // Save for future use
            Files.createDirectories(keyPath.getParent());
            Files.writeString(keyPath, rsaKey.toJSONString());
            LOGGER.info("RSA key saved to " + keyPath);
        }

        this.signer = new RSASSASigner(rsaKey);
        this.verifier = new RSASSAVerifier((RSAPublicKey) rsaKey.toPublicKey());
    }

    /**
     * Generate a new access token for an authenticated client.
     */
    public TokenResult generateAccessToken(ClientConfig client) {
        String tokenId = UUID.randomUUID().toString();
        Instant now = Instant.now();
        Instant expiry = now.plusSeconds(config.tokenValiditySeconds());

        JWTClaimsSet claims = new JWTClaimsSet.Builder()
                .jwtID(tokenId)
                .issuer(config.issuer())
                .audience(config.audience())
                .subject(client.id())
                .claim("permissions", client.permissions())
                .issueTime(Date.from(now))
                .expirationTime(Date.from(expiry))
                .build();

        try {
            SignedJWT signedJWT = new SignedJWT(
                    new JWSHeader.Builder(JWSAlgorithm.RS256)
                            .keyID(rsaKey.getKeyID())
                            .build(),
                    claims
            );
            signedJWT.sign(signer);

            return new TokenResult(
                    signedJWT.serialize(),
                    tokenId,
                    config.tokenValiditySeconds(),
                    expiry
            );
        } catch (JOSEException e) {
            LOGGER.log(Level.SEVERE, "Failed to sign token", e);
            throw new RuntimeException("Token generation failed", e);
        }
    }

    /**
     * Validate and parse a JWT token.
     */
    public ValidatedToken validateToken(String token) {
        try {
            SignedJWT signedJWT = SignedJWT.parse(token);

            // Verify signature
            if (!signedJWT.verify(verifier)) {
                return ValidatedToken.invalid("Invalid signature");
            }

            JWTClaimsSet claims = signedJWT.getJWTClaimsSet();

            // Check issuer
            if (!config.issuer().equals(claims.getIssuer())) {
                return ValidatedToken.invalid("Invalid issuer");
            }

            // Check expiration
            Date expiration = claims.getExpirationTime();
            if (expiration == null || expiration.before(new Date())) {
                return ValidatedToken.expired();
            }

            // Extract permissions
            @SuppressWarnings("unchecked")
            var permissionsList = claims.getListClaim("permissions");
            Set<String> permissions = permissionsList != null
                    ? Set.copyOf(permissionsList.stream().map(Object::toString).toList())
                    : Set.of();

            return ValidatedToken.valid(
                    claims.getJWTID(),
                    claims.getSubject(),
                    permissions,
                    expiration.toInstant()
            );

        } catch (ParseException e) {
            return ValidatedToken.invalid("Malformed token");
        } catch (JOSEException e) {
            return ValidatedToken.invalid("Verification failed: " + e.getMessage());
        }
    }

    /**
     * Result of token generation.
     */
    public record TokenResult(
            String accessToken,
            String tokenId,
            int expiresIn,
            Instant expiry
    ) {
        public String toJson() {
            return """
                    {"access_token":"%s","token_type":"Bearer","expires_in":%d}"""
                    .formatted(accessToken, expiresIn);
        }
    }

    /**
     * Result of token validation.
     */
    public sealed interface ValidatedToken {
        record Valid(
                String tokenId,
                String clientId,
                Set<String> permissions,
                Instant expiry
        ) implements ValidatedToken {}

        record Invalid(String reason) implements ValidatedToken {}

        record Expired() implements ValidatedToken {}

        static ValidatedToken valid(String tokenId, String clientId, Set<String> permissions, Instant expiry) {
            return new Valid(tokenId, clientId, permissions, expiry);
        }

        static ValidatedToken invalid(String reason) {
            return new Invalid(reason);
        }

        static ValidatedToken expired() {
            return new Expired();
        }
    }

    /**
     * Get the public key in JWK format for external verification.
     */
    public String getPublicKeyJwk() {
        return rsaKey.toPublicJWK().toJSONString();
    }
}
