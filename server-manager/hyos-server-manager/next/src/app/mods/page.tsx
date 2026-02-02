"use client";

import { useState, useCallback } from "react";
import {
  useInstalledMods,
  useLoadedPlugins,
  useUploadMod,
  useDeleteMod,
} from "@/lib/services/mods";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Upload,
  Trash2,
  RefreshCw,
  FileArchive,
  Puzzle,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Format bytes to human readable
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// Format date to relative time
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function ModsPage() {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Data fetching
  const {
    data: installedMods,
    error: installedError,
    isLoading: installedLoading,
    mutate: refreshInstalled,
  } = useInstalledMods();

  const {
    data: loadedPlugins,
    error: loadedError,
    isLoading: loadedLoading,
    mutate: refreshLoaded,
  } = useLoadedPlugins();

  // Mutations
  const { trigger: uploadMod, isMutating: isUploading } = useUploadMod();
  const { trigger: deleteMod, isMutating: isDeleting } = useDeleteMod();

  // Handle file selection
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setSelectedFile(file);
      }
    },
    [],
  );

  // Handle upload
  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    try {
      await uploadMod(selectedFile);
      setSelectedFile(null);
      refreshInstalled();
    } catch (error) {
      console.error("Upload failed:", error);
    }
  }, [selectedFile, uploadMod, refreshInstalled]);

  // Handle delete
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

  // Handle drag events
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  // Handle drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files?.[0]) {
      const file = files[0];
      if (file.name.endsWith(".jar")) {
        setSelectedFile(file);
      } else {
        alert("Only JAR files are allowed");
      }
    }
  }, []);

  // Check if a mod is loaded
  const isModLoaded = (modName: string) => {
    const baseName = modName.replace(/\.jar$/, "");
    return loadedPlugins?.plugins.some(
      (p) => p.name.toLowerCase() === baseName.toLowerCase(),
    );
  };

  // Get plugin info for a loaded mod
  const getPluginInfo = (modName: string) => {
    const baseName = modName.replace(/\.jar$/, "");
    return loadedPlugins?.plugins.find(
      (p) => p.name.toLowerCase() === baseName.toLowerCase(),
    );
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mods</h1>
          <p className="mt-2 text-muted-foreground">
            Manage server mods and plugins
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              refreshInstalled();
              refreshLoaded();
            }}
            disabled={installedLoading || loadedLoading}
          >
            <RefreshCw
              className={cn(
                "mr-2 h-4 w-4",
                (installedLoading || loadedLoading) && "animate-spin",
              )}
            />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Mod
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={cn(
                "rounded-lg border-2 border-dashed p-8 text-center transition-colors",
                dragActive
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50",
              )}
            >
              <FileArchive className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-sm text-muted-foreground">
                Drag and drop a JAR file here, or{" "}
                <label className="cursor-pointer text-primary hover:underline">
                  browse
                  <Input
                    type="file"
                    accept=".jar"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </label>
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Maximum file size: 100MB
              </p>
            </div>

            {selectedFile && (
              <div className="mt-4 rounded-lg border bg-muted p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileArchive className="h-8 w-8 text-primary" />
                    <div>
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatBytes(selectedFile.size)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedFile(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleUpload}
                      disabled={isUploading}
                    >
                      {isUploading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Upload
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Loaded Plugins Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Puzzle className="h-5 w-5" />
              Loaded Plugins
              {loadedPlugins && (
                <Badge variant="secondary">{loadedPlugins.count}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadedLoading ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : loadedError ? (
              <div className="flex h-32 items-center justify-center text-muted-foreground">
                <AlertCircle className="mr-2 h-5 w-5" />
                Failed to load plugins
              </div>
            ) : loadedPlugins?.plugins.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-muted-foreground">
                No plugins loaded
              </div>
            ) : (
              <div className="space-y-2">
                {loadedPlugins?.plugins.map((plugin) => (
                  <div
                    key={plugin.name}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{plugin.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {plugin.description || "No description"}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant={
                          plugin.state === "ENABLED" ? "default" : "secondary"
                        }
                      >
                        {plugin.state}
                      </Badge>
                      <p className="mt-1 text-xs text-muted-foreground">
                        v{plugin.version}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Installed Mods Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileArchive className="h-5 w-5" />
            Installed Mods
            {installedMods && (
              <Badge variant="secondary">{installedMods.count}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {installedLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : installedError ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              <AlertCircle className="mr-2 h-5 w-5" />
              Failed to load mods
            </div>
          ) : installedMods?.mods.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              No mods installed
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mod</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Modified</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {installedMods?.mods.map((mod) => {
                  const loaded = isModLoaded(mod.fileName);
                  const pluginInfo = getPluginInfo(mod.fileName);

                  return (
                    <TableRow key={mod.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <FileArchive className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{mod.name}</p>
                            {pluginInfo && (
                              <p className="text-xs text-muted-foreground">
                                v{pluginInfo.version}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{formatBytes(mod.size)}</TableCell>
                      <TableCell>{formatRelativeTime(mod.modified)}</TableCell>
                      <TableCell>
                        {loaded ? (
                          <Badge className="bg-green-500 hover:bg-green-600">
                            Loaded
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-500">
                            Restart Required
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(mod.id)}
                          disabled={isDeleting}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Restart Notice */}
      {installedMods?.mods.some((m) => !isModLoaded(m.fileName)) && (
        <div className="mt-6 rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
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
    </div>
  );
}
