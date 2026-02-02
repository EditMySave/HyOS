import useSWR, { mutate } from "swr";
import useSWRMutation from "swr/mutation";
import {
  addOp,
  createGroup,
  deleteGroup,
  getPermissionGroups,
  getPermissionsData,
  removeOp,
  updateGroup,
} from "./permissions.service";
import type {
  CommandResponse,
  GroupResponse,
  PermissionsData,
} from "./permissions.types";

const PERMISSIONS_KEY = "/api/server/permissions";
const GROUPS_KEY = "/api/server/permissions/groups";

export function usePermissionsData(refreshInterval = 10000) {
  return useSWR<PermissionsData>(PERMISSIONS_KEY, () => getPermissionsData(), {
    refreshInterval,
    dedupingInterval: 5000,
  });
}

export function usePermissionGroups(refreshInterval = 10000) {
  return useSWR<GroupResponse[]>(GROUPS_KEY, () => getPermissionGroups(), {
    refreshInterval,
    dedupingInterval: 5000,
  });
}

export function useAddOp() {
  return useSWRMutation<CommandResponse, Error, string, { player: string }>(
    PERMISSIONS_KEY,
    (_key, { arg }) => addOp(arg.player),
    {
      onSuccess: () => {
        void mutate(PERMISSIONS_KEY);
      },
    },
  );
}

export function useRemoveOp() {
  return useSWRMutation<CommandResponse, Error, string, { player: string }>(
    PERMISSIONS_KEY,
    (_key, { arg }) => removeOp(arg.player),
    {
      onSuccess: () => {
        void mutate(PERMISSIONS_KEY);
      },
    },
  );
}

export function useCreateGroup() {
  return useSWRMutation<
    GroupResponse,
    Error,
    string,
    { name: string; permissions?: string[] }
  >(
    GROUPS_KEY,
    (_key, { arg }) => createGroup(arg.name, arg.permissions ?? []),
    {
      onSuccess: () => {
        void mutate(GROUPS_KEY);
        void mutate(PERMISSIONS_KEY);
      },
    },
  );
}

export function useUpdateGroup() {
  return useSWRMutation<
    GroupResponse,
    Error,
    string,
    { name: string; permissions: string[] }
  >(GROUPS_KEY, (_key, { arg }) => updateGroup(arg.name, arg.permissions), {
    onSuccess: () => {
      void mutate(GROUPS_KEY);
      void mutate(PERMISSIONS_KEY);
    },
  });
}

export function useDeleteGroup() {
  return useSWRMutation<void, Error, string, { name: string }>(
    GROUPS_KEY,
    (_key, { arg }) => deleteGroup(arg.name),
    {
      onSuccess: () => {
        void mutate(GROUPS_KEY);
        void mutate(PERMISSIONS_KEY);
      },
    },
  );
}
