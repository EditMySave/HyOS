import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { ModProvider } from "@/lib/services/mods/browser/types";
import type { ProviderSettingsResponse } from "@/lib/services/mods/providers.types";

export interface ProviderState {
  enabled: boolean;
  hasApiKey: boolean;
}

interface ModProvidersState {
  providers: Record<ModProvider, ProviderState>;
  setProviderEnabled: (provider: ModProvider, enabled: boolean) => void;
  setProvidersFromSettings: (settings: ProviderSettingsResponse) => void;
  getEnabledProviders: () => ModProvider[];
}

const defaultProviders: Record<ModProvider, ProviderState> = {
  curseforge: { enabled: false, hasApiKey: false },
  modtale: { enabled: true, hasApiKey: false },
  nexusmods: { enabled: false, hasApiKey: false },
};

export const useModProvidersStore = create<ModProvidersState>()(
  persist(
    (set, get) => ({
      providers: defaultProviders,
      setProviderEnabled: (provider, enabled) =>
        set((state) => ({
          providers: {
            ...state.providers,
            [provider]: { ...state.providers[provider], enabled },
          },
        })),
      setProvidersFromSettings: (settings) =>
        set(() => {
          const providers = { ...defaultProviders };
          for (const p of settings.providers) {
            providers[p.id] = {
              enabled: p.enabled,
              hasApiKey: p.hasApiKey,
            };
          }
          return { providers };
        }),
      getEnabledProviders: () => {
        const { providers } = get();
        return (Object.keys(providers) as ModProvider[]).filter(
          (p) => providers[p].enabled,
        );
      },
    }),
    {
      name: "mod-providers-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ providers: state.providers }),
    },
  ),
);
