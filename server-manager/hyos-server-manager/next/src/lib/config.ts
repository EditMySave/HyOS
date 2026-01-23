/**
 * Centralized Configuration
 * 
 * Runtime configuration that can be updated via API
 * Falls back to environment variables and defaults
 */

// Runtime config store (in-memory, resets on server restart)
const runtimeConfig: Record<string, string> = {};

/**
 * Get a config value with fallback chain:
 * 1. Runtime config (set via API)
 * 2. Environment variable
 * 3. Default value
 */
export function getConfig(key: string, defaultValue: string): string {
  return runtimeConfig[key] ?? process.env[key] ?? defaultValue;
}

/**
 * Set a runtime config value
 */
export function setConfig(key: string, value: string): void {
  runtimeConfig[key] = value;
}

/**
 * Get all current config values
 */
export function getAllConfig() {
  // Use /tmp/hytale-state for local dev, /data/.state for production
  const defaultStateDir = process.env.NODE_ENV === 'production' 
    ? '/data/.state' 
    : '/tmp/hytale-state';
  
  return {
    adapterType: getConfig('ADAPTER_TYPE', 'rest'),
    containerName: getConfig('HYTALE_CONTAINER_NAME', 'hyos'),
    stateDir: getConfig('HYTALE_STATE_DIR', defaultStateDir),
    serverHost: getConfig('HYTALE_SERVER_HOST', '127.0.0.1'),
    serverPort: parseInt(getConfig('HYTALE_SERVER_PORT', '5520'), 10),
    dockerSocket: getConfig('DOCKER_SOCKET', '/var/run/docker.sock'),
    // REST API settings
    restApiUrl: getConfig('REST_API_URL', 'http://localhost:8080'),
    restApiClientId: getConfig('REST_API_CLIENT_ID', 'hyos-manager'),
    // Note: secret is not exposed in getAllConfig for security
  };
}

/**
 * Get adapter configuration object
 */
export function getAdapterConfig() {
  const config = getAllConfig();
  return {
    type: config.adapterType as 'console' | 'rest',
    hytaleContainerName: config.containerName,
    hytaleStateDir: config.stateDir,
    hytaleServerHost: config.serverHost,
    hytaleServerPort: config.serverPort,
  };
}
