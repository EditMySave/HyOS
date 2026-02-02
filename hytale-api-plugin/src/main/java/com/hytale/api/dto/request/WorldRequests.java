package com.hytale.api.dto.request;

/**
 * Request DTOs for world operations.
 */
public final class WorldRequests {
    private WorldRequests() {}

    /**
     * Request to set world time.
     * If relative is true, adds to current time instead of setting absolute.
     */
    public record SetTimeRequest(long time, Boolean relative) {
        public boolean isValid() {
            return true; // Time can be any value
        }

        public boolean isRelative() {
            return relative != null && relative;
        }
    }

    /**
     * Request to set world weather.
     * Valid weather types: "clear", "rain", "thunder"
     */
    public record SetWeatherRequest(String weather, Integer duration) {
        public boolean isValid() {
            return weather != null && !weather.isBlank();
        }

        public int getDurationOrDefault() {
            return duration != null ? duration : 6000; // Default ~5 minutes
        }
    }

    /**
     * Request to set a block at coordinates.
     */
    public record SetBlockRequest(String blockId, String nbt) {
        public boolean isValid() {
            return blockId != null && !blockId.isBlank();
        }
    }
}
