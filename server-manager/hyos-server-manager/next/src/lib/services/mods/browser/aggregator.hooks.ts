import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import {
  searchAllProviders,
  installMod as installModService,
  type InstallModInfo,
} from "./aggregator.service";
import type { AggregatedSearchResult, ModVersion, SearchParams } from "./types";

export function useAggregatedSearch(params: SearchParams | null) {
  return useSWR<AggregatedSearchResult>(
    params
      ? [`mod-search`, params.query, params.sort, params.page, params.providers]
      : null,
    () => searchAllProviders(params!),
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    },
  );
}

export function useModInstall() {
  return useSWRMutation(
    "install-mod",
    async (
      _,
      {
        arg,
      }: {
        arg: {
          version: ModVersion;
          provider: string;
          modInfo?: InstallModInfo;
        };
      },
    ) =>
      installModService(
        arg.provider as "curseforge" | "modtale" | "nexusmods",
        arg.version,
        arg.modInfo,
      ),
  );
}
