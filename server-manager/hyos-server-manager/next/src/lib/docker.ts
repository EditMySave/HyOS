/**
 * Docker Client for controlling the Hytale server container
 *
 * Uses Dockerode to communicate with Docker via the mounted socket.
 */

import Docker from "dockerode";
import { loadConfig } from "./services/config/config.loader";

// Initialize Docker client - uses /var/run/docker.sock by default
const docker = new Docker({ socketPath: "/var/run/docker.sock" });

/**
 * Get the Hytale server container by name
 * Uses getContainer directly (same approach as experiments)
 */
async function getServerContainer(): Promise<Docker.Container> {
  const config = await loadConfig();
  const containerName = config.containerName || "hyos";
  return docker.getContainer(containerName);
}

/**
 * Start the Hytale server container
 */
export async function startServerContainer(): Promise<void> {
  const container = await getServerContainer();
  const info = await container.inspect();

  if (info.State.Running) {
    console.log("[docker] Container already running");
    return;
  }

  console.log("[docker] Starting container...");
  await container.start();
  console.log("[docker] Container started");
}

/**
 * Stop the Hytale server container
 */
export async function stopServerContainer(): Promise<void> {
  const container = await getServerContainer();
  const info = await container.inspect();

  if (!info.State.Running) {
    console.log("[docker] Container already stopped");
    return;
  }

  console.log("[docker] Stopping container...");
  await container.stop({ t: 30 }); // 30 second grace period
  console.log("[docker] Container stopped");
}

/**
 * Restart the Hytale server container
 */
export async function restartServerContainer(): Promise<void> {
  const container = await getServerContainer();
  console.log("[docker] Restarting container...");
  await container.restart({ t: 30 });
  console.log("[docker] Container restarted");
}

/**
 * Get the current state of the server container
 */
export async function getContainerState(): Promise<{
  running: boolean;
  status: string;
  startedAt: string | null;
}> {
  try {
    const container = await getServerContainer();
    const info = await container.inspect();

    return {
      running: info.State.Running,
      status: info.State.Status,
      startedAt: info.State.Running ? info.State.StartedAt : null,
    };
  } catch (error) {
    console.error("[docker] Failed to get container state:", error);
    return {
      running: false,
      status: "unknown",
      startedAt: null,
    };
  }
}

/**
 * Check if Docker is available.
 * Note: Docker may be intentionally unavailable on some deployments (e.g., TrueNAS)
 * where the manager only uses the REST API adapter.
 */
export async function isDockerAvailable(): Promise<boolean> {
  try {
    await docker.ping();
    return true;
  } catch {
    // Expected on REST-only deployments
    return false;
  }
}

/**
 * Execute a command inside the Hytale server container
 */
export async function execInContainer(
  command: string[],
): Promise<{ exitCode: number; output: string }> {
  const container = await getServerContainer();

  // Create exec instance
  const exec = await container.exec({
    Cmd: command,
    AttachStdout: true,
    AttachStderr: true,
  });

  // Start exec and capture output
  const stream = await exec.start({ hijack: true, stdin: false });

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    stream.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });

    stream.on("end", async () => {
      try {
        const inspection = await exec.inspect();
        const rawOutput = Buffer.concat(chunks).toString("utf-8");
        // Docker multiplexes stdout/stderr with 8-byte headers, strip them
        const output = rawOutput.replace(/[\x00-\x08]/g, "").trim();
        resolve({
          exitCode: inspection.ExitCode ?? 0,
          output,
        });
      } catch (error) {
        reject(error);
      }
    });

    stream.on("error", reject);
  });
}

/**
 * Get container logs
 */
export async function getContainerLogs(
  containerName: string,
  options: { tail?: number; since?: number; timestamps?: boolean } = {},
): Promise<string> {
  try {
    const container = docker.getContainer(containerName);

    // Check if container uses TTY (affects log format)
    const info = await container.inspect();
    const isTty = info.Config?.Tty ?? false;

    const logs = await container.logs({
      stdout: true,
      stderr: true,
      tail: options.tail ?? 100,
      since: options.since ?? 0,
      timestamps: options.timestamps ?? true,
      follow: false,
    });

    const buffer = Buffer.isBuffer(logs) ? logs : Buffer.from(logs);

    // If TTY is enabled, logs are NOT multiplexed - return as-is
    if (isTty) {
      return buffer.toString("utf8");
    }

    // Non-TTY: Docker logs come as a Buffer with multiplexed stdout/stderr
    // Each frame has an 8-byte header: [stream_type(1), 0, 0, 0, size(4)]
    const lines: string[] = [];
    let offset = 0;

    while (offset < buffer.length) {
      if (offset + 8 > buffer.length) break;

      // Read the 8-byte header
      const size = buffer.readUInt32BE(offset + 4);
      offset += 8;

      if (offset + size > buffer.length) break;

      // Read the payload
      const payload = buffer.subarray(offset, offset + size).toString("utf8");
      lines.push(payload);
      offset += size;
    }

    return lines.join("");
  } catch (error) {
    console.error("Failed to get container logs:", error);
    return "";
  }
}

/**
 * Parse logs for authentication prompts
 */
export function parseAuthFromLogs(logs: string): {
  waiting: boolean;
  url: string | null;
  code: string | null;
} {
  // Look for authentication URL pattern
  const urlMatch = logs.match(
    /https:\/\/oauth\.accounts\.hytale\.com\/oauth2\/device\/verify\?user_code=([A-Za-z0-9]+)/,
  );
  const codeMatch = logs.match(/Authorization code:\s*([A-Za-z0-9]+)/);

  if (urlMatch && codeMatch) {
    return {
      waiting: true,
      url: urlMatch[0],
      code: codeMatch[1],
    };
  }

  return {
    waiting: false,
    url: null,
    code: null,
  };
}
