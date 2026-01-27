/**
 * Docker Client
 *
 * Wrapper for Docker operations using dockerode.
 * Used to execute commands in the Hytale server container
 * and manage container lifecycle.
 */

import Docker from "dockerode";
import type { CommandResult } from "../types";

// Singleton Docker instance
let dockerInstance: Docker | null = null;

/**
 * Get the Docker client instance
 */
export function getDocker(): Docker {
  if (!dockerInstance) {
    // Connect to Docker socket
    dockerInstance = new Docker({
      socketPath: process.env.DOCKER_SOCKET || "/var/run/docker.sock",
    });
  }
  return dockerInstance;
}

/**
 * Execute a command inside the Hytale server container
 * by piping to stdin of the running process
 */
export async function executeInContainer(
  containerName: string,
  command: string,
): Promise<CommandResult> {
  const docker = getDocker();

  try {
    const container = docker.getContainer(containerName);

    // Check if container is running
    const info = await container.inspect();
    if (!info.State.Running) {
      return {
        success: false,
        output: "",
        error: "Container is not running",
      };
    }

    // Execute command via exec
    // We use /opt/scripts/cmd/exec.sh if it exists, otherwise direct echo
    const exec = await container.exec({
      Cmd: ["sh", "-c", `echo "${escapeCommand(command)}" >> /proc/1/fd/0`],
      AttachStdout: true,
      AttachStderr: true,
    });

    const stream = await exec.start({ hijack: true, stdin: false });

    // Collect output
    const output = await streamToString(stream);

    // Check exec result
    const execInfo = await exec.inspect();

    return {
      success: execInfo.ExitCode === 0,
      output: output.trim(),
      error:
        execInfo.ExitCode !== 0 ? `Exit code: ${execInfo.ExitCode}` : undefined,
    };
  } catch (error) {
    return {
      success: false,
      output: "",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Execute a script in the container
 */
export async function executeScript(
  containerName: string,
  scriptPath: string,
  args: string[] = [],
): Promise<CommandResult> {
  const docker = getDocker();

  try {
    const container = docker.getContainer(containerName);

    const exec = await container.exec({
      Cmd: [scriptPath, ...args],
      AttachStdout: true,
      AttachStderr: true,
    });

    const stream = await exec.start({ hijack: true, stdin: false });
    const output = await streamToString(stream);
    const execInfo = await exec.inspect();

    return {
      success: execInfo.ExitCode === 0,
      output: output.trim(),
      error:
        execInfo.ExitCode !== 0 ? `Exit code: ${execInfo.ExitCode}` : undefined,
    };
  } catch (error) {
    return {
      success: false,
      output: "",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get container status
 */
export async function getContainerStatus(containerName: string): Promise<{
  running: boolean;
  state: string;
  startedAt: string | null;
  health: string | null;
}> {
  const docker = getDocker();

  try {
    const container = docker.getContainer(containerName);
    const info = await container.inspect();

    return {
      running: info.State.Running,
      state: info.State.Status,
      startedAt: info.State.StartedAt || null,
      health: info.State.Health?.Status || null,
    };
  } catch {
    return {
      running: false,
      state: "not_found",
      startedAt: null,
      health: null,
    };
  }
}

/**
 * Start the container
 */
export async function startContainer(containerName: string): Promise<void> {
  const docker = getDocker();
  const container = docker.getContainer(containerName);
  await container.start();
}

/**
 * Stop the container gracefully
 */
export async function stopContainer(
  containerName: string,
  timeout: number = 30,
): Promise<void> {
  const docker = getDocker();
  const container = docker.getContainer(containerName);
  await container.stop({ t: timeout });
}

/**
 * Restart the container
 */
export async function restartContainer(
  containerName: string,
  timeout: number = 30,
): Promise<void> {
  const docker = getDocker();
  const container = docker.getContainer(containerName);
  await container.restart({ t: timeout });
}

/**
 * Escape a command string for shell execution
 */
function escapeCommand(command: string): string {
  // Escape double quotes and backslashes
  return command.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * Convert a Docker stream to string
 */
async function streamToString(stream: NodeJS.ReadableStream): Promise<string> {
  const chunks: Buffer[] = [];

  return new Promise((resolve, reject) => {
    stream.on("data", (chunk: Buffer) => {
      // Docker streams have an 8-byte header for each frame
      // Skip the header and extract the payload
      if (chunk.length > 8) {
        chunks.push(chunk.subarray(8));
      }
    });

    stream.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
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
  const docker = getDocker();

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
