// Types
export type {
  InstalledMod,
  InstalledModsResponse,
  LoadedPlugin,
  LoadedPluginsResponse,
  UploadModResponse,
  DeleteModResponse,
  PatchModResponse,
  ManifestInfo,
  ModStatus,
  ModUpdate,
  ModUpdatesResponse,
} from "./mods.types";

// Services
export {
  getInstalledMods,
  getLoadedPlugins,
  uploadMod,
  deleteMod,
  patchMod,
  getModUpdates,
} from "./mods.service";

// Hooks
export {
  useInstalledMods,
  useLoadedPlugins,
  useModUpdates,
  useUploadMod,
  useDeleteMod,
  usePatchMod,
} from "./mods.hooks";

// Browser (aggregated mod search)
export {
  useAggregatedSearch,
  useModInstall,
  searchAllProviders,
  installMod,
  runSearch,
  getProviders,
  getProvider,
} from "./browser";
export type {
  AggregatedSearchResult,
  BrowsedMod,
  ModProvider,
  ModVersion,
  ProviderConfig,
  SearchParams,
} from "./browser";
