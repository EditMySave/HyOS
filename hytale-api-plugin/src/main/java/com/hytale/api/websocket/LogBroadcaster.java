package com.hytale.api.websocket;

import com.hytale.api.config.ApiConfig;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.logging.*;

/**
 * Captures server log output and broadcasts to WebSocket subscribers.
 * Attaches to the root logger to capture all server logs.
 */
public final class LogBroadcaster {
    private static final Logger LOGGER = Logger.getLogger(LogBroadcaster.class.getName());
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm:ss.SSS")
            .withZone(ZoneId.systemDefault());

    private final ApiConfig config;
    private final WebSocketSessionManager sessionManager;
    private final WebSocketLogHandler logHandler;
    private boolean registered = false;

    public LogBroadcaster(ApiConfig config, WebSocketSessionManager sessionManager) {
        this.config = config;
        this.sessionManager = sessionManager;
        this.logHandler = new WebSocketLogHandler();
    }

    /**
     * Start capturing logs by attaching to the root logger.
     */
    public void start() {
        if (registered) return;

        Logger rootLogger = Logger.getLogger("");
        rootLogger.addHandler(logHandler);
        registered = true;

        LOGGER.info("Log broadcaster started - subscribable via 'server.log' event");
    }

    /**
     * Stop capturing logs.
     */
    public void stop() {
        if (!registered) return;

        Logger rootLogger = Logger.getLogger("");
        rootLogger.removeHandler(logHandler);
        registered = false;

        LOGGER.info("Log broadcaster stopped");
    }

    /**
     * Custom handler that broadcasts log records to WebSocket.
     */
    private class WebSocketLogHandler extends Handler {

        public WebSocketLogHandler() {
            setLevel(Level.ALL);
        }

        @Override
        public void publish(LogRecord record) {
            if (sessionManager.getSessionCount() == 0) return;
            if (!isLoggable(record)) return;

            // Skip our own log messages to avoid loops
            String loggerName = record.getLoggerName();
            if (loggerName != null && loggerName.startsWith("com.hytale.api.websocket.Log")) {
                return;
            }

            try {
                String level = record.getLevel().getName();
                String message = formatMessage(record);
                String logger = loggerName != null ? loggerName : "unknown";
                String time = TIME_FORMATTER.format(Instant.ofEpochMilli(record.getMillis()));
                String thread = Thread.currentThread().getName();

                // Include exception info if present
                String exception = null;
                if (record.getThrown() != null) {
                    exception = formatThrowable(record.getThrown());
                }

                String payload = buildPayload(level, message, logger, time, thread, exception);
                sessionManager.broadcast("server.log", payload);

            } catch (Exception e) {
                // Silently ignore to avoid recursion
            }
        }

        @Override
        public void flush() {
            // No buffering
        }

        @Override
        public void close() throws SecurityException {
            // Nothing to close
        }

        private String formatMessage(LogRecord record) {
            String message = record.getMessage();
            if (message == null) return "";

            // Handle parameterized messages
            Object[] params = record.getParameters();
            if (params != null && params.length > 0) {
                try {
                    return String.format(message.replace("{0}", "%s")
                            .replace("{1}", "%s")
                            .replace("{2}", "%s")
                            .replace("{3}", "%s"), params);
                } catch (Exception e) {
                    // Fall back to raw message
                }
            }
            return message;
        }

        private String formatThrowable(Throwable t) {
            StringBuilder sb = new StringBuilder();
            sb.append(t.getClass().getName());
            if (t.getMessage() != null) {
                sb.append(": ").append(t.getMessage());
            }

            // Include first few stack trace elements
            StackTraceElement[] stack = t.getStackTrace();
            int limit = Math.min(5, stack.length);
            for (int i = 0; i < limit; i++) {
                sb.append("\\n    at ").append(stack[i].toString());
            }
            if (stack.length > limit) {
                sb.append("\\n    ... ").append(stack.length - limit).append(" more");
            }

            return sb.toString();
        }

        private String buildPayload(String level, String message, String logger,
                                    String time, String thread, String exception) {
            StringBuilder sb = new StringBuilder();
            sb.append("{\"level\":\"").append(level).append("\"");
            sb.append(",\"message\":\"").append(escapeJson(message)).append("\"");
            sb.append(",\"logger\":\"").append(escapeJson(logger)).append("\"");
            sb.append(",\"time\":\"").append(time).append("\"");
            sb.append(",\"thread\":\"").append(escapeJson(thread)).append("\"");

            if (exception != null) {
                sb.append(",\"exception\":\"").append(escapeJson(exception)).append("\"");
            }

            sb.append("}");
            return sb.toString();
        }
    }

    private static String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }
}
