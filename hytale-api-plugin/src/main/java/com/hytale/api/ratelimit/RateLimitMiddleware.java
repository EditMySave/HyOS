package com.hytale.api.ratelimit;

import com.hytale.api.exception.ApiException;
import io.netty.channel.ChannelHandler;
import io.netty.channel.ChannelHandlerContext;
import io.netty.channel.SimpleChannelInboundHandler;
import io.netty.handler.codec.http.FullHttpRequest;
import io.netty.handler.codec.http.HttpHeaderNames;

import java.net.InetSocketAddress;
import java.util.logging.Logger;

/**
 * Netty handler for rate limiting incoming requests.
 * Extracts client IP and checks against rate limiter.
 */
@ChannelHandler.Sharable
public final class RateLimitMiddleware extends SimpleChannelInboundHandler<FullHttpRequest> {
    private static final Logger LOGGER = Logger.getLogger(RateLimitMiddleware.class.getName());

    private final RateLimiter rateLimiter;

    public RateLimitMiddleware(RateLimiter rateLimiter) {
        super(false); // Don't auto-release, pass to next handler
        this.rateLimiter = rateLimiter;
    }

    @Override
    protected void channelRead0(ChannelHandlerContext ctx, FullHttpRequest request) throws Exception {
        String clientIp = getClientIp(ctx, request);
        String path = getPath(request.uri());

        var result = rateLimiter.tryAcquire(clientIp, path);

        if (result.isLimited()) {
            LOGGER.fine(() -> "Rate limited: " + clientIp + " on " + path);
            throw new ApiException.RateLimited(result.retryAfterSeconds());
        }

        // Store remaining tokens for response headers
        ctx.channel().attr(REMAINING_TOKENS_KEY).set(result.remainingTokens());

        // Pass to next handler
        ctx.fireChannelRead(request);
    }

    /**
     * Extract client IP from request, considering X-Forwarded-For header.
     */
    private String getClientIp(ChannelHandlerContext ctx, FullHttpRequest request) {
        // Check X-Forwarded-For header (for reverse proxy setups)
        String forwardedFor = request.headers().get("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isEmpty()) {
            // Take first IP in chain
            String ip = forwardedFor.split(",")[0].trim();
            if (!ip.isEmpty()) {
                return ip;
            }
        }

        // Check X-Real-IP header
        String realIp = request.headers().get("X-Real-IP");
        if (realIp != null && !realIp.isEmpty()) {
            return realIp;
        }

        // Fall back to socket address
        if (ctx.channel().remoteAddress() instanceof InetSocketAddress inet) {
            return inet.getAddress().getHostAddress();
        }

        return "unknown";
    }

    /**
     * Extract path from URI (remove query string).
     */
    private String getPath(String uri) {
        int queryStart = uri.indexOf('?');
        return queryStart > 0 ? uri.substring(0, queryStart) : uri;
    }

    /**
     * Attribute key for storing remaining tokens.
     */
    public static final io.netty.util.AttributeKey<Integer> REMAINING_TOKENS_KEY =
            io.netty.util.AttributeKey.valueOf("ratelimit.remaining");
}
