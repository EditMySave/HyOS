"use client";

import type { InstalledMod, ModUpdate } from "@/lib/services/mods/mods.types";
import type { LoadedPlugin } from "@/lib/services/mods/mods.types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  ExternalLink,
  CheckCircle2,
  XCircle,
  ArrowUpCircle,
} from "lucide-react";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
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
  if (!mod) return null;

  const deps = mod.dependencies ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mod.displayName}</DialogTitle>
          <DialogDescription>{mod.fileName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          {/* General Info */}
          <Section title="General">
            <Row label="Version" value={mod.version ?? "Unknown"} />
            {mod.authors.length > 0 && (
              <Row label="Author(s)" value={mod.authors.join(", ")} />
            )}
            {mod.providerSource && (
              <Row label="Source" value={mod.providerSource} />
            )}
            {mod.description && (
              <Row label="Description" value={mod.description} />
            )}
          </Section>

          {/* Manifest Info */}
          {mod.manifestInfo && (
            <Section title="Manifest">
              {mod.manifestInfo.group && (
                <Row label="Group" value={mod.manifestInfo.group} />
              )}
              {mod.manifestInfo.name && (
                <Row label="Name" value={mod.manifestInfo.name} />
              )}
              {mod.manifestInfo.main && (
                <Row label="Main Class" value={mod.manifestInfo.main} />
              )}
              {mod.manifestInfo.serverVersion && (
                <Row
                  label="Server Version"
                  value={mod.manifestInfo.serverVersion}
                />
              )}
            </Section>
          )}

          {/* Dependencies */}
          {deps.length > 0 && (
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
          )}

          {/* File Info */}
          <Section title="File">
            <Row label="Size" value={formatBytes(mod.size)} />
            <Row
              label="Modified"
              value={new Date(mod.modified).toLocaleString()}
            />
            <Row label="Path" value={mod.path} />
            <div className="flex gap-2">
              {mod.needsPatch && (
                <Badge
                  variant="outline"
                  className="border-amber-500 text-amber-500"
                >
                  Needs Patch
                </Badge>
              )}
              {mod.isPatched && (
                <Badge
                  variant="outline"
                  className="border-blue-500 text-blue-500"
                >
                  Patched
                </Badge>
              )}
              {pluginInfo && (
                <Badge className="bg-green-500 hover:bg-green-600">
                  {pluginInfo.state}
                </Badge>
              )}
            </div>
          </Section>

          {/* Update Info */}
          {update && (
            <Section title="Update Available">
              <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 p-3">
                <ArrowUpCircle className="h-4 w-4 text-green-500" />
                <div>
                  <p className="font-medium text-green-600 dark:text-green-400">
                    {update.currentVersion} → {update.latestVersion}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    via {update.provider}
                    {update.isCritical && " (critical)"}
                  </p>
                </div>
              </div>
            </Section>
          )}

          {/* Provider Link */}
          {mod.providerSource && mod.iconUrl && (
            <a
              href={mod.iconUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              View on {mod.providerSource}
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({
  title,
  children,
}: { title: string; children: React.ReactNode }) {
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
