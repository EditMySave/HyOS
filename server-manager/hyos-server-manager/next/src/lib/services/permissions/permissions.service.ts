import { z } from "zod";
import {
  type CommandResponse,
  commandResponseSchema,
  type GroupResponse,
  groupResponseSchema,
  type PermissionsData,
  permissionsDataSchema,
} from "./permissions.types";

const PERMISSIONS_KEY = "/api/server/permissions";
const GROUPS_KEY = "/api/server/permissions/groups";

const groupsArraySchema = z.array(groupResponseSchema);

export async function getPermissionsData(): Promise<PermissionsData> {
  const response = await fetch(PERMISSIONS_KEY);
  if (!response.ok) {
    throw new Error(`Failed to fetch permissions: ${response.statusText}`);
  }
  const data = await response.json();
  return permissionsDataSchema.parse(data);
}

export async function getPermissionGroups(): Promise<GroupResponse[]> {
  const response = await fetch(GROUPS_KEY);
  if (!response.ok) {
    throw new Error(`Failed to fetch groups: ${response.statusText}`);
  }
  const data = await response.json();
  return groupsArraySchema.parse(data);
}

export async function createGroup(
  name: string,
  permissions: string[] = [],
): Promise<GroupResponse> {
  const response = await fetch(GROUPS_KEY, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: name.trim(), permissions }),
  });
  if (!response.ok) {
    throw new Error(`Failed to create group: ${response.statusText}`);
  }
  const data = await response.json();
  return groupResponseSchema.parse(data);
}

export async function updateGroup(
  name: string,
  permissions: string[],
): Promise<GroupResponse> {
  const response = await fetch(`${GROUPS_KEY}/${encodeURIComponent(name)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ permissions }),
  });
  if (!response.ok) {
    throw new Error(`Failed to update group: ${response.statusText}`);
  }
  const data = await response.json();
  return groupResponseSchema.parse(data);
}

export async function deleteGroup(name: string): Promise<void> {
  const response = await fetch(`${GROUPS_KEY}/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(`Failed to delete group: ${response.statusText}`);
  }
}

export async function addOp(player: string): Promise<CommandResponse> {
  const response = await fetch("/api/server/permissions/op", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ player: player.trim() }),
  });
  if (!response.ok) {
    throw new Error(`Failed to add operator: ${response.statusText}`);
  }
  const data = await response.json();
  return commandResponseSchema.parse(data);
}

export async function removeOp(player: string): Promise<CommandResponse> {
  const response = await fetch(
    `/api/server/permissions/op?player=${encodeURIComponent(player)}`,
    { method: "DELETE" },
  );
  if (!response.ok) {
    throw new Error(`Failed to remove operator: ${response.statusText}`);
  }
  const data = await response.json();
  return commandResponseSchema.parse(data);
}

export async function addUserToGroup(
  uuid: string,
  group: string,
): Promise<void> {
  const response = await fetch(`/api/player/${uuid}/groups`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ group: group.trim() }),
  });
  if (!response.ok) {
    throw new Error(`Failed to add user to group: ${response.statusText}`);
  }
}

export async function grantUserPermission(
  uuid: string,
  permission: string,
): Promise<void> {
  const response = await fetch(`/api/player/${uuid}/permissions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ permission: permission.trim() }),
  });
  if (!response.ok) {
    throw new Error(`Failed to grant permission: ${response.statusText}`);
  }
}

export async function revokeUserPermission(
  uuid: string,
  permission: string,
): Promise<void> {
  const response = await fetch(
    `/api/player/${uuid}/permissions?permission=${encodeURIComponent(permission)}`,
    { method: "DELETE" },
  );
  if (!response.ok) {
    throw new Error(`Failed to revoke permission: ${response.statusText}`);
  }
}
