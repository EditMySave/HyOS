/**
 * Docker Client for controlling the Hytale server container
 *
 * Uses Dockerode to communicate with Docker via the mounted socket.
 */

import { promises as fs } from "node:fs";
import Docker from "dockerode";
import { loadConfig } from "./services/config/config.loader";

// Initialize Docker client - uses /var/run/docker.sock by default
const docker = new Docker({ socketPath: "/var/run/docker.sock" });

// Cache the resolved server container id so we don't list containers on every
// poll. Invalidated whenever an inspect() turns up a 404.
let resolvedContainerId: string | null = null;
let resolvedForName: string | null = null;

// Cache the manager's own compose project so we can disambiguate when multiple
// stacks expose a service with the same name. `null` once we've tried and failed.
let managerProject: string | null | undefined;

function isNotFound(error: unknown): boolean {
  return (error as { statusCode?: number })?.statusCode === 404;
}

/**
 * Best-effort: find the compose project label of the container we're running
 * in, so resolveServerContainer can prefer a sibling in the same stack.
 */
async function getManagerProject(): Promise<string | null> {
  if (managerProject !== undefined) return managerProject;
  managerProject = null;
  try {
    // In a container, the hostname is the (short) container id by default.
    const selfId = process.env.HOSTNAME;
    if (selfId) {
      try {
        const info = await docker.getContainer(selfId).inspect();
        managerProject =
          info.Config?.Labels?.["com.docker.compose.project"] ?? null;
        return managerProject;
      } catch {
        // fall through to cgroup parsing
      }
    }
    // Fallback: parse the container id out of /proc/self/cgroup or /proc/self/mountinfo
    for (const path of ["/proc/self/cgroup", "/proc/self/mountinfo"]) {
      try {
        const content = await fs.readFile(path, "utf8");
        const match = content.match(/[0-9a-f]{64}/);
        if (match) {
          const info = await docker.getContainer(match[0]).inspect();
          managerProject =
            info.Config?.Labels?.["com.docker.compose.project"] ?? null;
          return managerProject;
        }
      } catch {
        // try next source
      }
    }
  } catch {
    // give up — disambiguation just becomes best-effort
  }
  return managerProject;
}

/**
 * Resolve the Hytale server container, tolerating compose project prefixes.
 *
 * Order of preference:
 *  1. Exact name/id match (works for plain `docker compose` / Custom App where
 *     the container literally is e.g. `hyos-server`).
 *  2. A container whose `com.docker.compose.service` label equals the configured
 *     name. When several match, prefer one in the manager's own project.
 *  3. A container whose name ends with `/<name>`, `-<name>-N` or `_<name>_N`
 *     (TrueNAS / docker-compose v1 style prefixes).
 */
async function resolveServerContainer(
  preferredName?: string,
): Promise<Docker.Container> {
  let containerName = preferredName;
  if (!containerName) {
    const config = await loadConfig();
    containerName = config.containerName || "hyos-server";
  }

  // Use cached id if it's still for the same configured name.
  if (resolvedContainerId && resolvedForName === containerName) {
    const cached = docker.getContainer(resolvedContainerId);
    try {
      await cached.inspect();
      return cached;
    } catch (error) {
      if (!isNotFound(error)) throw error;
      resolvedContainerId = null;
      resolvedForName = null;
    }
  }

  // 1. Exact match.
  try {
    const exact = docker.getContainer(containerName);
    await exact.inspect();
    resolvedContainerId = containerName;
    resolvedForName = containerName;
    return exact;
  } catch (error) {
    if (!isNotFound(error)) throw error;
  }

  // 2 & 3. Scan all containers.
  const list = await docker.listContainers({ all: true });
  const byServiceLabel = list.filter(
    (c) => c.Labels?.["com.docker.compose.service"] === containerName,
  );

  let chosen: Docker.ContainerInfo | undefined = byServiceLabel[0];
  if (byServiceLabel.length > 1) {
    const project = await getManagerProject();
    if (project) {
      const sameProject = byServiceLabel.find(
        (c) => c.Labels?.["com.docker.compose.project"] === project,
      );
      if (sameProject) chosen = sameProject;
    }
  }

  if (!chosen) {
    const suffixes = [
      `/${containerName}`,
      `-${containerName}-`,
      `_${containerName}_`,
    ];
    chosen = list.find((c) =>
      (c.Names ?? []).some((n) =>
        suffixes.some((s) =>
          s.endsWith("-") || s.endsWith("_")
            ? new RegExp(`${s}\\d+$`).test(n)
            : n.endsWith(s),
        ),
      ),
    );
  }

  if (!chosen) {
    throw Object.assign(new Error(`No such container: ${containerName}`), {
      statusCode: 404,
      reason: "no such container",
    });
  }

  resolvedContainerId = chosen.Id;
  resolvedForName = containerName;
  return docker.getContainer(chosen.Id);
}

/**
 * Get the Hytale server container by name (compose-project aware).
 */
async function getServerContainer(): Promise<Docker.Container> {
  return resolveServerContainer();
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

// Only log a container-not-found once per outage, so a missing/renamed
// container doesn't spam the logs on every status poll.
let loggedMissingContainer = false;

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
    loggedMissingContainer = false;

    return {
      running: info.State.Running,
      status: info.State.Status,
      startedAt: info.State.Running ? info.State.StartedAt : null,
    };
  } catch (error) {
    if (isNotFound(error)) {
      if (!loggedMissingContainer) {
        console.warn(
          "[docker] Server container not found (will fall back to REST API):",
          (error as Error).message,
        );
        loggedMissingContainer = true;
      }
    } else {
      console.error("[docker] Failed to get container state:", error);
    }
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
 * Get container logs.
 *
 * `containerName` is treated as the configured/compose-service name; the real
 * container is resolved via resolveServerContainer so compose project prefixes
 * (e.g. TrueNAS `ix-<release>-server-1`) are handled transparently.
 */
export async function getContainerLogs(
  containerName: string,
  options: { tail?: number; since?: number; timestamps?: boolean } = {},
): Promise<string> {
  try {
    const container = await resolveServerContainer(containerName);

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
