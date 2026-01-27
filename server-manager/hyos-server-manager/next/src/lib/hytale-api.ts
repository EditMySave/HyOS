/**
 * Hytale Server REST API Client
 *
 * Direct client for communicating with the Hytale server API plugin.
 * Handles authentication and request/response formatting.
 * 
 * IMPORTANT: Health checks should only be called from the status endpoint,
 * not before every API request. This matches the experiments implementation.
 */

import { loadConfig } from "./services/config/config.loader";

let accessToken: string | null = null;
let tokenExpiresAt = 0;
let cachedBaseUrl: string | null = null;
let lastHealthCheck = 0;
let cachedHealthResult = false;

// Health check cache duration: 30 seconds
// This prevents hammering the server with health checks
const HEALTH_CACHE_MS = 30000;

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

/**
 * Get the base URL for the Hytale API
 */
async function getBaseUrl(): Promise<string> {
  if (cachedBaseUrl) return cachedBaseUrl;
  const config = await loadConfig();
  cachedBaseUrl = `http://${config.serverHost}:${config.serverPort}`;
  return cachedBaseUrl;
}

/**
 * Get credentials for authentication
 */
async function getCredentials(): Promise<{
  clientId: string;
  secret: string;
}> {
  const config = await loadConfig();
  return {
    clientId: config.apiClientId,
    secret: config.apiClientSecret || "",
  };
}

/**
 * Check if the API server is reachable (no auth required)
 * Only call this from the status endpoint, not before every request.
 * Caches result for 30 seconds to avoid hammering the server.
 */
export async function checkHealth(): Promise<boolean> {
  const now = Date.now();
  
  // Return cached result if checked recently
  if (now - lastHealthCheck < HEALTH_CACHE_MS) {
    return cachedHealthResult;
  }

  try {
    const baseUrl = await getBaseUrl();
    const response = await fetch(`${baseUrl}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    cachedHealthResult = response.ok;
    lastHealthCheck = now;
    return cachedHealthResult;
  } catch {
    cachedHealthResult = false;
    lastHealthCheck = now;
    return false;
  }
}

/**
 * Get a valid access token, refreshing if needed
 */
async function getToken(): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (accessToken && Date.now() < tokenExpiresAt - 60000) {
    return accessToken;
  }

  const baseUrl = await getBaseUrl();
  const creds = await getCredentials();

  const response = await fetch(`${baseUrl}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clientId: creds.clientId,
      secret: creds.secret,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Authentication failed: ${response.status} - ${text}`);
  }

  const data: TokenResponse = await response.json();
  accessToken = data.access_token;
  tokenExpiresAt = Date.now() + data.expires_in * 1000;

  return accessToken;
}

/**
 * Make an authenticated API request to the Hytale server.
 * No retries - let the caller handle failures.
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const baseUrl = await getBaseUrl();
  const token = await getToken();
  const url = `${baseUrl}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API error ${response.status}: ${text}`);
  }

  return response.json();
}

/**
 * Clear cached token and health status (useful after config changes or server state changes)
 */
export function clearCache(): void {
  accessToken = null;
  tokenExpiresAt = 0;
  cachedBaseUrl = null;
  lastHealthCheck = 0;
  cachedHealthResult = false;
}
