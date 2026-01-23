/**
 * Server Adapter Factory
 * 
 * Creates the appropriate adapter based on configuration.
 * Uses centralized config that supports runtime updates.
 * Can read saved credentials from the shared data volume.
 */

import type { ServerAdapter, AdapterConfig, AdapterType } from './types';
import { getConfig, setConfig } from '@/lib/config';
import { promises as fs } from 'fs';
import path from 'path';

// Re-export all types
export * from './types';

/**
 * Singleton adapter instance
 */
let adapterInstance: ServerAdapter | null = null;
let lastConfigHash: string | null = null;
let savedConfigLoaded = false;

/**
 * Load API credentials from saved config file or environment
 * Priority: 1) Saved config file, 2) Environment variables
 */
async function loadSavedCredentials(): Promise<void> {
  if (savedConfigLoaded) return;
  
  // First, try to load from saved config file
  try {
    const stateDir = getConfig('HYTALE_STATE_DIR', '/data/.state');
    const configPath = path.join(stateDir, 'manager-config.json');
    
    const content = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(content);
    
    if (config.apiClientId && config.apiClientSecret && config.setupComplete) {
      setConfig('REST_API_CLIENT_ID', config.apiClientId);
      setConfig('REST_API_CLIENT_SECRET', config.apiClientSecret);
      console.log('Loaded API credentials from saved config');
      savedConfigLoaded = true;
      return;
    }
  } catch (error: any) {
    if (error.code !== 'ENOENT') {
      console.error('Failed to load saved credentials:', error);
    }
  }
  
  // Fall back to environment variables
  const envSecret = process.env.REST_API_CLIENT_SECRET || process.env.API_CLIENT_SECRET;
  const envClientId = process.env.REST_API_CLIENT_ID || process.env.API_CLIENT_ID;
  
  if (envSecret) {
    if (envClientId) {
      setConfig('REST_API_CLIENT_ID', envClientId);
    }
    setConfig('REST_API_CLIENT_SECRET', envSecret);
    console.log('Using API credentials from environment variables');
  }
  
  savedConfigLoaded = true;
}

/**
 * Get the adapter configuration from centralized config
 * NOTE: REST adapter is the default and recommended for full functionality
 */
export function getAdapterConfig(): AdapterConfig {
  const type = getConfig('ADAPTER_TYPE', 'rest') as AdapterType;
  
  if (type === 'rest') {
    return {
      type: 'rest',
      baseUrl: getConfig('REST_API_URL', 'http://localhost:8080'),
      clientId: getConfig('REST_API_CLIENT_ID', 'hyos-manager'),
      clientSecret: getConfig('REST_API_CLIENT_SECRET', ''),
      containerName: getConfig('HYTALE_CONTAINER_NAME', 'hyos'),
    };
  }
  
  // Default to console adapter
  return {
    type: 'console',
    containerName: getConfig('HYTALE_CONTAINER_NAME', 'hyos'),
    stateDir: getConfig('HYTALE_STATE_DIR', '/data/.state'),
    serverHost: getConfig('HYTALE_SERVER_HOST', 'hyos'),
    serverPort: parseInt(getConfig('HYTALE_SERVER_PORT', '5520'), 10),
  };
}

/**
 * Get a hash of the current config for change detection
 */
function getConfigHash(): string {
  const config = getAdapterConfig();
  return JSON.stringify(config);
}

/**
 * Create or get the server adapter instance
 * Automatically recreates if config has changed
 */
export async function getAdapter(): Promise<ServerAdapter> {
  // Load saved credentials on first call
  await loadSavedCredentials();
  
  const currentHash = getConfigHash();
  
  // Reset adapter if config has changed
  if (lastConfigHash !== null && lastConfigHash !== currentHash) {
    adapterInstance = null;
  }
  
  if (adapterInstance) {
    return adapterInstance;
  }
  
  const config = getAdapterConfig();
  lastConfigHash = currentHash;
  
  if (config.type === 'rest') {
    // Lazy load REST adapter
    const { RestAdapter } = await import('./rest');
    adapterInstance = new RestAdapter(config);
  } else {
    // Lazy load Console adapter
    const { ConsoleAdapter } = await import('./console');
    adapterInstance = new ConsoleAdapter(config);
  }
  
  return adapterInstance;
}

/**
 * Reset the adapter instance (useful for testing or config changes)
 */
export function resetAdapter(): void {
  adapterInstance = null;
}
