"use client";

import {
  ArrowUpCircle,
  CheckCircle2,
  ExternalLink,
  Link2,
  Loader2,
  Search,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useSWRConfig } from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { searchAllProviders } from "@/lib/services/mods/browser/aggregator.service";
import type { BrowsedMod } from "@/lib/services/mods/browser/types";
import { useModLink } from "@/lib/services/mods/mods.hooks";
import type {
  InstalledMod,
  LoadedPlugin,
  ModUpdate,
} from "@/lib/services/mods/mods.types";
import { cn } from "@/lib/utils";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

function formatDownloads(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}

interface ModDetailsDialogProps {
  mod: InstalledMod | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pluginInfo?: LoadedPlugin | null;
  update?: ModUpdate | null;
  installedModNames: Set<string>;
}

export function ModDetailsDialog({
  mod,
  open,
  onOpenChange,
  pluginInfo,
  update,
  installedModNames,
}: ModDetailsDialogProps) {
  const { mutate } = useSWRConfig();
  const { trigger: linkMod, isMutating: isLinking } = useModLink();

  const [searchResults, setSearchResults] = useState<BrowsedMod[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [linkingId, setLinkingId] = useState<string | null>(null);

  // Reset search state when switching between mods
  useEffect(() => {
    setSearchResults([]);
    setHasSearched(false);
    setLinkingId(null);
  }, [mod?.id]);

  if (!mod) return null;

  const deps = mod.dependencies ?? [];

  const handleSearch = async () => {
    setIsSearching(true);
    setHasSearched(true);
    try {
      const result = await searchAllProviders({
        query: mod.displayName,
        providers: ["curseforge", "modtale", "nexusmods"],
        sort: "relevance",
        page: 0,
        pageSize: 5,
      });
      setSearchResults(result.results);
    } catch (e) {
      console.error("Provider search failed:", e);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleLink = async (browsedMod: BrowsedMod) => {
    setLinkingId(browsedMod.id);
    try {
      await linkMod({
        modId: mod.id,
        data: {
          provider: browsedMod.provider,
          providerModId: browsedMod.id,
          websiteUrl: browsedMod.websiteUrl,
          iconUrl: browsedMod.iconUrl,
          authors: browsedMod.authors,
          summary: browsedMod.summary,
        },
      });
      await mutate("installed-mods");
      await mutate("mod-updates");
      onOpenChange(false);
    } catch (e) {
      console.error("Link failed:", e);
    } finally {
      setLinkingId(null);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSearchResults([]);
      setHasSearched(false);
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mod.displayName}</DialogTitle>
          <DialogDescription>{mod.fileName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          {/* General Info */}
          <Section title="General">
            <Row label="Version" value={mod.version ?? "Unknown"} />
            {mod.authors.length > 0 ? (
              <Row label="Author(s)" value={mod.authors.join(", ")} />
            ) : null}
            {mod.providerSource ? (
              <Row label="Source" value={mod.providerSource} />
            ) : null}
            {mod.description ? (
              <Row label="Description" value={mod.description} />
            ) : null}
          </Section>

          {/* Manifest Info */}
          {mod.manifestInfo ? (
            <Section title="Manifest">
              {mod.manifestInfo.group ? (
                <Row label="Group" value={mod.manifestInfo.group} />
              ) : null}
              {mod.manifestInfo.name ? (
                <Row label="Name" value={mod.manifestInfo.name} />
              ) : null}
              {mod.manifestInfo.main ? (
                <Row label="Main Class" value={mod.manifestInfo.main} />
              ) : null}
              {mod.manifestInfo.serverVersion ? (
                <Row
                  label="Server Version"
                  value={mod.manifestInfo.serverVersion}
                />
              ) : null}
            </Section>
          ) : null}

          {/* Dependencies */}
          {deps.length > 0 ? (
            <Section title="Dependencies">
              <div className="space-y-1">
                {deps.map((dep) => {
                  const satisfied = installedModNames.has(dep.toLowerCase());
                  return (
                    <div key={dep} className="flex items-center gap-2">
                      {satisfied ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-red-500" />
                      )}
                      <span className={satisfied ? "" : "text-red-500"}>
                        {dep}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Section>
          ) : null}

          {/* File Info */}
          <Section title="File">
            <Row label="Size" value={formatBytes(mod.size)} />
            <Row
              label="Modified"
              value={new Date(mod.modified).toLocaleString()}
            />
            <Row label="Path" value={mod.path} />
            <div className="flex gap-2">
              {mod.disabled ? (
                <>
                  <Badge
                    variant="outline"
                    className="border-red-500 text-red-500"
                  >
                    Disabled
                  </Badge>
                  {mod.disableReason === "crashed" && (
                    <Badge variant="destructive">Caused Crash</Badge>
                  )}
                  {mod.disableReason === "invalid_version" && (
                    <Badge
                      variant="outline"
                      className="border-amber-500 text-amber-500"
                    >
                      Bad Version
                    </Badge>
                  )}
                </>
              ) : null}
              {mod.needsPatch ? (
                <Badge
                  variant="outline"
                  className="border-amber-500 text-amber-500"
                >
                  Needs Patch
                </Badge>
              ) : null}
              {mod.isPatched ? (
                <Badge
                  variant="outline"
                  className="border-blue-500 text-blue-500"
                >
                  Patched
                </Badge>
              ) : null}
              {pluginInfo ? (
                <Badge className="bg-green-500 hover:bg-green-600">
                  {pluginInfo.state}
                </Badge>
              ) : null}
            </div>
          </Section>

          {/* Update Info */}
          {update ? (
            <Section title="Update Available">
              <div className="flex items-center gap-2 border border-green-500/30 bg-green-500/10 p-3">
                <ArrowUpCircle className="h-4 w-4 text-green-500" />
                <div>
                  <p className="font-medium text-green-600 dark:text-green-400">
                    {update.currentVersion} → {update.latestVersion}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    via {update.provider}
                    {update.isCritical ? " (critical)" : ""}
                  </p>
                </div>
              </div>
            </Section>
          ) : null}

          {/* Link to Provider */}
          {!mod.providerSource ? (
            <Section title="Link to Provider">
              <p className="text-xs text-muted-foreground mb-2">
                Link this mod to a provider to enable update detection.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSearch}
                disabled={isSearching}
                className="rounded-none"
              >
                {isSearching ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Search className="mr-2 h-3.5 w-3.5" />
                )}
                Search Providers
              </Button>

              {isSearching ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : null}

              {hasSearched && !isSearching && searchResults.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">
                  No matching mods found on any provider.
                </p>
              ) : null}

              {searchResults.length > 0 ? (
                <div className="mt-2 space-y-2">
                  {searchResults.map((result) => (
                    <div
                      key={`${result.provider}-${result.id}`}
                      className={cn(
                        "flex items-center justify-between gap-2 border border-border p-2",
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {result.iconUrl ? (
                          <img
                            src={result.iconUrl}
                            alt=""
                            className="h-8 w-8 border border-border object-cover shrink-0"
                          />
                        ) : null}
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">
                            {result.name}
                          </p>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Badge
                              variant="outline"
                              className="rounded-none text-[10px] px-1 py-0"
                            >
                              {result.provider}
                            </Badge>
                            <span>
                              {result.latestVersion?.displayName ?? "?"}
                            </span>
                            <span>
                              {formatDownloads(result.downloadCount)} downloads
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => handleLink(result)}
                        disabled={isLinking}
                        className="rounded-none shrink-0"
                      >
                        {linkingId === result.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Link2 className="h-3 w-3" />
                        )}
                        Link
                      </Button>
                    </div>
                  ))}
                </div>
              ) : null}
            </Section>
          ) : null}

          {/* Provider Link */}
          {mod.providerSource && mod.websiteUrl ? (
            <a
              href={mod.websiteUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              View on {mod.providerSource}
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </h4>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-mono text-xs break-all">{value}</span>
    </div>
  );
}
