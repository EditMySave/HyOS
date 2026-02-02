package com.hytale.api.http;

import com.hytale.api.config.ApiConfig;
import com.hytale.api.ratelimit.RateLimitMiddleware;
import com.hytale.api.ratelimit.RateLimiter;
import com.hytale.api.security.TokenGenerator;
import com.hytale.api.websocket.WebSocketHandler;
import com.hytale.api.websocket.WebSocketSessionManager;
import io.netty.channel.ChannelInitializer;
import io.netty.channel.ChannelPipeline;
import io.netty.channel.socket.SocketChannel;
import io.netty.handler.codec.http.HttpObjectAggregator;
import io.netty.handler.codec.http.HttpServerCodec;
import io.netty.handler.codec.http.websocketx.WebSocketServerProtocolHandler;
import io.netty.handler.ssl.SslContext;
import io.netty.handler.ssl.SslContextBuilder;
import io.netty.handler.stream.ChunkedWriteHandler;
import io.netty.handler.timeout.IdleStateHandler;

import java.io.File;
import java.nio.file.Path;
import java.util.concurrent.TimeUnit;
import java.util.logging.Logger;

/**
 * Netty channel initializer for the API server.
 * Sets up HTTP codec, TLS (optional), rate limiting, and WebSocket support.
 */
public final class ApiChannelInitializer extends ChannelInitializer<SocketChannel> {
    private static final Logger LOGGER = Logger.getLogger(ApiChannelInitializer.class.getName());

    private static final int MAX_CONTENT_LENGTH = 1024 * 1024; // 1MB
    private static final int IDLE_TIMEOUT_SECONDS = 60;

    private final ApiConfig config;
    private final SslContext sslContext;
    private final RateLimiter rateLimiter;
    private final TokenGenerator tokenGenerator;
    private final WebSocketSessionManager wsSessionManager;

    // Sharable handlers
    private final RateLimitMiddleware rateLimitMiddleware;
    private final HttpRequestRouter httpRouter;
    private final WebSocketHandler webSocketHandler;

    public ApiChannelInitializer(
            ApiConfig config,
            TokenGenerator tokenGenerator,
            Path pluginDataPath
    ) throws Exception {
        this.config = config;
        this.tokenGenerator = tokenGenerator;

        // Initialize TLS if enabled
        if (config.tls().enabled()) {
            File certFile = pluginDataPath.resolve(config.tls().certPath()).toFile();
            File keyFile = pluginDataPath.resolve(config.tls().keyPath()).toFile();

            if (!certFile.exists() || !keyFile.exists()) {
                LOGGER.warning("TLS certificate files not found, TLS disabled");
                this.sslContext = null;
            } else {
                this.sslContext = SslContextBuilder.forServer(certFile, keyFile)
                        .build();
                LOGGER.info("TLS enabled with certificate: " + certFile);
            }
        } else {
            this.sslContext = null;
        }

        // Initialize rate limiter
        this.rateLimiter = new RateLimiter(config.rateLimits());
        this.rateLimitMiddleware = new RateLimitMiddleware(rateLimiter);

        // Initialize WebSocket manager
        this.wsSessionManager = new WebSocketSessionManager(config.websocket());

        // Initialize routers (sharable) - server root is parent of mods folder
        // Must use toAbsolutePath() first to normalize the path before getting parents
        Path absolutePluginPath = pluginDataPath.toAbsolutePath();
        Path modsFolder = absolutePluginPath.getParent();
        Path serverRoot = modsFolder != null ? modsFolder.getParent() : absolutePluginPath;
        this.httpRouter = new HttpRequestRouter(config, tokenGenerator, serverRoot);
        this.webSocketHandler = new WebSocketHandler(config, tokenGenerator, wsSessionManager);
    }

    @Override
    protected void initChannel(SocketChannel ch) throws Exception {
        ChannelPipeline pipeline = ch.pipeline();

        // TLS first if enabled
        if (sslContext != null) {
            pipeline.addLast("ssl", sslContext.newHandler(ch.alloc()));
        }

        // Idle timeout handler
        pipeline.addLast("idleState", new IdleStateHandler(
                IDLE_TIMEOUT_SECONDS, IDLE_TIMEOUT_SECONDS, IDLE_TIMEOUT_SECONDS, TimeUnit.SECONDS));

        // HTTP codec
        pipeline.addLast("httpCodec", new HttpServerCodec());

        // Chunked write support (for streaming responses)
        pipeline.addLast("chunkedWriter", new ChunkedWriteHandler());

        // HTTP message aggregation
        pipeline.addLast("httpAggregator", new HttpObjectAggregator(MAX_CONTENT_LENGTH));

        // Rate limiting (for HTTP requests)
        pipeline.addLast("rateLimit", rateLimitMiddleware);

        // WebSocket protocol handler (handles upgrade)
        if (config.websocket().enabled()) {
            pipeline.addLast("wsProtocol", new WebSocketServerProtocolHandler(
                    config.websocket().path(),
                    null, // subprotocols
                    true, // allow extensions
                    65536, // max frame size
                    false, // allow mask mismatch (for debugging)
                    true   // check starting request
            ));
            pipeline.addLast("wsHandler", webSocketHandler);
        }

        // HTTP request router (handles non-WebSocket requests)
        pipeline.addLast("httpRouter", httpRouter);
    }

    /**
     * Get the WebSocket session manager for event broadcasting.
     */
    public WebSocketSessionManager getWebSocketSessionManager() {
        return wsSessionManager;
    }

    /**
     * Get the rate limiter for external access.
     */
    public RateLimiter getRateLimiter() {
        return rateLimiter;
    }
}
