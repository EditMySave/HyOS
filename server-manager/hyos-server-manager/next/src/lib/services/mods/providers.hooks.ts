import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import type { ModProvider } from "./browser/types";
import {
  getProviderSettings,
  resetProviderKey as resetProviderKeyService,
  saveProviderSettings as saveProviderSettingsService,
} from "./providers.service";
import type {
  ProviderSettingsResponse,
  SaveProviderSettingsRequest,
} from "./providers.types";

const SETTINGS_KEY = "mod-providers-settings";

export function useProviderSettings() {
  return useSWR<ProviderSettingsResponse>(
    SETTINGS_KEY,
    () => getProviderSettings(),
    { revalidateOnFocus: true },
  );
}

export function useSaveProviderSettings() {
  return useSWRMutation<
    ProviderSettingsResponse,
    Error,
    typeof SETTINGS_KEY,
    SaveProviderSettingsRequest
  >(SETTINGS_KEY, (_key, { arg }) => saveProviderSettingsService(arg), {
    revalidate: true,
  });
}

export function useResetProviderKey() {
  return useSWRMutation<
    ProviderSettingsResponse,
    Error,
    typeof SETTINGS_KEY,
    ModProvider
  >(SETTINGS_KEY, (_key, { arg }) => resetProviderKeyService(arg), {
    revalidate: true,
  });
}
