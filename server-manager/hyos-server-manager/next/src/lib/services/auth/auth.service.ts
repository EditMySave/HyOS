import type { AuthStatusResponse } from "./auth.types";

export async function getAuthStatus(): Promise<AuthStatusResponse> {
  const response = await fetch("/api/auth/status");
  if (!response.ok) {
    throw new Error(`Failed to get auth status: ${response.statusText}`);
  }
  return response.json();
}

export async function login(
  username: string,
  password: string,
): Promise<{ success: boolean; error?: string }> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await response.json();
  if (!response.ok) {
    return { success: false, error: data.error ?? "Login failed" };
  }
  return { success: true };
}

export async function setup(
  username: string,
  password: string,
  telemetryOptOut = false,
): Promise<{ success: boolean; error?: string }> {
  const response = await fetch("/api/auth/setup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, telemetryOptOut }),
  });
  const data = await response.json();
  if (!response.ok) {
    return { success: false, error: data.error ?? "Setup failed" };
  }
  return { success: true };
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" });
}
