"use client";

import { useState, useCallback } from "react";
import {
  useInstalledMods,
  useLoadedPlugins,
  useUploadMod,
} from "@/lib/services/mods";
import { ModBrowse } from "@/components/mods/mod-browse";
import { ModInstalled } from "@/components/mods/mod-installed";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  Upload,
  RefreshCw,
  FileArchive,
  Search,
  FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export default function ModsPage() {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { isLoading: installedLoading, mutate: refreshInstalled } =
    useInstalledMods();

  const { isLoading: loadedLoading, mutate: refreshLoaded } =
    useLoadedPlugins();

  const { trigger: uploadMod, isMutating: isUploading } = useUploadMod();

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setSelectedFile(file);
      }
    },
    [],
  );

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

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

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

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
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

      <Tabs defaultValue="search" className="w-full">
        <TabsList>
          <TabsTrigger value="search">
            <Search className="mr-2 h-4 w-4" />
            Search
          </TabsTrigger>
          <TabsTrigger value="upload">
            <Upload className="mr-2 h-4 w-4" />
            Upload
          </TabsTrigger>
          <TabsTrigger value="installed">
            <FolderOpen className="mr-2 h-4 w-4" />
            Installed
          </TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="mt-0">
          <ModBrowse className="min-h-[calc(100vh-14rem)]" />
        </TabsContent>

        <TabsContent value="upload">
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
        </TabsContent>

        <TabsContent value="installed">
          <ModInstalled />
        </TabsContent>
      </Tabs>
    </div>
  );
}
