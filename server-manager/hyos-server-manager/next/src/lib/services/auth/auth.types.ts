import { z } from "zod";

// ============================================================================
// User & Credential Storage
// ============================================================================

export const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  passwordHash: z.string(),
  createdAt: z.string(),
});

export type User = z.infer<typeof userSchema>;

export const usersFileSchema = z.object({
  users: z.array(userSchema),
});

export type UsersFile = z.infer<typeof usersFileSchema>;

// ============================================================================
// Session
// ============================================================================

export interface SessionData {
  userId: string;
  username: string;
}

// ============================================================================
// API Request Schemas
// ============================================================================

export const setupRequestSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(32, "Username must be at most 32 characters")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Username can only contain letters, numbers, hyphens, and underscores",
    ),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters"),
});

export type SetupRequest = z.infer<typeof setupRequestSchema>;

export const loginRequestSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

// ============================================================================
// API Response Types
// ============================================================================

export interface AuthStatusResponse {
  authenticated: boolean;
  needsSetup: boolean;
  username?: string;
}
