/**
 * Hytale Server - Developer Configuration
 * TypeScript entrypoint with mod support and enhanced logging
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync, renameSync } from "fs";
import { resolve } from "path";

// =============================================================================
// Configuration
// =============================================================================

const config = {
  // Paths
  dataDir: process.env.DATA_DIR || "/data",
  get serverDir() { return resolve(this.dataDir, "server"); },
  get serverJar() { return resolve(this.serverDir, "HytaleServer.jar"); },
  get assetsFile() { return resolve(this.dataDir, "Assets.zip"); },
  get aotCache() { return resolve(this.serverDir, "HytaleServer.aot"); },
  get authCache() { return resolve(this.dataDir, ".auth-tokens.json"); },
  get modsDir() { return resolve(this.dataDir, "mods"); },
  get curseforgeModsDir() { return resolve(this.dataDir, "curseforge-mods"); },

  // Server settings
  serverPort: process.env.SERVER_PORT || "5520",
  javaXms: process.env.JAVA_XMS || "4G",
  javaXmx: process.env.JAVA_XMX || "8G",
  enableAot: process.env.ENABLE_AOT !== "false",
  disableSentry: process.env.DISABLE_SENTRY !== "false",
  patchline: process.env.PATCHLINE || "release",

  // Mod settings
  modInstallMode: process.env.MOD_INSTALL_MODE || "off",
  curseforgeApiKey: process.env.CURSEFORGE_API_KEY || "",
  curseforgeModList: process.env.CURSEFORGE_MOD_LIST || "",
  curseforgeGameVersion: process.env.CURSEFORGE_GAME_VERSION || "Early Access",

  // Logging
  logLevel: process.env.LOG_LEVEL || "INFO",

  // OAuth endpoints
  oauthUrl: "https://oauth.accounts.hytale.com",
  accountUrl: "https://account-data.hytale.com",
  sessionUrl: "https://sessions.hytale.com",
  clientId: "hytale-server",
  scope: "openid offline auth:server",
};

// =============================================================================
// Logging
// =============================================================================

type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

const LOG_LEVELS: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

const currentLogLevel = LOG_LEVELS[config.logLevel as LogLevel] ?? LOG_LEVELS.INFO;

function log(level: LogLevel, ...args: unknown[]) {
  if (LOG_LEVELS[level] >= currentLogLevel) {
    const timestamp = new Date().toISOString().substring(11, 19);
    const prefix = `[${level.padEnd(5)}] ${timestamp}`;
    console.log(prefix, ...args);
  }
}

const logDebug = (...args: unknown[]) => log("DEBUG", ...args);
const logInfo = (...args: unknown[]) => log("INFO", ...args);
const logWarn = (...args: unknown[]) => log("WARN", ...args);
const logError = (...args: unknown[]) => log("ERROR", ...args);

function logSeparator() {
  console.log("═".repeat(70));
}

// =============================================================================
// Server File Management
// =============================================================================

async function ensureServerFiles(): Promise<void> {
  logInfo("Checking server files...");

  if (existsSync(config.serverJar) && existsSync(config.assetsFile)) {
    logInfo("Server files already present");
    return;
  }

  logInfo(`Downloading server files (patchline: ${config.patchline})...`);

  const downloadPath = resolve(config.dataDir, "game.zip");
  const args = ["-download-path", downloadPath];

  if (config.patchline !== "release") {
    args.push("-patchline", config.patchline);
  }

  logSeparator();
  logInfo("Running Hytale Downloader...");
  logInfo("If this is your first time, you'll need to authenticate.");
  logSeparator();

  const proc = Bun.spawn(["hytale-downloader", ...args], {
    cwd: config.dataDir,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });

  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(`Download failed with exit code ${exitCode}`);
  }

  logInfo("Extracting server files...");

  const unzipProc = Bun.spawn(["unzip", "-q", "-o", downloadPath, "-d", config.dataDir], {
    cwd: config.dataDir,
  });

  await unzipProc.exited;
  rmSync(downloadPath, { force: true });

  // Handle Server directory naming
  const serverDirCapital = resolve(config.dataDir, "Server");
  if (existsSync(serverDirCapital) && !existsSync(config.serverDir)) {
    renameSync(serverDirCapital, config.serverDir);
  }

  if (!existsSync(config.serverJar)) {
    throw new Error("HytaleServer.jar not found after extraction");
  }

  logInfo("Server files ready!");
}

// =============================================================================
// OAuth Authentication
// =============================================================================

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  profileUuid: string;
  timestamp: number;
}

interface SessionTokens {
  sessionToken: string;
  identityToken: string;
  ownerUuid: string;
}

function loadCachedTokens(): AuthTokens | null {
  if (!existsSync(config.authCache)) return null;

  try {
    const data = JSON.parse(readFileSync(config.authCache, "utf-8"));
    if (!data.accessToken || !data.refreshToken || !data.profileUuid) {
      return null;
    }
    return {
      accessToken: data.access_token || data.accessToken,
      refreshToken: data.refresh_token || data.refreshToken,
      profileUuid: data.profile_uuid || data.profileUuid,
      timestamp: data.timestamp || 0,
    };
  } catch {
    return null;
  }
}

function saveTokens(tokens: AuthTokens): void {
  writeFileSync(
    config.authCache,
    JSON.stringify({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      profile_uuid: tokens.profileUuid,
      timestamp: Date.now(),
    }, null, 2)
  );
  logInfo("Auth tokens cached");
}

async function refreshAccessToken(tokens: AuthTokens): Promise<AuthTokens | null> {
  logDebug("Attempting to refresh access token...");

  const response = await fetch(`${config.oauthUrl}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      grant_type: "refresh_token",
      refresh_token: tokens.refreshToken,
    }),
  });

  if (!response.ok) {
    logWarn("Token refresh failed");
    return null;
  }

  const data = await response.json() as { access_token?: string; refresh_token?: string };

  if (!data.access_token) {
    return null;
  }

  const newTokens: AuthTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || tokens.refreshToken,
    profileUuid: tokens.profileUuid,
    timestamp: Date.now(),
  };

  saveTokens(newTokens);
  logInfo("Access token refreshed");
  return newTokens;
}

async function performDeviceAuth(): Promise<AuthTokens> {
  logInfo("Starting OAuth Device Code authentication...");

  // Step 1: Request device code
  const deviceResponse = await fetch(`${config.oauthUrl}/oauth2/device/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      scope: config.scope,
    }),
  });

  const deviceData = await deviceResponse.json() as {
    device_code: string;
    verification_uri_complete: string;
    interval: number;
    expires_in: number;
  };

  // Step 2: Display auth URL
  console.log("");
  logSeparator();
  logInfo("AUTHENTICATION REQUIRED");
  logSeparator();
  console.log("");
  console.log(`  Visit: ${deviceData.verification_uri_complete}`);
  console.log("");
  logSeparator();
  logInfo(`Waiting for authentication (expires in ${deviceData.expires_in}s)...`);
  console.log("");

  // Step 3: Poll for token
  const endTime = Date.now() + deviceData.expires_in * 1000;
  const interval = deviceData.interval * 1000;

  while (Date.now() < endTime) {
    await Bun.sleep(interval);

    const tokenResponse = await fetch(`${config.oauthUrl}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.clientId,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        device_code: deviceData.device_code,
      }),
    });

    const tokenData = await tokenResponse.json() as {
      error?: string;
      access_token?: string;
      refresh_token?: string;
    };

    if (tokenData.error === "authorization_pending") {
      process.stdout.write(".");
      continue;
    }

    if (tokenData.error) {
      throw new Error(`Authentication failed: ${tokenData.error}`);
    }

    if (tokenData.access_token) {
      console.log("");
      logInfo("Authentication successful!");

      // Get profile
      const profileResponse = await fetch(`${config.accountUrl}/my-account/get-profiles`, {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      const profileData = await profileResponse.json() as {
        profiles: Array<{ uuid: string; username: string }>;
      };

      if (!profileData.profiles?.length) {
        throw new Error("No game profiles found");
      }

      const profile = profileData.profiles[0];
      logInfo(`Using profile: ${profile.username} (${profile.uuid})`);

      const tokens: AuthTokens = {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || "",
        profileUuid: profile.uuid,
        timestamp: Date.now(),
      };

      saveTokens(tokens);
      return tokens;
    }
  }

  throw new Error("Authentication timed out");
}

async function createGameSession(accessToken: string, profileUuid: string): Promise<SessionTokens> {
  logInfo("Creating game session...");

  const response = await fetch(`${config.sessionUrl}/game-session/new`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ uuid: profileUuid }),
  });

  const data = await response.json() as {
    sessionToken?: string;
    identityToken?: string;
  };

  if (!data.sessionToken || !data.identityToken) {
    throw new Error("Failed to create game session");
  }

  logInfo("Game session created");

  return {
    sessionToken: data.sessionToken,
    identityToken: data.identityToken,
    ownerUuid: profileUuid,
  };
}

async function authenticate(): Promise<SessionTokens> {
  // Check for pre-injected tokens
  if (process.env.HYTALE_SERVER_SESSION_TOKEN && process.env.HYTALE_SERVER_IDENTITY_TOKEN) {
    logInfo("Using pre-injected session tokens");
    return {
      sessionToken: process.env.HYTALE_SERVER_SESSION_TOKEN,
      identityToken: process.env.HYTALE_SERVER_IDENTITY_TOKEN,
      ownerUuid: process.env.HYTALE_OWNER_UUID || "",
    };
  }

  // Try cached tokens
  let authTokens = loadCachedTokens();

  if (authTokens) {
    logInfo("Found cached auth tokens");
    authTokens = await refreshAccessToken(authTokens) || authTokens;
  } else {
    authTokens = await performDeviceAuth();
  }

  return createGameSession(authTokens.accessToken, authTokens.profileUuid);
}

// =============================================================================
// CurseForge Mod Installation
// =============================================================================

interface CurseForgeFile {
  id: number;
  fileName: string;
  downloadUrl: string;
  fileLength: number;
}

async function installCurseForgeMods(): Promise<void> {
  if (config.modInstallMode !== "curseforge") {
    logDebug("CurseForge mod installation disabled");
    return;
  }

  if (!config.curseforgeModList) {
    logInfo("No CurseForge mods specified");
    return;
  }

  if (!config.curseforgeApiKey) {
    throw new Error("CURSEFORGE_API_KEY required for mod installation");
  }

  const modIds = config.curseforgeModList.split(",").map((s) => s.trim()).filter(Boolean);
  logInfo(`Installing ${modIds.length} CurseForge mod(s)...`);

  mkdirSync(config.curseforgeModsDir, { recursive: true });

  for (const modSpec of modIds) {
    try {
      const [modIdStr, fileIdStr] = modSpec.includes(":") 
        ? modSpec.split(":") 
        : [modSpec, null];

      const modId = parseInt(modIdStr, 10);
      
      logDebug(`Fetching mod ${modId}...`);

      let fileInfo: CurseForgeFile;

      if (fileIdStr) {
        // Get specific file
        const response = await fetch(
          `https://api.curseforge.com/v1/mods/${modId}/files/${fileIdStr}`,
          { headers: { "x-api-key": config.curseforgeApiKey } }
        );
        const data = await response.json() as { data: CurseForgeFile };
        fileInfo = data.data;
      } else {
        // Get latest file
        const response = await fetch(
          `https://api.curseforge.com/v1/mods/${modId}/files?pageSize=1`,
          { headers: { "x-api-key": config.curseforgeApiKey } }
        );
        const data = await response.json() as { data: CurseForgeFile[] };
        fileInfo = data.data[0];
      }

      if (!fileInfo?.downloadUrl) {
        logWarn(`No download URL for mod ${modId}`);
        continue;
      }

      const targetPath = resolve(config.curseforgeModsDir, fileInfo.fileName);

      if (existsSync(targetPath)) {
        logDebug(`Mod ${fileInfo.fileName} already installed`);
        continue;
      }

      logInfo(`Downloading ${fileInfo.fileName}...`);

      const fileResponse = await fetch(fileInfo.downloadUrl);
      const buffer = new Uint8Array(await fileResponse.arrayBuffer());
      writeFileSync(targetPath, buffer);

      logInfo(`Installed: ${fileInfo.fileName}`);
    } catch (error) {
      logWarn(`Failed to install mod ${modSpec}: ${error}`);
    }
  }

  logInfo("Mod installation complete");
}

// =============================================================================
// Server Launch
// =============================================================================

async function launchServer(session: SessionTokens): Promise<void> {
  const javaArgs: string[] = [];

  // Memory
  javaArgs.push(`-Xms${config.javaXms}`, `-Xmx${config.javaXmx}`);

  // GC settings (G1GC for development)
  javaArgs.push("-XX:+UseG1GC", "-XX:MaxGCPauseMillis=200");

  // Container support
  javaArgs.push("-XX:+UseContainerSupport");

  // AOT cache
  if (config.enableAot && existsSync(config.aotCache)) {
    javaArgs.push(`-XX:AOTCache=${config.aotCache}`);
    logInfo("AOT cache enabled");
  }

  // Server jar
  javaArgs.push("-jar", config.serverJar);

  // Server arguments
  javaArgs.push("--assets", config.assetsFile);
  javaArgs.push("--bind", `0.0.0.0:${config.serverPort}`);
  javaArgs.push("--session-token", session.sessionToken);
  javaArgs.push("--identity-token", session.identityToken);

  if (session.ownerUuid) {
    javaArgs.push("--owner-uuid", session.ownerUuid);
  }

  if (config.disableSentry) {
    javaArgs.push("--disable-sentry");
  }

  // Development flags
  javaArgs.push("--accept-early-plugins");
  javaArgs.push("--allow-op");

  // Mods directory
  if (existsSync(config.curseforgeModsDir)) {
    javaArgs.push("--mods", config.curseforgeModsDir);
  }

  console.log("");
  logSeparator();
  logInfo("Starting Hytale Server (Developer Mode)");
  logSeparator();
  logInfo(`Port: ${config.serverPort}/udp`);
  logInfo(`Memory: ${config.javaXms} - ${config.javaXmx}`);
  logInfo(`Log Level: ${config.logLevel}`);
  logSeparator();
  console.log("");

  // Launch server
  const proc = Bun.spawn(["java", ...javaArgs], {
    cwd: config.serverDir,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });

  // Handle signals
  process.on("SIGTERM", () => {
    logInfo("Received SIGTERM, shutting down...");
    proc.kill("SIGTERM");
  });

  process.on("SIGINT", () => {
    logInfo("Received SIGINT, shutting down...");
    proc.kill("SIGINT");
  });

  const exitCode = await proc.exited;
  logInfo(`Server exited with code ${exitCode}`);
  process.exit(exitCode);
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  logInfo("Hytale Server Container (Developer) starting...");
  logDebug(`Data directory: ${config.dataDir}`);

  // Create directories
  mkdirSync(config.serverDir, { recursive: true });
  mkdirSync(config.modsDir, { recursive: true });
  mkdirSync(resolve(config.dataDir, "backups"), { recursive: true });

  // Step 1: Ensure server files
  await ensureServerFiles();

  // Step 2: Install mods
  await installCurseForgeMods();

  // Step 3: Authenticate
  const session = await authenticate();

  // Step 4: Launch server
  await launchServer(session);
}

main().catch((err) => {
  logError(`Fatal error: ${err.message}`);
  console.error(err);
  process.exit(1);
});
