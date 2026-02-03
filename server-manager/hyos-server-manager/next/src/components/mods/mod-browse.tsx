"use client";

import { useState, useCallback, useEffect } from "react";
import { useModProvidersStore } from "@/lib/stores/mod-providers.store";
import {
  useAggregatedSearch,
  useModInstall,
} from "@/lib/services/mods/browser/aggregator.hooks";
import { useProviderSettings } from "@/lib/services/mods/providers.hooks";
import { useInstalledMods } from "@/lib/services/mods";
import type { SearchParams } from "@/lib/services/mods/browser/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Loader2,
  Download,
  ExternalLink,
  FileArchive,
  AlertCircle,
  Settings,
  Check,
} from "lucide-react";
import { ModProviderSettingsDialog } from "./mod-provider-settings";
import { cn } from "@/lib/utils";
import type { BrowsedMod } from "@/lib/services/mods/browser/types";

const SORT_OPTIONS: { value: SearchParams["sort"]; label: string }[] = [
  { value: "downloads", label: "Downloads" },
  { value: "relevance", label: "Relevance" },
  { value: "updated", label: "Updated" },
  { value: "name", label: "Name" },
];

function ModCard({
  mod,
  onInstall,
  isInstalling,
  isInstalled,
}: {
  mod: BrowsedMod;
  onInstall: (mod: BrowsedMod) => void;
  isInstalling: boolean;
  isInstalled: boolean;
}) {
  const canInstall =
    mod.latestVersion?.downloadUrl != null && !isInstalling && !isInstalled;

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex gap-4">
        {mod.iconUrl ? (
          <img
            src={mod.iconUrl}
            alt=""
            className="h-14 w-14 shrink-0 rounded-none border border-border object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-none border border-border bg-muted">
            <FileArchive className="h-7 w-7 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium">{mod.name}</h3>
            <Badge variant="secondary" className="text-xs">
              {mod.provider}
            </Badge>
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {mod.summary || "No description"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {mod.authors.join(", ")} · {mod.downloadCount.toLocaleString()}{" "}
            downloads
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {isInstalling ? (
          <Button size="sm" disabled>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Installing…
          </Button>
        ) : isInstalled ? (
          <Button size="sm" variant="secondary" disabled>
            <Check className="mr-2 h-4 w-4" />
            Installed
          </Button>
        ) : canInstall ? (
          <Button size="sm" onClick={() => onInstall(mod)}>
            <Download className="mr-2 h-4 w-4" />
            Install
          </Button>
        ) : (
          <Button size="sm" variant="outline" asChild>
            <a
              href={mod.websiteUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              View on website
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}

export function ModBrowse({ className }: { className?: string }) {
  const providers = useModProvidersStore((s) => s.providers);
  const getEnabledProviders = useModProvidersStore(
    (s) => s.getEnabledProviders,
  );
  const setProvidersFromSettings = useModProvidersStore(
    (s) => s.setProvidersFromSettings,
  );

  const { data: providerSettings } = useProviderSettings();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (providerSettings) setProvidersFromSettings(providerSettings);
  }, [providerSettings, setProvidersFromSettings]);

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SearchParams["sort"]>("downloads");
  const [page, setPage] = useState(0);
  const [submittedParams, setSubmittedParams] = useState<SearchParams | null>(
    null,
  );
  const [settingsOpen, setSettingsOpen] = useState(false);

  const enabled = getEnabledProviders();

  const params: SearchParams = {
    query,
    providers: enabled,
    sort,
    page,
    pageSize: 20,
  };

  const { data, error, isLoading, mutate } =
    useAggregatedSearch(submittedParams);
  const { trigger: installMod } = useModInstall();
  const { data: installedMods, mutate: refreshInstalled } = useInstalledMods();
  const [installingModKey, setInstallingModKey] = useState<string | null>(null);

  const handleSearch = useCallback(() => {
    setPage(0);
    setSubmittedParams({
      query,
      providers: enabled,
      sort,
      page: 0,
      pageSize: 20,
    });
  }, [query, enabled, sort]);

  const handleInstall = useCallback(
    async (mod: BrowsedMod) => {
      if (!mod.latestVersion?.downloadUrl) return;
      const key = `${mod.provider}-${mod.id}`;
      setInstallingModKey(key);
      try {
        await installMod({
          provider: mod.provider,
          version: mod.latestVersion,
        });
        mutate();
        refreshInstalled();
      } catch (e) {
        console.error("Install failed:", e);
      } finally {
        setInstallingModKey(null);
      }
    },
    [installMod, mutate, refreshInstalled],
  );

  const hasNoProviders =
    enabled.length === 0 ||
    (enabled.includes("curseforge") && !providers.curseforge.hasApiKey) ||
    (enabled.includes("nexusmods") && !providers.nexusmods.hasApiKey);

  return (
    <>
      <ModProviderSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
      <Card className={cn("w-full", className)}>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Browse mods
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Search CurseForge, Modtale, and NexusMods. Configure API keys via
              the settings button.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSettingsOpen(true)}
            className="shrink-0"
            aria-label="Mod sources settings"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </CardHeader>
      <CardContent className="space-y-4">
        {hydrated && hasNoProviders && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>
              Enable at least one mod source and add API keys where required
              (CurseForge, NexusMods).
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search mods..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="max-w-sm"
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SearchParams["sort"])}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <Button onClick={handleSearch} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Search className="mr-2 h-4 w-4" />
            )}
            Search
          </Button>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            {error.message}
          </div>
        )}

        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && data && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              {data.results.map((mod) => (
                <ModCard
                  key={`${mod.provider}-${mod.id}`}
                  mod={mod}
                  onInstall={handleInstall}
                  isInstalling={installingModKey === `${mod.provider}-${mod.id}`}
                  isInstalled={
                    !!installedMods?.mods.some(
                      (m) => m.name === mod.latestVersion?.fileName,
                    )
                  }
                />
              ))}
            </div>

            {data.results.length === 0 && (
              <div className="py-12 text-center text-muted-foreground">
                No mods found. Try a different query or enable more sources.
              </div>
            )}

            {data.errors.length > 0 && (
              <div className="text-sm text-amber-600 dark:text-amber-400">
                Some sources failed:{" "}
                {data.errors.map((e) => `${e.provider}: ${e.error}`).join("; ")}
              </div>
            )}

            {data.results.length > 0 && submittedParams && (
              <div className="flex justify-center gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={submittedParams.page === 0}
                  onClick={() => {
                    const next = Math.max(0, submittedParams.page - 1);
                    setPage(next);
                    setSubmittedParams({ ...submittedParams, page: next });
                  }}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const next = submittedParams.page + 1;
                    setPage(next);
                    setSubmittedParams({ ...submittedParams, page: next });
                  }}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
    </>
  );
}
