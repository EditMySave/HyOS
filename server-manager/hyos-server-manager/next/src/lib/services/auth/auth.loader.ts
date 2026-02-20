import { promises as fs } from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import type { User, UsersFile } from "./auth.types";
import { usersFileSchema } from "./auth.types";

const USERS_FILE = "users.json";
const SESSION_SECRET_FILE = ".session-secret";
const BCRYPT_ROUNDS = 12;

function defaultStateDir(): string {
  return process.env.NODE_ENV === "production"
    ? "/data/.state"
    : "/tmp/hytale-state";
}

function getUsersPath(): string {
  const stateDir = process.env.HYTALE_STATE_DIR ?? defaultStateDir();
  return path.join(stateDir, USERS_FILE);
}

async function readUsersFile(): Promise<UsersFile> {
  try {
    const content = await fs.readFile(getUsersPath(), "utf8");
    return usersFileSchema.parse(JSON.parse(content));
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === "ENOENT") return { users: [] };
    console.error("Failed to read users file:", err);
    return { users: [] };
  }
}

async function writeUsersFile(data: UsersFile): Promise<void> {
  const filePath = getUsersPath();
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  const tempPath = `${filePath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(data, null, 2));
  await fs.rename(tempPath, filePath);
}

export async function needsSetup(): Promise<boolean> {
  const data = await readUsersFile();
  return data.users.length === 0;
}

export async function createUser(
  username: string,
  password: string,
): Promise<User> {
  const data = await readUsersFile();

  const exists = data.users.some(
    (u) => u.username.toLowerCase() === username.toLowerCase(),
  );
  if (exists) {
    throw new Error("Username already exists");
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user: User = {
    id: crypto.randomUUID(),
    username,
    passwordHash,
    createdAt: new Date().toISOString(),
  };

  data.users.push(user);
  await writeUsersFile(data);
  return user;
}

export async function findUserByUsername(
  username: string,
): Promise<User | null> {
  const data = await readUsersFile();
  return (
    data.users.find(
      (u) => u.username.toLowerCase() === username.toLowerCase(),
    ) ?? null
  );
}

export async function verifyPassword(
  user: User,
  password: string,
): Promise<boolean> {
  return bcrypt.compare(password, user.passwordHash);
}

export async function getSessionSecret(): Promise<string> {
  // Prefer env var (required for Edge Runtime middleware consistency)
  if (process.env.SESSION_SECRET) {
    return process.env.SESSION_SECRET;
  }

  // Fallback: auto-generated file-based secret for dev
  const stateDir = process.env.HYTALE_STATE_DIR ?? defaultStateDir();
  const secretPath = path.join(stateDir, SESSION_SECRET_FILE);

  try {
    return await fs.readFile(secretPath, "utf8");
  } catch {
    // Generate new secret
    const secret = crypto.randomUUID() + crypto.randomUUID();
    await fs.mkdir(stateDir, { recursive: true });
    await fs.writeFile(secretPath, secret, { mode: 0o600 });
    return secret;
  }
}
