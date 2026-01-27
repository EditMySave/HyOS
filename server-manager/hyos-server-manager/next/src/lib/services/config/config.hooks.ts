import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import { getConfig, resetConfig, updateConfig } from "./config.service";
import type { ConfigGetResponse, ManagerConfigUpdate } from "./config.types";

export function useConfig() {
  return useSWR<ConfigGetResponse>("config", getConfig);
}

export function useUpdateConfig() {
  return useSWRMutation<ConfigGetResponse, Error, string, ManagerConfigUpdate>(
    "config",
    async (_, { arg }) => updateConfig(arg),
  );
}

export function useResetConfig() {
  return useSWRMutation<void, Error, string>("config", async () =>
    resetConfig(),
  );
}
