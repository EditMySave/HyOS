package com.hytale.api.ratelimit;

import com.hytale.api.config.ApiConfig.RateLimitConfig;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Token bucket rate limiter implementation.
 * Thread-safe for concurrent access from Netty event loops.
 */
public final class RateLimiter {
    private final RateLimitConfig config;
    private final Map<String, TokenBucket> buckets = new ConcurrentHashMap<>();
    private final Duration cleanupInterval = Duration.ofMinutes(5);
    private volatile Instant lastCleanup = Instant.now();

    public RateLimiter(RateLimitConfig config) {
        this.config = config;
    }

    /**
     * Attempt to acquire a permit for the given key and endpoint.
     *
     * @param key      Unique identifier (e.g., IP address or client ID)
     * @param endpoint The API endpoint being accessed
     * @return Result indicating if request is allowed
     */
    public RateLimitResult tryAcquire(String key, String endpoint) {
        maybeCleanup();

        String bucketKey = key + ":" + endpoint;
        var limits = config.getForEndpoint(endpoint);

        TokenBucket bucket = buckets.computeIfAbsent(bucketKey,
                k -> new TokenBucket(limits.requestsPerMinute(), limits.burstSize()));

        return bucket.tryAcquire();
    }

    /**
     * Get remaining tokens for a key/endpoint combination.
     */
    public int getRemainingTokens(String key, String endpoint) {
        String bucketKey = key + ":" + endpoint;
        TokenBucket bucket = buckets.get(bucketKey);
        return bucket != null ? bucket.getAvailableTokens() : config.getForEndpoint(endpoint).burstSize();
    }

    /**
     * Reset rate limit for a specific key (e.g., after successful auth).
     */
    public void reset(String key) {
        buckets.entrySet().removeIf(e -> e.getKey().startsWith(key + ":"));
    }

    /**
     * Periodically cleanup expired buckets.
     */
    private void maybeCleanup() {
        Instant now = Instant.now();
        if (Duration.between(lastCleanup, now).compareTo(cleanupInterval) > 0) {
            lastCleanup = now;
            buckets.entrySet().removeIf(e -> e.getValue().isExpired());
        }
    }

    /**
     * Token bucket implementation with atomic operations.
     */
    private static final class TokenBucket {
        private final int tokensPerMinute;
        private final int maxBurst;
        private final AtomicReference<BucketState> state;
        private final Duration expiryDuration = Duration.ofMinutes(10);

        TokenBucket(int tokensPerMinute, int maxBurst) {
            this.tokensPerMinute = tokensPerMinute;
            this.maxBurst = maxBurst;
            this.state = new AtomicReference<>(new BucketState(maxBurst, Instant.now()));
        }

        RateLimitResult tryAcquire() {
            while (true) {
                BucketState current = state.get();
                BucketState updated = current.refill(tokensPerMinute, maxBurst);

                if (updated.tokens < 1) {
                    long retryAfterSeconds = calculateRetryAfter(updated);
                    return new RateLimitResult(false, 0, retryAfterSeconds);
                }

                BucketState consumed = new BucketState(updated.tokens - 1, Instant.now());
                if (state.compareAndSet(current, consumed)) {
                    return new RateLimitResult(true, consumed.tokens, 0);
                }
                // CAS failed, retry
            }
        }

        int getAvailableTokens() {
            return state.get().refill(tokensPerMinute, maxBurst).tokens;
        }

        boolean isExpired() {
            return Duration.between(state.get().lastUpdate, Instant.now()).compareTo(expiryDuration) > 0;
        }

        private long calculateRetryAfter(BucketState state) {
            // Calculate seconds until one token is available
            double tokensNeeded = 1.0 - state.tokens;
            double secondsPerToken = 60.0 / tokensPerMinute;
            return Math.max(1, (long) Math.ceil(tokensNeeded * secondsPerToken));
        }

        private record BucketState(int tokens, Instant lastUpdate) {
            BucketState refill(int tokensPerMinute, int maxBurst) {
                Duration elapsed = Duration.between(lastUpdate, Instant.now());
                double tokensToAdd = elapsed.toMillis() * tokensPerMinute / 60000.0;
                int newTokens = Math.min(maxBurst, tokens + (int) tokensToAdd);
                return new BucketState(newTokens, Instant.now());
            }
        }
    }

    /**
     * Result of a rate limit check.
     */
    public record RateLimitResult(
            boolean allowed,
            int remainingTokens,
            long retryAfterSeconds
    ) {
        public boolean isLimited() {
            return !allowed;
        }
    }
}
