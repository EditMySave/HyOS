"use client";

import { useState, useMemo, useCallback } from "react";
import {
  useInstalledMods,
  useLoadedPlugins,
  useModUpdates,
  useDeleteMod,
  usePatchMod,
} from "@/lib/services/mods";
import type { InstalledMod, LoadedPlugin } from "@/lib/services/mods";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Puzzle,
  ArrowUpCircle,
  Link,
  HardDrive,
  Search,
  Loader2,
  Trash2,
  Settings,
  AlertCircle,
  Wrench,
  LayoutList,
  LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ModDetailsDialog } from "./mod-details-dialog";

// ============================================================================
// Utilities
// ============================================================================

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function getModHue(name: string): number {
  return hashString(name) % 360;
}

const ITEMS_PER_PAGE = 8;

type FilterType = "all" | "active" | "inactive" | "updates";
type SortType = "name" | "size" | "version" | "modified";
type ViewType = "list" | "grid";

// ============================================================================
// Stat Card
// ============================================================================

function StatCard({
  label,
  primary,
  secondary,
  icon: Icon,
  iconColorClass,
  iconBgClass,
}: {
  label: string;
  primary: string | number;
  secondary: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColorClass: string;
  iconBgClass: string;
}) {
  return (
    <Card className="py-4">
      <CardContent className="px-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {label}
            </p>
            <p className="mt-1 text-2xl font-bold">{primary}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{secondary}</p>
          </div>
          <div className={cn("rounded-lg p-2", iconBgClass)}>
            <Icon className={cn("h-5 w-5", iconColorClass)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Mod Icon
// ============================================================================

function ModIcon({
  mod,
  size = "sm",
}: { mod: InstalledMod; size?: "sm" | "lg" }) {
  const dim = size === "lg" ? "h-12 w-12" : "h-8 w-8";
  const iconDim = size === "lg" ? "h-6 w-6" : "h-4 w-4";

  if (mod.iconUrl) {
    return (
      <img
        src={mod.iconUrl}
        alt=""
        className={cn(dim, "rounded border border-border object-cover")}
      />
    );
  }

  const hue = getModHue(mod.displayName);

  return (
    <div
      className={cn(
        dim,
        "flex items-center justify-center rounded border border-border",
      )}
      style={{ backgroundColor: `hsl(${hue}, 60%, 90%)` }}
    >
      <Puzzle
        className={iconDim}
        style={{ color: `hsl(${hue}, 60%, 40%)` }}
      />
    </div>
  );
}

// ============================================================================
// Grid Card
// ============================================================================

function ModGridCard({
  mod,
  isLoaded,
  hasUpdate,
  onDetails,
  onDelete,
  isDeleting,
}: {
  mod: InstalledMod;
  isLoaded: boolean;
  hasUpdate: boolean;
  onDetails: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  return (
    <Card className="group relative py-4 transition-shadow hover:shadow-md">
      <CardContent className="flex flex-col items-center gap-3 px-4 text-center">
        <ModIcon mod={mod} size="lg" />
        <div className="min-w-0 w-full">
          <p className="truncate font-medium">{mod.displayName}</p>
          <p className="text-xs text-muted-foreground">
            {mod.version ?? "Unknown version"}
          </p>
          {mod.author && (
            <p className="text-xs text-muted-foreground">{mod.author}</p>
          )}
        </div>
        <div className="flex gap-1.5">
          {isLoaded ? (
            <Badge className="bg-green-500 hover:bg-green-600" variant="default">
              Active
            </Badge>
          ) : (
            <Badge variant="secondary">Inactive</Badge>
          )}
          {hasUpdate && (
            <Badge className="bg-green-600 hover:bg-green-700" variant="default">
              Update
            </Badge>
          )}
        </div>
        <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Button variant="ghost" size="icon-xs" onClick={onDetails}>
            <Settings className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onDelete}
            disabled={isDeleting}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ModInstalled() {
  const {
    data: installedMods,
    error: installedError,
    isLoading: installedLoading,
    mutate: refreshInstalled,
  } = useInstalledMods();
  const { data: loadedPlugins } = useLoadedPlugins();
  const { data: updatesData } = useModUpdates();
  const { trigger: deleteMod, isMutating: isDeleting } = useDeleteMod();
  const { trigger: patchMod, isMutating: isPatching } = usePatchMod();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [sort, setSort] = useState<SortType>("name");
  const [view, setView] = useState<ViewType>("list");
  const [page, setPage] = useState(0);
  const [detailsMod, setDetailsMod] = useState<InstalledMod | null>(null);
  const [patchingModId, setPatchingModId] = useState<string | null>(null);
  const [isPatchingAll, setIsPatchingAll] = useState(false);

  const mods = installedMods?.mods ?? [];
  const updates = updatesData?.updates ?? [];

  // Build lookup maps
  const updateMap = useMemo(
    () => new Map(updates.map((u) => [u.fileName, u])),
    [updates],
  );

  // Map loaded plugins by their JAR filename (from server logs)
  const pluginByFile = useMemo(() => {
    const map = new Map<string, LoadedPlugin>();
    for (const p of loadedPlugins?.plugins ?? []) {
      if (p.fileName) {
        map.set(p.fileName, p);
      }
    }
    return map;
  }, [loadedPlugins]);

  const isModLoaded = useCallback(
    (mod: InstalledMod) => pluginByFile.has(mod.fileName),
    [pluginByFile],
  );

  const getPluginInfo = useCallback(
    (mod: InstalledMod) => pluginByFile.get(mod.fileName) ?? null,
    [pluginByFile],
  );

  // All installed mod names/groups (for dependency resolution)
  const installedModNames = useMemo(() => {
    const names = new Set<string>();
    for (const m of mods) {
      names.add(m.id.toLowerCase());
      names.add(m.fileName.replace(/\.jar$/, "").toLowerCase());
      if (m.manifestInfo?.name) names.add(m.manifestInfo.name.toLowerCase());
      if (m.manifestInfo?.group) names.add(m.manifestInfo.group.toLowerCase());
    }
    return names;
  }, [mods]);

  // Compute dependency stats
  const depStats = useMemo(() => {
    const allDeps = new Set<string>();
    let missing = 0;
    for (const m of mods) {
      for (const dep of m.dependencies ?? []) {
        allDeps.add(dep);
        if (!installedModNames.has(dep.toLowerCase())) {
          missing++;
        }
      }
    }
    return { total: allDeps.size, missing };
  }, [mods, installedModNames]);

  // Filter and sort
  const filtered = useMemo(() => {
    let list = mods;

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (m) =>
          m.displayName.toLowerCase().includes(q) ||
          m.fileName.toLowerCase().includes(q) ||
          (m.author?.toLowerCase().includes(q) ?? false),
      );
    }

    // Filter
    if (filter === "active") {
      list = list.filter((m) => isModLoaded(m));
    } else if (filter === "inactive") {
      list = list.filter((m) => !isModLoaded(m));
    } else if (filter === "updates") {
      list = list.filter((m) => updateMap.has(m.fileName));
    }

    // Sort
    list = [...list].sort((a, b) => {
      switch (sort) {
        case "name":
          return a.displayName.localeCompare(b.displayName);
        case "size":
          return b.size - a.size;
        case "version":
          return (a.version ?? "").localeCompare(b.version ?? "");
        case "modified":
          return new Date(b.modified).getTime() - new Date(a.modified).getTime();
        default:
          return 0;
      }
    });

    return list;
  }, [mods, search, filter, sort, isModLoaded, updateMap]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages - 1);
  const paginated = filtered.slice(
    safePage * ITEMS_PER_PAGE,
    (safePage + 1) * ITEMS_PER_PAGE,
  );

  // Stat computations
  const activeCount = mods.filter((m) => isModLoaded(m)).length;
  const criticalCount = updates.filter((u) => u.isCritical).length;
  const totalSize = mods.reduce((acc, m) => acc + m.size, 0);

  // Handlers
  const handleDelete = useCallback(
    async (modId: string) => {
      if (!confirm("Are you sure you want to delete this mod?")) return;
      try {
        await deleteMod(modId);
        refreshInstalled();
      } catch (error) {
        console.error("Delete failed:", error);
      }
    },
    [deleteMod, refreshInstalled],
  );

  const handlePatch = useCallback(
    async (modId: string) => {
      setPatchingModId(modId);
      try {
        await patchMod(modId);
        refreshInstalled();
      } catch (error) {
        console.error("Patch failed:", error);
      } finally {
        setPatchingModId(null);
      }
    },
    [patchMod, refreshInstalled],
  );

  const handlePatchAll = useCallback(async () => {
    const toPatch = mods.filter((m) => m.needsPatch);
    if (toPatch.length === 0) return;

    setIsPatchingAll(true);
    try {
      for (const mod of toPatch) {
        setPatchingModId(mod.id);
        try {
          await patchMod(mod.id);
        } catch (error) {
          console.error(`Patch failed for ${mod.name}:`, error);
        }
      }
      refreshInstalled();
    } finally {
      setPatchingModId(null);
      setIsPatchingAll(false);
    }
  }, [mods, patchMod, refreshInstalled]);

  // Loading state
  if (installedLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (installedError) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <AlertCircle className="mr-2 h-5 w-5" />
        Failed to load mods
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Installed Mods"
          primary={mods.length}
          secondary={`${activeCount} active`}
          icon={Puzzle}
          iconColorClass="text-violet-500"
          iconBgClass="bg-violet-500/10"
        />
        <StatCard
          label="Updates Available"
          primary={updates.length}
          secondary={criticalCount > 0 ? `${criticalCount} critical` : "All up to date"}
          icon={ArrowUpCircle}
          iconColorClass="text-green-500"
          iconBgClass="bg-green-500/10"
        />
        <StatCard
          label="Dependencies"
          primary={depStats.total}
          secondary={
            depStats.missing > 0
              ? `${depStats.missing} missing`
              : "All satisfied"
          }
          icon={Link}
          iconColorClass="text-blue-500"
          iconBgClass="bg-blue-500/10"
        />
        <StatCard
          label="Total Size"
          primary={formatBytes(totalSize)}
          secondary={`${mods.length} files`}
          icon={HardDrive}
          iconColorClass="text-orange-500"
          iconBgClass="bg-orange-500/10"
        />
      </div>

      {/* Patch All Warning */}
      {(() => {
        const patchCount = mods.filter((m) => m.needsPatch).length;
        return patchCount > 0 ? (
          <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 text-amber-500" />
                <div>
                  <p className="font-medium text-amber-500">
                    Content-Only Mods Detected
                  </p>
                  <p className="text-sm text-amber-500/80">
                    {patchCount} mod{patchCount > 1 ? "s are" : " is"} missing a
                    Main class and will crash the server.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePatchAll}
                disabled={isPatchingAll}
                className="shrink-0 border-amber-500 text-amber-500 hover:bg-amber-500/10"
              >
                {isPatchingAll ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Wrench className="mr-2 h-4 w-4" />
                )}
                Patch All
              </Button>
            </div>
          </div>
        ) : null;
      })()}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search mods..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="pl-9"
          />
        </div>

        <div className="flex gap-1">
          {(["all", "active", "inactive", "updates"] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setFilter(f);
                setPage(0);
              }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f === "updates" && updates.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 px-1">
                  {updates.length}
                </Badge>
              )}
            </Button>
          ))}
        </div>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortType)}
          className="h-8 rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="name">Name</option>
          <option value="size">Size</option>
          <option value="version">Version</option>
          <option value="modified">Modified</option>
        </select>

        <div className="flex gap-1 ml-auto">
          <Button
            variant={view === "list" ? "default" : "outline"}
            size="icon-sm"
            onClick={() => setView("list")}
          >
            <LayoutList className="h-4 w-4" />
          </Button>
          <Button
            variant={view === "grid" ? "default" : "outline"}
            size="icon-sm"
            onClick={() => setView("grid")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {mods.length === 0 ? (
        <div className="flex h-32 items-center justify-center text-muted-foreground">
          No mods installed
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex h-32 items-center justify-center text-muted-foreground">
          No mods match your filters
        </div>
      ) : view === "list" ? (
        /* Table View */
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Mod Name</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.map((mod) => {
                const loaded = isModLoaded(mod);
                const update = updateMap.get(mod.fileName);

                return (
                  <TableRow key={mod.id}>
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-3">
                        <ModIcon mod={mod} />
                        <div className="min-w-0">
                          <p className="font-medium truncate">
                            {mod.displayName}
                          </p>
                          {mod.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-[300px]">
                              {mod.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">
                          {mod.version ?? "-"}
                        </span>
                        {update && (
                          <Badge className="bg-green-600 hover:bg-green-700 text-[10px] px-1.5 py-0">
                            Update
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {mod.author ?? "-"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatBytes(mod.size)}
                    </TableCell>
                    <TableCell>
                      {mod.needsPatch ? (
                        <Badge
                          variant="outline"
                          className="border-amber-500 text-amber-500"
                        >
                          Needs Patch
                        </Badge>
                      ) : loaded ? (
                        <div className="flex items-center gap-1.5">
                          <div className="h-2 w-2 rounded-full bg-green-500" />
                          <span className="text-sm">Active</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <div className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                          <span className="text-sm text-muted-foreground">
                            Inactive
                          </span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {mod.needsPatch && (
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => handlePatch(mod.id)}
                            disabled={isPatching || isPatchingAll}
                            className="text-amber-500 hover:text-amber-600"
                          >
                            {patchingModId === mod.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Wrench className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => setDetailsMod(mod)}
                        >
                          <Settings className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleDelete(mod.id)}
                          disabled={isDeleting}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {paginated.map((mod) => (
            <ModGridCard
              key={mod.id}
              mod={mod}
              isLoaded={isModLoaded(mod)}
              hasUpdate={updateMap.has(mod.fileName)}
              onDetails={() => setDetailsMod(mod)}
              onDelete={() => handleDelete(mod.id)}
              isDeleting={isDeleting}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {filtered.length > ITEMS_PER_PAGE && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {safePage * ITEMS_PER_PAGE + 1}–
            {Math.min((safePage + 1) * ITEMS_PER_PAGE, filtered.length)} of{" "}
            {filtered.length} mods
          </p>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={safePage === 0}
              onClick={() => setPage(safePage - 1)}
            >
              &lt;
            </Button>
            {Array.from({ length: totalPages }, (_, i) => (
              <Button
                key={i}
                variant={safePage === i ? "default" : "outline"}
                size="sm"
                onClick={() => setPage(i)}
              >
                {i + 1}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage(safePage + 1)}
            >
              &gt;
            </Button>
          </div>
        </div>
      )}

      {/* Restart Warning */}
      {mods.some((m) => !m.needsPatch && !isModLoaded(m)) && (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-amber-500" />
            <div>
              <p className="font-medium text-amber-500">Restart Required</p>
              <p className="text-sm text-amber-500/80">
                Some mods have been installed or removed. Restart the server to
                apply changes.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Details Dialog */}
      <ModDetailsDialog
        mod={detailsMod}
        open={detailsMod !== null}
        onOpenChange={(open) => !open && setDetailsMod(null)}
        pluginInfo={detailsMod ? getPluginInfo(detailsMod) : null}
        update={detailsMod ? updateMap.get(detailsMod.fileName) : null}
        installedModNames={installedModNames}
      />
    </div>
  );
}
